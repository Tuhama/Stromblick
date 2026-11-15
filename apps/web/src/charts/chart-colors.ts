import { useEffect, useState } from "react";

export const SERIES_COUNT = 8;

export interface ChartColors {
  line: string;
  text: string;
  grid: string;
  background: string;
  /** Categorical colors for charts with several series, in their fixed order. */
  series: readonly string[];
}

/** A canvas can't use CSS variables, so the design tokens are read from <html> as plain colors. */
function readChartColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    line: token("--primary"),
    text: token("--muted-foreground"),
    grid: token("--border"),
    background: token("--background"),
    series: Array.from({ length: SERIES_COUNT }, (_, i) => token(`--series-${String(i + 1)}`)),
  };
}

/** The current theme's chart colors; read again whenever the theme changes. */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState(readChartColors);

  useEffect(() => {
    // The theme is the .dark class on <html> (see theme.ts), so a class change is a theme change.
    const observer = new MutationObserver(() => {
      setColors(readChartColors());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
    };
  }, []);

  return colors;
}
