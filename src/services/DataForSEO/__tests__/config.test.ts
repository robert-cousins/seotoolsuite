import { describe, it, expect } from "vitest";
import { createConfig } from "../config";

describe("createConfig", () => {
  it("creates config with defaults", () => {
    const config = createConfig({ username: "user", password: "pass" });
    expect(config.username).toBe("user");
    expect(config.password).toBe("pass");
    expect(config.isSandbox).toBe(false);
    expect(config.enableCaching).toBe(false);
    expect(config.cachingDurationDays).toBe(30);
    expect(config.timeout).toBe(60_000);
    expect(config.maxRetries).toBe(3);
    expect(config.rateLimitPerMinute).toBe(30);
  });

  it("accepts custom values", () => {
    const config = createConfig({
      username: "user",
      password: "pass",
      isSandbox: true,
      maxRetries: 5,
      timeout: 30_000,
    });
    expect(config.isSandbox).toBe(true);
    expect(config.maxRetries).toBe(5);
    expect(config.timeout).toBe(30_000);
  });

  it("rejects empty username", () => {
    expect(() => createConfig({ username: "", password: "pass" })).toThrow(
      "Invalid DataForSEO config",
    );
  });

  it("rejects empty password", () => {
    expect(() => createConfig({ username: "user", password: "" })).toThrow(
      "Invalid DataForSEO config",
    );
  });

  it("rejects negative timeout", () => {
    expect(() =>
      createConfig({ username: "user", password: "pass", timeout: -1 }),
    ).toThrow("Invalid DataForSEO config");
  });
});
