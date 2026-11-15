import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Point } from "@stromblick/shared";
import { ChartPanel, type ChartStatus } from "../../charts/ChartPanel";
import { samplePrices } from "../../charts/sample-data";
import PriceChart from "./PriceChart";

interface DemoProps {
  status: ChartStatus;
  points: Point[];
  unit: string;
  onRetry: () => void;
}

/** The chart as the page uses it: inside a panel that stands in for it while there is no chart. */
function Demo({ status, points, unit, onRetry }: DemoProps) {
  return (
    <ChartPanel status={status} onRetry={onRetry}>
      <PriceChart points={points} unit={unit} label={`Day-ahead price in ${unit}`} />
    </ChartPanel>
  );
}

const meta = {
  title: "Overview/Price chart",
  component: Demo,
  args: { status: "ready", unit: "EUR/MWh", points: samplePrices(1), onRetry: fn() },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One day of 15-minute prices: the usual case. */
export const Normal: Story = {};

/** A week: the axis switches from hours to days. */
export const Week: Story = { args: { points: samplePrices(7) } };

/** A year of 15-minute prices, 35,040 points: drawn from far fewer, and no slower to open. */
export const YearOfQuarterHours: Story = { args: { points: samplePrices(365) } };

export const Loading: Story = { args: { status: "loading", points: [] } };
export const Empty: Story = { args: { status: "empty", points: [] } };
export const Error: Story = { args: { status: "error", points: [] } };
