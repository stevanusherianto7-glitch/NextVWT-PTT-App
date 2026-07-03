import { usePTTStore } from '../../store/usePTTStore';
import { safeParseRealtimePayload } from '../../store/schemas/realtimePayloads';
import {
  VoiceChunkPayloadSchema,
  WebRTCSignalingPayloadSchema,
} from '../../store/schemas/realtimePayloads';
import type { WebRTCSignalingPayload } from '../../store/types';

export function handleVoiceChunk(rawPayload: unknown) {
  const payload = safeParseRealtimePayload(VoiceChunkPayloadSchema, rawPayload, 'voice_chunk');
  if (!payload) return;
  const state = usePTTStore.getState();
  const isSelf =
    payload.userId === state.userId && (!payload.callSign || payload.callSign === state.callSign);
  if (!isSelf && state.onVoiceChunkReceived) {
    state.onVoiceChunkReceived(payload.base64);
  }
}

export function handleWebRTCSignaling(rawPayload: unknown) {
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
    if (payload.targetUserId && payload.targetUserId !== state.userId) return;
    if (payload.targetCallSign && payload.targetCallSign !== state.callSign) return;
    state.onWebRTCSignalingReceived(payload as WebRTCSignalingPayload);
  }
}
