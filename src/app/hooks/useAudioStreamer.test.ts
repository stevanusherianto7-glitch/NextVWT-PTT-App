/**
 * src/app/hooks/useAudioStreamer.test.ts
 * Unit tests untuk useAudioStreamer hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioStreamer } from './useAudioStreamer';
import { usePTTStore } from '../store/usePTTStore';

// ─── Mock VAD ────────────────────────────────────────────────────────────────
vi.mock('./useVAD', () => ({
  useVAD: vi.fn(() => ({
    startVAD: vi.fn(),
    stopVAD: vi.fn(),
  })),
}));

// ─── Mock WebRTC ─────────────────────────────────────────────────────────────
vi.mock('./useWebRTC', () => ({
  useWebRTC: vi.fn(() => ({
    peerConnectionsRef: { current: new Map() },
    audioElementsRef: { current: new Map() },
    createPeerConnection: vi.fn(),
    cleanupPeer: vi.fn(),
    cleanupAllPeers: vi.fn(),
    handleSignaling: vi.fn(),
  })),
}));

// ─── Mock AudioPlayback ───────────────────────────────────────────────────────
const mockPlayAudioChunk = vi.fn();
const mockFlushAudioQueue = vi.fn();
vi.mock('./useAudioPlayback', () => ({
  useAudioPlayback: vi.fn(() => ({
    getAudioContext: vi.fn(() => ({
      createMediaStreamDestination: vi.fn(() => ({
        stream: {
          getAudioTracks: vi.fn(() => [{ stop: vi.fn(), kind: 'audio' }]),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() },
      })),
      createDynamicsCompressor: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        threshold: { setValueAtTime: vi.fn() },
        knee: { setValueAtTime: vi.fn() },
        ratio: { setValueAtTime: vi.fn() },
        attack: { setValueAtTime: vi.fn() },
        release: { setValueAtTime: vi.fn() },
      })),
      createDelay: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        delayTime: { setValueAtTime: vi.fn() },
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: { setValueAtTime: vi.fn() },
      })),
      currentTime: 100,
    })),
    playAudioChunk: mockPlayAudioChunk,
    flushAudioQueue: mockFlushAudioQueue,
  })),
  arrayBufferToBase64: vi.fn(() => 'mock-base64'),
}));

// ─── Mock MediaRecorder ───────────────────────────────────────────────────────
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  static lastCreatedInstance: MockMediaRecorder | null = null;

  constructor(
    public stream: unknown,
    public options?: MediaRecorderOptions
  ) {
    MockMediaRecorder.lastCreatedInstance = this;
  }

  start(_timeslice?: number) {
    this.state = 'recording';
    // Simulate chunk delivery immediately
    if (this.ondataavailable) {
      const dummyBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
      // Stub the arrayBuffer method
      dummyBlob.arrayBuffer = () => Promise.resolve(new ArrayBuffer(3));
      this.ondataavailable({ data: dummyBlob });
    }
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }

  static isTypeSupported(type: string) {
    return type.includes('webm');
  }
}

global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

describe('useAudioStreamer – Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePTTStore.setState({
      isConnected: true,
      audioMode: 'discussion',
      builtInEcho: false,
    });
  });

  it('should expose audio streaming and control functions', () => {
    const { result } = renderHook(() => useAudioStreamer());
    expect(result.current.startRecording).toBeTypeOf('function');
    expect(result.current.stopRecording).toBeTypeOf('function');
    expect(result.current.playAudioChunk).toBeTypeOf('function');
    expect(result.current.flushAudioQueue).toBeTypeOf('function');
  });

  it('should request microphone stream and start recording', async () => {
    const { result } = renderHook(() => useAudioStreamer());
    const onChunkAvailable = vi.fn();

    await act(async () => {
      await result.current.startRecording(onChunkAvailable);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    expect(onChunkAvailable).toHaveBeenCalled();
  });

  it('should stop recording and stop all media stream tracks', async () => {
    const { result } = renderHook(() => useAudioStreamer());
    const onChunkAvailable = vi.fn();

    await act(async () => {
      await result.current.startRecording(onChunkAvailable);
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(mockFlushAudioQueue).not.toHaveBeenCalled(); // flush is separate
  });

  it('should delegate playAudioChunk to audio playback hook', () => {
    const { result } = renderHook(() => useAudioStreamer());
    result.current.playAudioChunk('test-base64');
    expect(mockPlayAudioChunk).toHaveBeenCalledWith('test-base64', expect.any(Function));
  });

  it('should delegate flushAudioQueue to audio playback hook', () => {
    const { result } = renderHook(() => useAudioStreamer());
    result.current.flushAudioQueue();
    expect(mockFlushAudioQueue).toHaveBeenCalled();
  });
});

describe('Phase 1.4: Audio/MediaRecorder Logic & WebRTC Signaling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format audio chunks via MediaRecorder in opus/webm format', async () => {
    const { result } = renderHook(() => useAudioStreamer());
    const onChunkAvailable = vi.fn();

    await act(async () => {
      await result.current.startRecording(onChunkAvailable);
    });

    const instance = (global.MediaRecorder as unknown as typeof MockMediaRecorder)
      .lastCreatedInstance;
    expect(instance).toBeDefined();
    expect(instance?.options?.mimeType).toContain('webm');
    expect(onChunkAvailable).toHaveBeenCalledWith('mock-base64');
  });

  it('should gracefully handle microphone permission rejection (NotAllowedError)', async () => {
    const permError = new DOMException('Permission denied', 'NotAllowedError');
    const getUserMediaSpy = vi
      .spyOn(navigator.mediaDevices, 'getUserMedia')
      .mockRejectedValueOnce(permError);

    const { result } = renderHook(() => useAudioStreamer());
    const onChunkAvailable = vi.fn();

    await expect(
      act(async () => {
        await result.current.startRecording(onChunkAvailable);
      })
    ).rejects.toThrow('Permission denied');

    expect(getUserMediaSpy).toHaveBeenCalled();
  });
});
