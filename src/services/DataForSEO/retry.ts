import {
  AuthenticationError,
  QuotaExceededError,
  RateLimitError,
  classifyError,
} from "./errors";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFraction: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
  backoffMultiplier: 2,
  jitterFraction: 0.25,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetry?: (error: unknown) => boolean,
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: unknown;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classified = classifyError(error);

      // Never retry auth or quota errors
      if (
        classified instanceof AuthenticationError ||
        classified instanceof QuotaExceededError
      ) {
        throw classified;
      }

      // Check custom shouldRetry
      if (shouldRetry && !shouldRetry(error)) {
        throw classified;
      }

      // No more retries left
      if (attempt >= cfg.maxRetries) {
        throw classified;
      }

      // Calculate delay
      let delayMs: number;
      if (classified instanceof RateLimitError) {
        delayMs = classified.retryAfterMs;
      } else {
        delayMs = Math.min(
          cfg.baseDelayMs * cfg.backoffMultiplier ** attempt,
          cfg.maxDelayMs,
        );
      }

      // Add jitter
      const jitter = delayMs * cfg.jitterFraction * (Math.random() * 2 - 1);
      delayMs = Math.max(0, Math.round(delayMs + jitter));

      await sleep(delayMs);
    }
  }

  throw classifyError(lastError);
}
