import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Point, Resolution } from "@stromblick/shared";
import { useChartColors } from "../../charts/chart-colors";
import { EChart } from "../../charts/EChart";
import { currentLanguage } from "../../i18n";
import { explorerOption } from "./explorer-option";

interface ExplorerChartProps {
  points: readonly Point[];
  unit: string;
  resolution: Resolution;
  steps: boolean;
  formatValue: (value: number) => string;
  /** The chart's text alternative for screen readers. */
  label: string;
}

/**
 * One series over the chosen range as a line chart. A default export, so the page can load this
 * file, and ECharts with it, lazily: after the text of the page, and only when a chart is shown.
 */
export default function ExplorerChart({
  points,
  unit,
  resolution,
  steps,
  formatValue,
  label,
}: ExplorerChartProps) {
  // The hook makes the chart follow a language change, like every text on the page.
  useTranslation();
  const language = currentLanguage();
  const colors = useChartColors();

  // A new option object makes ECharts redraw, so build one only when its inputs change.
  const option = useMemo(
    () =>
      explorerOption({
        points,
        unit,
        resolution,
        steps,
        formatValue,
        language,
        colors,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }),
    [points, unit, resolution, steps, formatValue, language, colors],
  );

  return <EChart option={option} label={label} className="h-72 w-full" />;
}
