import type { Point } from "@stromblick/shared";
import type { ChartColors } from "../../charts/chart-colors";
import type { ChartOption } from "../../charts/echarts";
import { downsample, MAX_CHART_POINTS } from "../../charts/downsample";
import { breakAtGaps } from "../../charts/gaps";
import { timeAxis } from "../../charts/time-axis";
import { readPoint } from "../../charts/tooltip";
import { formatClock, formatDateTime } from "../../time/berlin";
import { DAY } from "../../time/units";

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

/** The ECharts option of the price line. A pure function, so it is tested without a canvas. */
export function priceOption({
  points,
  unit,
  language,
  colors,
  animate,
}: PriceOptionInput): ChartOption {
  // Normally the API already sends few enough points; this keeps a long range from freezing the page.
  const [drawn = []] = downsample([points]);
  const times = drawn.map(([time]) => time);
  // A day or less shows the clock time, longer ranges the date as well.
  const first = times[0] ?? 0;
  const spansDays = (times.at(-1) ?? first) - first > DAY;
  return {
    // Animating tens of thousands of points would stall the first draw.
    animation: animate && points.length <= MAX_CHART_POINTS,
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.background,
      borderColor: colors.grid,
      textStyle: { color: colors.text },
      formatter: (params) => {
        const hovered = Array.isArray(params) ? params[0] : params;
        const point = readPoint(hovered?.value);
        if (!point) return "";
        const [time, price] = point;
        const when = spansDays ? formatDateTime(time, language) : formatClock(time);
        return `${when}<br /><strong>${formatPrice(price, language)}</strong> ${unit}`;
      },
    },
    xAxis: timeAxis({ times, language, colors }),
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
        // A hole in the data stops the line; a step line would otherwise hold the price across it.
        data: breakAtGaps(drawn),
      },
    ],
  };
}
