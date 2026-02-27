import type {
  TransformedKeywordOverview,
  TransformResult,
  MonthlySearch,
  BacklinksData,
} from "./types";
import { calculateTrend } from "../types";

/**
 * Transforms a single raw keyword overview item.
 */
function transformItem(
  item: Record<string, unknown>
): TransformedKeywordOverview {
  const keywordInfo = (item.keyword_info as Record<string, unknown>) ?? {};
  const keywordProps = (item.keyword_properties as Record<string, unknown>) ?? {};
  const intentInfo = (item.search_intent_info as Record<string, unknown>) ?? {};
  const backlinksInfo = (item.avg_backlinks_info as Record<string, unknown>) ?? {};
  const clickstreamInfo = (item.clickstream_keyword_info as Record<string, unknown>) ?? {};

  const monthlySearches: MonthlySearch[] = Array.isArray(keywordInfo.monthly_searches)
    ? (keywordInfo.monthly_searches as Array<Record<string, unknown>>).map((m) => ({
        year: (m.year as number) ?? 0,
        month: (m.month as number) ?? 0,
        search_volume: (m.search_volume as number) ?? 0,
      }))
    : [];

  const avgBacklinksData: BacklinksData | undefined =
    backlinksInfo.backlinks != null
      ? {
          backlinks: (backlinksInfo.backlinks as number) ?? 0,
          dofollowBacklinks: (backlinksInfo.dofollow as number) ?? 0,
          referringPages: (backlinksInfo.referring_pages as number) ?? 0,
          referringDomains: (backlinksInfo.referring_domains as number) ?? 0,
          pageRank: (backlinksInfo.rank as number) ?? 0,
          domainRank: (backlinksInfo.main_domain_rank as number) ?? 0,
        }
      : undefined;

  const genderDistribution = clickstreamInfo.gender_distribution as Record<string, number> | undefined;
  const ageDistribution = clickstreamInfo.age_distribution as Record<string, number> | undefined;

  return {
    keyword: (item.keyword as string) ?? "",
    location_code: (item.location_code as number) ?? 0,
    language_code: (item.language_code as string) ?? "",
    searchVolume: (keywordInfo.search_volume as number) ?? 0,
    ppc: (keywordInfo.competition as number) ?? 0,
    ppcLevel: (keywordInfo.competition_level as string) ?? "",
    cpc: (keywordInfo.cpc as number) ?? 0,
    lowTopPageBid: (keywordInfo.low_top_of_page_bid as number) ?? undefined,
    highTopPageBid: (keywordInfo.high_top_of_page_bid as number) ?? undefined,
    monthlySearches,
    searchVolumeTrend: calculateTrend(monthlySearches),
    searchIntent: (intentInfo.main_intent as string) ?? undefined,
    keywordDifficulty: (keywordProps.keyword_difficulty as number) ?? undefined,
    avgBacklinksData,
    genderDistribution: genderDistribution
      ? { male: genderDistribution.male ?? 0, female: genderDistribution.female ?? 0 }
      : undefined,
    ageDistribution,
  };
}

/**
 * Transforms raw DataForSEO keyword overview response to minimal UI format.
 * @param rawResponse - The full API response from keyword_overview/live endpoint
 * @returns Transformed result with metadata
 */
export function transformKeywordOverview(
  rawResponse: Record<string, unknown>
): TransformResult<TransformedKeywordOverview[]> {
  const tasks = rawResponse.tasks as Array<Record<string, unknown>> | undefined;
  const task = tasks?.[0];
  const result = (task?.result as Array<Record<string, unknown>>)?.[0];
  const items = (result?.items as Array<Record<string, unknown>>) ?? [];

  const data = items.map((item) => transformItem(item));

  return {
    data,
    totalResults: (result?.total_count as number) ?? data.length,
    cost: (rawResponse.cost as number) ?? 0,
    statusCode: (task?.status_code as number) ?? 0,
  };
}
