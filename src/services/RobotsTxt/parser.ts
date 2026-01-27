import type { UserAgentSection, RobotsTxtIssue } from "./types";

export interface ParseResult {
  userAgents: UserAgentSection[];
  sitemaps: string[];
  issues: RobotsTxtIssue[];
}

const KNOWN_DIRECTIVES = [
  "user-agent",
  "disallow",
  "allow",
  "sitemap",
  "crawl-delay",
  "host",
];

export function parseRobotsTxt(content: string): ParseResult {
  const userAgents: UserAgentSection[] = [];
  const sitemaps: string[] = [];
  const issues: RobotsTxtIssue[] = [];
  const seenSitemaps = new Set<string>();

  let currentSection: UserAgentSection | null = null;
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    let line = lines[i].trim();

    // Skip empty lines (they also end a user-agent group conceptually)
    if (!line) {
      continue;
    }

    // Skip comments
    if (line.startsWith("#")) {
      continue;
    }

    // Remove inline comments
    const commentIndex = line.indexOf("#");
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex).trim();
    }

    // Parse directive
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      issues.push({
        type: "malformed",
        message: `Malformed line (no colon): ${line}`,
        line: lineNumber,
      });
      continue;
    }

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    switch (directive) {
      case "user-agent":
        // Start a new section
        currentSection = {
          userAgent: value || "*",
          disallow: [],
          allow: [],
        };
        userAgents.push(currentSection);
        break;

      case "disallow":
        if (currentSection) {
          currentSection.disallow.push(value);
        } else {
          // Disallow without a user-agent, create a default section
          currentSection = {
            userAgent: "*",
            disallow: [value],
            allow: [],
          };
          userAgents.push(currentSection);
        }
        break;

      case "allow":
        if (currentSection) {
          currentSection.allow.push(value);
        } else {
          currentSection = {
            userAgent: "*",
            disallow: [],
            allow: [value],
          };
          userAgents.push(currentSection);
        }
        break;

      case "sitemap":
        // Validate sitemap URL
        if (value.startsWith("http://") || value.startsWith("https://")) {
          if (!seenSitemaps.has(value)) {
            seenSitemaps.add(value);
            sitemaps.push(value);
          }
        } else if (value) {
          issues.push({
            type: "malformed",
            message: `Invalid sitemap URL (must start with http:// or https://): ${value}`,
            line: lineNumber,
          });
        }
        break;

      case "crawl-delay":
      case "host":
        // Known but ignored directives
        issues.push({
          type: "ignored",
          message: `Ignored directive: ${directive}`,
          line: lineNumber,
        });
        break;

      default:
        // Unknown directive
        if (!KNOWN_DIRECTIVES.includes(directive)) {
          issues.push({
            type: "ignored",
            message: `Unknown directive ignored: ${directive}`,
            line: lineNumber,
          });
        }
        break;
    }
  }

  return { userAgents, sitemaps, issues };
}
