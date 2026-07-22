import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePTTStore } from '../store/usePTTStore';

const mockTransport = {
  connect: vi.fn(() => Promise.resolve()),
  publishMic: vi.fn(() => Promise.resolve()),
  setMicEnabled: vi.fn(),
  onRemoteAudio: vi.fn(),
  onPresence: vi.fn(),
  emitInitialPresence: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../utils/config', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    USE_SFU: true,
    BRAND: { ...actual.BRAND, livekitUrl: 'wss://test-livekit.local' },
  };
});

vi.mock('../services/livekitToken', () => ({
  fetchLiveKitToken: vi.fn(() => Promise.resolve({ token: 'tok', room: 'r', url: 'u' })),
}));

vi.mock('../services/livekitAudioTransport', () => ({
  createLiveKitTransport: vi.fn(() => mockTransport),
}));

const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

// Stub getUserMedia
beforeEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(() =>
        Promise.resolve({
          getAudioTracks: () => [{ stop: vi.fn() }],
          getTracks: () => [{ stop: vi.fn() }],
        })
      ),
    },
  });
});

import { useSfuTransport } from './useSfuTransport';

describe('useSfuTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.error.mockClear();
    usePTTStore.setState({ activeUsers: [] });
  });

  it('connects and sets presence when power on', async () => {
    renderHook(() => useSfuTransport({ isPowerOn: true, isTransmitting: false, channel: 200 }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(mockTransport.connect).toHaveBeenCalled();
    expect(mockTransport.publishMic).toHaveBeenCalled();
    expect(mockTransport.setMicEnabled).toHaveBeenCalledWith(false);
  });

  it('enables mic on transmit (non-zero channel)', async () => {
    const { rerender } = renderHook(({ args }) => useSfuTransport(args), {
      initialProps: { args: { isPowerOn: true, isTransmitting: false, channel: 200 } },
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    vi.clearAllMocks();
    rerender({ args: { isPowerOn: true, isTransmitting: true, channel: 200 } });
    expect(mockTransport.setMicEnabled).toHaveBeenCalledWith(true);
  });

  it('does not enable mic on channel 100 (landing)', async () => {
    const { rerender } = renderHook(({ args }) => useSfuTransport(args), {
      initialProps: { args: { isPowerOn: true, isTransmitting: false, channel: 100 } },
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    vi.clearAllMocks();
    rerender({ args: { isPowerOn: true, isTransmitting: true, channel: 100 } });
    expect(mockTransport.setMicEnabled).toHaveBeenCalledWith(false);
  });

  it('disconnects on power off / unmount', async () => {
    const { unmount } = renderHook(() =>
      useSfuTransport({ isPowerOn: true, isTransmitting: false, channel: 200 })
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    unmount();
    expect(mockTransport.disconnect).toHaveBeenCalled();
  });
});
