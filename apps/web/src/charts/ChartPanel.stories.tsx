import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ChartPanel } from "./ChartPanel";

const meta = {
  title: "Charts/Chart panel",
  component: ChartPanel,
  args: { status: "ready", onRetry: fn(), children: <p>The chart would be here.</p> },
} satisfies Meta<typeof ChartPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { status: "loading" } };
export const Empty: Story = { args: { status: "empty" } };
export const Error: Story = { args: { status: "error" } };

/** A page can say something more specific than the generic texts. */
export const OwnWords: Story = {
  args: { status: "empty", messages: { empty: "Today's prices aren't available yet." } },
};
