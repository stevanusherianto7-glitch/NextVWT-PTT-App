import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  handlePttState,
  startActiveTransmitterWatchdog,
  clearActiveTransmitterWatchdog,
} from '../../services/handlers/pttHandler';
import { handleVoiceChunk, handleWebRTCSignaling } from '../../services/handlers/voiceHandler';
import { usePTTStore } from '../../store/usePTTStore';

function seedStore(overrides: Record<string, unknown> = {}) {
  usePTTStore.setState({
    userId: 'me-1',
    callSign: 'AB12CD',
    isTransmitting: false,
    activeTransmitter: null,
    progress: 0,
    lastTransmitTime: 0,
    myChannelRole: 'guest',
    onVoiceChunkReceived: null,
    onWebRTCSignalingReceived: null,
    setTransmitting: (v: boolean) => usePTTStore.setState({ isTransmitting: v }),
    ...overrides,
  });
}

describe('pttHandler.handlePttState', () => {
  beforeEach(() => seedStore());
  afterEach(() => clearActiveTransmitterWatchdog());

  it('ignores a malformed payload (invalid schema)', () => {
    handlePttState({ userId: 123 }); // not a string -> schema fail
    expect(usePTTStore.getState().activeTransmitter).toBeNull();
  });

  it('sets activeTransmitter when another user starts transmitting', () => {
    handlePttState({
      userId: 'other-1',
      displayName: 'Budi',
      callSign: 'ZZ99ZZ',
      isTransmitting: true,
      role: 'guest',
    });
    const tx = usePTTStore.getState().activeTransmitter;
    expect(tx?.userId).toBe('other-1');
    expect(tx?.displayName).toBe('Budi');
  });

  it('does NOT yield to same userId+callSign (self echo)', () => {
    seedStore({ isTransmitting: true });
    handlePttState({
      userId: 'me-1',
      displayName: 'Me',
      callSign: 'AB12CD',
      isTransmitting: true,
      role: 'guest',
    });
    // self -> should not replace self state; still transmitting
    expect(usePTTStore.getState().isTransmitting).toBe(true);
    expect(usePTTStore.getState().activeTransmitter?.userId).toBe('me-1');
  });

  it('MODERATOR OVERRIDE: higher-priority transmitter preempts my TX', () => {
    seedStore({ isTransmitting: true, myChannelRole: 'guest' });
    handlePttState({
      userId: 'mod-1',
      displayName: 'Operator X',
      callSign: 'OP00OP',
      isTransmitting: true,
      role: 'operator',
    });
    expect(usePTTStore.getState().isTransmitting).toBe(false);
    expect(usePTTStore.getState().activeTransmitter?.userId).toBe('mod-1');
  });

  it('COLLISION: equal priority, local started later -> I lose TX', () => {
    seedStore({ isTransmitting: true, myChannelRole: 'guest', lastTransmitTime: 5000 });
    handlePttState({
      userId: 'peer-1',
      displayName: 'Peer',
      callSign: 'PP11PP',
      isTransmitting: true,
      role: 'guest',
      timestamp: 2000, // remote started earlier -> local (5000) loses
    });
    expect(usePTTStore.getState().isTransmitting).toBe(false);
  });

  it('COLLISION tie-break: equal time, remote userId < mine -> I keep TX', () => {
    seedStore({ isTransmitting: true, myChannelRole: 'guest', lastTransmitTime: 1000 });
    handlePttState({
      userId: 'aaaa', // < 'me-1'
      displayName: 'A',
      callSign: 'AA00AA',
      isTransmitting: true,
      role: 'guest',
      timestamp: 1000,
    });
    expect(usePTTStore.getState().isTransmitting).toBe(false); // lost because 'aaaa' < 'me-1'
  });

  it('clears activeTransmitter when the transmitter stops (matching id)', () => {
    seedStore({
      activeTransmitter: { userId: 'other-1', displayName: 'Budi', callSign: 'ZZ99ZZ' } as never,
    });
    handlePttState({
      userId: 'other-1',
      displayName: 'Budi',
      callSign: 'ZZ99ZZ',
      isTransmitting: false,
    });
    expect(usePTTStore.getState().activeTransmitter).toBeNull();
  });
});

describe('pttHandler watchdog', () => {
  afterEach(() => clearActiveTransmitterWatchdog());

  it('force-clears stale transmitter after timeout', () => {
    vi.useFakeTimers();
    seedStore({
      activeTransmitter: { userId: 'x', displayName: 'X', callSign: 'XX00XX' } as never,
    });
    startActiveTransmitterWatchdog('x', 'X');
    vi.advanceTimersByTime(60000);
    expect(usePTTStore.getState().activeTransmitter).toBeNull();
    vi.useRealTimers();
  });
});

describe('voiceHandler.handleVoiceChunk', () => {
  beforeEach(() => seedStore());

  it('ignores malformed voice payload', () => {
    const cb = vi.fn();
    usePTTStore.setState({ onVoiceChunkReceived: cb });
    handleVoiceChunk({ base64: 123 }); // wrong type
    expect(cb).not.toHaveBeenCalled();
  });

  it('plays remote chunk (not self)', () => {
    const cb = vi.fn();
    usePTTStore.setState({ onVoiceChunkReceived: cb });
    handleVoiceChunk({ userId: 'other', callSign: 'ZZ99ZZ', base64: 'abc' });
    expect(cb).toHaveBeenCalledWith('abc');
  });

  it('drops self chunk (same userId+callSign)', () => {
    const cb = vi.fn();
    usePTTStore.setState({ onVoiceChunkReceived: cb });
    handleVoiceChunk({ userId: 'me-1', callSign: 'AB12CD', base64: 'selfdata' });
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('voiceHandler.handleWebRTCSignaling', () => {
  beforeEach(() => seedStore());

  it('drops self signaling', () => {
    const cb = vi.fn();
    usePTTStore.setState({ onWebRTCSignalingReceived: cb });
    handleWebRTCSignaling({
      senderUserId: 'me-1',
      senderCallSign: 'AB12CD',
      type: 'offer',
      data: { type: 'offer', sdp: 'x' },
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('delivers when no target specified', () => {
    const cb = vi.fn();
    usePTTStore.setState({ onWebRTCSignalingReceived: cb });
    handleWebRTCSignaling({
      senderUserId: 'peer',
      senderCallSign: 'PP11PP',
      type: 'offer',
      data: { type: 'offer', sdp: 'x' },
    });
    expect(cb).toHaveBeenCalled();
  });

  it('drops when targetUserId differs from me', () => {
    const cb = vi.fn();
    usePTTStore.setState({ onWebRTCSignalingReceived: cb });
    handleWebRTCSignaling({
      senderUserId: 'peer',
      senderCallSign: 'PP11PP',
      targetUserId: 'someone-else',
      type: 'offer',
      data: { type: 'offer', sdp: 'x' },
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('delivers when targetUserId matches me', () => {
    const cb = vi.fn();
    usePTTStore.setState({ onWebRTCSignalingReceived: cb });
    handleWebRTCSignaling({
      senderUserId: 'peer',
      senderCallSign: 'PP11PP',
      targetUserId: 'me-1',
      type: 'offer',
      data: { type: 'offer', sdp: 'x' },
    });
    expect(cb).toHaveBeenCalled();
  });
});
