import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadioAudioEngine } from './useRadioAudioEngine';

// Hoisted mocks for vitest
const mockPlayChirpSound = vi.hoisted(() => vi.fn());

// Mock Zustand store
vi.mock('../store/usePTTStore', () => {
  const state = {
    channelNumber: 1,
    isConnected: true,
    userId: 'test-user',
    setTransmitting: vi.fn(),
    setOnVoiceChunkReceived: vi.fn(),
    broadcastVoiceChunk: vi.fn(),
    setShowFeedbackModal: vi.fn(),
    setConnected: vi.fn(),
    subscribeToChannel: vi.fn(),
    activeUsers: [],
    activeTransmitter: null,
    progress: 0,
    isTransmitting: false,
    isPowerOn: false,
    isScanning: false,
    channel: 1,
    status: 'idle',
    setProgress: vi.fn(),
    lastFeedbackTime: 0,
  };
  const fn = Object.assign(
    vi.fn((selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state)),
    { getState: vi.fn(() => state), setState: vi.fn(), subscribe: vi.fn() }
  );
  return { usePTTStore: fn };
});

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
  LiveKitAudioTransport: {},
}));

vi.mock('../services/livekitToken', () => ({
  fetchLiveKitToken: vi.fn(),
}));

vi.mock('./useSfuTransport', () => ({
  useSfuTransport: vi.fn(),
}));

vi.mock('./useNetworkConnection', () => ({
  useNetworkConnection: vi.fn(),
}));

vi.mock('./useStaleTransmitterWatchdog', () => ({
  useStaleTransmitterWatchdog: vi.fn(() => ({ resetWatchdogRef: { current: null } })),
}));

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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns handleUserListChange function', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));
    expect(typeof result.current.handleUserListChange).toBe('function');
  });

  it('handleUserListChange: plays join chirp when new users join', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));

    // First call = initial state (no chirp)
    act(() => {
      result.current.handleUserListChange(['user-1']);
    });
    expect(mockPlayChirpSound).not.toHaveBeenCalled();

    // Second call = new user joins
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });

    expect(mockPlayChirpSound).toHaveBeenCalledWith(true);
  });

  it('handleUserListChange: plays leave chirp when users leave', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));

    // First call sets initial state
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });

    // Second call detects user left
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

    // First call = no chirp
    expect(mockPlayChirpSound).not.toHaveBeenCalled();
  });

  it('chirp not played when list unchanged', () => {
    const { result } = renderHook(() => useRadioAudioEngine(mockArgs));

    // First call = initial state
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });
    // Second call = same list, no chirp
    act(() => {
      result.current.handleUserListChange(['user-1', 'user-2']);
    });

    expect(mockPlayChirpSound).not.toHaveBeenCalled();
  });
});
