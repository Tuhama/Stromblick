import { describe, expect, it } from "vitest";
import type { Point } from "@stromblick/shared";
import { SAMPLE_START, sampleGeneration } from "../../charts/sample-data";
import { MAX_CHART_POINTS } from "../../charts/downsample";
import {
  GENERATION_GROUPS,
  generationOption,
  groupGeneration,
  formatShare,
  generationRows,
  keepCommonTimes,
  renewableShare,
  type GenerationLayer,
} from "./generation";

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

  it("stops every layer at the same hole, so the stack does not bridge it", () => {
    const hour = 3_600_000;
    const hours = [0, 1, 2, 5, 6].map((index) => SAMPLE_START + index * hour);
    const option = generationOption({
      layers: groupGeneration([
        { key: "generation-solar", points: hours.map((time): Point => [time, 10]) },
        { key: "generation-hydro", points: hours.map((time): Point => [time, 2]) },
      ]),
      names,
      unit: "MWh",
      language: "en",
      colors,
      animate: false,
    });
    expect(option.series).toHaveLength(2);
    for (const entry of option.series as { data: unknown[] }[]) {
      // One point without a value, right after the last hour before the hole.
      expect(entry.data).toContainEqual([SAMPLE_START + 3 * hour, null]);
      expect(entry.data).toHaveLength(6);
    }
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
describe("renewableShare", () => {
  const at = SAMPLE_START;
  it("divides renewable generation by all generation", () => {
    const share = renewableShare([
      { key: "generation-solar", points: [[at, 30]] },
      { key: "generation-wind-onshore", points: [[at, 20]] },
      { key: "generation-lignite", points: [[at, 50]] },
    ]);
    expect(share).toBeCloseTo(0.5);
  });

  it("doesn't count pumped storage as renewable", () => {
    const share = renewableShare([
      { key: "generation-pumped-storage", points: [[at, 10]] },
      { key: "generation-solar", points: [[at, 10]] },
    ]);
    expect(share).toBeCloseTo(0.5);
  });

  it("ignores series that aren't generation, such as the load", () => {
    const share = renewableShare([
      { key: "load", points: [[at, 1000]] },
      { key: "generation-solar", points: [[at, 10]] },
    ]);
    expect(share).toBe(1);
  });

  it("is null without any generation", () => {
    expect(renewableShare([])).toBeNull();
    expect(renewableShare([{ key: "generation-solar", points: [] }])).toBeNull();
  });
});

describe("keepCommonTimes", () => {
  it("drops hours that some of the series don't have yet", () => {
    const hour = 3_600_000;
    const result = keepCommonTimes([
      {
        key: "generation-solar",
        points: [
          [0, 1],
          [hour, 2],
          [2 * hour, 3],
        ],
      },
      {
        key: "generation-lignite",
        points: [
          [0, 1],
          [hour, 2],
        ],
      },
      { key: "generation-gas", points: [] },
    ]);
    expect(result[0]?.points).toEqual([
      [0, 1],
      [hour, 2],
    ]);
    expect(result[1]?.points).toEqual([
      [0, 1],
      [hour, 2],
    ]);
    expect(result[2]?.points).toEqual([]);
  });
});

describe("formatShare", () => {
  it("writes a whole percentage in the reader's language", () => {
    expect(formatShare(0.624, "en")).toBe("62%");
    expect(formatShare(0.624, "de").replace(/\s/g, " ")).toBe("62 %");
  });
});

describe("generationRows", () => {
  const hour = 3_600_000;
  const layers: GenerationLayer[] = [
    {
      id: "solar",
      slot: 0,
      points: [
        [0, 10],
        [hour, 20],
      ],
    },
    {
      id: "wind",
      slot: 1,
      points: [
        [hour, 5],
        [2 * hour, 7],
      ],
    },
  ];

  it("has one row per hour, in time order, with each layer's value and the total last", () => {
    expect(generationRows(layers)).toEqual([
      { time: 0, values: [10, null, 10] },
      { time: hour, values: [20, 5, 25] },
      { time: 2 * hour, values: [null, 7, 7] },
    ]);
  });

  it("gives no rows without layers", () => {
    expect(generationRows([])).toEqual([]);
  });
});
