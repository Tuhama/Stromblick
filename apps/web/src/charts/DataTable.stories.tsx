import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataTable, type DataTableRow } from "./DataTable";
import { samplePrices } from "./sample-data";

const priceRows: DataTableRow[] = samplePrices(1).map(([time, price]) => ({
  time,
  values: [price],
}));

const meta = {
  title: "Charts/Data table",
  component: DataTable,
  args: {
    caption: "Day-ahead price in EUR/MWh",
    columns: ["Price"],
    rows: priceRows,
    formatValue: (value: number) => value.toFixed(2),
  },
  // Open, so the story and its a11y check show the table itself.
  render: (args) => (
    <div className="max-w-xl">
      <DataTable {...args} />
    </div>
  ),
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneColumn: Story = {};

/** A source that reported nothing in an hour shows "no data" in words, not a blank cell. */
export const MissingValues: Story = {
  args: {
    caption: "Generation in MWh",
    columns: ["Solar", "Wind"],
    rows: priceRows.slice(0, 8).map((row, index) => ({
      time: row.time,
      values: [index % 3 === 0 ? null : 100 + index, 250 + index],
    })),
    formatValue: (value: number) => value.toFixed(0),
  },
};
