import axios from "axios";
import UpstashRedis from "@/services/UpstashRedis";
import { getLocalStorageItem } from "@/utils/localStorage";
import {
  transformKeywordSuggestions,
  transformKeywordOverview,
  transformDomainKeywords,
  type TransformResult,
  type TransformedKeywordSuggestion,
  type TransformedKeywordOverview,
  type TransformedDomainKeyword,
} from "./transformers";
import { createConfig, type DataForSEOConfig } from "./config";
import { RateLimiter } from "./rate-limiter";
import { MetricsTracker, type ApiMetrics } from "./metrics";
import { withRetry } from "./retry";
import { classifyError, RateLimitError } from "./errors";

/**
 * DataForSEO service.
 */
class DataForSEO {
  private API_BASE_URL: string;
  private config: DataForSEOConfig;
  private authHeader: string;
  private sandboxEnabled: boolean;
  private enableCaching: boolean;
  private cachingDuration: number;
  private upstashRedis?: UpstashRedis;
  private rateLimiter: RateLimiter;
  private metrics: MetricsTracker;

  constructor(
    username: string,
    password: string,
    isSandbox: boolean = false,
    enableCaching: boolean = false,
  ) {
    this.config = createConfig({
      username,
      password,
      isSandbox,
      enableCaching,
    });

    this.API_BASE_URL = isSandbox
      ? "https://sandbox.dataforseo.com/v3"
      : "https://api.dataforseo.com/v3";

    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    this.sandboxEnabled = isSandbox;
    this.enableCaching = enableCaching;
    this.cachingDuration = Number(
      getLocalStorageItem("CACHING_DURATION") ?? 30,
    );

    if (!this.sandboxEnabled && enableCaching) {
      this.upstashRedis = new UpstashRedis();
    }

    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
    this.metrics = new MetricsTracker();
  }

  private async request<T>(
    method: "get" | "post",
    path: string,
    data?: unknown,
  ): Promise<T> {
    const rateCheck = this.rateLimiter.canProceed();
    if (!rateCheck.allowed) {
      this.metrics.recordRateLimitHit();
      this.rateLimiter.recordRateLimitHit();
      throw new RateLimitError(
        "Rate limit exceeded",
        429,
        rateCheck.retryAfterMs!,
      );
    }

    const start = Date.now();
    try {
      const response =
        method === "get"
          ? await axios.get<T>(`${this.API_BASE_URL}${path}`, {
              headers: { Authorization: this.authHeader },
              timeout: this.config.timeout,
            })
          : await axios.post<T>(`${this.API_BASE_URL}${path}`, data, {
              headers: { Authorization: this.authHeader },
              timeout: this.config.timeout,
            });

      const duration = Date.now() - start;
      const cost = (response.data as Record<string, unknown>)?.cost as number ?? 0;
      this.metrics.recordRequest(duration, cost, true);
      this.rateLimiter.recordSuccess();
      return response.data;
    } catch (error) {
      const duration = Date.now() - start;
      this.metrics.recordRequest(duration, 0, false);
      throw classifyError(error);
    }
  }

  private async withCache<T>(
    cacheKey: string,
    fn: () => Promise<T>,
    shouldCache: (result: T) => boolean = () => true,
  ): Promise<T> {
    if (!this.sandboxEnabled && this.enableCaching && this.upstashRedis) {
      try {
        const cached = await this.upstashRedis.getData(cacheKey);
        if (cached) return JSON.parse(cached) as T;
      } catch (error) {
        console.error(error);
      }
    }

    const result = await fn();

    if (
      !this.sandboxEnabled &&
      this.enableCaching &&
      this.upstashRedis &&
      shouldCache(result)
    ) {
      try {
        this.upstashRedis.setData(
          cacheKey,
          JSON.stringify(result),
          60 * 60 * 24 * this.cachingDuration,
        );
      } catch (error) {
        console.error(error);
      }
    }

    return result;
  }

  /**
   * Get session API metrics.
   */
  getMetrics(): ApiMetrics {
    return this.metrics.getMetrics();
  }

  /**
   * Get user data.
   */
  async getUserData() {
    return withRetry(
      () => this.request("get", "/appendix/user_data"),
      { maxRetries: this.config.maxRetries },
    );
  }

  /**
   * Get account balance.
   */
  async getAccountBalance(): Promise<number | null> {
    const data: any = await withRetry(
      () => this.request("get", "/appendix/user_data"),
      { maxRetries: this.config.maxRetries },
    );

    const balance = data?.tasks?.[0]?.result?.[0]?.money?.balance ?? null;
    return balance as number | null;
  }

  /**
   * Get keyword suggestions.
   * Returns transformed data with only the fields needed by the UI.
   */
  async getKeywordSuggestions(
    keyword: string,
    location_code: number,
    language_code: string = "any",
    filters: Array<unknown> = [],
    limit: number = 50,
    offset: number = 0,
  ): Promise<TransformResult<TransformedKeywordSuggestion[]>> {
    const cacheKey = btoa(
      `keyword-suggestions-v2-${keyword}-${location_code}-${language_code}-${JSON.stringify(filters)}-${limit}-${offset}`,
    );

    return this.withCache(
      cacheKey,
      async () => {
        const apiData = await withRetry(
          () =>
            this.request<Record<string, unknown>>(
              "post",
              "/dataforseo_labs/google/keyword_suggestions/live",
              [
                {
                  keyword,
                  location_code,
                  ...(language_code !== "any" ? { language_code } : {}),
                  ...(filters && filters.length > 0 ? { filters } : {}),
                  limit,
                  offset,
                  order_by: ["keyword_info.search_volume,desc"],
                },
              ],
            ),
          { maxRetries: this.config.maxRetries },
        );

        const transformed = transformKeywordSuggestions(apiData);

        console.log("[DataForSEO] getKeywordSuggestions response:", {
          task_status_code: transformed.statusCode,
          result_count: transformed.data.length,
          total_results: transformed.totalResults,
        });

        return transformed;
      },
      (result) => result.statusCode === 20000,
    );
  }

  /**
   * Get keywords overview.
   * Returns transformed data with only the fields needed by the UI.
   */
  async getKeywordsOverview(
    keywords: string[],
    location_code: number,
    language_code: string = "en",
    includeClickstreamData: boolean = false,
  ): Promise<TransformResult<TransformedKeywordOverview[]>> {
    const cacheKey = btoa(
      `keywords-overview-v2-${JSON.stringify(keywords)}-${location_code}-${language_code}-${includeClickstreamData}`,
    );

    return this.withCache(
      cacheKey,
      async () => {
        const apiData = await withRetry(
          () =>
            this.request<Record<string, unknown>>(
              "post",
              "/dataforseo_labs/google/keyword_overview/live",
              [
                {
                  keywords,
                  location_code,
                  language_code,
                  include_clickstream_data: includeClickstreamData,
                },
              ],
            ),
          { maxRetries: this.config.maxRetries },
        );

        const transformed = transformKeywordOverview(apiData);

        console.log("[DataForSEO] getKeywordsOverview response:", {
          task_status_code: transformed.statusCode,
          result_count: transformed.data.length,
        });

        return transformed;
      },
      (result) => result.statusCode === 20000,
    );
  }

  /**
   * Get keywords for a domain (ranked keywords).
   * Returns transformed data with only the fields needed by the UI.
   */
  async getKeywordsForDomain(
    target: string,
    location_code: number,
    language_code: string = "en",
    limit: number = 20,
    offset: number = 0,
  ): Promise<TransformResult<TransformedDomainKeyword[]>> {
    const cacheKey = btoa(
      `keywords-for-domain-v2-${target}-${location_code}-${language_code}-${limit}-${offset}`,
    );

    return this.withCache(
      cacheKey,
      async () => {
        const normalizedTarget = target.startsWith("http")
          ? target
          : `https://${target}/`;

        const apiData = await withRetry(
          () =>
            this.request<Record<string, unknown>>(
              "post",
              "/keywords_data/google_ads/keywords_for_site/live",
              [
                {
                  target: normalizedTarget,
                  location_code,
                  language_code,
                  sort_by: "search_volume",
                  search_partners: false,
                  include_adult_keywords: false,
                },
              ],
            ),
          { maxRetries: this.config.maxRetries },
        );

        const transformed = transformDomainKeywords(apiData);

        console.log("[DataForSEO] getKeywordsForDomain response:", {
          task_status_code: transformed.statusCode,
          result_count: transformed.data.length,
          total_results: transformed.totalResults,
        });

        return transformed;
      },
      (result) => result.statusCode === 20000,
    );
  }
}

export default DataForSEO;
