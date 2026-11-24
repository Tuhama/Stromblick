import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Point } from "@stromblick/shared";
import { useChartColors } from "../../charts/chart-colors";
import { EChart } from "../../charts/EChart";
import { currentLanguage } from "../../i18n";
import { tomorrowOption, type Highlight } from "./tomorrow-option";

interface TomorrowChartProps {
  /** The prices, already in `unit`. */
  points: readonly Point[];
  unit: string;
  cheapest: Highlight | null;
  mostExpensive: Highlight | null;
  /** The chart's text alternative for screen readers. */
  label: string;
}

/** Tomorrow's price line with the chosen windows marked. A default export, loaded lazily like the other charts. */
export default function TomorrowChart({
  points,
  unit,
  cheapest,
  mostExpensive,
  label,
}: TomorrowChartProps) {
  // The hook makes the chart follow a language change, like every text on the page.
  useTranslation();
  const language = currentLanguage();
  const colors = useChartColors();

  const option = useMemo(
    () =>
      tomorrowOption({
        points,
        unit,
        language,
        colors,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        cheapest,
        mostExpensive,
      }),
    [points, unit, language, colors, cheapest, mostExpensive],
  );

  return <EChart option={option} label={label} className="h-72 w-full" />;
}
