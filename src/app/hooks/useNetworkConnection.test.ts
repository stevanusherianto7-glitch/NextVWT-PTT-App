import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkConnection } from './useNetworkConnection';
import { usePTTStore } from '../store/usePTTStore';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useNetworkConnection', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    usePTTStore.setState({ isPowerOn: true, isConnected: false });
  });

  it('reconnects on online event', () => {
    renderHook(() => useNetworkConnection());
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(toast.success).toHaveBeenCalled();
    expect(usePTTStore.getState().isConnected).toBe(true);
  });

  it('goes offline on offline event', () => {
    renderHook(() => useNetworkConnection());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(toast.error).toHaveBeenCalled();
    expect(usePTTStore.getState().isConnected).toBe(false);
  });
});
