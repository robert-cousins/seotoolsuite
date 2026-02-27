import { DataForSEOError } from "./errors";
import {
  calculateTrend,
  analyzeTrend,
  classifyCompetitionLevel,
  classifyKeywordIntent,
} from "./types";

export { calculateTrend, analyzeTrend, classifyCompetitionLevel, classifyKeywordIntent };

export interface ParsedResponse<T = unknown> {
  tasks: ParsedTask<T>[];
  cost: number;
  version: string;
}

export interface ParsedTask<T = unknown> {
  statusCode: number;
  statusMessage: string;
  cost: number;
  items: T[];
  totalCount: number;
}

export function parseResponse<T = unknown>(
  rawResponse: Record<string, unknown>,
): ParsedResponse<T> {
  const version = (rawResponse.version as string) ?? "";
  const cost = (rawResponse.cost as number) ?? 0;
  const rawTasks = rawResponse.tasks as Array<Record<string, unknown>> | undefined;

  if (!rawTasks || !Array.isArray(rawTasks)) {
    throw new DataForSEOError(
      "Invalid API response: missing tasks array",
      0,
      rawResponse,
    );
  }

  const tasks: ParsedTask<T>[] = rawTasks.map((task) => {
    const statusCode = (task.status_code as number) ?? 0;
    const statusMessage = (task.status_message as string) ?? "";
    const taskCost = (task.cost as number) ?? 0;

    if (statusCode >= 40000) {
      throw new DataForSEOError(
        `Task error ${statusCode}: ${statusMessage}`,
        statusCode,
        task,
      );
    }

    const results = task.result as Array<Record<string, unknown>> | null | undefined;
    const firstResult = results?.[0];

    // DataForSEO returns null items (not []) when there are no results
    const items = ((firstResult?.items as T[]) ?? []) as T[];
    const totalCount = (firstResult?.total_count as number) ?? items.length;

    return { statusCode, statusMessage, cost: taskCost, items, totalCount };
  });

  return { tasks, cost, version };
}
