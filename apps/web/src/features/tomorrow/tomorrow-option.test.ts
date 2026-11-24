import type { Point } from "@stromblick/shared";
import { describe, expect, it } from "vitest";
import { tomorrowOption } from "./tomorrow-option";

const START = Date.parse("2026-11-23T23:00:00Z");
const POINTS: Point[] = Array.from({ length: 8 }, (_, index): Point => [
  START + index * 900_000,
  index,
]);
const COLORS = {
  line: "#0b1f2a",
  text: "#4a5d69",
  grid: "#d5dee3",
  background: "#ffffff",
  series: ["#2a78d6", "#d65a2a"],
};
const CHEAPEST = { start: START, end: START + 3_600_000, label: "Cheapest" };
const EXPENSIVE = { start: START + 3_600_000, end: START + 7_200_000, label: "Most expensive" };

function build(cheapest: typeof CHEAPEST | null, mostExpensive: typeof EXPENSIVE | null) {
  return tomorrowOption({
    points: POINTS,
    unit: "EUR/MWh",
    language: "en",
    colors: COLORS,
    animate: false,
    cheapest,
    mostExpensive,
  });
}

function markedAreas(option: ReturnType<typeof build>) {
  const [line] = [option.series].flat();
  // Every area we draw is a pair: where it starts and where it ends.
  return (line?.markArea?.data ?? []).flatMap((area) => (Array.isArray(area) ? [area] : []));
}

describe("tomorrowOption", () => {
  it("keeps the price line of the overview", () => {
    const [line] = [build(CHEAPEST, EXPENSIVE).series].flat();
    expect(line?.type).toBe("line");
    expect(line?.step).toBe("end");
  });

  it("marks both windows from their start to their end, with the label written inside", () => {
    const areas = markedAreas(build(CHEAPEST, EXPENSIVE));

    expect(areas).toHaveLength(2);
    expect(areas[0]?.[0]).toMatchObject({ name: "Cheapest", xAxis: CHEAPEST.start });
    expect(areas[0]?.[1]).toEqual({ xAxis: CHEAPEST.end });
    expect(areas[1]?.[0]).toMatchObject({ name: "Most expensive", xAxis: EXPENSIVE.start });
    expect(areas[1]?.[1]).toEqual({ xAxis: EXPENSIVE.end });
  });

  it("tells the two windows apart by border as well as by color", () => {
    const areas = markedAreas(build(CHEAPEST, EXPENSIVE));
    const [cheap, dear] = areas.map((area) => area[0]);

    expect(cheap?.itemStyle?.color).toBe("#2a78d6");
    expect(dear?.itemStyle?.color).toBe("#d65a2a");
    expect(cheap?.itemStyle?.borderType).toBe("solid");
    expect(dear?.itemStyle?.borderType).toBe("dashed");
  });

  it("marks only the window it is given", () => {
    expect(markedAreas(build(CHEAPEST, null))).toHaveLength(1);
    expect(markedAreas(build(null, null))).toHaveLength(0);
  });
});
