import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import type { ReadingsResponse } from "@stromblick/shared";
import { todayInBerlin } from "../../time/berlin";
import { PRICE_UNIT_STORAGE_KEY } from "./price-unit";
import { PriceToday } from "./PriceToday";

const READINGS: ReadingsResponse = {
  series: "price-day-ahead",
  region: "DE-LU",
  resolution: "quarterhour",
  unit: "EUR/MWh",
  points: [
    [Date.parse("2026-11-13T23:00:00Z"), 80],
    [Date.parse("2026-11-14T02:15:00Z"), -5.5],
    [Date.parse("2026-11-14T17:00:00Z"), 120.3],
  ],
};

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPriceToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PriceToday />
    </QueryClientProvider>,
  );
}

describe("PriceToday", () => {
  it("asks for today's prices in Berlin", async () => {
    const fetchMock = stubFetch(READINGS);
    renderPriceToday();

    await screen.findByRole("img");
    const today = todayInBerlin();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/series/price-day-ahead/readings?from=${today}&to=${today}`,
      expect.anything(),
    );
  });

  it("shows the chart with a text alternative, and the day's figures", async () => {
    stubFetch(READINGS);
    renderPriceToday();

    expect(
      await screen.findByRole("img", {
        name: "Line chart of today's day-ahead price in EUR/MWh. Lowest -5.50, highest 120.30.",
      }),
    ).toBeInTheDocument();
    const lowest = screen.getByText("Lowest").parentElement;
    expect(lowest).toHaveTextContent("-5.50 EUR/MWh");
    expect(lowest).toHaveTextContent("at 03:15");
    const highest = screen.getByText("Highest").parentElement;
    expect(highest).toHaveTextContent("120.30 EUR/MWh");
    expect(highest).toHaveTextContent("at 18:00");
    expect(screen.getByText("Average").parentElement).toHaveTextContent("64.93 EUR/MWh");
    expect(screen.getByText(/Times are in German time \(CET\)\./)).toBeInTheDocument();
  });

  it("shows the prices in ct/kWh when that unit is chosen, and remembers it", async () => {
    const user = userEvent.setup();
    stubFetch(READINGS);
    renderPriceToday();
    await screen.findByRole("img");

    await user.selectOptions(screen.getByLabelText("Price unit"), "ct/kWh");

    expect(
      screen.getByRole("img", {
        name: "Line chart of today's day-ahead price in ct/kWh. Lowest -0.55, highest 12.03.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Lowest").parentElement).toHaveTextContent("-0.55 ct/kWh");
    expect(screen.getByText("Average").parentElement).toHaveTextContent("6.49 ct/kWh");
    expect(localStorage.getItem(PRICE_UNIT_STORAGE_KEY)).toBe("ct/kWh");
  });

  it("formats numbers the German way in German", async () => {
    await i18n.changeLanguage("de");
    stubFetch(READINGS);
    renderPriceToday();

    const highest = (await screen.findByText("Höchster")).parentElement;
    expect(highest).toHaveTextContent("120,30 EUR/MWh");
    expect(highest).toHaveTextContent("um 18:00");
  });

  it("says so when today's prices aren't there yet", async () => {
    stubFetch({ ...READINGS, points: [] });
    renderPriceToday();

    expect(await screen.findByText("Today's prices aren't available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("says so when the prices can't be loaded", async () => {
    stubFetch({ type: "about:blank", title: "Internal Server Error", status: 500 }, 500);
    renderPriceToday();

    expect(await screen.findByText("The prices couldn't be loaded.")).toBeInTheDocument();
  });
});
