import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import type { TomorrowResponse, WindowsOfLength } from "@stromblick/shared";
import { renderApp } from "../../test/render";

// Tomorrow is 24 November 2026; Berlin is on UTC+1, so the day starts at 23:00 UTC on the 23rd.
const START = Date.parse("2026-11-23T23:00:00Z");
const SLOT = 900_000;

function prices(values: number[]): [number, number][] {
  return values.map((price, index) => [START + index * SLOT, price]);
}

const WINDOWS: WindowsOfLength[] = [1, 2, 3, 4].map((hours) => ({
  hours: hours as 1 | 2 | 3 | 4,
  // The cheapest starts at 01:00 German time (00:00 UTC); the most expensive at 00:00 (23:00 UTC).
  cheapest: { start: START + 4 * SLOT, end: START + (4 + 4 * hours) * SLOT, average: 40.5 },
  mostExpensive: { start: START, end: START + 4 * hours * SLOT, average: 180.25 },
}));

const PUBLISHED: TomorrowResponse = {
  status: "published",
  day: "2026-11-24",
  unit: "EUR/MWh",
  complete: true,
  // Eight quarter-hours are enough for the page: the windows come from the API.
  points: prices([80, 70, 60, 50, 120.3, 110, 100, -5.5]),
  windows: WINDOWS,
};

function stubTomorrow(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.endsWith("/tomorrow")) return Promise.resolve(Response.json(body, { status }));
    return Promise.resolve(
      Response.json({
        lastSuccessAt: "2026-11-23T12:00:00.000Z",
        lastRun: { status: "SUCCEEDED", finishedAt: "2026-11-23T12:00:00.000Z" },
        latestReadings: { "price-day-ahead": "2026-11-23T22:45:00.000Z" },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Tomorrow page", () => {
  it("asks the API for tomorrow's prices", async () => {
    const fetchMock = stubTomorrow(PUBLISHED);
    renderApp("/tomorrow");

    await screen.findByRole("img");
    expect(fetchMock).toHaveBeenCalledWith("/api/tomorrow", expect.anything());
  });

  describe("before the prices are published", () => {
    it("explains it, with the usual time and how far our data reaches", async () => {
      stubTomorrow({ status: "not-published", day: "2026-11-24" });
      renderApp("/tomorrow");

      expect(
        await screen.findByText(
          "The prices for Tuesday, November 24 aren't published yet. They usually appear around 13:00 German time. The newest prices we have run up to Nov 23, 2026, 23:45 CET.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    });

    it("explains it in German in German", async () => {
      await i18n.changeLanguage("de");
      stubTomorrow({ status: "not-published", day: "2026-11-24" });
      renderApp("/tomorrow");

      expect(
        await screen.findByText(
          /Die Preise für Dienstag, 24\. November sind noch nicht veröffentlicht\. Sie erscheinen meist gegen 13:00 Uhr deutscher Zeit\./,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("with the prices", () => {
    it("shows the cheapest and the most expensive window of 2 hours at first", async () => {
      stubTomorrow(PUBLISHED);
      renderApp("/tomorrow");

      expect(await screen.findByText("Cheapest 2 hours")).toBeInTheDocument();
      expect(screen.getByText("01:00–03:00")).toBeInTheDocument();
      expect(screen.getByText("40.50 EUR/MWh on average")).toBeInTheDocument();
      expect(screen.getByText("Most expensive 2 hours")).toBeInTheDocument();
      expect(screen.getByText("00:00–02:00")).toBeInTheDocument();
      expect(screen.getByText("180.25 EUR/MWh on average")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "2 hours" })).toBeChecked();
    });

    it("gives the chart a text alternative that names both windows", async () => {
      stubTomorrow(PUBLISHED);
      renderApp("/tomorrow");

      expect(
        await screen.findByRole("img", {
          name: "Line chart of tomorrow's day-ahead price in EUR/MWh. The cheapest and the most expensive 2-hour window are marked: cheapest 01:00–03:00, most expensive 00:00–02:00.",
        }),
      ).toBeInTheDocument();
    });

    it("shows another window length when it is picked, and keeps it in the link", async () => {
      const user = userEvent.setup();
      stubTomorrow(PUBLISHED);
      const { router } = renderApp("/tomorrow");
      await screen.findByText("Cheapest 2 hours");

      await user.click(screen.getByRole("radio", { name: "4 hours" }));

      expect(screen.getByText("Cheapest 4 hours")).toBeInTheDocument();
      expect(screen.getByText("01:00–05:00")).toBeInTheDocument();
      expect(router.state.location.search).toBe("?hours=4");
    });

    it("starts with the length in the link", async () => {
      stubTomorrow(PUBLISHED);
      renderApp("/tomorrow?hours=3");

      expect(await screen.findByText("Cheapest 3 hours")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "3 hours" })).toBeChecked();
    });

    it("says 'hour' for a single hour", async () => {
      stubTomorrow(PUBLISHED);
      renderApp("/tomorrow?hours=1");

      expect(await screen.findByText("Cheapest hour")).toBeInTheDocument();
      expect(screen.getByText("Most expensive hour")).toBeInTheDocument();
    });

    it("shows a price below zero with its minus sign, in the table", async () => {
      stubTomorrow(PUBLISHED);
      renderApp("/tomorrow");

      const table = await screen.findByRole("table", {
        name: "Day-ahead price on Tuesday, November 24 by time, in German time (CET)",
      });
      expect(within(table).getAllByRole("cell").at(-1)).toHaveTextContent("-5.50");
    });

    it("shows the prices in ct/kWh when that unit is chosen", async () => {
      const user = userEvent.setup();
      stubTomorrow(PUBLISHED);
      renderApp("/tomorrow");
      await screen.findByText("Cheapest 2 hours");

      await user.selectOptions(screen.getByLabelText("Price unit"), "ct/kWh");

      expect(screen.getByText("4.05 ct/kWh on average")).toBeInTheDocument();
      expect(screen.getByText("18.03 ct/kWh on average")).toBeInTheDocument();
    });

    it("writes the page in German in German", async () => {
      await i18n.changeLanguage("de");
      stubTomorrow(PUBLISHED);
      renderApp("/tomorrow");

      expect(await screen.findByText("Günstigste 2 Stunden")).toBeInTheDocument();
      expect(screen.getByText("Teuerste 2 Stunden")).toBeInTheDocument();
      expect(screen.getByText("40,50 EUR/MWh im Durchschnitt")).toBeInTheDocument();
    });
  });

  describe("with missing quarter-hours", () => {
    it("warns about it", async () => {
      stubTomorrow({ ...PUBLISHED, complete: false });
      renderApp("/tomorrow");

      expect(
        await screen.findByText(
          "Some quarter-hours of Tuesday, November 24 are missing at the source. Windows that would include them are left out.",
        ),
      ).toBeInTheDocument();
    });

    it("can't pick a length with no window, and shows the shortest one that has one", async () => {
      stubTomorrow({
        ...PUBLISHED,
        complete: false,
        windows: WINDOWS.slice(0, 2),
      });
      renderApp("/tomorrow?hours=4");

      expect(await screen.findByText("Cheapest hour")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "4 hours" })).toBeDisabled();
      expect(screen.getByRole("radio", { name: "1 hour" })).toBeChecked();
    });

    it("says so when no window is left", async () => {
      stubTomorrow({ ...PUBLISHED, complete: false, windows: [] });
      renderApp("/tomorrow");

      expect(
        await screen.findByText("There is no complete window to show: quarter-hours are missing."),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("radio").every((radio) => radio.hasAttribute("disabled"))).toBe(
        true,
      );
    });
  });

  it("says so when the prices can't be loaded", async () => {
    stubTomorrow({ type: "about:blank", title: "Internal Server Error", status: 500 }, 500);
    renderApp("/tomorrow");

    expect(await screen.findByText("Tomorrow's prices couldn't be loaded.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
