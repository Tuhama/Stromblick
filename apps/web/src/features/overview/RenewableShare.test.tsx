import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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
