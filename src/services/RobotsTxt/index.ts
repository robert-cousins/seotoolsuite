import type { RobotsTxtResult } from "./types";
import { normalizeDomain, buildRobotsTxtUrl } from "./normalizer";
import { parseRobotsTxt } from "./parser";

const MAX_CONTENT_SIZE = 262144; // 256KB
const TIMEOUT_MS = 10000; // 10 seconds

export type { RobotsTxtResult, UserAgentSection, RobotsTxtIssue } from "./types";
export { normalizeDomain, buildRobotsTxtUrl } from "./normalizer";
export { parseRobotsTxt } from "./parser";

export class RobotsTxt {
  private async fetchWithTimeout(
    url: string,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async analyze(domain: string): Promise<RobotsTxtResult> {
    const normResult = normalizeDomain(domain);

    if (!normResult.hostname) {
      return {
        url: "",
        status: "error",
        userAgents: [],
        sitemaps: [],
        issues: [
          {
            type: "malformed",
            message: normResult.error || "Invalid domain",
          },
        ],
      };
    }

    const hostname = normResult.hostname;

    // Try HTTPS first
    let url = buildRobotsTxtUrl(hostname, true);
    let response: Response | null = null;
    let usedHttpFallback = false;

    try {
      response = await this.fetchWithTimeout(url, TIMEOUT_MS);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          url,
          status: "unreachable",
          userAgents: [],
          sitemaps: [],
          issues: [
            {
              type: "unreachable",
              message: "Request timed out after 10s",
            },
          ],
        };
      }

      // Try HTTP fallback
      url = buildRobotsTxtUrl(hostname, false);
      usedHttpFallback = true;

      try {
        response = await this.fetchWithTimeout(url, TIMEOUT_MS);
      } catch (fallbackError) {
        if (
          fallbackError instanceof Error &&
          fallbackError.name === "AbortError"
        ) {
          return {
            url,
            status: "unreachable",
            userAgents: [],
            sitemaps: [],
            issues: [
              {
                type: "unreachable",
                message: "Request timed out after 10s",
              },
            ],
          };
        }

        return {
          url,
          status: "unreachable",
          userAgents: [],
          sitemaps: [],
          issues: [
            {
              type: "unreachable",
              message: `Failed to fetch robots.txt: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
            },
          ],
        };
      }
    }

    if (!response) {
      return {
        url,
        status: "unreachable",
        userAgents: [],
        sitemaps: [],
        issues: [
          {
            type: "unreachable",
            message: "No response received",
          },
        ],
      };
    }

    // Handle HTTP status codes
    if (response.status === 404) {
      return {
        url,
        status: "missing",
        userAgents: [],
        sitemaps: [],
        issues: [
          {
            type: "missing",
            message: "robots.txt not found (404)",
          },
        ],
      };
    }

    if (!response.ok) {
      return {
        url,
        status: "error",
        userAgents: [],
        sitemaps: [],
        issues: [
          {
            type: "unreachable",
            message: `HTTP error: ${response.status} ${response.statusText}`,
          },
        ],
      };
    }

    // Read content
    let rawContent = await response.text();
    let truncated = false;

    if (rawContent.length > MAX_CONTENT_SIZE) {
      rawContent = rawContent.substring(0, MAX_CONTENT_SIZE);
      truncated = true;
    }

    // Parse content
    const parseResult = parseRobotsTxt(rawContent);

    const issues = [...parseResult.issues];

    if (truncated) {
      issues.unshift({
        type: "malformed",
        message: "robots.txt truncated (exceeded 256KB limit)",
      });
    }

    if (usedHttpFallback) {
      issues.push({
        type: "ignored",
        message: "HTTPS failed, used HTTP fallback",
      });
    }

    return {
      url,
      status: "found",
      rawContent,
      truncated,
      userAgents: parseResult.userAgents,
      sitemaps: parseResult.sitemaps,
      issues,
    };
  }
}

export default RobotsTxt;
