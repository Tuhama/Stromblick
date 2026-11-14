import { describe, expect, it } from "vitest";
import type { Point } from "@stromblick/shared";
import { axisTicks, formatPrice, priceOption, summarizePrices } from "./price";

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

describe("axisTicks", () => {
  it("picks every fourth full hour on the Berlin clock", () => {
    // 13 November, 23:00 UTC is midnight in Berlin; one point every 15 minutes for a day.
    const start = Date.parse("2026-11-13T23:00:00Z");
    const day: Point[] = Array.from({ length: 96 }, (_, i) => [start + i * 900_000, 50]);

    expect(axisTicks(day)).toEqual([0, 4, 8, 12, 16, 20].map((hour) => start + hour * 3_600_000));
  });
});

describe("priceOption", () => {
  const colors = { line: "#0b1f2a", text: "#4a5d69", grid: "#d5dee3", background: "#ffffff" };
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

  it("animates only when asked to", () => {
    expect(option.animation).toBe(false);
  });
});
