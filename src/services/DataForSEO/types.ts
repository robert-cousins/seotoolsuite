import type { MonthlySearch, SearchVolumeTrend } from "./transformers/types";

export const KeywordIntent = {
  INFORMATIONAL: "informational",
  NAVIGATIONAL: "navigational",
  COMMERCIAL: "commercial",
  TRANSACTIONAL: "transactional",
} as const;
export type KeywordIntent = (typeof KeywordIntent)[keyof typeof KeywordIntent];

export const CompetitionLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  VERY_HIGH: "VERY_HIGH",
} as const;
export type CompetitionLevel =
  (typeof CompetitionLevel)[keyof typeof CompetitionLevel];

export const TrendDirection = {
  UP: "up",
  DOWN: "down",
  STABLE: "stable",
} as const;
export type TrendDirection =
  (typeof TrendDirection)[keyof typeof TrendDirection];

export interface TrendAnalysis {
  direction: TrendDirection;
  seasonalityScore: number;
  growthRate: number;
}

export function classifyCompetitionLevel(score: number): CompetitionLevel {
  if (score < 0.2) return CompetitionLevel.LOW;
  if (score < 0.4) return CompetitionLevel.MEDIUM;
  if (score < 0.7) return CompetitionLevel.MEDIUM;
  if (score < 0.85) return CompetitionLevel.HIGH;
  return CompetitionLevel.VERY_HIGH;
}

const TRANSACTIONAL_PATTERNS =
  /\b(buy|purchase|order|price|pricing|cheap|deal|discount|coupon|shop|store|sale|subscribe|hire)\b/i;
const COMMERCIAL_PATTERNS =
  /\b(best|top|review|compare|comparison|vs|versus|alternative|recommend)\b/i;
const NAVIGATIONAL_PATTERNS =
  /\b(login|sign in|signin|sign up|signup|official|website|homepage|account|dashboard|app)\b/i;

export function classifyKeywordIntent(keyword: string): KeywordIntent {
  if (TRANSACTIONAL_PATTERNS.test(keyword)) return KeywordIntent.TRANSACTIONAL;
  if (COMMERCIAL_PATTERNS.test(keyword)) return KeywordIntent.COMMERCIAL;
  if (NAVIGATIONAL_PATTERNS.test(keyword)) return KeywordIntent.NAVIGATIONAL;
  return KeywordIntent.INFORMATIONAL;
}

export function calculateTrend(
  monthlySearches: MonthlySearch[],
): SearchVolumeTrend {
  if (!monthlySearches || monthlySearches.length === 0) {
    return { monthly: 0, quarterly: 0, yearly: 0 };
  }

  const sorted = [...monthlySearches].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const current = sorted[0]?.search_volume ?? 0;
  const lastMonth = sorted[1]?.search_volume ?? current;
  const threeMonthsAgo = sorted[3]?.search_volume ?? current;
  const twelveMonthsAgo = sorted[11]?.search_volume ?? current;

  const calcChange = (prev: number, curr: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    monthly: calcChange(lastMonth, current),
    quarterly: calcChange(threeMonthsAgo, current),
    yearly: calcChange(twelveMonthsAgo, current),
  };
}

export function analyzeTrend(monthlySearches: MonthlySearch[]): TrendAnalysis {
  if (!monthlySearches || monthlySearches.length < 2) {
    return { direction: TrendDirection.STABLE, seasonalityScore: 0, growthRate: 0 };
  }

  const sorted = [...monthlySearches].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  const volumes = sorted.map((m) => m.search_volume);

  // Growth rate: YoY if we have 12+ months, otherwise first vs last
  const current = volumes[volumes.length - 1] ?? 0;
  const compareIdx = volumes.length >= 12 ? volumes.length - 12 : 0;
  const previous = volumes[compareIdx] ?? 0;
  const growthRate =
    previous === 0
      ? current > 0
        ? 100
        : 0
      : Math.round(((current - previous) / previous) * 100);

  // Seasonality: coefficient of variation
  const mean = volumes.reduce((s, v) => s + v, 0) / volumes.length;
  const variance =
    volumes.reduce((s, v) => s + (v - mean) ** 2, 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  const seasonalityScore = mean === 0 ? 0 : Math.round((stdDev / mean) * 100) / 100;

  // Direction based on growth rate
  let direction: TrendDirection;
  if (growthRate > 10) direction = TrendDirection.UP;
  else if (growthRate < -10) direction = TrendDirection.DOWN;
  else direction = TrendDirection.STABLE;

  return { direction, seasonalityScore, growthRate };
}
