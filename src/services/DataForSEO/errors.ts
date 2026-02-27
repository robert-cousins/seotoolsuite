import type { AxiosError } from "axios";

export class DataForSEOError extends Error {
  readonly statusCode: number;
  readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown) {
    super(message);
    this.name = "DataForSEOError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class AuthenticationError extends DataForSEOError {
  constructor(message: string, statusCode: number, responseBody?: unknown) {
    super(message, statusCode, responseBody);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends DataForSEOError {
  readonly retryAfterMs: number;

  constructor(
    message: string,
    statusCode: number,
    retryAfterMs: number,
    responseBody?: unknown,
  ) {
    super(message, statusCode, responseBody);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class ConnectionError extends DataForSEOError {
  constructor(message: string, responseBody?: unknown) {
    super(message, 0, responseBody);
    this.name = "ConnectionError";
  }
}

export class QuotaExceededError extends DataForSEOError {
  constructor(message: string, statusCode: number, responseBody?: unknown) {
    super(message, statusCode, responseBody);
    this.name = "QuotaExceededError";
  }
}

export function classifyError(error: unknown): DataForSEOError {
  if (error instanceof DataForSEOError) return error;

  const axiosError = error as AxiosError;

  if (axiosError.response) {
    const status = axiosError.response.status;
    const body = axiosError.response.data;
    const message = axiosError.message || `HTTP ${status}`;

    if (status === 401 || status === 403) {
      return new AuthenticationError(message, status, body);
    }

    if (status === 429) {
      const retryHeader = axiosError.response.headers?.["retry-after"];
      const retryAfterMs = retryHeader
        ? Number(retryHeader) * 1000
        : 30_000;
      return new RateLimitError(message, status, retryAfterMs, body);
    }

    if (status === 402) {
      return new QuotaExceededError(message, status, body);
    }

    return new DataForSEOError(message, status, body);
  }

  if (axiosError.code === "ECONNREFUSED" || axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT" || axiosError.code === "ERR_NETWORK") {
    return new ConnectionError(axiosError.message || "Network error");
  }

  if (error instanceof Error) {
    return new DataForSEOError(error.message, 0);
  }

  return new DataForSEOError(String(error), 0);
}
