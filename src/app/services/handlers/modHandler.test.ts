import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock store + schemas so we test pure handler logic deterministically.
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
  HangUpPayloadSchema: 'HangUpPayloadSchema',
  KickPayloadSchema: 'KickPayloadSchema',
  UpdateRolePayloadSchema: 'UpdateRolePayloadSchema',
  UpdateStatusPayloadSchema: 'UpdateStatusPayloadSchema',
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));

// Silence console.warn from handlers
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

import { handleHangUp, handleKick, handleUpdateRole, handleUpdateStatus } from './modHandler';

describe('modHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (console.warn as any).mockImplementation(() => {});
    getState.mockReturnValue({
      userId: 'me',
      callSign: '2DYUA',
      isTransmitting: false,
      activeTransmitter: null,
      setChannelNumber: vi.fn(),
      infoText: '',
      locationText: '',
      profilePhotoOption: 'none',
      customPhotoUrl: '',
      user: null,
    });
  });

  describe('handleHangUp', () => {
    it('does nothing when payload invalid', () => {
      safeParse.mockReturnValue(null);
      handleHangUp({ bad: 1 }, vi.fn());
      expect(setState).not.toHaveBeenCalled();
    });

    it('clears my transmitting + progress when I am target + transmitting', () => {
      safeParse.mockReturnValue({ targetUserId: 'me', moderatorName: 'Op' });
      getState.mockReturnValue({
        userId: 'me',
        isTransmitting: true,
        activeTransmitter: { userId: 'me' },
      });
      handleHangUp({ targetUserId: 'me' }, vi.fn());
      expect(setState).toHaveBeenCalledWith({ isTransmitting: false, progress: 0 });
    });

    it('clears activeTransmitter + calls clearWatchdog when tx matches target', () => {
      safeParse.mockReturnValue({ targetUserId: 'other' });
      getState.mockReturnValue({
        userId: 'me',
        isTransmitting: false,
        activeTransmitter: { userId: 'other' },
      });
      const clearWatchdog = vi.fn();
      handleHangUp({ targetUserId: 'other' }, clearWatchdog);
      expect(setState).toHaveBeenCalledWith({ activeTransmitter: null, progress: 0 });
      expect(clearWatchdog).toHaveBeenCalled();
    });
  });

  describe('handleKick', () => {
    it('moves to CH 302 when I am the kicked target', () => {
      safeParse.mockReturnValue({ targetUserId: 'me', reason: 'spam' });
      const setChannelNumber = vi.fn();
      getState.mockReturnValue({ userId: 'me', setChannelNumber });
      handleKick({ targetUserId: 'me', reason: 'spam' });
      expect(setChannelNumber).toHaveBeenCalledWith(302);
    });

    it('does nothing when target is someone else', () => {
      safeParse.mockReturnValue({ targetUserId: 'other', reason: 'x' });
      const setChannelNumber = vi.fn();
      getState.mockReturnValue({ userId: 'me', setChannelNumber });
      handleKick({ targetUserId: 'other', reason: 'x' });
      expect(setChannelNumber).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdateRole — security: broadcast is cache-only', () => {
    it('writes localStorage + dispatches event but does NOT set myChannelRole in store', () => {
      safeParse.mockReturnValue({ targetUserId: 'me', nextRole: 'noc' });
      const track = vi.fn().mockResolvedValue(undefined);
      const sub = { track } as any;
      handleUpdateRole({ targetUserId: 'me', nextRole: 'noc' }, 1, sub);
      // localStorage written
      expect(localStorage.getItem('channel-role:ptt-room-1:me')).toBe('noc');
      // store state NOT mutated with role
      expect(setState).not.toHaveBeenCalled();
      // presence track called with nextRole
      expect(track).toHaveBeenCalledWith(expect.objectContaining({ role: 'noc' }));
    });

    it('forged update_role for another user does not elevate my store role', () => {
      safeParse.mockReturnValue({ targetUserId: 'victim', nextRole: 'noc' });
      handleUpdateRole({ targetUserId: 'victim', nextRole: 'noc' }, 1, null);
      expect(localStorage.getItem('channel-role:ptt-room-1:victim')).toBe('noc');
      // no track (not me) + no store mutation
      expect(setState).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdateStatus', () => {
    it('maps normal -> active and writes localStorage', () => {
      safeParse.mockReturnValue({ targetUserId: 'me', statusType: 'normal' });
      const track = vi.fn().mockResolvedValue(undefined);
      handleUpdateStatus({ targetUserId: 'me', statusType: 'normal' }, 1, { track } as any);
      expect(localStorage.getItem('channel-status:ptt-room-1:me')).toBe('active');
      expect(track).toHaveBeenCalledWith(expect.objectContaining({ status: 'normal' }));
    });

    it('preserves non-normal statusType in localStorage', () => {
      safeParse.mockReturnValue({ targetUserId: 'me', statusType: 'muted' });
      handleUpdateStatus({ targetUserId: 'me', statusType: 'muted' }, 5, null);
      expect(localStorage.getItem('channel-status:ptt-room-5:me')).toBe('muted');
    });
  });
});
