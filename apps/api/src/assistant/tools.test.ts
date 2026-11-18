import { describe, expect, it, vi } from "vitest";
import type { Point } from "@stromblick/shared";
import { DAY_AHEAD_PRICE_KEY } from "@stromblick/shared";
import { HttpError } from "../errors";
import type { LoadReadings } from "../series/load-readings";
import { SMARD_SERIES } from "../smard/catalog";
import { createTools, MAX_LISTED_POINTS, type AssistantTool } from "./tools";

const generationKey = SMARD_SERIES.find((series) => series.kind === "generation")?.key ?? "";

// 2026-11-17 00:00 UTC is 01:00 in Berlin (winter time).
const MIDNIGHT = Date.UTC(2026, 10, 17);
const HOUR = 3_600_000;

function setup(points: Point[] = []) {
  const readings = vi.fn<LoadReadings>(() => Promise.resolve(points));
  const status = vi.fn(() =>
    Promise.resolve({
      lastSuccessAt: "2026-11-17T10:00:00.000Z",
      lastRun: { status: "SUCCEEDED" as const, finishedAt: "2026-11-17T10:00:00.000Z" },
    }),
  );
  const tools = createTools({ readings, status });
  const tool = (name: string): AssistantTool => {
    const found = tools.find((candidate) => candidate.spec.name === name);
    if (!found) throw new Error(`No tool ${name}`);
    return found;
  };
  return { tool, readings, status };
}

describe("tool specs", () => {
  it("offers exactly three read-only tools, with schemas the model can use", () => {
    const { tool } = setup();
    for (const name of ["list_series", "get_readings", "get_status"]) {
      expect(tool(name).spec.description.length).toBeGreaterThan(10);
      expect(tool(name).spec.parameters).not.toHaveProperty("$schema");
    }
    const parameters = tool("get_readings").spec.parameters as {
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(parameters.required).toEqual(["series", "from", "to"]);
    expect(Object.keys(parameters.properties)).toEqual(["series", "from", "to", "resolution"]);
  });
});

describe("list_series", () => {
  it("lists the series without SMARD's internals", async () => {
    const text = await setup().tool("list_series").run({});
    expect(text).toContain(DAY_AHEAD_PRICE_KEY);
    expect(text).not.toContain("filter");
    expect(text).not.toContain("region");
  });
});

describe("get_readings", () => {
  const args = { series: DAY_AHEAD_PRICE_KEY, from: "2026-11-17", to: "2026-11-17" };

  it("lists the points in Berlin time with a summary; a price has no total", async () => {
    const { tool } = setup([
      [MIDNIGHT, 80],
      [MIDNIGHT + HOUR, 100],
      [MIDNIGHT + 2 * HOUR, 60],
    ]);
    const result = JSON.parse(await tool("get_readings").run(args)) as Record<string, unknown>;

    expect(result).toMatchObject({
      series: DAY_AHEAD_PRICE_KEY,
      unit: "EUR/MWh",
      timeZone: "Europe/Berlin",
      count: 3,
      points: [
        { time: "2026-11-17 01:00", value: 80 },
        { time: "2026-11-17 02:00", value: 100 },
        { time: "2026-11-17 03:00", value: 60 },
      ],
      summary: {
        min: { time: "2026-11-17 03:00", value: 60 },
        max: { time: "2026-11-17 02:00", value: 100 },
        average: 80,
      },
    });
    expect(result.summary).not.toHaveProperty("total");
  });

  it("gives a total for energy", async () => {
    const { tool } = setup([
      [MIDNIGHT, 10],
      [MIDNIGHT + HOUR, 30],
    ]);
    const result = JSON.parse(
      await tool("get_readings").run({ ...args, series: generationKey }),
    ) as { summary: { total: number } };
    expect(result.summary.total).toBe(40);
  });

  it("summarises instead of listing when there are too many points", async () => {
    const many: Point[] = Array.from({ length: MAX_LISTED_POINTS + 1 }, (_, i) => [
      MIDNIGHT + i * HOUR,
      i,
    ]);
    const result = JSON.parse(
      await setup(many)
        .tool("get_readings")
        .run({ ...args, to: "2026-11-24" }),
    ) as Record<string, unknown>;
    expect(result.count).toBe(MAX_LISTED_POINTS + 1);
    expect(result).not.toHaveProperty("points");
    expect(result.note).toMatch(/shorter range/);
    expect(result).toHaveProperty("summary");
  });

  it("handles a range without data", async () => {
    const result = JSON.parse(await setup([]).tool("get_readings").run(args)) as Record<
      string,
      unknown
    >;
    expect(result).toMatchObject({ count: 0, summary: null, points: [] });
  });

  it("rejects bad arguments with a readable HttpError and never reads the database", async () => {
    const { tool, readings } = setup();
    const run = tool("get_readings").run;
    await expect(run({ series: DAY_AHEAD_PRICE_KEY })).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...args, from: "17.11.2026" })).rejects.toBeInstanceOf(HttpError);
    await expect(run({ ...args, from: "2026-11-18" })).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...args, series: "nope" })).rejects.toMatchObject({ status: 404 });
    await expect(run({ ...args, from: "2025-01-01" })).rejects.toMatchObject({ status: 400 });
    expect(readings).not.toHaveBeenCalled();
  });
});

describe("get_status", () => {
  it("returns when the data was last updated", async () => {
    const result = JSON.parse(await setup().tool("get_status").run({})) as Record<string, unknown>;
    expect(result.lastSuccessAt).toBe("2026-11-17T10:00:00.000Z");
  });
});
