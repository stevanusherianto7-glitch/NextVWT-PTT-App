import { usePTTStore } from '../store/usePTTStore';
import { getSupabase } from '../utils/supabase';
import { BRAND } from '../utils/config';
import type { ChannelRole } from '../../features/moderation/permissions';
import {
  activeChannelSubscription,
  setActiveChannelSubscription,
  heartbeatState,
  cleanupHeartbeat,
} from '../store/subscription';
import { safeParseRealtimePayload } from '../store/schemas/realtimePayloads';
import { PresenceMetaSchema, ReactionPayloadSchema } from '../store/schemas/realtimePayloads';
import { toast } from 'sonner';
import { generateUUID } from '../store/storeUtils';
import { checkIfNewUser } from '../utils/constants';

import { handlePttState, clearActiveTransmitterWatchdog } from './handlers/pttHandler';
import { handleVoiceChunk, handleWebRTCSignaling } from './handlers/voiceHandler';
import {
  handleHangUp,
  handleKick,
  handleUpdateRole,
  handleUpdateStatus,
} from './handlers/modHandler';

let subscribingChannelNum: number | null = null;

export function subscribeToChannel(channelNum: number, retryCount = 0) {
  subscribingChannelNum = channelNum;
  cleanupHeartbeat();

  (async () => {
    try {
      if (activeChannelSubscription) {
        activeChannelSubscription.unsubscribe();
        setActiveChannelSubscription(null);
      }

      // Clear active users list immediately on channel change and set connection to false
      usePTTStore.setState({ activeUsers: [], isConnected: false });

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
            handlePttState(rawPayload);
          }
        )
        .on(
          'broadcast',
          { event: 'voice_chunk' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            handleVoiceChunk(rawPayload);
          }
        )
        .on(
          'broadcast',
          { event: 'webrtc_signaling' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            handleWebRTCSignaling(rawPayload);
          }
        )
        .on('broadcast', { event: 'hang_up' }, ({ payload: rawPayload }: { payload: unknown }) => {
          if (activeChannelSubscription !== channelInstance) return;
          handleHangUp(rawPayload, clearActiveTransmitterWatchdog);
        })
        .on('broadcast', { event: 'reaction' }, ({ payload: rawPayload }: { payload: unknown }) => {
          if (activeChannelSubscription !== channelInstance) return;
          const payload = safeParseRealtimePayload(ReactionPayloadSchema, rawPayload, 'reaction');
          if (!payload) return;
          const state = usePTTStore.getState();
          if (state.onReactionReceived) {
            state.onReactionReceived(payload);
          }
        })
        .on('broadcast', { event: 'kick' }, ({ payload: rawPayload }: { payload: unknown }) => {
          if (activeChannelSubscription !== channelInstance) return;
          handleKick(rawPayload);
        })
        .on(
          'broadcast',
          { event: 'update_role' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            handleUpdateRole(rawPayload, channelNum, channelInstance);
          }
        )
        .on(
          'broadcast',
          { event: 'update_status' },
          ({ payload: rawPayload }: { payload: unknown }) => {
            if (activeChannelSubscription !== channelInstance) return;
            handleUpdateStatus(rawPayload, channelNum, channelInstance);
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
        } else {
          usePTTStore.setState({ isConnected: false });
        }

        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && retryCount < 5) {
          const timeout = Math.min(30000, Math.pow(2, retryCount) * 1000);
          console.warn(
            `[Supabase] Channel status ${status}. Retrying in ${timeout}ms (attempt ${retryCount + 1}/5)...`
          );
          setTimeout(() => subscribeToChannel(channelNum, retryCount + 1), timeout);
          return;
        } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && retryCount >= 5) {
          toast.error('Koneksi terputus. Klik untuk mencoba lagi.', {
            action: {
              label: 'Coba Lagi',
              onClick: () => subscribeToChannel(channelNum, 0),
            },
            duration: Infinity,
          });
          return;
        }

        if (status === 'SUBSCRIBED' && retryCount > 0) {
          console.warn(`[Supabase] Successfully reconnected after ${retryCount} attempt(s).`);
          toast.success('Koneksi radio pulih kembali.');
        }

        if (isSubscribed) {
          const currentStore = usePTTStore.getState();
          const userMeta = currentStore.user;
          const displayName =
            currentStore.infoText || userMeta?.user_metadata?.full_name || 'Pebe Herianto';
          const location = currentStore.locationText;

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
      usePTTStore.setState({
        isConnected: true,
        error: 'Connection failed — operating in offline mode',
      });
    }
  })();
}
