import type { Point } from "@stromblick/shared";
import type { ChartColors } from "../../charts/chart-colors";
import type { ChartOption } from "../../charts/echarts";
import { formatClock } from "../../time/berlin";

export interface PriceSummary {
  min: Point;
  max: Point;
  average: number;
}

/** The cheapest and the most expensive interval and the mean price, or null without points. */
export function summarizePrices(points: readonly Point[]): PriceSummary | null {
  const [first] = points;
  if (!first) return null;

  let min = first;
  let max = first;
  let sum = 0;
  for (const point of points) {
    if (point[1] < min[1]) min = point;
    if (point[1] > max[1]) max = point;
    sum += point[1];
  }
  return { min, max, average: sum / points.length };
}

/** A price with two decimals in the reader's language: "98.50" or "98,50". */
export function formatPrice(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface PriceOptionInput {
  points: readonly Point[];
  unit: string;
  language: string;
  colors: ChartColors;
  animate: boolean;
}

/**
 * The full hours to label: every fourth one on the Berlin clock (00:00, 04:00, …).
 * ECharts would pick its own ticks by the browser's clock, which is uneven for readers elsewhere.
 */
export function axisTicks(points: readonly Point[]): number[] {
  return points
    .map(([time]) => time)
    .filter((time) => {
      const [hour, minute] = formatClock(time).split(":");
      return minute === "00" && Number(hour) % 4 === 0;
    });
}

/** The ECharts option of the price line. A pure function, so it is tested without a canvas. */
export function priceOption({
  points,
  unit,
  language,
  colors,
  animate,
}: PriceOptionInput): ChartOption {
  const ticks = axisTicks(points);
  return {
    animation: animate,
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.background,
      borderColor: colors.grid,
      textStyle: { color: colors.text },
      formatter: (params) => {
        const hovered = Array.isArray(params) ? params[0] : params;
        const value: unknown = hovered?.value;
        if (!Array.isArray(value)) return "";
        const pair: unknown[] = value;
        const [time, price] = pair;
        if (typeof time !== "number" || typeof price !== "number") return "";
        return `${formatClock(time)}<br /><strong>${formatPrice(price, language)}</strong> ${unit}`;
      },
    },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { customValues: ticks },
      axisLabel: {
        color: colors.text,
        customValues: ticks,
        formatter: (value: number) => formatClock(value),
      },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.text },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [
      {
        type: "line",
        // A price holds for its whole interval, so the line is drawn as steps, not as slopes.
        step: "end",
        showSymbol: false,
        lineStyle: { color: colors.line, width: 2 },
        itemStyle: { color: colors.line },
        data: points.map(([time, price]) => [time, price]),
      },
    ],
  };
}
