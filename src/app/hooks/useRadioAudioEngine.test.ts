import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadioAudioEngine } from './useRadioAudioEngine';

// ── Hoisted mocks (vitest hoists vi.mock + vi.hoisted above imports) ──────────
const mockPlayChirpSound = vi.hoisted(() => vi.fn());

const storeStateRef = vi.hoisted(() => ({
  state: {
    channelNumber: 1,
    isConnected: true,
    userId: 'test-user',
    setTransmitting: () => {},
    setOnVoiceChunkReceived: () => {},
    broadcastVoiceChunk: () => {},
    setShowFeedbackModal: () => {},
    setConnected: () => {},
    subscribeToChannel: () => {},
    activeUsers: [],
    activeTransmitter: null,
    progress: 0,
    isTransmitting: false,
    isPowerOn: false,
    isScanning: false,
    channel: 1,
    status: 'idle',
    setProgress: () => {},
    lastFeedbackTime: 0,
  },
}));

const usePTTStoreMock = vi.hoisted(() => {
  const fn = (selector?: (s: any) => any) => {
    const s = storeStateRef.state;
    return selector ? selector(s) : s;
  };
  fn.getState = () => storeStateRef.state;
  fn.setState = (partial: any) => {
    Object.assign(storeStateRef.state, partial);
  };
  fn.subscribe = () => () => {};
  return fn;
});

vi.mock('../store/usePTTStore', () => ({ usePTTStore: usePTTStoreMock }));

vi.mock('./useAudioStreamer', () => ({
  useAudioStreamer: () => ({
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    playAudioChunk: vi.fn(),
    flushAudioQueue: vi.fn(),
  }),
}));

vi.mock('./useAudioPlayback', () => ({
  base64ToArrayBuffer: vi.fn(),
  arrayBufferToBase64: vi.fn(),
}));

vi.mock('../utils/radioSound', () => ({
  playChirpSound: mockPlayChirpSound,
}));

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

vi.mock('../utils/config', () => ({
  USE_SFU: false,
  BRAND: { livekitUrl: 'wss://test.livekit.cloud' },
}));

vi.mock('../services/livekitAudioTransport', () => ({
  createLiveKitTransport: vi.fn(),
  LiveKitAudioTransport: class {},
}));

vi.mock('../services/livekitToken', () => ({
  fetchLiveKitToken: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
const mockArgs = {
  isPowerOn: true,
  isTransmitting: false,
  isScanning: false,
  channel: 1,
  activeTransmitter: null,
  status: 'idle',
  setProgress: vi.fn(),
};

describe('useRadioAudioEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayChirpSound.mockReset();
    vi.useFakeTimers();
    Object.assign(storeStateRef.state, {
      channelNumber: 1,
      isConnected: true,
      userId: 'test-user',
      activeUsers: [],
      activeTransmitter: null,
      progress: 0,
      isTransmitting: false,
      isPowerOn: false,
      isScanning: false,
      channel: 1,
      status: 'idle',
      lastFeedbackTime: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a handleUserListChange function', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));
    expect(typeof result.current.handleUserListChange).toBe('function');
  });

  it('handleUserListChange: plays join chirp when new users join (2nd call)', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));
    // 1st call = initial state (no chirp)
    act(() => {
      result.current.handleUserListChange(['user-1']);
    });
    // 2nd call adds a new user → join chirp
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });
    expect(mockPlayChirpSound).toHaveBeenCalledWith(true);
  });

  it('handleUserListChange: plays leave chirp when users leave', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });
    act(() => {
      result.current.handleUserListChange(['user-1']);
    });
    expect(mockPlayChirpSound).toHaveBeenCalledWith(false);
  });

  it('handleUserListChange: no chirp on first render (initial state)', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));
    act(() => {
      result.current.handleUserListChange(['user-1']);
    });
    expect(mockPlayChirpSound).not.toHaveBeenCalled();
  });

  it('chirp not replayed when identical list repeated after a join', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));
    act(() => {
      result.current.handleUserListChange(['user-1']);
    });
    // join → 1 chirp
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });
    // identical list again → no extra chirp
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });
    expect(mockPlayChirpSound).toHaveBeenCalledTimes(1);
  });
});
