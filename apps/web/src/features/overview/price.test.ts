import { describe, expect, it } from "vitest";
import type { Point } from "@stromblick/shared";
import { MAX_CHART_POINTS } from "../../charts/downsample";
import { formatPrice, priceOption, summarizePrices } from "./price";

const POINTS: Point[] = [
  [Date.parse("2026-11-13T23:00:00Z"), 80],
  [Date.parse("2026-11-13T23:15:00Z"), -5.5],
  [Date.parse("2026-11-13T23:30:00Z"), 120.25],
  [Date.parse("2026-11-13T23:45:00Z"), 90],
];

describe("summarizePrices", () => {
  it("finds the lowest and highest interval and the average", () => {
    expect(summarizePrices(POINTS)).toEqual({
      min: POINTS[1],
      max: POINTS[2],
      average: 71.1875,
    });
  });

  it("has nothing to say without points", () => {
    expect(summarizePrices([])).toBeNull();
  });
});

describe("formatPrice", () => {
  it("uses the reader's decimal separator, with two decimals", () => {
    expect(formatPrice(98.5, "en")).toBe("98.50");
    expect(formatPrice(98.5, "de")).toBe("98,50");
    expect(formatPrice(-5.5, "en")).toBe("-5.50");
  });
});

describe("priceOption", () => {
  const colors = {
    line: "#0b1f2a",
    text: "#4a5d69",
    grid: "#d5dee3",
    background: "#ffffff",
    series: ["#2a78d6"],
  };
  const option = priceOption({
    points: POINTS,
    unit: "EUR/MWh",
    language: "en",
    colors,
    animate: false,
  });

  it("draws the points as one stepped line on a time axis", () => {
    expect(option.xAxis).toMatchObject({ type: "time" });
    expect(option.series).toEqual([
      expect.objectContaining({ type: "line", step: "end", data: POINTS }),
    ]);
  });

  it("takes its colors from the theme", () => {
    expect(option.series).toEqual([
      expect.objectContaining({ lineStyle: { color: "#0b1f2a", width: 2 } }),
    ]);
    expect(option.tooltip).toMatchObject({ backgroundColor: "#ffffff" });
  });

  it("draws a year of 15-minute prices as a bounded number of averaged points", () => {
    const start = Date.parse("2025-12-31T23:00:00Z");
    const year: Point[] = Array.from({ length: 35_040 }, (_, i) => [start + i * 900_000, 50]);
    const long = priceOption({
      points: year,
      unit: "EUR/MWh",
      language: "en",
      colors,
      animate: true,
    });
    const [line] = long.series as { data: unknown[] }[];
    expect(line?.data.length).toBeLessThanOrEqual(MAX_CHART_POINTS);
    expect(long.animation).toBe(false);
  });

  it("animates only when asked to", () => {
    expect(option.animation).toBe(false);
  });
});
