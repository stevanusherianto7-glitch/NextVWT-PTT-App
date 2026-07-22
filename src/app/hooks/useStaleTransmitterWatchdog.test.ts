import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaleTransmitterWatchdog } from './useStaleTransmitterWatchdog';
import { usePTTStore } from '../store/usePTTStore';

describe('useStaleTransmitterWatchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePTTStore.setState({
      userId: 'me',
      activeTransmitter: null,
      progress: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears an external active transmitter after timeout', () => {
    const tx = {
      userId: 'other',
      displayName: 'Other',
      callSign: 'OTH01',
      role: 'guest',
      timestamp: 0,
    };
    usePTTStore.setState({ activeTransmitter: tx });

    renderHook(() => useStaleTransmitterWatchdog(tx));

    act(() => {
      vi.advanceTimersByTime(1501);
    });

    expect(usePTTStore.getState().activeTransmitter).toBeNull();
    expect(usePTTStore.getState().progress).toBe(0);
  });

  it('does not clear own transmitter', () => {
    const tx = { userId: 'me', displayName: 'Me', callSign: 'ME001', role: 'guest', timestamp: 0 };
    usePTTStore.setState({ activeTransmitter: tx });

    renderHook(() => useStaleTransmitterWatchdog(tx));

    act(() => {
      vi.advanceTimersByTime(1501);
    });

    expect(usePTTStore.getState().activeTransmitter).not.toBeNull();
  });
});
