import { devWarn } from './logger';

interface RateLimitConfig {
  maxRequests: number; // Max requests dalam window
  windowMs: number; // Window duration dalam milliseconds
  blockDurationMs: number; // Block duration jika limit exceeded
  ignoreTestEnv?: boolean; // Set true untuk memaksa berjalan di lingkungan test
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10, // 10 request
  windowMs: 1000, // per 1 detik
  blockDurationMs: 5000, // block 5 detik jika exceeded
  ignoreTestEnv: false,
};

export class RateLimiter {
  private timestamps: number[] = [];
  private blockedUntil: number = 0;
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Cek apakah request diizinkan
   * @returns true jika diizinkan, false jika rate limited
   */
  canProceed(): boolean {
    const isTest =
      (typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');

    if (isTest && !this.config.ignoreTestEnv) {
      return true;
    }

    const now = Date.now();

    // Jika masih dalam periode block
    if (now < this.blockedUntil) {
      return false;
    }

    // Hapus timestamp lama di luar window
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.config.windowMs);

    // Cek apakah sudah melebihi limit
    if (this.timestamps.length >= this.config.maxRequests) {
      this.blockedUntil = now + this.config.blockDurationMs;
      devWarn('[RateLimiter] Rate limit exceeded. Blocked until:', new Date(this.blockedUntil));
      return false;
    }

    // Record timestamp
    this.timestamps.push(now);
    return true;
  }

  /**
   * Get sisa requests yang diizinkan dalam window
   */
  getRemaining(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - this.timestamps.length);
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.timestamps = [];
    this.blockedUntil = 0;
  }
}

// Pre-configured limiters untuk berbagai use case
export const pttRateLimiter = new RateLimiter({
  maxRequests: 6, // 6 PTT press per detik
  windowMs: 1000,
  blockDurationMs: 3000,
});

export const channelSwitchRateLimiter = new RateLimiter({
  maxRequests: 3, // 3 channel switch per detik
  windowMs: 1000,
  blockDurationMs: 2000,
});

export const broadcastRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 broadcast per detik
  windowMs: 1000,
  blockDurationMs: 5000,
});
