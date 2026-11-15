import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ChartPanel, type ChartStatus } from "../../charts/ChartPanel";
import { sampleGeneration } from "../../charts/sample-data";
import GenerationChart from "./GenerationChart";
import { groupGeneration, type GenerationLayer } from "./generation";

interface DemoProps {
  status: ChartStatus;
  layers: GenerationLayer[];
  onRetry: () => void;
}

/** The chart as the page uses it: inside a panel that stands in for it while there is no chart. */
function Demo({ status, layers, onRetry }: DemoProps) {
  return (
    <ChartPanel status={status} onRetry={onRetry}>
      <GenerationChart layers={layers} unit="MWh" />
    </ChartPanel>
  );
}

const meta = {
  title: "Overview/Generation mix",
  component: Demo,
  args: { status: "ready", layers: groupGeneration(sampleGeneration(1)), onRetry: fn() },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One day of hourly generation by source: the usual case. */
export const Normal: Story = {};

/** A week: the axis switches from hours to days. */
export const Week: Story = { args: { layers: groupGeneration(sampleGeneration(7)) } };

/** A year of 15-minute data in 11 series, 385,000 points: drawn from far fewer. */
export const YearOfQuarterHours: Story = {
  args: { layers: groupGeneration(sampleGeneration(365, 15)) },
};

export const Loading: Story = { args: { status: "loading", layers: [] } };
export const Empty: Story = { args: { status: "empty", layers: [] } };
export const Error: Story = { args: { status: "error", layers: [] } };
