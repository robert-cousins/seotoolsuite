const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const PRIVATE_HOSTNAMES = ["localhost", "127.0.0.1", "0.0.0.0"];

export interface NormalizationResult {
  hostname: string | null;
  error?: string;
}

export function normalizeDomain(input: string): NormalizationResult {
  if (!input || typeof input !== "string") {
    return { hostname: null, error: "Invalid input: empty or not a string" };
  }

  let hostname = input.trim();

  // Strip protocol if present
  if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
    try {
      const url = new URL(hostname);
      hostname = url.hostname;
    } catch {
      return { hostname: null, error: "Invalid URL format" };
    }
  }

  // Strip paths, query strings, fragments
  const slashIndex = hostname.indexOf("/");
  if (slashIndex !== -1) {
    hostname = hostname.substring(0, slashIndex);
  }

  // Strip port if present
  const colonIndex = hostname.indexOf(":");
  if (colonIndex !== -1) {
    hostname = hostname.substring(0, colonIndex);
  }

  // Strip trailing dots
  hostname = hostname.replace(/\.+$/, "");

  // Lowercase
  hostname = hostname.toLowerCase();

  // Validate: reject empty
  if (!hostname) {
    return { hostname: null, error: "Empty hostname after normalization" };
  }

  // Reject IP addresses
  if (IP_REGEX.test(hostname)) {
    return { hostname: null, error: "IP addresses are not allowed" };
  }

  // Reject private/localhost hostnames
  if (
    PRIVATE_HOSTNAMES.includes(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost")
  ) {
    return {
      hostname: null,
      error: "Private/localhost hostnames are not allowed",
    };
  }

  // Basic hostname validation (alphanumeric, hyphens, dots)
  const validHostnameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
  if (!validHostnameRegex.test(hostname)) {
    return { hostname: null, error: "Invalid hostname format" };
  }

  return { hostname };
}

export function buildRobotsTxtUrl(hostname: string, useHttps: boolean = true): string {
  const protocol = useHttps ? "https" : "http";
  return `${protocol}://${hostname}/robots.txt`;
}
