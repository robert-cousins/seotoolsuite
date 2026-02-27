import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter(5);
    for (let i = 0; i < 5; i++) {
      expect(limiter.canProceed().allowed).toBe(true);
    }
  });

  it("blocks when limit is reached", () => {
    const limiter = new RateLimiter(3);
    limiter.canProceed();
    limiter.canProceed();
    limiter.canProceed();
    const result = limiter.canProceed();
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows requests after window expires", () => {
    const limiter = new RateLimiter(2);
    limiter.canProceed();
    limiter.canProceed();
    expect(limiter.canProceed().allowed).toBe(false);

    vi.advanceTimersByTime(60_000);
    expect(limiter.canProceed().allowed).toBe(true);
  });

  it("detects burst within 10s window", () => {
    const limiter = new RateLimiter(100, 3); // high per-minute, low burst
    limiter.canProceed();
    limiter.canProceed();
    limiter.canProceed();
    const result = limiter.canProceed();
    expect(result.allowed).toBe(false);
  });

  it("applies escalating backoff on rate limit hits", () => {
    const limiter = new RateLimiter(100);

    limiter.recordRateLimitHit(); // 30s backoff
    const result1 = limiter.canProceed();
    expect(result1.allowed).toBe(false);

    vi.advanceTimersByTime(30_000);
    expect(limiter.canProceed().allowed).toBe(true);

    limiter.recordRateLimitHit(); // 60s backoff
    vi.advanceTimersByTime(30_000);
    expect(limiter.canProceed().allowed).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(limiter.canProceed().allowed).toBe(true);
  });

  it("resets consecutive hits on success", () => {
    const limiter = new RateLimiter(100);
    limiter.recordRateLimitHit();
    limiter.recordRateLimitHit();
    limiter.recordSuccess();

    vi.advanceTimersByTime(120_000); // past any backoff
    limiter.recordRateLimitHit(); // should be 30s again, not 120s
    vi.advanceTimersByTime(30_000);
    expect(limiter.canProceed().allowed).toBe(true);
  });
});
