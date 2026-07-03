import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePTTStore } from './usePTTStore';
import { getChannelUUID, safeGetStorage, safeSetStorage } from './storeUtils';
import { supabase } from '../utils/supabase';

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// Mock Supabase to keep unit tests offline-capable and fast
vi.mock('../utils/supabase', () => {
  const callbacks: Record<string, (payload?: unknown) => void> = {};
  let currentPresenceState: Record<string, unknown[]> = {};

  const mockChannel = {
    on: vi.fn((type: string, filterOrCb: unknown, cb?: unknown) => {
      if (typeof filterOrCb === 'function') {
        callbacks[type] = filterOrCb as (payload?: unknown) => void;
      } else if (cb && typeof cb === 'function') {
        const key = (filterOrCb as { event?: string })?.event
          ? `${type}_${(filterOrCb as { event?: string }).event}`
          : type;
        callbacks[key] = cb as (payload?: unknown) => void;
      }
      return mockChannel;
    }),
    track: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve()),
    presenceState: vi.fn(() => currentPresenceState),
    subscribe: vi.fn((callback) => {
      if (callback) callback('SUBSCRIBED');
      return {
        unsubscribe: vi.fn(),
      };
    }),
    unsubscribe: vi.fn(),
  };

  const mockSupabase = {
    _callbacks: callbacks,
    _setPresenceState: (state: Record<string, unknown[]>) => {
      currentPresenceState = state;
    },
    channel: vi.fn(() => mockChannel),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
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
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Helper: reset store to clean state ──────────────────────────────────────
function resetStore() {
  usePTTStore.setState({
    isPowerOn: true,
    isConnected: false,
    isTransmitting: false,
    isScanning: false,
    progress: 0,
    channelNumber: 100,
    channelId: getChannelUUID(100),
    userId: '',
    error: null,
    infoText: 'Pebe Herianto',
    locationText: 'BANDUNG, JAWA BARAT',
    showMyPhoto: true,
    showOtherPhotos: true,
    showPhotosInList: true,
    fastClick: true,
    showModulator: true,
    showPTT: true,
    maxQueue: '99999',
    audioMode: 'music',
    pttSize: 30,
    pttBottom: 50,
    togglePtt: true,
    pttVolume: 70,
    vibrateOnStart: true,
    toneOnStartEnd: true,
    bgActive: true,
    fullDuplex: false,
    themeText: 'Monokrom',
    builtInEcho: true,
    isKaraokePlayerOpen: false,
    echoFeedback: 35,
    profilePhotoOption: 'custom',
    customPhotoUrl: '',
  });
}

// ─── Test Suites ──────────────────────────────────────────────────────────────
describe('usePTTStore – Core Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetStore();
  });

  it('should initialize with default states', () => {
    const state = usePTTStore.getState();
    expect(state.isPowerOn).toBe(true);
    expect(state.isConnected).toBe(false);
    expect(state.isTransmitting).toBe(false);
    expect(state.channelNumber).toBe(100);
    expect(state.channelId).toBe(getChannelUUID(100));
    expect(state.userId).toBe('');
  });

  it('should generate a valid UUID v4 for the session user ID (Golden Rule #3)', () => {
    const state = usePTTStore.getState();
    state.initializeSession();

    const updatedState = usePTTStore.getState();
    expect(updatedState.userId).toMatch(UUID_V4_REGEX);
  });

  it('should map channel number deterministically to a valid UUID format (Golden Rule #3)', () => {
    const state = usePTTStore.getState();
    expect(state.channelId).toMatch(UUID_V4_REGEX);

    state.setChannelNumber(55);
    const updatedState = usePTTStore.getState();
    expect(updatedState.channelNumber).toBe(55);
    expect(updatedState.channelId).toBe(getChannelUUID(55));
    expect(updatedState.channelId).toMatch(UUID_V4_REGEX);
  });

  it('should clamp channel numbers between 0 and 999', () => {
    const state = usePTTStore.getState();

    state.setChannelNumber(1000);
    expect(usePTTStore.getState().channelNumber).toBe(999);

    state.setChannelNumber(0);
    expect(usePTTStore.getState().channelNumber).toBe(0);

    state.setChannelNumber(-50);
    expect(usePTTStore.getState().channelNumber).toBe(0);
  });

  it('should support callback function updater syntax for channel transitions', () => {
    const state = usePTTStore.getState();

    state.setChannelNumber((prev: number) => prev + 5);
    expect(usePTTStore.getState().channelNumber).toBe(105);

    state.setChannelNumber((prev: number) => prev - 10);
    expect(usePTTStore.getState().channelNumber).toBe(95);
  });

  it('should reset transmission, scanning, and progress when power is turned off', () => {
    const state = usePTTStore.getState();

    state.setTransmitting(true);
    state.setScanning(true);
    state.setProgress(80);

    expect(usePTTStore.getState().isTransmitting).toBe(true);
    expect(usePTTStore.getState().isScanning).toBe(true);
    expect(usePTTStore.getState().progress).toBe(80);

    state.setPower(false);

    const poweredOffState = usePTTStore.getState();
    expect(poweredOffState.isPowerOn).toBe(false);
    expect(poweredOffState.isTransmitting).toBe(false);
    expect(poweredOffState.isScanning).toBe(false);
    expect(poweredOffState.progress).toBe(0);
  });

  it('should ignore all state-modifying actions if power is off (Graceful Degradation)', () => {
    const state = usePTTStore.getState();
    state.setPower(false);

    state.setChannelNumber(200);
    state.setTransmitting(true);
    state.setScanning(true);
    state.setProgress(75);

    const updatedState = usePTTStore.getState();
    expect(updatedState.channelNumber).toBe(100); // remains default
    expect(updatedState.isTransmitting).toBe(false);
    expect(updatedState.isScanning).toBe(false);
    expect(updatedState.progress).toBe(0);
  });

  it('should increment channel number with channelUp and wrap from 999 to 0', () => {
    const state = usePTTStore.getState();

    state.channelUp();
    expect(usePTTStore.getState().channelNumber).toBe(101);
    expect(usePTTStore.getState().channelId).toBe(getChannelUUID(101));

    state.setChannelNumber(999);
    state.channelUp();
    expect(usePTTStore.getState().channelNumber).toBe(0);
    expect(usePTTStore.getState().channelId).toBe(getChannelUUID(0));
  });

  it('should decrement channel number with channelDown and wrap from 0 to 999', () => {
    const state = usePTTStore.getState();

    state.channelDown();
    expect(usePTTStore.getState().channelNumber).toBe(99);
    expect(usePTTStore.getState().channelId).toBe(getChannelUUID(99));

    state.setChannelNumber(0);
    state.channelDown();
    expect(usePTTStore.getState().channelNumber).toBe(999);
    expect(usePTTStore.getState().channelId).toBe(getChannelUUID(999));
  });

  it('should toggle isScanning with toggleScan', () => {
    const state = usePTTStore.getState();

    state.toggleScan();
    expect(usePTTStore.getState().isScanning).toBe(true);

    state.toggleScan();
    expect(usePTTStore.getState().isScanning).toBe(false);
  });

  it('should not modify channel or scanning via control actions when power is off', () => {
    const state = usePTTStore.getState();
    state.setPower(false);

    state.channelUp();
    state.channelDown();
    state.toggleScan();

    const updatedState = usePTTStore.getState();
    expect(updatedState.channelNumber).toBe(100);
    expect(updatedState.isScanning).toBe(false);
  });

  it('should support updating settings properties via updateSettings action', () => {
    const state = usePTTStore.getState();
    expect(state.togglePtt).toBe(true);
    expect(state.pttVolume).toBe(70);

    state.updateSettings({ togglePtt: false, pttVolume: 90, themeText: 'Gelap' });

    const updatedState = usePTTStore.getState();
    expect(updatedState.togglePtt).toBe(false);
    expect(updatedState.pttVolume).toBe(90);
    expect(updatedState.themeText).toBe('Gelap');
  });
});

// ─── Robustness: localStorage Persistence Tests (Option C) ────────────────────
describe('usePTTStore – localStorage Persistence & Offline Robustness', () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetStore();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('safeGetStorage returns null when localStorage is empty', () => {
    expect(safeGetStorage()).toBeNull();
  });

  it('safeSetStorage writes partial state and safeGetStorage reads it back', () => {
    safeSetStorage({
      infoText: 'TestUser',
      locationText: 'JAKARTA, DKI JAKARTA',
      channelNumber: 42,
    });

    const result = safeGetStorage();
    expect(result).not.toBeNull();
    expect(result?.infoText).toBe('TestUser');
    expect(result?.locationText).toBe('JAKARTA, DKI JAKARTA');
    expect(result?.channelNumber).toBe(42);
  });

  it('safeSetStorage merges with existing cache instead of overwriting', () => {
    safeSetStorage({ infoText: 'FirstUser' });
    safeSetStorage({ locationText: 'SURABAYA, JAWA TIMUR' });

    const result = safeGetStorage();
    expect(result?.infoText).toBe('FirstUser');
    expect(result?.locationText).toBe('SURABAYA, JAWA TIMUR');
  });

  it('updateSettings persists settings keys to localStorage', () => {
    const state = usePTTStore.getState();
    state.updateSettings({ infoText: 'Budi', locationText: 'YOGYAKARTA, DIY', pttVolume: 80 });

    const cached = safeGetStorage();
    expect(cached?.infoText).toBe('Budi');
    expect(cached?.locationText).toBe('YOGYAKARTA, DIY');
    expect(cached?.pttVolume).toBe(80);
  });

  it('updateSettings does NOT persist volatile runtime state (isTransmitting, progress)', () => {
    const state = usePTTStore.getState();
    // Force-inject volatile state into updateSettings call
    state.updateSettings({ infoText: 'Sari' } as Partial<typeof state>);

    const cached = safeGetStorage();
    // Volatile keys must not appear in cache
    expect(cached).not.toHaveProperty('isTransmitting');
    expect(cached).not.toHaveProperty('progress');
    expect(cached).not.toHaveProperty('isConnected');
  });

  it('setChannelNumber persists channel to localStorage', () => {
    const state = usePTTStore.getState();
    state.setChannelNumber(77);

    const cached = safeGetStorage();
    expect(cached?.channelNumber).toBe(77);
  });

  it('channelUp persists new channel number to localStorage', () => {
    const state = usePTTStore.getState();
    state.channelUp(); // 100 -> 101

    const cached = safeGetStorage();
    expect(cached?.channelNumber).toBe(101);
  });

  it('channelDown persists new channel number to localStorage', () => {
    const state = usePTTStore.getState();
    state.channelDown(); // 100 -> 99

    const cached = safeGetStorage();
    expect(cached?.channelNumber).toBe(99);
  });

  it('initializeSession restores settings from localStorage cache (Offline Recovery)', () => {
    // Pre-populate cache with previous session data
    safeSetStorage({
      infoText: 'CachedUser',
      locationText: 'SEMARANG, JAWA TENGAH',
      channelNumber: 55,
      pttVolume: 60,
    });

    // Reset userId so initializeSession runs restoration
    usePTTStore.setState({ userId: '' });

    const state = usePTTStore.getState();
    state.initializeSession();

    const updated = usePTTStore.getState();
    expect(updated.infoText).toBe('CachedUser');
    expect(updated.locationText).toBe('SEMARANG, JAWA TENGAH');
    expect(updated.channelNumber).toBe(55);
    expect(updated.pttVolume).toBe(60);
    // userId must be a valid UUID
    expect(updated.userId).toMatch(UUID_V4_REGEX);
  });

  it('initializeSession is idempotent – does not re-run if userId already exists', () => {
    const state = usePTTStore.getState();
    state.initializeSession();
    const firstUserId = usePTTStore.getState().userId;

    // Inject different localStorage data before second call
    safeSetStorage({ infoText: 'InjectedUser' });

    state.initializeSession(); // Should be a no-op
    const secondUserId = usePTTStore.getState().userId;

    expect(firstUserId).toBe(secondUserId); // Same userId = not re-initialized
    // infoText should NOT change since second call was a no-op
    expect(usePTTStore.getState().infoText).not.toBe('InjectedUser');
  });

  it('safeGetStorage returns null on corrupted JSON without crashing (Graceful Degradation)', () => {
    // Manually inject malformed JSON
    localStorageMock.setItem('nextvwt_settings', '{ invalid json }}');
    const result = safeGetStorage();
    expect(result).toBeNull(); // Must return null, not throw
  });

  it('initializeSession generates and persists a random 5-char alphanumeric callSign if missing', () => {
    usePTTStore.setState({ userId: '' });

    const state = usePTTStore.getState();
    state.initializeSession();

    const updated = usePTTStore.getState();
    expect(updated.callSign).toMatch(/^[A-Z0-9]{5}$/);

    const cached = safeGetStorage();
    expect(cached?.callSign).toBe(updated.callSign);
  });

  it('initializeSession restores callSign from localStorage cache', () => {
    safeSetStorage({ callSign: 'ABC12' });
    usePTTStore.setState({ userId: '' });

    const state = usePTTStore.getState();
    state.initializeSession();

    const updated = usePTTStore.getState();
    expect(updated.callSign).toBe('ABC12');
  });
});

// ─── Phase 1.3: Store State & Realtime Handler Tests ─────────────────────────
describe('PTT collision detection (tie-breaking logic)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('channel-role:ptt-room-100:user-AAA', 'operator');
    usePTTStore.setState({
      userId: 'user-AAA',
      callSign: 'MYCS',
      myChannelRole: 'operator',
      isTransmitting: true,
      lastTransmitTime: 1000,
    });
    usePTTStore.getState().subscribeToChannel(100);
  });

  it('Terima ptt_state dari NOC (role noc) saat kita transmit → isTransmitting false (NOC override)', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_ptt_state'];
    expect(cb).toBeDefined();
    cb({
      payload: {
        userId: 'user-NOC',
        displayName: 'NOC User',
        callSign: 'NOC01',
        isTransmitting: true,
        role: 'noc',
        timestamp: 1000,
      },
    });
    expect(usePTTStore.getState().isTransmitting).toBe(false);
  });

  it('Terima ptt_state timestamp lebih baru dari userId yang lebih kecil → kita kalah, isTransmitting false', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_ptt_state'];
    cb({
      payload: {
        userId: 'user-000',
        displayName: 'Other User',
        callSign: 'OTH01',
        isTransmitting: true,
        role: 'operator',
        timestamp: 500,
      },
    });
    expect(usePTTStore.getState().isTransmitting).toBe(false);
  });

  it('Terima ptt_state timestamp sama, userId pengirim > userId kita → kita menang, isTransmitting tetap true', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_ptt_state'];
    cb({
      payload: {
        userId: 'user-ZZZ',
        displayName: 'ZZZ User',
        callSign: 'ZZZ01',
        isTransmitting: true,
        role: 'operator',
        timestamp: 1000,
      },
    });
    expect(usePTTStore.getState().isTransmitting).toBe(true);
  });

  it('Terima ptt_state isTransmitting=false dari activeTransmitter → activeTransmitter null, progress 0', () => {
    usePTTStore.setState({
      activeTransmitter: {
        userId: 'user-TX',
        displayName: 'TX User',
        callSign: 'TX01',
        role: 'operator',
      },
      progress: 50,
    });
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_ptt_state'];
    cb({
      payload: {
        userId: 'user-TX',
        displayName: 'TX User',
        callSign: 'TX01',
        isTransmitting: false,
      },
    });
    expect(usePTTStore.getState().activeTransmitter).toBeNull();
  });
});

describe('channel number navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    usePTTStore.setState({ isPowerOn: true, channelNumber: 1 });
  });

  it('channelUp() dari channel 1 → channel 2', () => {
    usePTTStore.getState().channelUp();
    expect(usePTTStore.getState().channelNumber).toBe(2);
  });

  it('channelUp() dari channel 999 → channel 0 (wrap)', () => {
    usePTTStore.setState({ channelNumber: 999 });
    usePTTStore.getState().channelUp();
    expect(usePTTStore.getState().channelNumber).toBe(0);
  });

  it('channelDown() dari channel 1 → channel 0', () => {
    usePTTStore.getState().channelDown();
    expect(usePTTStore.getState().channelNumber).toBe(0);
  });

  it('channelDown() dari channel 0 → channel 999 (wrap)', () => {
    usePTTStore.setState({ channelNumber: 0 });
    usePTTStore.getState().channelDown();
    expect(usePTTStore.getState().channelNumber).toBe(999);
  });

  it('setChannelNumber(42) → channelNumber === 42', () => {
    usePTTStore.getState().setChannelNumber(42);
    expect(usePTTStore.getState().channelNumber).toBe(42);
  });

  it('setChannelNumber(-1) → tolak atau clamp ke 0', () => {
    usePTTStore.getState().setChannelNumber(-1);
    expect(usePTTStore.getState().channelNumber).toBe(0);
  });

  it('setChannelNumber(1000) → tolak atau clamp ke 999', () => {
    usePTTStore.getState().setChannelNumber(1000);
    expect(usePTTStore.getState().channelNumber).toBe(999);
  });
});

describe('kick handler', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    usePTTStore.setState({ userId: 'my-user-id', channelNumber: 100 });
    usePTTStore.getState().subscribeToChannel(100);
  });

  it('kick payload targetUserId === userId kita → channelNumber berubah ke 302', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_kick'];
    cb({
      payload: {
        targetUserId: 'my-user-id',
        reason: 'Violation',
      },
    });
    expect(usePTTStore.getState().channelNumber).toBe(302);
  });

  it('kick payload targetUserId !== userId kita → channelNumber tidak berubah', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_kick'];
    cb({
      payload: {
        targetUserId: 'other-user-id',
        reason: 'Violation',
      },
    });
    expect(usePTTStore.getState().channelNumber).toBe(100);
  });

  it('kick payload invalid (Zod gagal) → state tidak berubah', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_kick'];
    cb({
      payload: {
        targetUserId: '', // empty string fails min(1) Zod validation
      },
    });
    expect(usePTTStore.getState().channelNumber).toBe(100);
  });
});

describe('update_role handler', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('channel-role:ptt-room-100:my-user-id', 'operator');
    usePTTStore.setState({ userId: 'my-user-id', channelNumber: 100 });
    usePTTStore.getState().subscribeToChannel(100);
    usePTTStore.setState({ myChannelRole: 'operator' });
  });

  it('targetUserId === userId kita, nextRole=pjc → myChannelRole === pjc & localStorage updated', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_update_role'];
    cb({
      payload: {
        targetUserId: 'my-user-id',
        nextRole: 'pjc',
      },
    });
    expect(usePTTStore.getState().myChannelRole).toBe('pjc');
    expect(localStorage.getItem('channel-role:ptt-room-100:my-user-id')).toBe('pjc');
  });

  it('targetUserId !== userId kita → myChannelRole tidak berubah', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['broadcast_update_role'];
    cb({
      payload: {
        targetUserId: 'other-user-id',
        nextRole: 'pjc',
      },
    });
    expect(usePTTStore.getState().myChannelRole).toBe('operator');
  });
});

describe('presence member tracking', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    usePTTStore.setState({ activeUsers: [] });
    usePTTStore.getState().subscribeToChannel(100);
  });

  it('presence join event → activeUsers bertambah 1', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['presence_sync'];
    (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._setPresenceState({
      key1: [{ userId: 'user-1', displayName: 'User One', callSign: 'US1' }],
    });
    cb();
    expect(usePTTStore.getState().activeUsers.length).toBe(1);
    expect(usePTTStore.getState().activeUsers[0].userId).toBe('user-1');
  });

  it('presence leave event → activeUsers berkurang 1', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['presence_sync'];
    (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._setPresenceState({
      key1: [{ userId: 'user-1', displayName: 'User One' }],
      key2: [{ userId: 'user-2', displayName: 'User Two' }],
    });
    cb();
    expect(usePTTStore.getState().activeUsers.length).toBe(2);

    (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._setPresenceState({
      key1: [{ userId: 'user-1', displayName: 'User One' }],
    });
    cb();
    expect(usePTTStore.getState().activeUsers.length).toBe(1);
  });

  it('presence join user yang sama dua kali → tidak duplikat di activeUsers', () => {
    const cb = (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._callbacks['presence_sync'];
    (
      supabase as unknown as {
        _callbacks: Record<string, (payload?: unknown) => void>;
        _setPresenceState: (state: unknown) => void;
      }
    )._setPresenceState({
      key1: [{ userId: 'user-1', displayName: 'User One' }],
      key2: [{ userId: 'user-1', displayName: 'User One Duplicate' }],
    });
    cb();
    expect(usePTTStore.getState().activeUsers.length).toBe(1);
  });
});
