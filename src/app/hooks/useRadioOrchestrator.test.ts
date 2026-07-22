import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePTTStore } from '../store/usePTTStore';

// Mock child hooks so orchestrator test focuses on view-model composition
vi.mock('./useRadioAudioEngine', () => ({
  useRadioAudioEngine: () => ({ handleUserListChange: vi.fn() }),
}));
vi.mock('./useRadioModeration', () => ({
  useRadioModeration: () => ({ waitTimer: null }),
}));
vi.mock('./useRadioReactions', () => ({
  useRadioReactions: () => ({ floatingReactions: [], handleSendReaction: vi.fn() }),
}));

// Mock supabase for useChannelRole / useChannelSettings
vi.mock('../../features/moderation/useChannelRole', () => ({
  useChannelRole: () => ({ role: 'guest', status: 'active', loading: false }),
}));
vi.mock('../../features/moderation/useChannelSettings', () => ({
  useChannelSettings: () => ({ settings: { allow_guest_ptt: true }, loading: false }),
}));

import { useRadioOrchestrator } from './useRadioOrchestrator';

function makeSupabase() {
  const mockSupabase = {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
  };
  return mockSupabase;
}

vi.mock('../../app/utils/supabase', () => ({
  getSupabase: vi.fn(() => Promise.resolve((globalThis as any).__sb)),
}));

describe('useRadioOrchestrator', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (globalThis as any).__sb = makeSupabase();
    usePTTStore.setState({
      isPowerOn: true,
      isTransmitting: false,
      isScanning: false,
      channelNumber: 100,
      activeUsers: [],
      activeTransmitter: null,
      themeText: 'theme-v1',
      audioMode: 'discussion',
      fullDuplex: false,
      isKaraokePlayerOpen: false,
      infoText: 'Budi',
      locationText: 'BANDUNG, JABAR',
      userId: 'me',
      callSign: 'BUD01',
    });
  });

  it('composes view-model with theme class mapping', () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.getThemeClass('theme-v3')).toBe('theme-v3');
    expect(result.current.getThemeClass('theme-monokrom')).toBe('theme-monokrom');
    expect(result.current.getThemeClass('unknown')).toBe('theme-classic');
  });

  it('pttAllowed respects guest + allowGuestPTT', async () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(result.current.pttAllowed).toBe(true); // guest + allow_guest_ptt true
  });

  it('isBusy is false when not receiving', () => {
    usePTTStore.setState({ activeTransmitter: null });
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.isBusy).toBe(false);
  });

  it('isBusy true when receiving from another user (half-duplex)', () => {
    usePTTStore.setState({
      activeTransmitter: {
        userId: 'other',
        callSign: 'OTH01',
        displayName: 'Other',
        role: 'guest',
      },
      audioMode: 'discussion',
      fullDuplex: false,
    });
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.isBusy).toBe(true);
  });

  it('isBusy false when receiving but full-duplex on', () => {
    usePTTStore.setState({
      activeTransmitter: {
        userId: 'other',
        callSign: 'OTH01',
        displayName: 'Other',
        role: 'guest',
      },
      audioMode: 'music',
      fullDuplex: false,
    });
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.isBusy).toBe(false);
  });

  it('handleSet opens settings only when power on', () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    act(() => result.current.handleSet());
    expect(result.current.isSettingsOpen).toBe(true);
  });

  it('closes all panels when power turned off', () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    act(() => result.current.setIsManageOpen(true));
    expect(result.current.isManageOpen).toBe(true);
    act(() => usePTTStore.getState().setPower(false));
    expect(result.current.isManageOpen).toBe(false);
    expect(result.current.isPanelOpen).toBe(false);
  });

  it('builds marquee text from channel info', () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.marqueeText).toContain('CHANNEL 100');
    expect(result.current.marqueeText).toContain('BUDI');
  });
});
