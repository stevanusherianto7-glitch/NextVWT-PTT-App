import { create } from 'zustand';
import { PTTState, WebRTCSignalingPayload } from './types';
import { getSupabase } from '../utils/supabase';
import { checkIfNewUser } from '../utils/constants';
export type { AppUser, ChannelItem, WebRTCSignalingPayload, GuestUser, PTTState } from './types';
import { BRAND } from '../utils/config';
import {
  PttStatePayloadSchema,
  VoiceChunkPayloadSchema,
  WebRTCSignalingPayloadSchema,
  HangUpPayloadSchema,
  ReactionPayloadSchema,
  KickPayloadSchema,
  PresenceMetaSchema,
  safeParseRealtimePayload,
} from './schemas/realtimePayloads';

import {
  safeGetStorage,
  safeSetStorage,
  generateUUID,
  getChannelUUID,
  generateRandomCallSign,
  PERSISTED_KEYS,
  pickPersistedState,
} from './storeUtils';

export {
  safeGetStorage,
  safeSetStorage,
  generateUUID,
  getChannelUUID,
  generateRandomCallSign,
  PERSISTED_KEYS,
  pickPersistedState,
};

// [F-04] Inline payload interfaces replaced by Zod schemas in ./schemas/realtimePayloads.ts
// Types are now inferred from the schemas: PttStatePayload, PresenceMeta, etc.

import { activeChannelSubscription, setActiveChannelSubscription } from './subscription';
// ─── Supabase Channel Subscription ───────────────────────────────────────────

function subscribeToChannel(channelNum: number, retryCount = 0) {
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
      const channelInstance = supabase.channel(`${BRAND.supabaseRoomPrefix}${channelNum}`, {
        config: {
          presence: {
            key: store.userId || 'anonymous',
          },
        },
      });
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
            }
          >();
          rawList.forEach((raw) => {
            const p = safeParseRealtimePayload(PresenceMetaSchema, raw, 'presence');
            if (p && p.userId) {
              uniqueUsersMap.set(p.userId, {
                userId: p.userId,
                displayName: p.displayName || 'Anonim',
                callSign: p.callSign || '2DYUA',
                location: p.location || 'BANDUNG, JABAR',
                avatarUrl: p.avatarUrl || '',
                isNewUser: checkIfNewUser(p.createdAt),
              });
            }
          });
          const users = Array.from(uniqueUsersMap.values());
          usePTTStore.setState({ activeUsers: users });
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
              usePTTStore.setState({
                activeTransmitter: {
                  userId: payload.userId,
                  displayName: payload.displayName,
                  callSign: payload.callSign,
                  role: payload.role,
                  isNewUser: payload.isNewUser,
                },
              });
            } else {
              const currentTx = usePTTStore.getState().activeTransmitter;
              if (currentTx && currentTx.userId === payload.userId) {
                usePTTStore.setState({ activeTransmitter: null });
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
            // Ignore our own broadcasted voice chunks to avoid feedback loop
            if (payload.userId !== state.userId && state.onVoiceChunkReceived) {
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
            if (payload.senderUserId !== state.userId && state.onWebRTCSignalingReceived) {
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
        });

      channelInstance.subscribe((status: string) => {
        if (activeChannelSubscription !== channelInstance) return;
        const isSubscribed = status === 'SUBSCRIBED';
        if (isSubscribed) {
          usePTTStore.setState({ isConnected: true });
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

            channelInstance.track({
              userId: currentStore.userId,
              displayName: displayName,
              callSign: currentStore.callSign || '2DYUA',
              location: location,
              avatarUrl: avatarUrl,
              createdAt: userMeta?.created_at,
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

import { createAuthSlice } from './slices/createAuthSlice';
import { createUISlice } from './slices/createUISlice';
import { createChannelSlice } from './slices/createChannelSlice';
import { createSettingsSlice } from './slices/createSettingsSlice';
import { createWebRTCSlice } from './slices/createWebRTCSlice';

// ─── Store ────────────────────────────────────────────────────────────────────
export const usePTTStore = create<PTTState>()((set, get, store) => ({
  ...createAuthSlice(set, get, store),
  ...createUISlice(set, get, store),
  ...createChannelSlice(set, get, store),
  ...createSettingsSlice(set, get, store),
  ...createWebRTCSlice(set, get, store),

  subscribeToChannel: (channelNum: number) => {
    subscribeToChannel(channelNum, 0);
  },
}));
