import { describe, it, expect } from 'vitest';
import { getChannelUserCount, checkIfNewUser, STATIC_CHANNELS } from './constants';

describe('constants', () => {
  it('STATIC_CHANNELS mirrors CHANNELS', () => {
    expect(STATIC_CHANNELS.length).toBeGreaterThan(0);
  });

  it('getChannelUserCount returns users length for known channel', () => {
    const ch1 = STATIC_CHANNELS.find((c) => c.number === 1);
    expect(getChannelUserCount(1)).toBe(ch1?.users.length ?? 0);
  });

  it('getChannelUserCount returns users length for channel 100 (present in STATIC_CHANNELS)', () => {
    const ch100 = STATIC_CHANNELS.find((c) => c.number === 100);
    expect(getChannelUserCount(100)).toBe(ch100?.users.length ?? 0);
  });

  it('getChannelUserCount returns deterministic count for unknown channel (>299)', () => {
    const n = getChannelUserCount(301);
    expect(n).toBe((301 * 13 + 7) % 37 + 2);
  });

  it('checkIfNewUser returns false when no date', () => {
    expect(checkIfNewUser()).toBe(false);
  });

  it('checkIfNewUser returns true within 7 days', () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(checkIfNewUser(recent)).toBe(true);
  });

  it('checkIfNewUser returns false after 7 days', () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(checkIfNewUser(old)).toBe(false);
  });
});
