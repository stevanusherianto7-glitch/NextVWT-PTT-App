import { usePTTStore } from '../store/usePTTStore';
import { getSupabase } from '../utils/supabase';
import { BRAND } from '../utils/config';
import { roleRank } from '../../features/moderation/permissions';
import type { ChannelRole } from '../../features/moderation/permissions';
import {
  activeChannelSubscription,
  setActiveChannelSubscription,
  heartbeatState,
  cleanupHeartbeat,
} from '../store/subscription';
import { safeParseRealtimePayload } from '../store/schemas/realtimePayloads';
import {
  PttStatePayloadSchema,
  VoiceChunkPayloadSchema,
  WebRTCSignalingPayloadSchema,
  HangUpPayloadSchema,
  ReactionPayloadSchema,
  KickPayloadSchema,
  PresenceMetaSchema,
  UpdateRolePayloadSchema,
  UpdateStatusPayloadSchema,
} from '../store/schemas/realtimePayloads';
import type { WebRTCSignalingPayload } from '../store/types';
import { toast } from 'sonner';
import { generateUUID } from '../store/storeUtils';
import { checkIfNewUser } from '../utils/constants';

let activeTransmitterTimeout: NodeJS.Timeout | null = null;
let subscribingChannelNum: number | null = null;

function startActiveTransmitterWatchdog(userId: string, displayName: string) {
  if (activeTransmitterTimeout) {
    clearTimeout(activeTransmitterTimeout);
  }
  activeTransmitterTimeout = setTimeout(() => {
    const state = usePTTStore.getState();
    if (state.activeTransmitter && state.activeTransmitter.userId === userId) {
      console.warn(
        `[Watchdog] Transmission from ${displayName} exceeded 60s limit. Force clearing.`
      );
      usePTTStore.setState({ activeTransmitter: null });
      if (userId === state.userId && state.isTransmitting) {
        state.setTransmitting(false);
      }
    }
    activeTransmitterTimeout = null;
  }, 60000);
}

function clearActiveTransmitterWatchdog() {
  if (activeTransmitterTimeout) {
    clearTimeout(activeTransmitterTimeout);
    activeTransmitterTimeout = null;
  }
}

export function subscribeToChannel(channelNum: number, retryCount = 0) {
  subscribingChannelNum = channelNum;
  cleanupHeartbeat();

  (async () => {
    try {
      if (activeChannelSubscription) {
        activeChannelSubscription.unsubscribe();
        setActiveChannelSubscription(null);
      }

      // Clear active users list immediately on channel change to prevent showing stale users
      usePTTStore.setState({ activeUsers: [] });

      // Optimistic connection state for smooth fallback and instant UX
      usePTTStore.setState({ isConnected: true });

      // Update Foreground Service notification
      const channelStr = String(channelNum).padStart(3, '0');
      import('../utils/backgroundSurvival')
        .then(({ startBackgroundService }) => {
          startBackgroundService(`Siaga di Saluran ${channelStr}`);
        })
        .catch((err) => console.warn('Failed to start/update background service:', err));

      const store = usePTTStore.getState();
      const supabase = await getSupabase();

      // Check if we were preempted by a newer subscription call during the await
      if (subscribingChannelNum !== channelNum) {
        console.warn(
          `[Supabase] Aborting subscription to CH ${channelNum} because target changed to CH ${subscribingChannelNum}`
        );
        return;
      }

      const channelInstance = supabase.channel(`${BRAND.supabaseRoomPrefix}${channelNum}`, {
        config: {
          presence: {
            key: `${store.userId || 'anonymous'}_${store.callSign || ''}`,
          },
          broadcast: {
            self: true, // receive our own broadcasts for loopback Ping-Pong
          },
        },
      });

      if (subscribingChannelNum !== channelNum) {
        return;
      }

      setActiveChannelSubscription(channelInstance);

      channelInstance
        .on('presence', { event: 'sync' }, () => {
          if (activeChannelSubscription !== channelInstance) return;
          const presenceState = channelInstance.presenceState();
          const rawList = Object.values(presenceState).flat() as unknown[];

          // [F-04] Validate each presence entry against Zod schema before use
          const uniqueUsersMap = new Map<
            string,
            {
              userId: string;
              displayName: string;
              callSign: string;
              location: string;
              avatarUrl?: string;
              isNewUser?: boolean;
              role?: ChannelRole;
              isMuted?: boolean;
              isControlled?: boolean;
              isWait?: boolean;
              isWaitControlled?: boolean;
            }
          >();
          rawList.forEach((raw) => {
            const p = safeParseRealtimePayload(PresenceMetaSchema, raw, 'presence');
            if (p && p.userId) {
              uniqueUsersMap.set(`${p.userId}_${p.callSign || ''}`, {
                userId: p.userId,
                displayName: p.displayName || 'Anonim',
                callSign: p.callSign || '2DYUA',
                location: p.location || 'BANDUNG, JABAR',
                avatarUrl: p.avatarUrl || '',
                isNewUser: checkIfNewUser(p.createdAt || undefined),
                role: (p.role as ChannelRole) || undefined,
                isMuted: p.status === 'muted',
                isControlled: p.status === 'controlled',
                isWait: p.status === 'wait',
                isWaitControlled: p.status === 'wait_controlled',
              });
            }
          });
          const users = Array.from(uniqueUsersMap.values());
          usePTTStore.setState({ activeUsers: users });

          // Watchdog: If the active transmitter is no longer present in presence list, clear it
          const currentTx = usePTTStore.getState().activeTransmitter;
          if (currentTx) {
            const isTxStillPresent = users.some((u) => u.userId === currentTx.userId);
            if (!isTxStillPresent) {
              console.warn(
                `[Watchdog] Active transmitter ${currentTx.displayName} left the channel (presence drop). Clearing activeTransmitter.`
              );
              usePTTStore.setState({ activeTransmitter: null });
              clearActiveTransmitterWatchdog();
            }
          }
        })
        .on(
          'broadcast',
          { event: 'ptt_state' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            // [F-04] Validate before using payload to prevent state corruption
            const payload = safeParseRealtimePayload(
              PttStatePayloadSchema,
              rawPayload,
              'ptt_state'
            );
            if (!payload) return;
            if (payload.isTransmitting) {
              const state = usePTTStore.getState();
              const isOtherDevice =
                payload.userId !== state.userId || payload.callSign !== state.callSign;

              if (isOtherDevice) {
                const myRole = state.myChannelRole ?? 'guest';
                const myPriority = roleRank[myRole as ChannelRole] ?? 1;
                const incomingPriority = roleRank[(payload.role as ChannelRole) ?? 'guest'] ?? 1;

                if (state.isTransmitting) {
                  // 1. Moderator Override (Pre-emption)
                  if (incomingPriority > myPriority) {
                    usePTTStore.setState({ isTransmitting: false, progress: 0 });
                    toast.error(
                      `Transmisi Anda dihentikan: Jalur diambil alih oleh Moderator/Operator (${payload.displayName}).`
                    );
                  }
                  // 2. PTT Collision Detection (Deterministic Tie-Breaker)
                  else {
                    const localTime = state.lastTransmitTime;
                    const remoteTime = payload.timestamp || 0;

                    // If we started later, or started at same time but have lower ID / priority
                    const lostCollision =
                      localTime > remoteTime ||
                      (localTime === remoteTime && state.userId > payload.userId);

                    if (lostCollision) {
                      usePTTStore.setState({ isTransmitting: false, progress: 0 });
                      toast.warning(
                        `Jalur sibuk! Transmisi bertabrakan dengan ${payload.displayName}.`
                      );
                      // In this case, we abort and listen to them instead
                    }
                  }
                }
              }

              usePTTStore.setState({
                activeTransmitter: {
                  userId: payload.userId,
                  displayName: payload.displayName,
                  callSign: payload.callSign,
                  role: payload.role,
                  isNewUser: payload.isNewUser,
                },
              });
              startActiveTransmitterWatchdog(payload.userId, payload.displayName);
            } else {
              const currentTx = usePTTStore.getState().activeTransmitter;
              if (currentTx && currentTx.userId === payload.userId) {
                usePTTStore.setState({ activeTransmitter: null });
                clearActiveTransmitterWatchdog();
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'voice_chunk' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            // [F-04] Validate chunk size and userId before piping to audio
            const payload = safeParseRealtimePayload(
              VoiceChunkPayloadSchema,
              rawPayload,
              'voice_chunk'
            );
            if (!payload) return;
            const state = usePTTStore.getState();
            // Ignore our own broadcasted voice chunks (matching both userId and callSign) to avoid feedback loop
            const isSelf =
              payload.userId === state.userId &&
              (!payload.callSign || payload.callSign === state.callSign);
            if (!isSelf && state.onVoiceChunkReceived) {
              state.onVoiceChunkReceived(payload.base64);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'webrtc_signaling' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            // [F-04] Validate signaling message structure before processing
            const payload = safeParseRealtimePayload(
              WebRTCSignalingPayloadSchema,
              rawPayload,
              'webrtc_signaling'
            );
            if (!payload) return;
            const state = usePTTStore.getState();
            const isSelf =
              payload.senderUserId === state.userId &&
              (!payload.senderCallSign || payload.senderCallSign === state.callSign);
            if (!isSelf && state.onWebRTCSignalingReceived) {
              // Ensure the signal is intended for us (if targeted)
              if (payload.targetUserId && payload.targetUserId !== state.userId) return;
              if (payload.targetCallSign && payload.targetCallSign !== state.callSign) return;
              state.onWebRTCSignalingReceived(payload as WebRTCSignalingPayload);
            }
          }
        )
        .on('broadcast', { event: 'hang_up' }, ({ payload: rawPayload }: { payload: unknown }) => {
          if (activeChannelSubscription !== channelInstance) return;
          // [F-04] Validate before acting on hang_up to prevent spoofed disconnections
          const payload = safeParseRealtimePayload(HangUpPayloadSchema, rawPayload, 'hang_up');
          if (!payload) return;
          const state = usePTTStore.getState();

          // If we are the target and currently transmitting, force-stop our transmission
          if (payload.targetUserId === state.userId && state.isTransmitting) {
            console.warn(
              `[Hang Up] Transmission interrupted by moderator${payload.moderatorName ? ` (${payload.moderatorName})` : ''}`
            );
            usePTTStore.setState({ isTransmitting: false, progress: 0 });
          }

          // If the target matches the current active transmitter, clear it for all listeners
          const currentTx = state.activeTransmitter;
          if (currentTx && currentTx.userId === payload.targetUserId) {
            usePTTStore.setState({ activeTransmitter: null, progress: 0 });
            clearActiveTransmitterWatchdog();
          }
        })
        .on('broadcast', { event: 'reaction' }, ({ payload: rawPayload }: { payload: unknown }) => {
          if (activeChannelSubscription !== channelInstance) return;
          // [F-04] Validate reaction payload to prevent XSS via reaction strings
          const payload = safeParseRealtimePayload(ReactionPayloadSchema, rawPayload, 'reaction');
          if (!payload) return;
          const state = usePTTStore.getState();
          if (state.onReactionReceived) {
            state.onReactionReceived(payload);
          }
        })
        .on('broadcast', { event: 'kick' }, ({ payload: rawPayload }: { payload: unknown }) => {
          if (activeChannelSubscription !== channelInstance) return;
          // [F-04] Validate kick payload
          const payload = safeParseRealtimePayload(KickPayloadSchema, rawPayload, 'kick');
          if (!payload) return;
          const state = usePTTStore.getState();

          if (payload.targetUserId === state.userId) {
            console.warn(
              `[Kick] You have been kicked/banned. Reason: ${payload.reason || 'No reason'}. Moving to CH 302...`
            );
            // Force channel change to 302
            state.setChannelNumber(302);
          }
        })
        .on(
          'broadcast',
          { event: 'update_role' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            // [F-04] Validate update_role payload
            const payload = safeParseRealtimePayload(
              UpdateRolePayloadSchema,
              rawPayload,
              'update_role'
            );
            if (!payload) return;
            const roomId = `ptt-room-${channelNum}`;
            sessionStorage.setItem(
              `channel-role:${roomId}:${payload.targetUserId}`,
              payload.nextRole
            );
            localStorage.setItem(
              `channel-role:${roomId}:${payload.targetUserId}`,
              payload.nextRole
            );
            window.dispatchEvent(new Event('channel-role-changed'));

            // Re-track presence if the change is for the local user
            const currentStore = usePTTStore.getState();
            if (payload.targetUserId === currentStore.userId) {
              usePTTStore.setState({ myChannelRole: payload.nextRole as ChannelRole });
            }
            if (payload.targetUserId === currentStore.userId && activeChannelSubscription) {
              const userMeta = currentStore.user;
              const displayName =
                currentStore.infoText || userMeta?.user_metadata?.full_name || 'Pebe Herianto';
              const location = currentStore.locationText;
              const avatarUrl =
                currentStore.profilePhotoOption === 'google'
                  ? userMeta?.user_metadata?.avatar_url || ''
                  : currentStore.customPhotoUrl;

              const localStatus =
                localStorage.getItem(`channel-status:${roomId}:${currentStore.userId}`) || 'active';
              let presenceStatus: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled' =
                'normal';
              if (
                localStatus === 'muted' ||
                localStatus === 'controlled' ||
                localStatus === 'wait' ||
                localStatus === 'wait_controlled'
              ) {
                presenceStatus = localStatus as typeof presenceStatus;
              }

              activeChannelSubscription
                .track({
                  userId: currentStore.userId,
                  displayName: displayName,
                  callSign: currentStore.callSign || '2DYUA',
                  location: location,
                  avatarUrl: avatarUrl,
                  createdAt: userMeta?.created_at,
                  role: payload.nextRole,
                  status: presenceStatus,
                })
                .catch((err) => console.warn('Failed to update presence on role sync:', err));
            }
          }
        )
        .on(
          'broadcast',
          { event: 'update_status' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            // [F-04] Validate update_status payload
            const payload = safeParseRealtimePayload(
              UpdateStatusPayloadSchema,
              rawPayload,
              'update_status'
            );
            if (!payload) return;
            const roomId = `ptt-room-${channelNum}`;
            const statusVal = payload.statusType === 'normal' ? 'active' : payload.statusType;
            sessionStorage.setItem(`channel-status:${roomId}:${payload.targetUserId}`, statusVal);
            localStorage.setItem(`channel-status:${roomId}:${payload.targetUserId}`, statusVal);
            window.dispatchEvent(new Event('channel-role-changed'));

            // Re-track presence if the change is for the local user
            const currentStore = usePTTStore.getState();
            if (payload.targetUserId === currentStore.userId) {
              usePTTStore.setState({ myChannelStatus: payload.statusType });
            }
            if (payload.targetUserId === currentStore.userId && activeChannelSubscription) {
              const userMeta = currentStore.user;
              const displayName =
                currentStore.infoText || userMeta?.user_metadata?.full_name || 'Pebe Herianto';
              const location = currentStore.locationText;
              const avatarUrl =
                currentStore.profilePhotoOption === 'google'
                  ? userMeta?.user_metadata?.avatar_url || ''
                  : currentStore.customPhotoUrl;

              const localRole = (localStorage.getItem(
                `channel-role:${roomId}:${currentStore.userId}`
              ) || 'guest') as ChannelRole;

              activeChannelSubscription
                .track({
                  userId: currentStore.userId,
                  displayName: displayName,
                  callSign: currentStore.callSign || '2DYUA',
                  location: location,
                  avatarUrl: avatarUrl,
                  createdAt: userMeta?.created_at,
                  role: localRole,
                  status: payload.statusType,
                })
                .catch((err) => console.warn('Failed to update presence on status sync:', err));
            }
          }
        )
        .on(
          'broadcast',
          { event: 'heartbeat_ping' },
          ({ payload }: { payload: { userId?: string; pingId?: string } }) => {
            if (activeChannelSubscription !== channelInstance) return;
            const state = usePTTStore.getState();
            if (
              payload &&
              payload.userId === state.userId &&
              payload.pingId === heartbeatState.expectedPingId
            ) {
              heartbeatState.expectedPingId = null;
              heartbeatState.missedPings = 0;
              if (heartbeatState.heartbeatTimeout) {
                clearTimeout(heartbeatState.heartbeatTimeout);
                heartbeatState.heartbeatTimeout = null;
              }
            }
          }
        );

      channelInstance.subscribe((status: string) => {
        if (activeChannelSubscription !== channelInstance) return;
        const isSubscribed = status === 'SUBSCRIBED';
        if (isSubscribed) {
          usePTTStore.setState({ isConnected: true });

          // Start Loopback Ping-Pong Heartbeat
          heartbeatState.missedPings = 0;
          heartbeatState.expectedPingId = null;
          if (heartbeatState.heartbeatInterval) {
            clearInterval(heartbeatState.heartbeatInterval);
          }

          heartbeatState.heartbeatInterval = setInterval(() => {
            const state = usePTTStore.getState();
            if (activeChannelSubscription === channelInstance && state.isConnected) {
              if (heartbeatState.expectedPingId) {
                heartbeatState.missedPings++;
                console.warn(
                  `[Heartbeat] Missed loopback pong count: ${heartbeatState.missedPings}`
                );
                if (heartbeatState.missedPings >= 2) {
                  console.error(
                    `[Heartbeat] Missed ${heartbeatState.missedPings} consecutive pongs. Force reconnecting CH ${channelNum}...`
                  );
                  cleanupHeartbeat();
                  subscribeToChannel(channelNum, 0);
                  return;
                }
              }

              const pingId = generateUUID();
              heartbeatState.expectedPingId = pingId;

              channelInstance
                .send({
                  type: 'broadcast',
                  event: 'heartbeat_ping',
                  payload: {
                    userId: state.userId,
                    pingId: pingId,
                  },
                })
                .catch((err) => {
                  console.warn('[Heartbeat] Send ping failed:', err);
                });

              if (heartbeatState.heartbeatTimeout) {
                clearTimeout(heartbeatState.heartbeatTimeout);
              }
              heartbeatState.heartbeatTimeout = setTimeout(() => {
                // Pong tidak diterima dalam 5 detik
                if (heartbeatState.expectedPingId) {
                  heartbeatState.missedPings++;
                  heartbeatState.expectedPingId = null;
                  console.warn(
                    `[Heartbeat] Pong timeout. Missed count: ${heartbeatState.missedPings}`
                  );
                  if (heartbeatState.missedPings >= 2) {
                    console.error(
                      `[Heartbeat] ${heartbeatState.missedPings} consecutive timeouts. ` +
                        `Force reconnecting CH ${channelNum}...`
                    );
                    cleanupHeartbeat();
                    subscribeToChannel(channelNum, 0);
                  }
                }
              }, 5000);
            }
          }, 10000); // Check every 10 seconds
        }

        if (status === 'CHANNEL_ERROR' && retryCount < 3) {
          const timeout = Math.pow(2, retryCount) * 1000;
          console.warn(
            `[Supabase] Channel error. Retrying in ${timeout}ms (attempt ${retryCount + 1})...`
          );
          setTimeout(() => subscribeToChannel(channelNum, retryCount + 1), timeout);
          return;
        }

        if (isSubscribed) {
          const currentStore = usePTTStore.getState();
          const userMeta = currentStore.user;
          const displayName =
            currentStore.infoText || userMeta?.user_metadata?.full_name || 'Pebe Herianto';
          const location = currentStore.locationText;

          // Only track presence if the channel is actually subscribed on the backend
          if (status === 'SUBSCRIBED') {
            const avatarUrl =
              currentStore.profilePhotoOption === 'google'
                ? userMeta?.user_metadata?.avatar_url || ''
                : currentStore.customPhotoUrl;

            const roomId = `ptt-room-${channelNum}`;
            const localRole = (localStorage.getItem(
              `channel-role:${roomId}:${currentStore.userId}`
            ) || 'guest') as ChannelRole;
            const localStatus =
              localStorage.getItem(`channel-status:${roomId}:${currentStore.userId}`) || 'active';
            let presenceStatus: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled' =
              'normal';
            if (
              localStatus === 'muted' ||
              localStatus === 'controlled' ||
              localStatus === 'wait' ||
              localStatus === 'wait_controlled'
            ) {
              presenceStatus = localStatus as typeof presenceStatus;
            }

            usePTTStore.setState({ myChannelRole: localRole, myChannelStatus: presenceStatus });

            channelInstance.track({
              userId: currentStore.userId,
              displayName: displayName,
              callSign: currentStore.callSign || '2DYUA',
              location: location,
              avatarUrl: avatarUrl,
              createdAt: userMeta?.created_at,
              role: localRole,
              status: presenceStatus,
            });
          }
        }
      });
    } catch (err) {
      console.error('Supabase room connection error:', err);
      // Graceful Degradation: keep optimistic connection for smooth fallback
      usePTTStore.setState({
        isConnected: true,
        error: 'Connection failed — operating in offline mode',
      });
    }
  })();
}
