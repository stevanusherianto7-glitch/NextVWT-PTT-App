import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  safeGetStorage,
  safeSetStorage,
  generateUUID,
  getChannelUUID,
  generateRandomCallSign,
  pickPersistedState,
  clearChannelOverrides,
  PERSISTED_KEYS,
} from './storeUtils';

describe('storeUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('safeGetStorage / safeSetStorage', () => {
    it('returns null when storage empty', () => {
      expect(safeGetStorage()).toBeNull();
    });

    it('round-trips partial state', () => {
      safeSetStorage({ channelNumber: 5, callSign: 'ABC12' } as never);
      const got = safeGetStorage();
      expect(got?.channelNumber).toBe(5);
      expect(got?.callSign).toBe('ABC12');
    });

    it('merges with existing partial', () => {
      safeSetStorage({ channelNumber: 1 } as never);
      safeSetStorage({ callSign: 'ZZ99' } as never);
      const got = safeGetStorage();
      expect(got?.channelNumber).toBe(1);
      expect(got?.callSign).toBe('ZZ99');
    });

    it('returns null on corrupted JSON', () => {
      localStorage.setItem('nextvwt_settings', '{not json');
      expect(safeGetStorage()).toBeNull();
    });
  });

  describe('generateUUID', () => {
    it('returns RFC4122 v4 shape', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('produces unique values', () => {
      const a = generateUUID();
      const b = generateUUID();
      expect(a).not.toBe(b);
    });
  });

  describe('getChannelUUID', () => {
    it('maps channel number to deterministic UUID', () => {
      expect(getChannelUUID(1)).toBe('00000000-0000-4000-8000-000000000001');
      expect(getChannelUUID(123)).toBe('00000000-0000-4000-8000-000000000123');
    });
  });

  describe('generateRandomCallSign', () => {
    it('is 5 uppercase alphanumeric chars', () => {
      const cs = generateRandomCallSign();
      expect(cs).toMatch(/^[A-Z0-9]{5}$/);
    });
  });

  describe('pickPersistedState', () => {
    it('keeps only PERSISTED_KEYS present in state', () => {
      const state = {
        channelNumber: 7,
        callSign: 'AB1CD',
        isPowerOn: true, // not persisted
        activeTransmitter: { userId: 'x' }, // not persisted
      } as never;
      const picked = pickPersistedState(state);
      expect(picked).toHaveProperty('channelNumber', 7);
      expect(picked).toHaveProperty('callSign', 'AB1CD');
      expect(picked).not.toHaveProperty('isPowerOn');
    });

    it('PERSISTED_KEYS is a non-empty array', () => {
      expect(Array.isArray(PERSISTED_KEYS)).toBe(true);
      expect(PERSISTED_KEYS.length).toBeGreaterThan(0);
    });
  });

  describe('clearChannelOverrides', () => {
    it('removes matching channel-status / channel-role keys from localStorage', () => {
      localStorage.setItem('channel-status:ptt-room-3:abc', '1');
      localStorage.setItem('channel-role:ptt-room-3:abc', 'mod');
      localStorage.setItem('unrelated-key', 'keep');
      clearChannelOverrides(3);
      expect(localStorage.getItem('channel-status:ptt-room-3:abc')).toBeNull();
      expect(localStorage.getItem('channel-role:ptt-room-3:abc')).toBeNull();
      expect(localStorage.getItem('unrelated-key')).toBe('keep');
    });

    it('removes matching keys from sessionStorage too', () => {
      sessionStorage.setItem('channel-status:ptt-room-9:xyz', '1');
      clearChannelOverrides(9);
      expect(sessionStorage.getItem('channel-status:ptt-room-9:xyz')).toBeNull();
    });
  });
});
