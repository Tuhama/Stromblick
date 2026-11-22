import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
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

  it("offers the day's prices as a table, in German time", async () => {
    stubFetch(READINGS);
    renderPriceToday();

    const table = await screen.findByRole("table", {
      name: "Day-ahead price today by time, in German time (CET)",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Time", "Price (EUR/MWh)"]);
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual(["00:00", "03:15", "18:00"]);
    expect(
      within(table)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["80.00", "-5.50", "120.30"]);
  });

  it("changes the table's unit with the chart's", async () => {
    const user = userEvent.setup();
    stubFetch(READINGS);
    renderPriceToday();
    await screen.findByRole("table");

    await user.selectOptions(screen.getByLabelText("Price unit"), "ct/kWh");

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Price (ct/kWh)" })).toBeInTheDocument();
    expect(within(table).getAllByRole("cell")[1]).toHaveTextContent("-0.55");
  });

  it("writes the table in German in German", async () => {
    await i18n.changeLanguage("de");
    stubFetch(READINGS);
    renderPriceToday();

    const table = await screen.findByRole("table", {
      name: "Day-Ahead-Preis heute nach Uhrzeit, in deutscher Zeit (MEZ)",
    });
    expect(within(table).getAllByRole("cell")[2]).toHaveTextContent("120,30");
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

  it("shows no table while loading, when there are no prices, or when they can't be loaded", async () => {
    // Loading: the request never answers.
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined)),
    );
    const loading = renderPriceToday();
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    loading.unmount();

    stubFetch({ ...READINGS, points: [] });
    const empty = renderPriceToday();
    await screen.findByText("Today's prices aren't available yet.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    empty.unmount();

    stubFetch({ type: "about:blank", title: "Internal Server Error", status: 500 }, 500);
    renderPriceToday();
    await screen.findByText("The prices couldn't be loaded.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says so when today's prices aren't there yet", async () => {
    stubFetch({ ...READINGS, points: [] });
    renderPriceToday();

    expect(await screen.findByText("Today's prices aren't available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("says how far the data reaches when today has no prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        // The 20th and 21st are missing at SMARD; the newest price is for the 22nd.
        return Promise.resolve(
          Response.json(
            url.endsWith("/status")
              ? {
                  lastSuccessAt: "2026-11-21T13:15:35.000Z",
                  lastRun: { status: "SUCCEEDED", finishedAt: "2026-11-21T13:15:35.000Z" },
                  latestReadings: { "price-day-ahead": "2026-11-22T22:45:00.000Z" },
                }
              : { ...READINGS, points: [] },
          ),
        );
      }),
    );
    renderPriceToday();

    expect(
      await screen.findByText(
        "Today's prices aren't available. The newest prices we have run up to Nov 22, 2026, 23:45 CET.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("says so when the prices can't be loaded", async () => {
    stubFetch({ type: "about:blank", title: "Internal Server Error", status: 500 }, 500);
    renderPriceToday();

    expect(await screen.findByText("The prices couldn't be loaded.")).toBeInTheDocument();
  });

  it("tells a visitor who hit the rate limit how long to wait, in both languages", async () => {
    const tooMany = () =>
      Promise.resolve(
        Response.json(
          { type: "about:blank", title: "Too Many Requests", status: 429 },
          { status: 429, headers: { "Retry-After": "30" } },
        ),
      );
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(tooMany));
    const english = renderPriceToday();
    expect(
      await screen.findByText("Too many requests. Please try again in 30 seconds."),
    ).toBeInTheDocument();
    expect(screen.queryByText("The prices couldn't be loaded.")).not.toBeInTheDocument();
    english.unmount();

    await act(() => i18n.changeLanguage("de"));
    renderPriceToday();
    expect(
      await screen.findByText("Zu viele Anfragen. Bitte versuche es in 30 Sekunden erneut."),
    ).toBeInTheDocument();
  });

  it("keeps the last prices, with a warning, when a refresh fails", async () => {
    const fetchMock = stubFetch(READINGS);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PriceToday />
      </QueryClientProvider>,
    );
    await screen.findByRole("img");

    // The API goes down: the next refresh fails.
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({}, { status: 500 })));
    await act(() => client.refetchQueries());

    expect(await screen.findByText(/Couldn't refresh/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText("The prices couldn't be loaded.")).not.toBeInTheDocument();
  });
});
