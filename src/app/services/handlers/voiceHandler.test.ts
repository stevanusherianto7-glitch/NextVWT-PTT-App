import { describe, it, expect, vi, beforeEach } from 'vitest';

const setState = vi.fn();
const getState = vi.fn();
vi.mock('../../store/usePTTStore', () => ({
  usePTTStore: {
    getState: (...args: any[]) => getState(...args),
    setState: (...args: any[]) => setState(...args),
  },
}));

const safeParse = vi.fn();
vi.mock('../../store/schemas/realtimePayloads', () => ({
  safeParseRealtimePayload: (...args: any[]) => safeParse(...args),
  VoiceChunkPayloadSchema: 'VoiceChunkPayloadSchema',
  WebRTCSignalingPayloadSchema: 'WebRTCSignalingPayloadSchema',
}));

import { handleVoiceChunk, handleWebRTCSignaling } from './voiceHandler';

describe('voiceHandler', () => {
  const onVoiceChunkReceived = vi.fn();
  const onWebRTCSignalingReceived = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setState.mockClear();
    getState.mockReturnValue({
      userId: 'me',
      callSign: '2DYUA',
      onVoiceChunkReceived,
      onWebRTCSignalingReceived,
    });
  });

  describe('handleVoiceChunk', () => {
    it('ignores invalid payload', () => {
      safeParse.mockReturnValue(null);
      handleVoiceChunk({ bad: 1 });
      expect(onVoiceChunkReceived).not.toHaveBeenCalled();
    });

    it('delivers chunk for other users', () => {
      safeParse.mockReturnValue({ userId: 'other', base64: 'AABB' });
      handleVoiceChunk({ userId: 'other', base64: 'AABB' });
      expect(onVoiceChunkReceived).toHaveBeenCalledWith('AABB');
    });

    it('drops self chunk (same userId + callSign)', () => {
      safeParse.mockReturnValue({ userId: 'me', callSign: '2DYUA', base64: 'CCCC' });
      handleVoiceChunk({ userId: 'me', callSign: '2DYUA', base64: 'CCCC' });
      expect(onVoiceChunkReceived).not.toHaveBeenCalled();
    });

    it('drops self chunk when callSign missing (treated as self via !callSign)', () => {
      safeParse.mockReturnValue({ userId: 'me', base64: 'DDDD' });
      handleVoiceChunk({ userId: 'me', base64: 'DDDD' });
      expect(onVoiceChunkReceived).not.toHaveBeenCalled();
    });
  });

  describe('handleWebRTCSignaling', () => {
    it('ignores invalid payload', () => {
      safeParse.mockReturnValue(null);
      handleWebRTCSignaling({ bad: 1 });
      expect(onWebRTCSignalingReceived).not.toHaveBeenCalled();
    });

    it('drops self signaling', () => {
      safeParse.mockReturnValue({ senderUserId: 'me', senderCallSign: '2DYUA' });
      handleWebRTCSignaling({ senderUserId: 'me', senderCallSign: '2DYUA' });
      expect(onWebRTCSignalingReceived).not.toHaveBeenCalled();
    });

    it('delivers when targetUserId matches me', () => {
      safeParse.mockReturnValue({ senderUserId: 'other', targetUserId: 'me' });
      handleWebRTCSignaling({ senderUserId: 'other', targetUserId: 'me' });
      expect(onWebRTCSignalingReceived).toHaveBeenCalled();
    });

    it('drops when targetUserId != me', () => {
      safeParse.mockReturnValue({ senderUserId: 'other', targetUserId: 'victim' });
      handleWebRTCSignaling({ senderUserId: 'other', targetUserId: 'victim' });
      expect(onWebRTCSignalingReceived).not.toHaveBeenCalled();
    });

    it('drops when targetCallSign != my callSign', () => {
      safeParse.mockReturnValue({ senderUserId: 'other', targetCallSign: '9ZZZ' });
      handleWebRTCSignaling({ senderUserId: 'other', targetCallSign: '9ZZZ' });
      expect(onWebRTCSignalingReceived).not.toHaveBeenCalled();
    });
  });
});
