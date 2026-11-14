import { useEffect, useRef } from "react";
import { echarts, type ChartOption } from "./echarts";

interface EChartProps {
  option: ChartOption;
  /** What the chart shows, for screen readers: the canvas itself is one opaque image to them. */
  label: string;
  className?: string;
}

/** Draws an ECharts option into a div, and keeps it in step with the option and the div's size. */
export function EChart({ option, label, className }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  // Create the chart once, and free its canvas and listeners when the component goes away.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container);
    chartRef.current = chart;
    // ECharts draws at a fixed pixel size, so it has to be told when its container changes.
    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Runs after the effect above. notMerge: the new option replaces the old one completely.
  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} role="img" aria-label={label} className={className} />;
}
