import { describe, expect, it } from "vitest";
import type { Point } from "@stromblick/shared";
import { SAMPLE_START, sampleGeneration } from "../../charts/sample-data";
import { MAX_CHART_POINTS } from "../../charts/downsample";
import { GENERATION_GROUPS, generationOption, groupGeneration } from "./generation";

const colors = {
  line: "#0b1f2a",
  text: "#4a5d69",
  grid: "#d5dee3",
  background: "#ffffff",
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
};
const names = {
  solar: "Solar",
  wind: "Wind",
  biomass: "Biomass",
  hydro: "Hydropower",
  gas: "Natural gas",
  hardCoal: "Hard coal",
  lignite: "Lignite",
  other: "Other",
};

describe("groupGeneration", () => {
  it("folds the 11 API series into at most 8 groups, in stacking order", () => {
    const layers = groupGeneration(sampleGeneration(1));
    expect(layers.map((layer) => layer.id)).toEqual(GENERATION_GROUPS.map((group) => group.id));
    expect(layers.map((layer) => layer.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("adds the series of a group moment by moment", () => {
    const at = SAMPLE_START;
    const onshore: Point[] = [
      [at, 10],
      [at + 3_600_000, 20],
    ];
    const offshore: Point[] = [
      [at, 1],
      [at + 3_600_000, 2],
    ];
    const [wind] = groupGeneration([
      { key: "generation-wind-onshore", points: onshore },
      { key: "generation-wind-offshore", points: offshore },
    ]);
    expect(wind).toMatchObject({
      id: "wind",
      points: [
        [at, 11],
        [at + 3_600_000, 22],
      ],
    });
  });

  it("keeps a color for a group even when another group has no data", () => {
    const layers = groupGeneration([
      { key: "generation-lignite", points: [[SAMPLE_START, 1]] },
      { key: "generation-wind-onshore", points: [[SAMPLE_START, 1]] },
    ]);
    const wind = layers.find((layer) => layer.id === "wind");
    // Wind keeps slot 1 (orange), whether or not solar is on the chart.
    expect(wind?.slot).toBe(1);
  });

  it("ignores series that are not generation", () => {
    expect(groupGeneration([{ key: "load", points: [[SAMPLE_START, 1]] }])).toEqual([]);
  });
});

describe("generationOption", () => {
  const build = (days: number, stepMinutes: number) =>
    generationOption({
      layers: groupGeneration(sampleGeneration(days, stepMinutes)),
      names,
      unit: "MWh",
      language: "en",
      colors,
      animate: true,
    });

  it("stacks one area per group in the group's color", () => {
    const option = build(1, 60);
    expect(option.series).toHaveLength(8);
    expect(option.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Solar",
          stack: "generation",
          areaStyle: { color: "#2a78d6", opacity: 1 },
        }),
      ]),
    );
  });

  it("separates the layers with a surface-colored line", () => {
    const [first] = build(1, 60).series as { lineStyle: unknown }[];
    expect(first?.lineStyle).toEqual({ color: "#ffffff", width: 2 });
  });

  it("draws a year of 15-minute data with a bounded number of points, without animation", () => {
    const option = build(365, 15);
    const series = option.series as { data: unknown[] }[];
    expect(series).toHaveLength(8);
    for (const layer of series) expect(layer.data.length).toBeLessThanOrEqual(MAX_CHART_POINTS);
    expect(option.animation).toBe(false);
  });

  it("keeps a day's points as they are", () => {
    const [first] = build(1, 60).series as { data: unknown[] }[];
    expect(first?.data).toHaveLength(24);
  });
});
