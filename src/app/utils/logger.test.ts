import { describe, it, expect, vi, afterEach } from 'vitest';
import { devLog, devWarn } from './logger';

describe('logger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('devLog is a function and does not throw when called', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(typeof devLog).toBe('function');
    expect(() => devLog('hello')).not.toThrow();
    // In vitest (production-like DEV=false) devLog is a no-op
    expect(spy).not.toHaveBeenCalled();
  });

  it('devWarn is a function and does not throw when called', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(typeof devWarn).toBe('function');
    expect(() => devWarn('careful')).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});
