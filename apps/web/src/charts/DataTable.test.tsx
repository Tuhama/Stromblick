import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableRow } from "./DataTable";

// 10:00 and 11:00 UTC are 11:00 and 12:00 in Berlin in winter.
const rows: DataTableRow[] = [
  { time: Date.parse("2026-01-15T10:00:00Z"), values: [12.5, 3] },
  { time: Date.parse("2026-01-15T11:00:00Z"), values: [null, 4] },
];

function renderTable() {
  return render(
    <DataTable
      caption="Wind and solar"
      columns={["Wind", "Solar"]}
      rows={rows}
      formatValue={(value) => value.toFixed(1)}
    />,
  );
}

describe("DataTable", () => {
  it("is closed until the reader opens it", async () => {
    renderTable();
    const details = screen.getByText("Show the data as a table").closest("details");
    expect(details).not.toHaveAttribute("open");

    await userEvent.click(screen.getByText("Show the data as a table"));
    expect(details).toHaveAttribute("open");
  });

  it("is a table with a caption and named columns", () => {
    renderTable();
    const table = screen.getByRole("table", { name: "Wind and solar" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(["Time", "Wind", "Solar"]);
  });

  it("writes each row's time in German time and its numbers with the given formatter", () => {
    renderTable();
    const [, first] = screen.getAllByRole("row");
    expect(first).toBeDefined();
    if (!first) return;
    expect(within(first).getByRole("rowheader")).toHaveTextContent("11:00");
    expect(
      within(first)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["12.5", "3.0"]);
  });

  it("says in words when a column has no reading", () => {
    renderTable();
    const [, , second] = screen.getAllByRole("row");
    expect(second).toBeDefined();
    if (!second) return;
    expect(within(second).getAllByRole("cell")[0]).toHaveTextContent("no data");
  });

  it("can be scrolled by keyboard, and is named", () => {
    renderTable();
    const region = screen.getByRole("region", { name: "Wind and solar" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("is reached with the Tab key: first the summary, then the scroll region", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByText("Show the data as a table"));

    // Leave the focus the click gave the summary, so the Tab key starts from the top of the page.
    screen.getByText("Show the data as a table").blur();
    await user.tab();
    expect(screen.getByText("Show the data as a table")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("region", { name: "Wind and solar" })).toHaveFocus();
  });

  it("uses the German texts after a language change", async () => {
    await i18n.changeLanguage("de");
    renderTable();
    expect(screen.getByText("Daten als Tabelle anzeigen")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Uhrzeit" })).toBeInTheDocument();
  });
});
