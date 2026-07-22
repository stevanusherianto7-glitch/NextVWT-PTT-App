import { describe, it, expect, vi } from 'vitest';
import {
  RateLimiter,
  pttRateLimiter,
  channelSwitchRateLimiter,
  broadcastRateLimiter,
} from './rateLimiter';

describe('rateLimiter', () => {
  it('allows up to maxRequests then blocks (ignoreTestEnv)', () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      blockDurationMs: 3000,
      ignoreTestEnv: true,
    });
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(false); // 4th blocked
  });

  it('resets after window elapses (fake timers)', () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter({
      maxRequests: 1,
      windowMs: 1000,
      blockDurationMs: 3000,
      ignoreTestEnv: true,
    });
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(false);
    // Block period is 3000ms; advance past window + block
    vi.advanceTimersByTime(4001);
    expect(limiter.canProceed()).toBe(true);
    vi.useRealTimers();
  });

  it('getRemaining decreases as requests proceed', () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
      blockDurationMs: 3000,
      ignoreTestEnv: true,
    });
    expect(limiter.getRemaining()).toBe(2);
    limiter.canProceed();
    expect(limiter.getRemaining()).toBe(1);
  });

  it('exports shared limiters as instances', () => {
    expect(pttRateLimiter).toBeInstanceOf(RateLimiter);
    expect(channelSwitchRateLimiter).toBeInstanceOf(RateLimiter);
    expect(broadcastRateLimiter).toBeInstanceOf(RateLimiter);
  });
});
