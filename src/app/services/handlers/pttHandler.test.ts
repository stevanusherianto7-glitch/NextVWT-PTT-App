import { describe, it, expect, vi, beforeEach } from 'vitest';

const setState = vi.fn();
const getState = vi.fn();
vi.mock('../../store/usePTTStore', () => ({
  usePTTStore: {
    getState: (...args: any[]) => getState(...args),
    setState: (...args: any[]) => setState(...args),
  },
}));

const safeParse = vi.fn();
vi.mock('../../store/schemas/realtimePayloads', () => ({
  safeParseRealtimePayload: (...args: any[]) => safeParse(...args),
  PttStatePayloadSchema: 'PttStatePayloadSchema',
}));

const toastError = vi.hoisted(() => vi.fn());
const toastWarning = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError, warning: toastWarning } }));

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

import {
  handlePttState,
  startActiveTransmitterWatchdog,
  clearActiveTransmitterWatchdog,
} from './pttHandler';

const baseState = {
  userId: 'me',
  callSign: '2DYUA',
  isTransmitting: false,
  activeTransmitter: null,
  myChannelRole: 'member',
  lastTransmitTime: 0,
  setTransmitting: vi.fn(),
};

describe('pttHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (console.warn as any).mockImplementation(() => {});
    getState.mockReturnValue({ ...baseState });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearActiveTransmitterWatchdog();
  });

  it('ignores malformed payload', () => {
    safeParse.mockReturnValue(null);
    handlePttState({ bad: 1 });
    expect(setState).not.toHaveBeenCalled();
  });

  it('sets activeTransmitter for a different device transmitting', () => {
    safeParse.mockReturnValue({
      isTransmitting: true,
      userId: 'other',
      callSign: '9ZZZ',
      displayName: 'Budi',
      role: 'member',
      isNewUser: false,
    });
    handlePttState({});
    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({ activeTransmitter: expect.objectContaining({ userId: 'other' }) })
    );
  });

  it('moderator override: higher-priority remote stops my TX', () => {
    getState.mockReturnValue({
      ...baseState,
      isTransmitting: true,
      myChannelRole: 'member',
      lastTransmitTime: 100,
    });
    safeParse.mockReturnValue({
      isTransmitting: true,
      userId: 'op',
      callSign: '1OP',
      displayName: 'Operator',
      role: 'operator',
      isNewUser: false,
    });
    handlePttState({});
    expect(setState).toHaveBeenCalledWith({ isTransmitting: false, progress: 0 });
    expect(toastError).toHaveBeenCalled();
  });

  it('collision: I lose when localTime > remoteTime -> my TX cleared', () => {
    getState.mockReturnValue({
      ...baseState,
      isTransmitting: true,
      myChannelRole: 'member',
      lastTransmitTime: 500,
    });
    safeParse.mockReturnValue({
      isTransmitting: true,
      userId: 'peer',
      callSign: '3PEER',
      displayName: 'Peer',
      role: 'member',
      isNewUser: false,
      timestamp: 100,
    });
    handlePttState({});
    expect(setState).toHaveBeenCalledWith({ isTransmitting: false, progress: 0 });
    expect(toastWarning).toHaveBeenCalled();
  });

  it('collision tie: I lose when userId > payload.userId (deterministic)', () => {
    getState.mockReturnValue({
      ...baseState,
      isTransmitting: true,
      myChannelRole: 'member',
      lastTransmitTime: 100,
      userId: 'zzz',
    });
    safeParse.mockReturnValue({
      isTransmitting: true,
      userId: 'aaa',
      callSign: '3AAA',
      displayName: 'Aaa',
      role: 'member',
      isNewUser: false,
      timestamp: 100,
    });
    handlePttState({});
    expect(setState).toHaveBeenCalledWith({ isTransmitting: false, progress: 0 });
  });

  it('clears activeTransmitter on TX end for matching user', () => {
    getState.mockReturnValue({ ...baseState, activeTransmitter: { userId: 'other' } });
    safeParse.mockReturnValue({ isTransmitting: false, userId: 'other' });
    handlePttState({});
    expect(setState).toHaveBeenCalledWith({ activeTransmitter: null });
  });

  it('watchdog force-clears stale transmitter after 60s', () => {
    startActiveTransmitterWatchdog('other', 'Budi');
    getState.mockReturnValue({
      ...baseState,
      activeTransmitter: { userId: 'other' },
      isTransmitting: false,
    });
    vi.advanceTimersByTime(61000);
    expect(setState).toHaveBeenCalledWith({ activeTransmitter: null });
  });
});
