import { describe, it, expect } from "vitest";
import { parseResponse } from "../parser";
import { DataForSEOError } from "../errors";

describe("parseResponse", () => {
  it("parses valid response with items", () => {
    const raw = {
      version: "0.1",
      cost: 0.5,
      tasks: [
        {
          status_code: 20000,
          status_message: "Ok.",
          cost: 0.5,
          result: [{ items: [{ id: 1 }, { id: 2 }], total_count: 100 }],
        },
      ],
    };
    const parsed = parseResponse(raw);
    expect(parsed.cost).toBe(0.5);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].items).toHaveLength(2);
    expect(parsed.tasks[0].totalCount).toBe(100);
  });

  it("handles null items (DataForSEO returns null, not [])", () => {
    const raw = {
      tasks: [
        {
          status_code: 20000,
          status_message: "Ok.",
          result: [{ items: null, total_count: 0 }],
        },
      ],
    };
    const parsed = parseResponse(raw);
    expect(parsed.tasks[0].items).toEqual([]);
  });

  it("handles missing result array", () => {
    const raw = {
      tasks: [
        {
          status_code: 20000,
          status_message: "Ok.",
          result: null,
        },
      ],
    };
    const parsed = parseResponse(raw);
    expect(parsed.tasks[0].items).toEqual([]);
    expect(parsed.tasks[0].totalCount).toBe(0);
  });

  it("throws on missing tasks array", () => {
    expect(() => parseResponse({})).toThrow(DataForSEOError);
  });

  it("throws on task error status code >= 40000", () => {
    const raw = {
      tasks: [
        {
          status_code: 40000,
          status_message: "You can set only one task at a time.",
        },
      ],
    };
    expect(() => parseResponse(raw)).toThrow(DataForSEOError);
    expect(() => parseResponse(raw)).toThrow("Task error 40000");
  });
});
