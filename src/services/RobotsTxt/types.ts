export interface RobotsTxtResult {
  url: string;
  status: "found" | "missing" | "unreachable" | "error";
  rawContent?: string;
  truncated?: boolean;
  userAgents: UserAgentSection[];
  sitemaps: string[];
  issues: RobotsTxtIssue[];
}

export interface UserAgentSection {
  userAgent: string;
  disallow: string[];
  allow: string[];
}

export interface RobotsTxtIssue {
  type: "missing" | "malformed" | "unreachable" | "ignored";
  message: string;
  line?: number;
}
