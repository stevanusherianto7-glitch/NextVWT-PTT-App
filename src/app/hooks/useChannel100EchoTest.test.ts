/**
 * useChannel100EchoTest.test.ts
 * Test suite untuk memverifikasi fix channel 100 echo test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChannel100EchoTest } from '../hooks/useChannel100EchoTest';

// ── Mock MediaRecorder ────────────────────────────────────────────────────

class MockMediaRecorder {
  state: string = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  private timeslice = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private chunks: Blob[] = [];

  static isTypeSupported(type: string): boolean {
    return type === 'audio/webm;codecs=opus' || type === '';
  }

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions
  ) {}

  start(timeslice?: number) {
    this.state = 'recording';
    this.timeslice = timeslice ?? 0;

    if (this.timeslice > 0) {
      // Simulasikan ondataavailable setiap timeslice ms
      this.interval = setInterval(() => {
        if (this.state !== 'recording') return;
        const fakeBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
        this.chunks.push(fakeBlob);
        this.ondataavailable?.({ data: fakeBlob });
      }, this.timeslice);
    }
  }

  stop() {
    this.state = 'inactive';
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Fire chunk terakhir (simulasi MediaRecorder.stop() behavior)
    const lastBlob = new Blob(['last-chunk'], { type: 'audio/webm' });
    this.ondataavailable?.({ data: lastBlob });

    // Fire onstop SETELAH ondataavailable (ini yang fix bug #2)
    Promise.resolve().then(() => {
      this.onstop?.();
    });
  }
}

vi.stubGlobal('MediaRecorder', MockMediaRecorder);

// ── Mock getUserMedia ─────────────────────────────────────────────────────

const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  configurable: true,
});

const makeFakeStream = () => ({
  getTracks: () => [{ stop: vi.fn(), kind: 'audio', enabled: true }],
  getAudioTracks: () => [{ stop: vi.fn(), enabled: true }],
});

// ── Mock useAudioPlayback ─────────────────────────────────────────────────

const mockPlayAudioChunk = vi.fn().mockResolvedValue(undefined);
const mockFlushAudioQueue = vi.fn();
const mockGetAudioContext = vi.fn().mockReturnValue({
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
});

vi.mock('../hooks/useAudioPlayback', () => ({
  useAudioPlayback: () => ({
    playAudioChunk: mockPlayAudioChunk,
    flushAudioQueue: mockFlushAudioQueue,
    getAudioContext: mockGetAudioContext,
  }),
  arrayBufferToBase64: (buf: ArrayBuffer) => {
    return Buffer.from(buf).toString('base64');
  },
}));

// ── Mock usePTTStore ──────────────────────────────────────────────────────

vi.mock('../store/usePTTStore', () => ({
  usePTTStore: vi.fn((selector: (s: { setTransmitting: (v: boolean) => void }) => unknown) =>
    selector({ setTransmitting: vi.fn() })
  ),
}));

// ── Mock toast ────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useChannel100EchoTest', () => {
  beforeEach(() => {
    mockGetUserMedia.mockResolvedValue(makeFakeStream());
    mockPlayAudioChunk.mockResolvedValue(undefined);
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startEchoCapture()', () => {
    it('harus membuka mic lewat getUserMedia', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
      });

      expect(mockGetUserMedia).toHaveBeenCalledOnce();
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: false }) })
      );
    });

    it('echoCancellation harus false (supaya bisa dengar suara sendiri)', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
      });

      const audioConstraints = mockGetUserMedia.mock.calls[0][0].audio;
      expect(audioConstraints.echoCancellation).toBe(false);
    });

    it('status isCapturing harus true saat rekaman aktif', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
      });

      expect(result.current.echoStatus.isCapturing).toBe(true);
    });

    it('idempoten: panggilan kedua diabaikan', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
        await result.current.startEchoCapture(); // panggil dua kali
      });

      expect(mockGetUserMedia).toHaveBeenCalledOnce(); // hanya satu kali
    });

    it('throw MicPermissionDenied jika getUserMedia throw NotAllowedError', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );

      const { result } = renderHook(() => useChannel100EchoTest());

      await expect(act(async () => result.current.startEchoCapture())).rejects.toThrow(
        'MicPermissionDenied'
      );
    });

    it('throw MicNotFound jika getUserMedia throw NotFoundError', async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error('No mic'), { name: 'NotFoundError' })
      );

      const { result } = renderHook(() => useChannel100EchoTest());

      await expect(act(async () => result.current.startEchoCapture())).rejects.toThrow(
        'MicNotFound'
      );
    });

    it('status kembali ke default jika getUserMedia gagal', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Mic error'));

      const { result } = renderHook(() => useChannel100EchoTest());

      try {
        await act(async () => result.current.startEchoCapture());
      } catch {
        /* expected */
      }

      expect(result.current.echoStatus.isCapturing).toBe(false);
      expect(result.current.echoStatus.hasChunks).toBe(false);
    });
  });

  describe('stopEchoAndPlayback()', () => {
    it('FIX BUG #2: playback dimulai SETELAH onstop (bukan setTimeout)', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      // Start capture
      await act(async () => {
        await result.current.startEchoCapture();
      });

      // Advance timers untuk trigger beberapa chunks via timeslice
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Stop dan tunggu onstop + playback delay
      await act(async () => {
        result.current.stopEchoAndPlayback();
        // Flush microtask queue (Promise.resolve().then in MockMediaRecorder.stop)
        await Promise.resolve();
        await Promise.resolve();
        vi.advanceTimersByTime(300); // PRE_PLAYBACK_DELAY_MS
        await Promise.resolve();
      });

      // playAudioChunk harus dipanggil (chunks ada)
      expect(mockPlayAudioChunk).toHaveBeenCalled();
    });

    it('status isPlayingBack true saat playback berlangsung', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
        vi.advanceTimersByTime(200); // buat beberapa chunks
      });

      // Set playAudioChunk lambat (simulasi audio panjang)
      mockPlayAudioChunk.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      await act(async () => {
        result.current.stopEchoAndPlayback();
        await Promise.resolve();
        await Promise.resolve();
        vi.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect(result.current.echoStatus.isPlayingBack).toBe(true);
    });

    it('status kembali ke idle setelah playback selesai', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
        vi.advanceTimersByTime(200);
      });

      await act(async () => {
        result.current.stopEchoAndPlayback();
        await Promise.resolve();
        await Promise.resolve();
        vi.advanceTimersByTime(500);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.echoStatus.isCapturing).toBe(false);
      expect(result.current.echoStatus.isPlayingBack).toBe(false);
    });

    it('stopEchoAndPlayback tanpa startEchoCapture: tidak crash', () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      expect(() => {
        act(() => {
          result.current.stopEchoAndPlayback();
        });
      }).not.toThrow();
    });
  });

  describe('cancelEcho()', () => {
    it('batalkan sesi tanpa memulai playback', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
        vi.advanceTimersByTime(200);
      });

      act(() => {
        result.current.cancelEcho();
      });

      // playAudioChunk TIDAK boleh dipanggil
      await act(async () => {
        await Promise.resolve();
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(mockPlayAudioChunk).not.toHaveBeenCalled();
    });

    it('status kembali ke idle setelah cancel', async () => {
      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
      });

      act(() => {
        result.current.cancelEcho();
      });

      expect(result.current.echoStatus.isCapturing).toBe(false);
      expect(result.current.echoStatus.isPlayingBack).toBe(false);
    });
  });

  describe('stream cleanup', () => {
    it('track.stop() dipanggil setelah stopEchoAndPlayback', async () => {
      const fakeTrack = { stop: vi.fn(), kind: 'audio', enabled: true };
      const fakeStream = { getTracks: () => [fakeTrack], getAudioTracks: () => [fakeTrack] };
      mockGetUserMedia.mockResolvedValueOnce(fakeStream);

      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
      });

      await act(async () => {
        result.current.stopEchoAndPlayback();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fakeTrack.stop).toHaveBeenCalled();
    });

    it('track.stop() dipanggil setelah cancelEcho', async () => {
      const fakeTrack = { stop: vi.fn(), kind: 'audio', enabled: true };
      const fakeStream = { getTracks: () => [fakeTrack], getAudioTracks: () => [fakeTrack] };
      mockGetUserMedia.mockResolvedValueOnce(fakeStream);

      const { result } = renderHook(() => useChannel100EchoTest());

      await act(async () => {
        await result.current.startEchoCapture();
      });

      act(() => {
        result.current.cancelEcho();
      });

      expect(fakeTrack.stop).toHaveBeenCalled();
    });
  });
});
