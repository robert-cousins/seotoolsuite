import { describe, it, expect } from "vitest";
import { MetricsTracker } from "../metrics";

describe("MetricsTracker", () => {
  it("tracks successful requests", () => {
    const tracker = new MetricsTracker();
    tracker.recordRequest(100, 0.5, true);
    tracker.recordRequest(200, 0.3, true);

    const metrics = tracker.getMetrics();
    expect(metrics.requestsMade).toBe(2);
    expect(metrics.successfulRequests).toBe(2);
    expect(metrics.failedRequests).toBe(0);
    expect(metrics.creditsUsed).toBeCloseTo(0.8);
    expect(metrics.avgResponseTimeMs).toBe(150);
  });

  it("tracks failed requests", () => {
    const tracker = new MetricsTracker();
    tracker.recordRequest(50, 0, false);

    const metrics = tracker.getMetrics();
    expect(metrics.failedRequests).toBe(1);
    expect(metrics.successfulRequests).toBe(0);
  });

  it("tracks rate limit hits", () => {
    const tracker = new MetricsTracker();
    tracker.recordRateLimitHit();
    tracker.recordRateLimitHit();

    expect(tracker.getMetrics().rateLimitHits).toBe(2);
  });

  it("calculates average response time", () => {
    const tracker = new MetricsTracker();
    tracker.recordRequest(100, 0, true);
    tracker.recordRequest(300, 0, true);

    expect(tracker.getMetrics().avgResponseTimeMs).toBe(200);
  });

  it("returns 0 avg when no requests", () => {
    const tracker = new MetricsTracker();
    expect(tracker.getMetrics().avgResponseTimeMs).toBe(0);
  });

  it("resets all counters", () => {
    const tracker = new MetricsTracker();
    tracker.recordRequest(100, 1, true);
    tracker.recordRateLimitHit();
    tracker.reset();

    const metrics = tracker.getMetrics();
    expect(metrics.requestsMade).toBe(0);
    expect(metrics.creditsUsed).toBe(0);
    expect(metrics.rateLimitHits).toBe(0);
  });
});
