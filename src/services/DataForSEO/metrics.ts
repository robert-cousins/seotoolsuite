export interface ApiMetrics {
  requestsMade: number;
  creditsUsed: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  avgResponseTimeMs: number;
}

export class MetricsTracker {
  private requestsMade = 0;
  private creditsUsed = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private rateLimitHits = 0;
  private totalResponseTimeMs = 0;

  recordRequest(durationMs: number, cost: number, success: boolean): void {
    this.requestsMade++;
    this.totalResponseTimeMs += durationMs;
    this.creditsUsed += cost;
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
  }

  recordRateLimitHit(): void {
    this.rateLimitHits++;
  }

  getMetrics(): ApiMetrics {
    return {
      requestsMade: this.requestsMade,
      creditsUsed: this.creditsUsed,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      rateLimitHits: this.rateLimitHits,
      avgResponseTimeMs:
        this.requestsMade > 0
          ? Math.round(this.totalResponseTimeMs / this.requestsMade)
          : 0,
    };
  }

  reset(): void {
    this.requestsMade = 0;
    this.creditsUsed = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.rateLimitHits = 0;
    this.totalResponseTimeMs = 0;
  }
}
