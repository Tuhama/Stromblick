import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import type { ReadingsResponse, Series, SeriesListResponse } from "@stromblick/shared";
import { renderApp } from "../../test/render";
import { todayInBerlin } from "../../time/berlin";
import { addDays } from "./explorer-range";

const SERIES: Series[] = [
  {
    key: "price-day-ahead",
    kind: "price",
    unit: "EUR/MWh",
    name: { en: "Day-ahead price", de: "Day-Ahead-Preis" },
  },
  { key: "load", kind: "load", unit: "MWh", name: { en: "Grid load", de: "Netzlast" } },
  {
    key: "generation-solar",
    kind: "generation",
    unit: "MWh",
    name: { en: "Solar", de: "Photovoltaik" },
  },
];

const SOLAR: ReadingsResponse = {
  series: "generation-solar",
  region: "DE",
  resolution: "hour",
  unit: "MWh",
  points: [
    [Date.parse("2026-11-19T11:00:00Z"), 4200],
    [Date.parse("2026-11-19T12:00:00Z"), 5100.4],
    [Date.parse("2026-11-19T13:00:00Z"), 3900],
  ],
};

const PRICE: ReadingsResponse = {
  series: "price-day-ahead",
  region: "DE-LU",
  resolution: "hour",
  unit: "EUR/MWh",
  points: [
    [Date.parse("2026-11-19T11:00:00Z"), 80],
    [Date.parse("2026-11-19T12:00:00Z"), -5.5],
  ],
};

/** The catalog and readings answers; `readings` decides what a request for readings gets. */
function stubApi(readings: (url: string) => Response) {
  const list: SeriesListResponse = { series: SERIES };
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.endsWith("/series")) return Promise.resolve(Response.json(list));
    if (url.includes("/readings")) return Promise.resolve(readings(url));
    return Promise.resolve(Response.json({}, { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function answer(url: string): Response {
  return Response.json(url.includes("/series/generation-solar/") ? SOLAR : PRICE);
}

function readingsUrls(fetchMock: ReturnType<typeof stubApi>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => (input instanceof Request ? input.url : input.toString()))
    .filter((url) => url.includes("/readings"));
}

describe("Explorer page", () => {
  it("asks for the series and the days named in the link", async () => {
    const fetchMock = stubApi(answer);
    renderApp("/explorer?series=generation-solar&range=month&end=2026-11-20");

    await screen.findByRole("img");
    expect(readingsUrls(fetchMock)).toEqual([
      "/api/series/generation-solar/readings?from=2026-10-22&to=2026-11-20",
    ]);
  });

  it("shows the view from the link in its controls and its heading", async () => {
    stubApi(answer);
    renderApp("/explorer?series=generation-solar&range=month&end=2026-11-20");

    expect(await screen.findByRole("img")).toHaveAccessibleName(
      "Line chart of Solar, Oct 22, 2026 – Nov 20, 2026, in MWh. Lowest 3,900, highest 5,100.",
    );
    expect(screen.getByLabelText("Series")).toHaveValue("generation-solar");
    expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
    expect(screen.getByLabelText("Last day")).toHaveValue("2026-11-20");
    expect(
      screen.getByRole("heading", { level: 2, name: "Solar, Oct 22, 2026 – Nov 20, 2026" }),
    ).toBeInTheDocument();
  });

  it("shows the latest week of the day-ahead price when the link says nothing", async () => {
    const fetchMock = stubApi(answer);
    renderApp("/explorer");

    await screen.findByRole("img");
    const today = todayInBerlin();
    expect(readingsUrls(fetchMock)).toEqual([
      `/api/series/price-day-ahead/readings?from=${addDays(today, -6)}&to=${today}`,
    ]);
    expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();
  });

  it("falls back on the price and the latest week when the link makes no sense", async () => {
    const fetchMock = stubApi(answer);
    renderApp("/explorer?series=no-such-series&range=century&end=2999-01-01");

    await screen.findByRole("img");
    const today = todayInBerlin();
    expect(readingsUrls(fetchMock)).toEqual([
      `/api/series/price-day-ahead/readings?from=${addDays(today, -6)}&to=${today}`,
    ]);
    expect(screen.getByLabelText("Series")).toHaveValue("price-day-ahead");
  });

  describe("changing the view", () => {
    it("writes the whole view into the URL, so the link reproduces it", async () => {
      stubApi(answer);
      const { router } = renderApp("/explorer?series=generation-solar&range=month&end=2026-11-20");
      await screen.findByRole("img");

      await userEvent.click(screen.getByRole("radio", { name: "Week" }));

      await waitFor(() => {
        expect(router.state.location.search).toBe(
          "?series=generation-solar&range=week&end=2026-11-20",
        );
      });
    });

    it("loads the new range", async () => {
      const fetchMock = stubApi(answer);
      renderApp("/explorer?series=generation-solar&range=month&end=2026-11-20");
      await screen.findByRole("img");

      await userEvent.click(screen.getByRole("radio", { name: "Day" }));

      await waitFor(() => {
        expect(readingsUrls(fetchMock)).toContain(
          "/api/series/generation-solar/readings?from=2026-11-20&to=2026-11-20",
        );
      });
    });

    it("changes the series", async () => {
      const fetchMock = stubApi(answer);
      const { router } = renderApp("/explorer?series=generation-solar&range=week&end=2026-11-20");
      await screen.findByRole("img");

      await userEvent.selectOptions(screen.getByLabelText("Series"), "Grid load");

      await waitFor(() => {
        expect(router.state.location.search).toBe("?series=load&range=week&end=2026-11-20");
      });
      expect(readingsUrls(fetchMock)).toContain(
        "/api/series/load/readings?from=2026-11-14&to=2026-11-20",
      );
    });

    it("steps a whole range earlier and later", async () => {
      stubApi(answer);
      const { router } = renderApp("/explorer?series=load&range=week&end=2026-11-20");
      await screen.findByRole("img");

      await userEvent.click(screen.getByRole("button", { name: "Earlier" }));
      await waitFor(() => {
        expect(router.state.location.search).toBe("?series=load&range=week&end=2026-11-13");
      });

      await userEvent.click(screen.getByRole("button", { name: "Later" }));
      await waitFor(() => {
        expect(router.state.location.search).toBe("?series=load&range=week&end=2026-11-20");
      });
    });

    it("can't go later than today", async () => {
      stubApi(answer);
      renderApp("/explorer");
      await screen.findByRole("img");

      expect(screen.getByRole("button", { name: "Later" })).toBeDisabled();
      expect(screen.getByLabelText("Last day")).toHaveAttribute("max", todayInBerlin());
    });

    it("takes a last day typed into the date field", async () => {
      stubApi(answer);
      const { router } = renderApp("/explorer?series=load&range=week&end=2026-11-20");
      await screen.findByRole("img");

      // A date field has no keys to type into in jsdom; the change event is what the browser sends.
      fireEvent.change(screen.getByLabelText("Last day"), { target: { value: "2026-11-10" } });

      await waitFor(() => {
        expect(router.state.location.search).toBe("?series=load&range=week&end=2026-11-10");
      });
    });
  });

  describe("the price unit", () => {
    it("is offered for the price only", async () => {
      stubApi(answer);
      renderApp("/explorer?series=price-day-ahead&range=day&end=2026-11-19");
      await screen.findByRole("img");
      expect(screen.getByLabelText("Price unit")).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByLabelText("Series"), "Solar");
      await screen.findByRole("heading", { level: 2, name: /^Solar/ });
      expect(screen.queryByLabelText("Price unit")).not.toBeInTheDocument();
    });

    it("converts the price to the chosen unit", async () => {
      stubApi(answer);
      renderApp("/explorer?series=price-day-ahead&range=day&end=2026-11-19");
      const chart = await screen.findByRole("img");
      expect(chart).toHaveAccessibleName(
        "Line chart of Day-ahead price, Nov 19, 2026, in EUR/MWh. Lowest -5.50, highest 80.00.",
      );

      await userEvent.selectOptions(screen.getByLabelText("Price unit"), "ct/kWh");

      expect(await screen.findByRole("img")).toHaveAccessibleName(
        "Line chart of Day-ahead price, Nov 19, 2026, in ct/kWh. Lowest -0.55, highest 8.00.",
      );
    });
  });

  it("shows the lowest, the highest and the average of the range", async () => {
    stubApi(answer);
    renderApp("/explorer?series=generation-solar&range=week&end=2026-11-20");

    const figures = (await screen.findByText("Lowest")).closest("dl");
    expect(figures).not.toBeNull();
    if (!figures) return;
    expect(within(figures).getByText("3,900")).toBeInTheDocument();
    expect(within(figures).getByText("5,100")).toBeInTheDocument();
    // (4200 + 5100.4 + 3900) / 3
    expect(within(figures).getByText("4,400")).toBeInTheDocument();
  });

  it("says what the readings are: how often, and in which time", async () => {
    stubApi(answer);
    renderApp("/explorer?series=generation-solar&range=week&end=2026-11-20");

    expect(
      await screen.findByText(
        "One value per hour. Energy is in MWh per interval. Times are in German time (CET).",
      ),
    ).toBeInTheDocument();
  });

  it("does not talk about energy under a price", async () => {
    stubApi(answer);
    renderApp("/explorer?series=price-day-ahead&range=week&end=2026-11-20");

    expect(
      await screen.findByText("One value per hour. Times are in German time (CET)."),
    ).toBeInTheDocument();
  });

  it("says so when the range has no readings", async () => {
    stubApi(() => Response.json({ ...SOLAR, points: [] }));
    renderApp("/explorer?series=generation-solar&range=week&end=2026-01-20");

    expect(
      await screen.findByText("We have no readings for this range. Try a later one."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("says so when the readings can't be loaded, and offers to try again", async () => {
    stubApi(() => Response.json({ title: "Server error" }, { status: 500 }));
    renderApp("/explorer?series=generation-solar&range=week&end=2026-11-20");

    expect(await screen.findByText("The figures couldn't be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("writes the texts, the dates and the numbers in German", async () => {
    await i18n.changeLanguage("de");
    stubApi(answer);
    renderApp("/explorer?series=generation-solar&range=month&end=2026-11-20");

    expect(await screen.findByRole("img")).toHaveAccessibleName(
      "Liniendiagramm: Photovoltaik, 22.10.2026 – 20.11.2026, in MWh. Niedrigster Wert 3.900, höchster 5.100.",
    );
    expect(screen.getByRole("radio", { name: "Monat" })).toBeChecked();
    expect(screen.getByLabelText("Letzter Tag")).toHaveValue("2026-11-20");
  });
});
