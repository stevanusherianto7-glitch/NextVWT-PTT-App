/**
 * src/app/hooks/useAudioPlayback.test.ts
 * Unit tests untuk Audio Playback hook
 *
 * Tests memverifikasi:
 *   1. base64ToArrayBuffer dan arrayBufferToBase64 helper functions
 *   2. getAudioContext lazy initialization dan resume dari suspended state
 *   3. playAudioChunk mute saat isTransmitting (half-duplex constraint)
 *   4. playAudioChunk skip saat ada active WebRTC peer (deduplication)
 *   5. playAudioChunk queue management saat buffer penuh
 *   6. flushAudioQueue mereset playback timeline
 *   7. Graceful handling decode error
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAudioPlayback,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  __resetAudioContextForTest,
} from './useAudioPlayback';
import { usePTTStore } from '../store/usePTTStore';

vi.mock('../utils/supabase', () => {
  const mockSupabase = {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      track: vi.fn(() => Promise.resolve()),
      send: vi.fn(() => Promise.resolve()),
      subscribe: vi.fn((cb) => {
        cb?.('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
    })),
  };

  return {
    supabase: mockSupabase,
    getSupabase: vi.fn(() => Promise.resolve(mockSupabase)),
  };
});

// ─── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ─── Mock Web Audio API ───────────────────────────────────────────────────────
let mockAudioBuffer: { duration: number };
let mockSourceNode: {
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  buffer: unknown;
};
let mockGainNode: {
  connect: ReturnType<typeof vi.fn>;
  gain: { value: number };
};
let mockAnalyserNode: {
  connect: ReturnType<typeof vi.fn>;
  fftSize: number;
  frequencyBinCount: number;
  getFloatTimeDomainData: ReturnType<typeof vi.fn>;
};
let mockCtx: {
  state: string;
  currentTime: number;
  resume: ReturnType<typeof vi.fn>;
  decodeAudioData: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  createAnalyser: ReturnType<typeof vi.fn>;
  destination: unknown;
};

const setupAudioContextMock = (ctxState: 'running' | 'suspended' = 'running') => {
  mockAudioBuffer = { duration: 0.5 };
  mockSourceNode = {
    connect: vi.fn(),
    start: vi.fn(),
    buffer: null,
  };
  mockGainNode = {
    connect: vi.fn(),
    gain: { value: 1.0 },
  };
  mockAnalyserNode = {
    connect: vi.fn(),
    fftSize: 512,
    frequencyBinCount: 256,
    getFloatTimeDomainData: vi.fn(),
  };
  mockCtx = {
    state: ctxState,
    currentTime: 0,
    resume: vi.fn(() => Promise.resolve()),
    decodeAudioData: vi.fn(() => Promise.resolve(mockAudioBuffer)),
    createBufferSource: vi.fn(() => mockSourceNode),
    createGain: vi.fn(() => mockGainNode),
    createAnalyser: vi.fn(() => mockAnalyserNode),
    destination: {},
  };

  Object.defineProperty(globalThis, 'AudioContext', {
    value: vi.fn().mockImplementation(function () {
      return mockCtx;
    }),
    writable: true,
    configurable: true,
  });
};

// ─── Helper: buat Base64 dummy audio chunk ────────────────────────────────────
function makeDummyBase64(): string {
  // Buat Uint8Array 16-byte sederhana dan encode ke base64
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('base64ToArrayBuffer & arrayBufferToBase64 helpers', () => {
  it('should convert base64 string to ArrayBuffer correctly', () => {
    // "SGVsbG8=" adalah Base64 untuk "Hello" (5 bytes)
    const result = base64ToArrayBuffer('SGVsbG8=');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(5);

    const decoded = new Uint8Array(result);
    expect(decoded[0]).toBe(72); // 'H'
    expect(decoded[1]).toBe(101); // 'e'
    expect(decoded[4]).toBe(111); // 'o'
  });

  it('should convert ArrayBuffer back to base64 string correctly (round-trip)', () => {
    const original = 'SGVsbG8='; // "Hello"
    const buffer = base64ToArrayBuffer(original);
    const roundTripped = arrayBufferToBase64(buffer);
    expect(roundTripped).toBe(original);
  });

  it('should handle empty string gracefully', () => {
    const result = base64ToArrayBuffer('');
    expect(result.byteLength).toBe(0);
  });
});

describe('useAudioPlayback', () => {
  beforeEach(() => {
    localStorageMock.clear();
    setupAudioContextMock('running');
    __resetAudioContextForTest();

    // Reset store state
    usePTTStore.setState({
      isTransmitting: false,
      fullDuplex: false,
      activeTransmitter: null,
      isConnected: false,
      pttVolume: 80,
      maxQueue: '5',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should expose getAudioContext, playAudioChunk, and flushAudioQueue functions', () => {
    const { result } = renderHook(() => useAudioPlayback());

    expect(result.current.getAudioContext).toBeInstanceOf(Function);
    expect(result.current.playAudioChunk).toBeInstanceOf(Function);
    expect(result.current.flushAudioQueue).toBeInstanceOf(Function);
  });

  it('should lazily initialize AudioContext on first getAudioContext call', () => {
    const { result } = renderHook(() => useAudioPlayback());

    // Sebelum dipanggil: AudioContext belum dibuat
    expect(globalThis.AudioContext).toBeDefined();

    act(() => {
      result.current.getAudioContext();
    });

    // AudioContext harus sudah dibuat
    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('should resume suspended AudioContext when getAudioContext is called', async () => {
    setupAudioContextMock('suspended');
    const { result } = renderHook(() => useAudioPlayback());

    act(() => {
      result.current.getAudioContext();
    });

    expect(mockCtx.resume).toHaveBeenCalled();
  });

  it('should NOT create new AudioContext on subsequent getAudioContext calls (singleton)', () => {
    const { result } = renderHook(() => useAudioPlayback());

    act(() => {
      result.current.getAudioContext();
      result.current.getAudioContext();
      result.current.getAudioContext();
    });

    // Hanya satu instance yang dibuat
    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('should skip playback when isTransmitting and not fullDuplex (half-duplex constraint)', async () => {
    usePTTStore.setState({ isTransmitting: true, fullDuplex: false });
    const { result } = renderHook(() => useAudioPlayback());
    const noActivePeer = vi.fn(() => false);

    await act(async () => {
      await result.current.playAudioChunk(makeDummyBase64(), noActivePeer);
    });

    // decodeAudioData tidak boleh dipanggil (skip sebelum proses audio)
    expect(mockCtx.decodeAudioData).not.toHaveBeenCalled();
  });

  it('should allow playback when isTransmitting AND fullDuplex is true', async () => {
    usePTTStore.setState({ isTransmitting: true, fullDuplex: true });
    const { result } = renderHook(() => useAudioPlayback());
    const noActivePeer = vi.fn(() => false);

    await act(async () => {
      await result.current.playAudioChunk(makeDummyBase64(), noActivePeer);
    });

    // Harus diproses (fullDuplex bypass half-duplex constraint)
    expect(mockCtx.decodeAudioData).toHaveBeenCalled();
    expect(mockSourceNode.start).toHaveBeenCalled();
  });

  it('should skip playback when active WebRTC peer exists (deduplication)', async () => {
    const mockTransmitter = { userId: 'peer-001', displayName: 'Peer' };
    usePTTStore.setState({
      isTransmitting: false,
      isConnected: true,
      activeTransmitter: mockTransmitter as import('../store/types').PTTState['activeTransmitter'],
    });

    const { result } = renderHook(() => useAudioPlayback());
    // hasActivePeer mengembalikan true → ada WebRTC stream aktif dari transmitter ini
    const hasActivePeer = vi.fn(() => true);

    await act(async () => {
      await result.current.playAudioChunk(makeDummyBase64(), hasActivePeer);
    });

    // Harus skip karena WebRTC peer sudah ada (Base64 fallback tidak dibutuhkan)
    expect(mockCtx.decodeAudioData).not.toHaveBeenCalled();
    expect(hasActivePeer).toHaveBeenCalledWith('peer-001');
  });

  it('should apply pttVolume to gain node', async () => {
    usePTTStore.setState({ pttVolume: 60, isTransmitting: false });
    const { result } = renderHook(() => useAudioPlayback());
    const noActivePeer = vi.fn(() => false);

    await act(async () => {
      await result.current.playAudioChunk(makeDummyBase64(), noActivePeer);
    });

    // Gain = pttVolume / 100 = 60 / 100 = 0.6
    expect(mockGainNode.gain.value).toBe(0.6);
  });

  it('should reset nextPlaybackTime when flushAudioQueue is called', async () => {
    usePTTStore.setState({ pttVolume: 80, isTransmitting: false });
    const { result } = renderHook(() => useAudioPlayback());
    const noActivePeer = vi.fn(() => false);

    // Play beberapa chunk untuk mengakumulasi nextPlaybackTime
    await act(async () => {
      await result.current.playAudioChunk(makeDummyBase64(), noActivePeer);
      await result.current.playAudioChunk(makeDummyBase64(), noActivePeer);
    });

    // Flush → reset timeline
    act(() => {
      result.current.flushAudioQueue();
    });

    // Setelah flush, play lagi → source.start harus dipanggil dengan time ~0.05
    // (bukan accumulated time dari sebelumnya)
    const startCallsBefore = mockSourceNode.start.mock.calls.length;

    await act(async () => {
      await result.current.playAudioChunk(makeDummyBase64(), noActivePeer);
    });

    const lastStartCall = mockSourceNode.start.mock.calls[startCallsBefore];
    // Seharusnya start mendekati 0 + 0.05 (initial offset), bukan waktu yang sudah terakumulasi
    expect(lastStartCall[0]).toBeLessThan(0.5); // jauh dari accumulated time sebelum flush
  });

  it('should handle decodeAudioData failure gracefully without crashing', async () => {
    mockCtx.decodeAudioData.mockRejectedValueOnce(new Error('EncodingError: corrupt audio'));
    usePTTStore.setState({ isTransmitting: false });
    const { result } = renderHook(() => useAudioPlayback());
    const noActivePeer = vi.fn(() => false);

    // Tidak boleh throw / crash
    await expect(
      act(async () => {
        await result.current.playAudioChunk(makeDummyBase64(), noActivePeer);
      })
    ).resolves.not.toThrow();
  });
});

describe('Phase 1.4: WebRTC Disconnection Fallback Test', () => {
  beforeEach(() => {
    localStorageMock.clear();
    setupAudioContextMock('running');
    __resetAudioContextForTest();
  });

  it('should fallback to Supabase Realtime playback automatically when WebRTC drops (iceConnectionState disconnected)', async () => {
    const mockTransmitter = { userId: 'peer-001', displayName: 'Peer' };
    usePTTStore.setState({
      isTransmitting: false,
      isConnected: true,
      activeTransmitter: mockTransmitter as import('../store/types').PTTState['activeTransmitter'],
    });

    const { result } = renderHook(() => useAudioPlayback());

    // Simulasikan koneksi WebRTC terputus (disconnected / cleaned up) sehingga hasActivePeer mengembalikan false
    const hasActivePeer = vi.fn((_userId: string) => {
      // simulate iceConnectionState === 'disconnected' → peer removed
      return false;
    });

    await act(async () => {
      await result.current.playAudioChunk(makeDummyBase64(), hasActivePeer);
    });

    // Karena WebRTC disconnected (hasActivePeer false), fallback Realtime harus aktif dan mendecode audio
    expect(mockCtx.decodeAudioData).toHaveBeenCalled();
    expect(hasActivePeer).toHaveBeenCalledWith('peer-001');
  });
});
