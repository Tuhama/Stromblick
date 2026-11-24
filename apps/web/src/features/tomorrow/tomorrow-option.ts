import type { Point } from "@stromblick/shared";
import type { ChartColors } from "../../charts/chart-colors";
import type { ChartOption } from "../../charts/echarts";
import { priceOption } from "../overview/price";

/** A stretch of the day to mark on the chart. */
export interface Highlight {
  start: number;
  end: number;
  /** Written inside the marked area, so the meaning does not depend on its color. */
  label: string;
}

interface TomorrowOptionInput {
  /** The prices, already in `unit`. */
  points: readonly Point[];
  unit: string;
  language: string;
  colors: ChartColors;
  animate: boolean;
  cheapest: Highlight | null;
  mostExpensive: Highlight | null;
}

/**
 * The price line of the overview, with the cheapest and the most expensive window marked. The two
 * areas also differ in their border (solid, dashed), not only in color. A pure function, so it is
 * tested without a canvas.
 */
export function tomorrowOption({
  cheapest,
  mostExpensive,
  ...input
}: TomorrowOptionInput): ChartOption {
  const base = priceOption(input);
  const { colors } = input;

  const area = (highlight: Highlight, color: string | undefined, dashed: boolean) =>
    [
      {
        name: highlight.label,
        xAxis: highlight.start,
        itemStyle: {
          color,
          opacity: 0.2,
          borderColor: color,
          borderWidth: 1.5,
          borderType: dashed ? ("dashed" as const) : ("solid" as const),
        },
        label: {
          show: true,
          position: "insideTop" as const,
          color: colors.text,
          formatter: "{b}",
        },
      },
      { xAxis: highlight.end },
    ] satisfies [object, object];

  const areas = [
    ...(cheapest ? [area(cheapest, colors.series[0], false)] : []),
    ...(mostExpensive ? [area(mostExpensive, colors.series[1], true)] : []),
  ];

  const [line] = [base.series].flat();
  return {
    ...base,
    series: line ? [{ ...line, markArea: { silent: true, data: areas } }] : base.series,
  };
}
