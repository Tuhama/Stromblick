import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Point } from "@stromblick/shared";
import { ChartPanel, type ChartStatus } from "../../charts/ChartPanel";
import { samplePrices } from "../../charts/sample-data";
import TomorrowChart from "./TomorrowChart";

interface DemoProps {
  status: ChartStatus;
  points: Point[];
  onRetry: () => void;
}

/** The chart as the page uses it, with the two windows marked in the middle of the day. */
function Demo({ status, points, onRetry }: DemoProps) {
  const first = points[0]?.[0] ?? 0;
  const hour = 3_600_000;
  return (
    <ChartPanel status={status} onRetry={onRetry}>
      <TomorrowChart
        points={points}
        unit="EUR/MWh"
        cheapest={{ start: first + 10 * hour, end: first + 12 * hour, label: "Cheapest" }}
        mostExpensive={{
          start: first + 17 * hour,
          end: first + 19 * hour,
          label: "Most expensive",
        }}
        label="Day-ahead price tomorrow, with the cheapest and the most expensive window"
      />
    </ChartPanel>
  );
}

const meta = {
  title: "Tomorrow/Price chart with windows",
  component: Demo,
  args: { status: "ready", points: samplePrices(1), onRetry: fn() },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One day of prices with a cheap and an expensive 2-hour window marked. */
export const Normal: Story = {};

export const Loading: Story = { args: { status: "loading", points: [] } };
