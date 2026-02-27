import { describe, it, expect } from "vitest";
import {
  classifyError,
  DataForSEOError,
  AuthenticationError,
  RateLimitError,
  ConnectionError,
  QuotaExceededError,
} from "../errors";

function makeAxiosError(status: number, headers: Record<string, string> = {}) {
  return {
    response: { status, data: { message: "test" }, headers },
    message: `Request failed with status code ${status}`,
  };
}

function makeNetworkError(code: string) {
  return { code, message: `Network error: ${code}` };
}

describe("classifyError", () => {
  it("maps 401 to AuthenticationError", () => {
    const err = classifyError(makeAxiosError(401));
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.statusCode).toBe(401);
  });

  it("maps 403 to AuthenticationError", () => {
    const err = classifyError(makeAxiosError(403));
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("maps 429 to RateLimitError with default retryAfterMs", () => {
    const err = classifyError(makeAxiosError(429));
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBe(30_000);
  });

  it("maps 429 with retry-after header", () => {
    const err = classifyError(makeAxiosError(429, { "retry-after": "10" }));
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBe(10_000);
  });

  it("maps 402 to QuotaExceededError", () => {
    const err = classifyError(makeAxiosError(402));
    expect(err).toBeInstanceOf(QuotaExceededError);
  });

  it("maps 500 to generic DataForSEOError", () => {
    const err = classifyError(makeAxiosError(500));
    expect(err).toBeInstanceOf(DataForSEOError);
    expect(err.statusCode).toBe(500);
  });

  it("maps ECONNREFUSED to ConnectionError", () => {
    const err = classifyError(makeNetworkError("ECONNREFUSED"));
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it("maps ETIMEDOUT to ConnectionError", () => {
    const err = classifyError(makeNetworkError("ETIMEDOUT"));
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it("passes through existing DataForSEOError", () => {
    const original = new AuthenticationError("test", 401);
    expect(classifyError(original)).toBe(original);
  });

  it("handles plain Error", () => {
    const err = classifyError(new Error("something broke"));
    expect(err).toBeInstanceOf(DataForSEOError);
    expect(err.message).toBe("something broke");
  });

  it("handles string error", () => {
    const err = classifyError("raw string");
    expect(err).toBeInstanceOf(DataForSEOError);
    expect(err.message).toBe("raw string");
  });
});
