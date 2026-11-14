import { LineChart, type LineSeriesOption } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import * as echarts from "echarts/core";
import type { ComposeOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

// Only the parts in use are registered, so the rest of ECharts stays out of the bundle.
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export { echarts };

/** An option object limited to the registered parts: using another one is a compile error. */
export type ChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption
>;
