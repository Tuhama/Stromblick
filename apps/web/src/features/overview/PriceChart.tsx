import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Point } from "@stromblick/shared";
import { useChartColors } from "../../charts/chart-colors";
import { EChart } from "../../charts/EChart";
import { currentLanguage } from "../../i18n";
import { priceOption } from "./price";

interface PriceChartProps {
  /** The prices, already in `unit`. */
  points: readonly Point[];
  unit: string;
  /** The chart's text alternative for screen readers. */
  label: string;
}

/**
 * The day-ahead price as a line chart. A default export, so the page can load this file,
 * and ECharts with it, lazily: after the text of the page, and only when a chart is shown.
 */
export default function PriceChart({ points, unit, label }: PriceChartProps) {
  // The hook makes the chart follow a language change, like every text on the page.
  useTranslation();
  const language = currentLanguage();
  const colors = useChartColors();

  // A new option object makes ECharts redraw, so build one only when its inputs change.
  const option = useMemo(
    () =>
      priceOption({
        points,
        unit,
        language,
        colors,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }),
    [points, unit, language, colors],
  );

  return <EChart option={option} label={label} className="h-72 w-full" />;
}
