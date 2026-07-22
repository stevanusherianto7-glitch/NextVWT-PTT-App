import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadioOrchestrator } from './useRadioOrchestrator';

// ── Store mock (function + namespace) ────────────────────────────────────────
const storeStateRef = vi.hoisted(() => ({
  state: {
    isPowerOn: true,
    isTransmitting: false,
    isScanning: false,
    setProgress: () => {},
    channelUp: () => {},
    setChannelNumber: () => {},
    activeUsers: [] as any[],
    activeTransmitter: null,
    themeText: 'theme-classic',
    audioMode: 'radio',
    fullDuplex: false,
    isKaraokePlayerOpen: false,
    setKaraokePlayerOpen: () => {},
    userId: 'me',
    channelNumber: 1,
    infoText: '',
    locationText: '',
    setTransmitting: () => {},
    setPower: () => {},
    callSign: '2DYUA',
    myChannelRole: 'member',
    lastTransmitTime: 0,
    user: null,
    profilePhotoOption: 'none',
    customPhotoUrl: '',
  },
}));

const usePTTStoreMock = vi.hoisted(() => {
  const fn = (selector?: (s: any) => any) => {
    const s = storeStateRef.state;
    return selector ? selector(s) : s;
  };
  fn.getState = () => storeStateRef.state;
  fn.setState = (partial: any) => Object.assign(storeStateRef.state, partial);
  fn.subscribe = () => () => {};
  return fn;
});

vi.mock('../store/usePTTStore', () => ({ usePTTStore: usePTTStoreMock }));

// ── Child hook mocks ───────────────────────────────────────────────────────────
vi.mock('../utils/constants', () => ({
  STATIC_CHANNELS: [{ number: 1, name: 'Channel One', users: ['staticUser1'] }],
  BRAND: { simulatedUserOffset: 0 },
}));
vi.mock('../utils/config', () => ({
  BRAND: { simulatedUserOffset: 0 },
}));
vi.mock('../../features/moderation/useChannelRole', () => ({
  useChannelRole: () => ({ role: 'member' as const, status: 'active' as const, loading: false }),
}));
vi.mock('../../features/moderation/useChannelSettings', () => ({
  useChannelSettings: () => ({
    settings: { allow_guest_ptt: true, channel_description: 'PROGRAM X' },
    loading: false,
    updateSettings: vi.fn(),
  }),
}));
vi.mock('../../features/moderation/permissions', () => ({
  canUsePTT: () => true,
}));
vi.mock('./useRadioAudioEngine', () => ({
  useRadioAudioEngine: () => ({ handleUserListChange: vi.fn() }),
}));
vi.mock('./useRadioModeration', () => ({
  useRadioModeration: () => ({ waitTimer: 0 }),
}));
vi.mock('./useRadioReactions', () => ({
  useRadioReactions: () => ({ floatingReactions: [], handleSendReaction: vi.fn() }),
}));

describe('useRadioOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(storeStateRef.state, {
      isPowerOn: true,
      isTransmitting: false,
      isScanning: false,
      activeUsers: [],
      activeTransmitter: null,
      themeText: 'theme-classic',
      audioMode: 'radio',
      fullDuplex: false,
      isKaraokePlayerOpen: false,
      setIsKaraokePlayerOpen: () => {},
      userId: 'me',
      channelNumber: 1,
      infoText: '',
      locationText: '',
      callSign: '2DYUA',
    });
  });

  it('exposes derived view-model fields', () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.isPowerOn).toBe(true);
    expect(result.current.roomId).toBe('ptt-room-1');
    expect(result.current.channel).toBe(1);
    expect(result.current.pttAllowed).toBe(true);
    expect(Array.isArray(result.current.dynamicUserList)).toBe(true);
  });

  it('getThemeClass maps known themes', () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.getThemeClass('theme-v1')).toBe('theme-v1');
    expect(result.current.getThemeClass('v3')).toBe('theme-v3');
    expect(result.current.getThemeClass('monokrom')).toBe('theme-monokrom');
    expect(result.current.getThemeClass('unknown')).toBe('theme-classic');
  });

  it('dedupes user list (case-insensitive) and includes static + simulated', () => {
    storeStateRef.state.activeUsers = ['UserA', { userId: 'userb', displayName: 'B' } as any];
    const { result } = renderHook(() => useRadioOrchestrator());
    // UserA (from activeUsers) + userb + staticUser1 from STATIC_CHANNELS.users
    const ids = result.current.dynamicUserList.map((u) => (typeof u === 'string' ? u : u.userId));
    // 'UserA' and 'userb' deduped to themselves; staticUser1 added
    expect(ids).toContain('UserA');
    expect(ids).toContain('userb');
    expect(ids).toContain('staticUser1');
    expect(result.current.dynamicUserList.length).toBe(3);
  });

  it('handleSet opens settings only when powered on', () => {
    storeStateRef.state.isPowerOn = true;
    const { result } = renderHook(() => useRadioOrchestrator());
    act(() => result.current.handleSet());
    expect(result.current.isSettingsOpen).toBe(true);

    // power off -> handleSet does nothing
    storeStateRef.state.isPowerOn = false;
    const { result: r2 } = renderHook(() => useRadioOrchestrator());
    act(() => r2.current.handleSet());
    expect(r2.current.isSettingsOpen).toBe(false);
  });

  it('powers-off resets all panel open flags', () => {
    storeStateRef.state.isPowerOn = false;
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.isPanelOpen).toBe(false);
    // All individual flags default false when off
    expect(result.current.isSettingsOpen).toBe(false);
    expect(result.current.isManageOpen).toBe(false);
  });

  it('marqueeText includes program name when channel description present', () => {
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.marqueeText).toContain('PROGRAM X');
    expect(result.current.marqueeText).toContain('CHANNEL 1');
  });

  it('isBusy true when receiving + half-duplex', () => {
    storeStateRef.state.activeTransmitter = { userId: 'other', callSign: '9ZZZ' } as any;
    storeStateRef.state.fullDuplex = false;
    storeStateRef.state.audioMode = 'radio';
    const { result } = renderHook(() => useRadioOrchestrator());
    expect(result.current.isBusy).toBe(true);
  });
});
