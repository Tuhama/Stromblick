import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import { RenewableShare } from "./RenewableShare";
import { GenerationToday } from "./GenerationToday";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("RenewableShare", () => {
  it("shows the share and its definition", async () => {
    renderWithClient(<RenewableShare />);
    // The default stub gives every series the same values: 6 of the 11 series are renewable.
    expect(await screen.findByText("55%")).toBeInTheDocument();
    expect(screen.getByText(/Pumped storage doesn't count/)).toBeInTheDocument();
  });

  it("says so when the readings can't be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json({}, { status: 500 }))),
    );
    renderWithClient(<RenewableShare />);
    expect(await screen.findByText("The share couldn't be calculated.")).toBeInTheDocument();
  });

  it("says so when today has no generation yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({
            series: "x",
            region: "DE",
            resolution: "hour",
            unit: "MWh",
            points: [],
          }),
        ),
      ),
    );
    renderWithClient(<RenewableShare />);
    expect(await screen.findByText("Not available yet today.")).toBeInTheDocument();
  });
});

describe("GenerationToday", () => {
  it("draws the chart with the groups that have data", async () => {
    renderWithClient(<GenerationToday />);
    const chart = await screen.findByRole("img", { name: "generation chart" });
    expect(chart.dataset["layers"]).toContain("solar");
    expect(chart.dataset["layers"]).toContain("gas");
  });

  it("offers the hours as a table with a column per source and a total", async () => {
    renderWithClient(<GenerationToday />);
    const table = await screen.findByRole("table", {
      name: "Electricity generation today by source, in MWh per hour, in German time (CET)",
    });

    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers[0]).toBe("Time");
    expect(headers).toHaveLength(10); // time, 8 groups, total
    expect(headers.at(-1)).toBe("Total");
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual(["10:00", "11:00"]);
    // The default stub gives each of the 11 series 100 MWh an hour.
    const [firstRow] = within(table).getAllByRole("row").slice(1);
    expect(firstRow).toBeDefined();
    if (!firstRow) return;
    expect(within(firstRow).getAllByRole("cell").at(-1)).toHaveTextContent("1,100");
  });

  it("writes the generation table in German, with German group names and numbers", async () => {
    await i18n.changeLanguage("de");
    renderWithClient(<GenerationToday />);
    const table = await screen.findByRole("table", {
      name: "Stromerzeugung heute nach Quelle, in MWh pro Stunde, in deutscher Zeit (MEZ)",
    });

    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers[0]).toBe("Uhrzeit");
    expect(headers).toContain("Photovoltaik");
    expect(headers.at(-1)).toBe("Gesamt");
    const [firstRow] = within(table).getAllByRole("row").slice(1);
    if (!firstRow) throw new Error("the table has no rows");
    // 1,100 MWh in English, 1.100 in German.
    expect(within(firstRow).getAllByRole("cell").at(-1)).toHaveTextContent("1.100");
  });

  it("shows no table when the readings can't be loaded or today has none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json({}, { status: 500 }))),
    );
    const failed = renderWithClient(<GenerationToday />);
    await screen.findByText("The generation figures couldn't be loaded.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    failed.unmount();

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({ series: "x", region: "DE", resolution: "hour", unit: "MWh", points: [] }),
        ),
      ),
    );
    renderWithClient(<GenerationToday />);
    await screen.findByText("Today's generation figures aren't available yet.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("offers a retry when the readings can't be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json({}, { status: 500 }))),
    );
    renderWithClient(<GenerationToday />);
    expect(
      await screen.findByText("The generation figures couldn't be loaded."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("explains an empty day", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({ series: "x", region: "DE", resolution: "hour", unit: "MWh", points: [] }),
        ),
      ),
    );
    renderWithClient(<GenerationToday />);
    expect(
      await screen.findByText("Today's generation figures aren't available yet."),
    ).toBeInTheDocument();
  });
});
