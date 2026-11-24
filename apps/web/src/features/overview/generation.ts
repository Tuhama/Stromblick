import { DAY } from "@stromblick/shared";
import type { Point } from "@stromblick/shared";
import type { ChartColors } from "../../charts/chart-colors";
import type { DataTableRow } from "../../charts/DataTable";
import { downsample, MAX_CHART_POINTS } from "../../charts/downsample";
import { breakAtGaps } from "../../charts/gaps";
import type { ChartOption } from "../../charts/echarts";
import { timeAxis } from "../../charts/time-axis";
import { readPoint } from "../../charts/tooltip";
import { formatClock, formatDateTime } from "../../time/berlin";

/**
 * The 11 generation series of the API, folded into 8 groups: a chart can't keep more colors apart.
 * The order is the stacking order from the bottom, and group number n always gets series color n.
 */
export const GENERATION_GROUPS = [
  { id: "solar", keys: ["generation-solar"] },
  { id: "wind", keys: ["generation-wind-onshore", "generation-wind-offshore"] },
  { id: "biomass", keys: ["generation-biomass"] },
  { id: "hydro", keys: ["generation-hydro"] },
  { id: "gas", keys: ["generation-natural-gas"] },
  { id: "hardCoal", keys: ["generation-hard-coal"] },
  { id: "lignite", keys: ["generation-lignite"] },
  {
    id: "other",
    keys: [
      "generation-other-renewables",
      "generation-pumped-storage",
      "generation-other-conventional",
    ],
  },
] as const;

export type GenerationGroupId = (typeof GENERATION_GROUPS)[number]["id"];

/** One series as the API sends it. */
export interface GenerationSeries {
  key: string;
  points: readonly Point[];
}

/** One layer of the stacked chart: a group's points, with its place in the stack. */
export interface GenerationLayer {
  id: GenerationGroupId;
  /** Which categorical color it wears: the same group has the same color in every chart. */
  slot: number;
  points: readonly Point[];
}

/** Adds series that share a time axis, point by point. */
function sumSeries(all: readonly (readonly Point[])[]): Point[] {
  const totals = new Map<number, number>();
  for (const points of all) {
    for (const [time, value] of points) totals.set(time, (totals.get(time) ?? 0) + value);
  }
  return [...totals].sort((a, b) => a[0] - b[0]);
}

/** Sorts the API's series into the groups. Series nobody asked for (like "load") are left out. */
export function groupGeneration(series: readonly GenerationSeries[]): GenerationLayer[] {
  return GENERATION_GROUPS.flatMap((group, slot) => {
    const members = series.filter((entry) => (group.keys as readonly string[]).includes(entry.key));
    const [only, ...rest] = members;
    if (!only) return [];
    const points = rest.length === 0 ? only.points : sumSeries(members.map((m) => m.points));
    return [{ id: group.id, slot, points }];
  });
}

/** A whole number in the reader's language: "12,345" or "12.345". */
export function formatEnergy(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value);
}

interface GenerationOptionInput {
  layers: readonly GenerationLayer[];
  /** The group names, in the reader's language. */
  names: Record<GenerationGroupId, string>;
  unit: string;
  language: string;
  colors: ChartColors;
  animate: boolean;
}

/** The ECharts option of the stacked generation chart. Pure, so it is tested without a canvas. */
export function generationOption({
  layers,
  names,
  unit,
  language,
  colors,
  animate,
}: GenerationOptionInput): ChartOption {
  // Layers are shrunk together, so their sum stays the total at every moment.
  const drawn = downsample(layers.map((layer) => layer.points));
  const times = drawn[0]?.map(([time]) => time) ?? [];
  const first = times[0] ?? 0;
  const spansDays = (times.at(-1) ?? first) - first > DAY;
  const pointCount = Math.max(0, ...layers.map((layer) => layer.points.length));

  return {
    animation: animate && pointCount <= MAX_CHART_POINTS,
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.background,
      borderColor: colors.grid,
      textStyle: { color: colors.text },
      formatter: (params) => {
        const hovered = Array.isArray(params) ? params : [params];
        const [first] = hovered;
        const moment = readPoint(first?.value)?.[0];
        if (moment === undefined) return "";

        // The top layer first, like the picture.
        const rows = [...hovered].reverse().flatMap((item) => {
          const point = readPoint(item.value);
          const color = colors.series[item.seriesIndex ?? 0] ?? colors.line;
          if (!point) return [];
          const swatch = `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;background:${color}"></span>`;
          return [`${swatch}${item.seriesName ?? ""}: ${formatEnergy(point[1], language)}`];
        });
        const total = hovered.reduce((sum, item) => sum + (readPoint(item.value)?.[1] ?? 0), 0);
        const when = spansDays ? formatDateTime(moment, language) : formatClock(moment);
        return [when, ...rows, `<strong>${formatEnergy(total, language)}</strong> ${unit}`].join(
          "<br />",
        );
      },
    },
    xAxis: timeAxis({ times, language, colors }),
    yAxis: {
      type: "value",
      axisLabel: {
        color: colors.text,
        formatter: (value: number) => formatEnergy(value, language),
      },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: layers.map((layer, index) => {
      const color = colors.series[layer.slot] ?? colors.line;
      return {
        type: "line",
        name: names[layer.id],
        stack: "generation",
        // Generation is energy over an interval, so it is drawn as steps like the price.
        step: "end",
        showSymbol: false,
        // The line is the surface color: a 2px gap between neighbouring layers.
        lineStyle: { color: colors.background, width: 2 },
        areaStyle: { color, opacity: 1 },
        itemStyle: { color },
        // Every layer shares the same times, so all layers stop at the same hole.
        data: breakAtGaps(drawn[index] ?? []),
      };
    }),
  };
}
/** Every series key the generation chart folds in: the keys of all groups. */
export const GENERATION_KEYS: readonly string[] = GENERATION_GROUPS.flatMap((group) => group.keys);

/** What counts as renewable. Pumped storage doesn't (it returns energy taken from the grid). */
const RENEWABLE_KEYS: readonly string[] = [
  "generation-solar",
  "generation-wind-onshore",
  "generation-wind-offshore",
  "generation-biomass",
  "generation-hydro",
  "generation-other-renewables",
];

/**
 * Keeps only the hours for which every series that has any data has a value. SMARD publishes the
 * sources with different delays, so the newest hour is often partial; a stack or a share that
 * included it would look as if generation had dropped.
 */
export function keepCommonTimes(series: readonly GenerationSeries[]): GenerationSeries[] {
  const filled = series.filter((entry) => entry.points.length > 0);
  const [first, ...others] = filled;
  if (!first) return series.map((entry) => ({ ...entry }));

  const common = new Set(first.points.map(([time]) => time));
  for (const entry of others) {
    const times = new Set(entry.points.map(([time]) => time));
    for (const time of common) if (!times.has(time)) common.delete(time);
  }
  return series.map((entry) => ({
    key: entry.key,
    points: entry.points.filter(([time]) => common.has(time)),
  }));
}

/**
 * The table behind the stacked chart: one row per hour, one value per layer in the layers' order, and
 * the hour's total last. A layer without a reading in an hour gives null, not 0: nothing was reported.
 */
export function generationRows(layers: readonly GenerationLayer[]): DataTableRow[] {
  const byTime = new Map<number, (number | null)[]>();
  layers.forEach((layer, column) => {
    for (const [time, value] of layer.points) {
      const row = byTime.get(time) ?? layers.map(() => null);
      row[column] = value;
      byTime.set(time, row);
    }
  });
  return [...byTime]
    .sort((a, b) => a[0] - b[0])
    .map(([time, values]) => ({
      time,
      values: [...values, values.reduce<number>((sum, value) => sum + (value ?? 0), 0)],
    }));
}

/** Renewable generation as a share of all generation, from 0 to 1, or null without any generation. */
export function renewableShare(series: readonly GenerationSeries[]): number | null {
  let renewable = 0;
  let total = 0;
  for (const entry of series) {
    if (!GENERATION_KEYS.includes(entry.key)) continue;
    const sum = entry.points.reduce((acc, [, value]) => acc + value, 0);
    total += sum;
    if (RENEWABLE_KEYS.includes(entry.key)) renewable += sum;
  }
  return total > 0 ? renewable / total : null;
}

/** A share as a whole percentage in the reader's language: "62%" or "62 %". */
export function formatShare(share: number, language: string): string {
  return new Intl.NumberFormat(language, { style: "percent", maximumFractionDigits: 0 }).format(
    share,
  );
}
