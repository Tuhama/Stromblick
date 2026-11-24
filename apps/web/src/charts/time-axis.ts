import { DAY, HOUR } from "@stromblick/shared";
import {
  berlinDay,
  berlinMonth,
  formatClock,
  formatDayLabel,
  formatMonthLabel,
} from "../time/berlin";
import type { ChartColors } from "./chart-colors";
import type { ChartOption } from "./echarts";

/** How the axis is labelled, by how much time the chart covers. */
export type AxisTier = "hours" | "days" | "weeks" | "months";

export function axisTier(first: number, last: number): AxisTier {
  const span = last - first;
  if (span <= 36 * HOUR) return "hours";
  if (span <= 14 * DAY) return "days";
  if (span <= 70 * DAY) return "weeks";
  return "months";
}

/** Whether a moment falls on a Monday in Berlin. */
function isMonday(time: number): boolean {
  // Noon UTC is the same calendar day in Berlin in every season.
  return new Date(`${berlinDay(time)}T12:00:00Z`).getUTCDay() === 1;
}

/** The first time of each run of times that share a key, e.g. the first point of each day. */
function firstOfEach(times: readonly number[], key: (time: number) => string): number[] {
  const ticks: number[] = [];
  let previous = "";
  for (const time of times) {
    const current = key(time);
    if (current !== previous) ticks.push(time);
    previous = current;
  }
  return ticks;
}

/**
 * The times to label, in Berlin time. ECharts would pick its own by the browser's clock, which is
 * uneven for readers elsewhere. A day or less: every fourth full hour (00:00, 04:00, …). Up to two
 * weeks: the first point of each day. Up to ten weeks: the first point of each Monday. Longer: the
 * first point of each month.
 */
export function axisTicks(times: readonly number[]): number[] {
  const first = times[0];
  const last = times.at(-1);
  if (first === undefined || last === undefined) return [];

  switch (axisTier(first, last)) {
    case "hours":
      return times.filter((time) => {
        const [hour, minute] = formatClock(time).split(":");
        return minute === "00" && Number(hour) % 4 === 0;
      });
    case "days":
      return firstOfEach(times, berlinDay);
    case "weeks":
      return firstOfEach(times, berlinDay).filter(isMonday);
    case "months":
      return firstOfEach(times, berlinMonth);
  }
}

/** One axis label, in the style of the tier. */
export function tickLabel(time: number, tier: AxisTier, language: string): string {
  if (tier === "hours") return formatClock(time);
  return tier === "months" ? formatMonthLabel(time, language) : formatDayLabel(time, language);
}

interface TimeAxisInput {
  /** Every time the chart shows, ascending. */
  times: readonly number[];
  language: string;
  colors: ChartColors;
}

/** The x axis of a chart over time, labelled in Berlin time. */
export function timeAxis({
  times,
  language,
  colors,
}: TimeAxisInput): NonNullable<ChartOption["xAxis"]> {
  const first = times[0] ?? 0;
  const tier = axisTier(first, times.at(-1) ?? first);
  const ticks = axisTicks(times);
  return {
    type: "time",
    axisLine: { lineStyle: { color: colors.grid } },
    axisTick: { customValues: ticks },
    axisLabel: {
      color: colors.text,
      customValues: ticks,
      formatter: (value: number) => tickLabel(value, tier, language),
    },
  };
}
