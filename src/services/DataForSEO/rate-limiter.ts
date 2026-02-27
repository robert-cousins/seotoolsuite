export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export class RateLimiter {
  private readonly maxPerMinute: number;
  private readonly burstMax: number;
  private readonly burstWindowMs: number;
  private timestamps: number[] = [];
  private consecutiveHits = 0;
  private backoffUntil = 0;

  constructor(maxPerMinute: number = 30, burstMax: number = 10) {
    this.maxPerMinute = maxPerMinute;
    this.burstMax = burstMax;
    this.burstWindowMs = 10_000;
  }

  canProceed(): RateLimitResult {
    const now = Date.now();

    if (now < this.backoffUntil) {
      return { allowed: false, retryAfterMs: this.backoffUntil - now };
    }

    // Clean timestamps outside 60s window
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);

    if (this.timestamps.length >= this.maxPerMinute) {
      const oldest = this.timestamps[0]!;
      return { allowed: false, retryAfterMs: 60_000 - (now - oldest) };
    }

    // Check burst window
    const recentCount = this.timestamps.filter(
      (t) => now - t < this.burstWindowMs,
    ).length;
    if (recentCount >= this.burstMax) {
      const oldestBurst = this.timestamps.find(
        (t) => now - t < this.burstWindowMs,
      )!;
      return {
        allowed: false,
        retryAfterMs: this.burstWindowMs - (now - oldestBurst),
      };
    }

    this.timestamps.push(now);
    return { allowed: true };
  }

  recordRateLimitHit(): void {
    this.consecutiveHits++;
    const backoffSeconds = Math.min(30 * 2 ** (this.consecutiveHits - 1), 300);
    this.backoffUntil = Date.now() + backoffSeconds * 1000;
  }

  recordSuccess(): void {
    this.consecutiveHits = 0;
  }
}
