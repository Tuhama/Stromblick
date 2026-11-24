import { describe, expect, it } from "vitest";
import type { Point } from "@stromblick/shared";
import { MAX_CHART_POINTS } from "../../charts/downsample";
import { explorerOption } from "./explorer-option";

const COLORS = {
  line: "#0b1f2a",
  text: "#4a5d69",
  grid: "#d5dee3",
  background: "#ffffff",
  series: ["#2a78d6"],
};

const HOUR = 3_600_000;
const START = Date.parse("2026-11-19T00:00:00Z");
const POINTS: Point[] = [
  [START, 100],
  [START + HOUR, 120],
  [START + 2 * HOUR, 90],
];

function build(overrides: Partial<Parameters<typeof explorerOption>[0]> = {}) {
  return explorerOption({
    points: POINTS,
    unit: "MWh",
    resolution: "hour",
    steps: false,
    formatValue: (value) => value.toFixed(0),
    language: "en",
    colors: COLORS,
    animate: false,
    ...overrides,
  });
}

function tooltip(option: ReturnType<typeof build>, point: Point): string {
  const { formatter } = option.tooltip as { formatter: (params: unknown) => string };
  return formatter({ value: point });
}

describe("explorerOption", () => {
  it("draws the points as a plain line on a time axis", () => {
    const option = build();
    expect(option.xAxis).toMatchObject({ type: "time" });
    expect(option.series).toEqual([
      expect.objectContaining({
        type: "line",
        data: POINTS,
        lineStyle: { color: "#0b1f2a", width: 2 },
      }),
    ]);
    const [line] = option.series as object[];
    expect(line).not.toHaveProperty("step");
  });

  it("draws a price as steps, because a price holds for its whole interval", () => {
    expect(build({ steps: true }).series).toEqual([expect.objectContaining({ step: "end" })]);
  });

  it("stops the line at a hole in the data", () => {
    // Three hours, nothing for three hours, then two more.
    const withHole: Point[] = [
      [START, 100],
      [START + HOUR, 120],
      [START + 2 * HOUR, 110],
      [START + 5 * HOUR, 90],
      [START + 6 * HOUR, 95],
    ];
    expect(build({ points: withHole }).series).toEqual([
      expect.objectContaining({
        data: [
          [START, 100],
          [START + HOUR, 120],
          [START + 2 * HOUR, 110],
          [START + 3 * HOUR, null],
          [START + 5 * HOUR, 90],
          [START + 6 * HOUR, 95],
        ],
      }),
    ]);
  });

  describe("tooltip", () => {
    it("shows the clock time within one day, with the value and the unit", () => {
      const text = tooltip(build(), [START + HOUR, 120]);
      // 01:00 UTC is 02:00 in Berlin in November.
      expect(text).toBe("02:00<br /><strong>120</strong> MWh");
    });

    it("adds the date when the range spans several days", () => {
      const later: Point = [START + 3 * 24 * HOUR, 120];
      expect(tooltip(build({ points: [[START, 100], later] }), later)).toContain("Nov 22, 2026");
    });

    it("shows only the date for daily readings", () => {
      const second: Point = [Date.parse("2026-11-19T23:00:00Z"), 2500];
      const days: Point[] = [[Date.parse("2026-11-18T23:00:00Z"), 2400], second];
      expect(tooltip(build({ points: days, resolution: "day" }), second)).toBe(
        "Nov 20, 2026<br /><strong>2500</strong> MWh",
      );
    });
  });

  it("draws a year of 15-minute points as a bounded number of points, without animation", () => {
    const year: Point[] = Array.from({ length: 35_040 }, (_, i) => [START + i * 900_000, 50]);
    const option = build({ points: year, resolution: "quarterhour", animate: true });
    const [line] = option.series as { data: unknown[] }[];
    expect(line?.data.length).toBeLessThanOrEqual(MAX_CHART_POINTS);
    expect(option.animation).toBe(false);
  });

  it("animates only when asked to", () => {
    expect(build().animation).toBe(false);
    expect(build({ animate: true }).animation).toBe(true);
  });
});
