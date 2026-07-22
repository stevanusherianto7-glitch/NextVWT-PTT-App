import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assertCooldown } from './rateLimit';

describe('rateLimit/assertCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  it('allows first call (no prior timestamp)', () => {
    expect(() => assertCooldown('first-call', 1000, 'slow')).not.toThrow();
  });

  it('throws when called within cooldown window', () => {
    assertCooldown('within', 1000, 'slow');
    expect(() => assertCooldown('within', 1000, 'slow')).toThrow('slow');
  });

  it('allows again after cooldown elapses', () => {
    assertCooldown('elapse', 1000, 'slow');
    vi.advanceTimersByTime(1001);
    expect(() => assertCooldown('elapse', 1000, 'slow')).not.toThrow();
  });

  it('different keys tracked independently', () => {
    assertCooldown('keyA', 1000, 'slow');
    expect(() => assertCooldown('keyB', 1000, 'slow')).not.toThrow();
  });
});
