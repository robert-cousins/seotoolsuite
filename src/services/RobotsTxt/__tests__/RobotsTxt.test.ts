import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RobotsTxt } from "../index";
import { normalizeDomain, buildRobotsTxtUrl } from "../normalizer";
import { parseRobotsTxt } from "../parser";

describe("normalizeDomain", () => {
  it("should extract hostname from full URL", () => {
    expect(normalizeDomain("https://example.com/path?query=1").hostname).toBe(
      "example.com"
    );
    expect(normalizeDomain("http://example.com/").hostname).toBe("example.com");
  });

  it("should handle bare hostnames", () => {
    expect(normalizeDomain("example.com").hostname).toBe("example.com");
    expect(normalizeDomain("www.example.com").hostname).toBe("www.example.com");
  });

  it("should lowercase hostnames", () => {
    expect(normalizeDomain("EXAMPLE.COM").hostname).toBe("example.com");
    expect(normalizeDomain("Example.Com").hostname).toBe("example.com");
  });

  it("should strip ports", () => {
    expect(normalizeDomain("example.com:8080").hostname).toBe("example.com");
  });

  it("should reject IP addresses", () => {
    const result = normalizeDomain("192.168.1.1");
    expect(result.hostname).toBeNull();
    expect(result.error).toContain("IP addresses");
  });

  it("should reject localhost and private hostnames", () => {
    expect(normalizeDomain("localhost").hostname).toBeNull();
    expect(normalizeDomain("127.0.0.1").hostname).toBeNull();
    expect(normalizeDomain("myhost.local").hostname).toBeNull();
  });

  it("should reject empty input", () => {
    expect(normalizeDomain("").hostname).toBeNull();
    expect(normalizeDomain("   ").hostname).toBeNull();
  });

  it("should reject invalid hostnames", () => {
    expect(normalizeDomain("-invalid.com").hostname).toBeNull();
    expect(normalizeDomain("invalid-.com").hostname).toBeNull();
  });
});

describe("buildRobotsTxtUrl", () => {
  it("should build HTTPS URL by default", () => {
    expect(buildRobotsTxtUrl("example.com")).toBe(
      "https://example.com/robots.txt"
    );
  });

  it("should build HTTP URL when specified", () => {
    expect(buildRobotsTxtUrl("example.com", false)).toBe(
      "http://example.com/robots.txt"
    );
  });
});

describe("parseRobotsTxt", () => {
  it("should parse basic robots.txt", () => {
    const content = `
User-agent: *
Disallow: /admin
Disallow: /private
Allow: /public

Sitemap: https://example.com/sitemap.xml
    `;

    const result = parseRobotsTxt(content);

    expect(result.userAgents).toHaveLength(1);
    expect(result.userAgents[0].userAgent).toBe("*");
    expect(result.userAgents[0].disallow).toEqual(["/admin", "/private"]);
    expect(result.userAgents[0].allow).toEqual(["/public"]);
    expect(result.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });

  it("should handle case-insensitive directives", () => {
    const content = `
USER-AGENT: Googlebot
DISALLOW: /secret
ALLOW: /allowed
    `;

    const result = parseRobotsTxt(content);

    expect(result.userAgents).toHaveLength(1);
    expect(result.userAgents[0].userAgent).toBe("Googlebot");
  });

  it("should skip comments and blank lines", () => {
    const content = `
# This is a comment
User-agent: *

# Another comment
Disallow: /admin
    `;

    const result = parseRobotsTxt(content);

    expect(result.userAgents).toHaveLength(1);
    expect(result.userAgents[0].disallow).toEqual(["/admin"]);
    expect(result.issues).toHaveLength(0);
  });

  it("should handle inline comments", () => {
    const content = `
User-agent: * # all bots
Disallow: /admin # admin area
    `;

    const result = parseRobotsTxt(content);

    expect(result.userAgents[0].userAgent).toBe("*");
    expect(result.userAgents[0].disallow).toEqual(["/admin"]);
  });

  it("should dedupe sitemaps", () => {
    const content = `
Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap2.xml
    `;

    const result = parseRobotsTxt(content);

    expect(result.sitemaps).toHaveLength(2);
  });

  it("should flag invalid sitemap URLs", () => {
    const content = `
Sitemap: /sitemap.xml
Sitemap: ftp://example.com/sitemap.xml
    `;

    const result = parseRobotsTxt(content);

    expect(result.sitemaps).toHaveLength(0);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].type).toBe("malformed");
  });

  it("should flag malformed lines (no colon)", () => {
    const content = `
User-agent *
Disallow /admin
    `;

    const result = parseRobotsTxt(content);

    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].type).toBe("malformed");
    expect(result.issues[0].message).toContain("no colon");
  });

  it("should flag unknown directives as ignored", () => {
    const content = `
User-agent: *
Custom-directive: value
    `;

    const result = parseRobotsTxt(content);

    expect(result.issues.some((i) => i.type === "ignored")).toBe(true);
  });

  it("should handle multiple user-agent sections", () => {
    const content = `
User-agent: Googlebot
Disallow: /google-only

User-agent: Bingbot
Disallow: /bing-only
    `;

    const result = parseRobotsTxt(content);

    expect(result.userAgents).toHaveLength(2);
    expect(result.userAgents[0].userAgent).toBe("Googlebot");
    expect(result.userAgents[1].userAgent).toBe("Bingbot");
  });
});

describe("RobotsTxt.analyze", () => {
  let robotsTxt: RobotsTxt;

  beforeEach(() => {
    robotsTxt = new RobotsTxt();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return error for invalid domain", async () => {
    const result = await robotsTxt.analyze("");

    expect(result.status).toBe("error");
    expect(result.issues).toHaveLength(1);
  });

  it("should return error for IP address", async () => {
    const result = await robotsTxt.analyze("192.168.1.1");

    expect(result.status).toBe("error");
    expect(result.issues[0].message).toContain("IP addresses");
  });

  it("should handle 404 response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const result = await robotsTxt.analyze("example.com");

    expect(result.status).toBe("missing");
    expect(result.issues[0].type).toBe("missing");
  });

  it("should parse successful response", async () => {
    const robotsContent = `
User-agent: *
Disallow: /admin
Sitemap: https://example.com/sitemap.xml
    `;

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(robotsContent, { status: 200 })
    );

    const result = await robotsTxt.analyze("example.com");

    expect(result.status).toBe("found");
    expect(result.url).toBe("https://example.com/robots.txt");
    expect(result.userAgents).toHaveLength(1);
    expect(result.sitemaps).toHaveLength(1);
  });

  it("should fallback to HTTP on HTTPS failure", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("TLS error"))
      .mockResolvedValueOnce(
        new Response("User-agent: *\nDisallow:", { status: 200 })
      );

    const result = await robotsTxt.analyze("example.com");

    expect(result.status).toBe("found");
    expect(result.url).toBe("http://example.com/robots.txt");
    expect(result.issues.some((i) => i.message.includes("HTTP fallback"))).toBe(
      true
    );
  });

  it("should handle timeout", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    vi.mocked(fetch).mockRejectedValueOnce(abortError);

    const result = await robotsTxt.analyze("example.com");

    expect(result.status).toBe("unreachable");
    expect(result.issues[0].message).toContain("timed out");
  });

  it("should truncate large content", async () => {
    const largeContent = "x".repeat(300000);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(largeContent, { status: 200 })
    );

    const result = await robotsTxt.analyze("example.com");

    expect(result.status).toBe("found");
    expect(result.truncated).toBe(true);
    expect(result.rawContent?.length).toBe(262144);
    expect(result.issues[0].message).toContain("truncated");
  });
});
