import { StateCreator } from 'zustand';
import { PTTState, WebRTCSignalingPayload } from '../types';
import { activeChannelSubscription } from '../subscription';
import { broadcastRateLimiter } from '../../utils/rateLimiter';

export const createWebRTCSlice: StateCreator<
  PTTState,
  [],
  [],
  Pick<
    PTTState,
    | 'onVoiceChunkReceived'
    | 'setOnVoiceChunkReceived'
    | 'broadcastVoiceChunk'
    | 'onWebRTCSignalingReceived'
    | 'setOnWebRTCSignalingReceived'
    | 'broadcastWebRTCSignaling'
  >
> = (set, get) => ({
  onVoiceChunkReceived: null,
  setOnVoiceChunkReceived: (callback) => set({ onVoiceChunkReceived: callback }),
  broadcastVoiceChunk: (base64Chunk) => {
    const state = get();
    if (activeChannelSubscription && state.isConnected && state.isPowerOn) {
      if (!broadcastRateLimiter.canProceed()) {
        console.warn('[Rate Limit] Voice chunk broadcast dropped due to flood control');
        return;
      }
      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'voice_chunk',
        payload: {
          userId: state.userId,
          callSign: state.callSign,
          base64: base64Chunk,
        },
      });
    }
  },

  onWebRTCSignalingReceived: null,
  setOnWebRTCSignalingReceived: (callback) => set({ onWebRTCSignalingReceived: callback }),
  broadcastWebRTCSignaling: (payload: WebRTCSignalingPayload) => {
    const state = get();
    if (activeChannelSubscription && state.isConnected && state.isPowerOn) {
      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'webrtc_signaling',
        payload: {
          ...payload,
          senderCallSign: state.callSign,
        },
      });
    }
  },
});
