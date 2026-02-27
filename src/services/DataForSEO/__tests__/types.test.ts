import { describe, it, expect } from "vitest";
import {
  calculateTrend,
  analyzeTrend,
  classifyCompetitionLevel,
  classifyKeywordIntent,
  CompetitionLevel,
  KeywordIntent,
  TrendDirection,
} from "../types";
import type { MonthlySearch } from "../transformers/types";

describe("calculateTrend", () => {
  it("returns zeros for empty array", () => {
    expect(calculateTrend([])).toEqual({ monthly: 0, quarterly: 0, yearly: 0 });
  });

  it("returns zeros for null-ish input", () => {
    expect(calculateTrend(null as unknown as MonthlySearch[])).toEqual({
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    });
  });

  it("calculates correct trends from sorted monthly data", () => {
    const months: MonthlySearch[] = [];
    for (let i = 0; i < 12; i++) {
      months.push({ year: 2025, month: 12 - i, search_volume: 1000 + i * 100 });
    }
    const trend = calculateTrend(months);
    expect(trend.monthly).toBeTypeOf("number");
    expect(trend.quarterly).toBeTypeOf("number");
    expect(trend.yearly).toBeTypeOf("number");
  });

  it("handles zero previous volume", () => {
    const months: MonthlySearch[] = [
      { year: 2025, month: 2, search_volume: 100 },
      { year: 2025, month: 1, search_volume: 0 },
    ];
    const trend = calculateTrend(months);
    expect(trend.monthly).toBe(100);
  });
});

describe("analyzeTrend", () => {
  it("returns stable for insufficient data", () => {
    expect(analyzeTrend([])).toEqual({
      direction: TrendDirection.STABLE,
      seasonalityScore: 0,
      growthRate: 0,
    });
  });

  it("detects upward trend", () => {
    const months: MonthlySearch[] = [
      { year: 2025, month: 1, search_volume: 100 },
      { year: 2025, month: 12, search_volume: 200 },
    ];
    const result = analyzeTrend(months);
    expect(result.direction).toBe(TrendDirection.UP);
    expect(result.growthRate).toBe(100);
  });

  it("detects downward trend", () => {
    const months: MonthlySearch[] = [
      { year: 2025, month: 1, search_volume: 200 },
      { year: 2025, month: 12, search_volume: 100 },
    ];
    const result = analyzeTrend(months);
    expect(result.direction).toBe(TrendDirection.DOWN);
    expect(result.growthRate).toBe(-50);
  });

  it("calculates seasonality score", () => {
    const months: MonthlySearch[] = [
      { year: 2025, month: 1, search_volume: 100 },
      { year: 2025, month: 2, search_volume: 500 },
      { year: 2025, month: 3, search_volume: 100 },
      { year: 2025, month: 4, search_volume: 500 },
    ];
    const result = analyzeTrend(months);
    expect(result.seasonalityScore).toBeGreaterThan(0);
  });
});

describe("classifyCompetitionLevel", () => {
  it("classifies LOW for score < 0.2", () => {
    expect(classifyCompetitionLevel(0.1)).toBe(CompetitionLevel.LOW);
  });

  it("classifies MEDIUM for score 0.2-0.7", () => {
    expect(classifyCompetitionLevel(0.3)).toBe(CompetitionLevel.MEDIUM);
    expect(classifyCompetitionLevel(0.5)).toBe(CompetitionLevel.MEDIUM);
  });

  it("classifies HIGH for score 0.7-0.85", () => {
    expect(classifyCompetitionLevel(0.8)).toBe(CompetitionLevel.HIGH);
  });

  it("classifies VERY_HIGH for score >= 0.85", () => {
    expect(classifyCompetitionLevel(0.9)).toBe(CompetitionLevel.VERY_HIGH);
  });
});

describe("classifyKeywordIntent", () => {
  it("detects transactional intent", () => {
    expect(classifyKeywordIntent("buy running shoes")).toBe(KeywordIntent.TRANSACTIONAL);
    expect(classifyKeywordIntent("cheap laptop price")).toBe(KeywordIntent.TRANSACTIONAL);
  });

  it("detects commercial intent", () => {
    expect(classifyKeywordIntent("best crm software")).toBe(KeywordIntent.COMMERCIAL);
    expect(classifyKeywordIntent("notion vs obsidian")).toBe(KeywordIntent.COMMERCIAL);
  });

  it("detects navigational intent", () => {
    expect(classifyKeywordIntent("gmail login")).toBe(KeywordIntent.NAVIGATIONAL);
    expect(classifyKeywordIntent("spotify official website")).toBe(KeywordIntent.NAVIGATIONAL);
  });

  it("defaults to informational", () => {
    expect(classifyKeywordIntent("how to tie a knot")).toBe(KeywordIntent.INFORMATIONAL);
    expect(classifyKeywordIntent("weather forecast")).toBe(KeywordIntent.INFORMATIONAL);
  });
});
