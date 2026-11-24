import { DAY, type Point, type Resolution } from "@stromblick/shared";
import type { ChartColors } from "../../charts/chart-colors";
import { downsample, MAX_CHART_POINTS } from "../../charts/downsample";
import type { ChartOption } from "../../charts/echarts";
import { breakAtGaps } from "../../charts/gaps";
import { timeAxis } from "../../charts/time-axis";
import { readPoint } from "../../charts/tooltip";
import { formatClock, formatDate, formatDateTime } from "../../time/berlin";
import { isDaily } from "./explorer-text";

interface ExplorerOptionInput {
  points: readonly Point[];
  unit: string;
  resolution: Resolution;
  /** A price holds for its whole interval, so it is drawn as steps; energy as a plain line. */
  steps: boolean;
  /** Writes a value in the reader's language. */
  formatValue: (value: number) => string;
  language: string;
  colors: ChartColors;
  animate: boolean;
}

/** The ECharts option of the Explorer's line. A pure function, so it is tested without a canvas. */
export function explorerOption({
  points,
  unit,
  resolution,
  steps,
  formatValue,
  language,
  colors,
  animate,
}: ExplorerOptionInput): ChartOption {
  // The API keeps a range small enough for a chart; this keeps a surprise from freezing the page.
  const [drawn = []] = downsample([points]);
  const times = drawn.map(([time]) => time);
  const first = times[0] ?? 0;
  const spansDays = (times.at(-1) ?? first) - first > DAY;

  function when(time: number): string {
    if (isDaily(resolution)) return formatDate(time, language);
    return spansDays ? formatDateTime(time, language) : formatClock(time);
  }

  return {
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
        const [time, value] = point;
        return `${when(time)}<br /><strong>${formatValue(value)}</strong> ${unit}`;
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
        ...(steps ? { step: "end" as const } : {}),
        showSymbol: false,
        lineStyle: { color: colors.line, width: 2 },
        itemStyle: { color: colors.line },
        // A hole in the data stops the line instead of joining the two sides.
        data: breakAtGaps(drawn),
      },
    ],
  };
}
