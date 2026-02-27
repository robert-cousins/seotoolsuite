import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../retry";
import { AuthenticationError, QuotaExceededError, DataForSEOError } from "../errors";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 1,
      jitterFraction: 0,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, jitterFraction: 0 }),
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("never retries AuthenticationError", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new AuthenticationError("bad creds", 401));
    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 1 }),
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("never retries QuotaExceededError", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new QuotaExceededError("no balance", 402));
    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 1 }),
    ).rejects.toBeInstanceOf(QuotaExceededError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("respects custom shouldRetry predicate", async () => {
    const fn = vi.fn().mockRejectedValue(new DataForSEOError("custom", 500));
    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 1 }, () => false),
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
