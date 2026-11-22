import { screen } from "@testing-library/react";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import type { StatusResponse } from "@stromblick/shared";
import { HOUR, MINUTE } from "../../time/units";
import { renderApp } from "../../test/render";

/** Answers /status with the given last success, and everything else as the default stub does. */
function stubStatus(status: StatusResponse | number) {
  const defaultFetch = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (!url.endsWith("/status")) return defaultFetch(input, init);
      return Promise.resolve(
        typeof status === "number" ? Response.json({}, { status }) : Response.json(status),
      );
    }),
  );
}

function succeededAgo(milliseconds: number): StatusResponse {
  const at = new Date(Date.now() - milliseconds).toISOString();
  return {
    lastSuccessAt: at,
    lastRun: { status: "SUCCEEDED", finishedAt: at },
    latestReadings: {},
  };
}

describe("overview data freshness", () => {
  it("shows no warning when the data is fresh", async () => {
    renderApp("/");
    expect(await screen.findByText("Data updated 20 minutes ago")).toBeInTheDocument();
    expect(screen.queryByText("Warning:")).not.toBeInTheDocument();
  });

  it("accepts one missed hourly update without a warning", async () => {
    stubStatus(succeededAgo(2 * HOUR + 30 * MINUTE));
    renderApp("/");
    expect(await screen.findByText("Data updated 3 hours ago")).toBeInTheDocument();
    expect(screen.queryByText("Warning:")).not.toBeInTheDocument();
  });

  it("warns when the data is older than expected, and still shows the charts", async () => {
    stubStatus(succeededAgo(5 * HOUR));
    renderApp("/");

    expect(await screen.findByText(/The data is out of date/)).toHaveTextContent(
      "The data is out of date: the last successful update was 5 hours ago.",
    );
    expect(screen.getByText("Warning:")).toBeInTheDocument();
    // The last data is still on screen, not a blank chart.
    expect(await screen.findByRole("img", { name: "generation chart" })).toBeInTheDocument();
  });

  it("says the API is unreachable only when there is no earlier answer", async () => {
    stubStatus(503);
    renderApp("/");
    expect(await screen.findByText("The API is not reachable right now.")).toBeInTheDocument();
  });
});

describe("overview newest data", () => {
  it("says how new the prices and the generation figures are, in German time", async () => {
    renderApp("/");
    expect(await screen.findByText(/^Newest data:/)).toHaveTextContent(
      "Newest data: prices up to Nov 11, 2026, 23:45 CET and generation up to Nov 10, 2026, 15:00 CET.",
    );
  });

  it("names only what it knows", async () => {
    stubStatus({
      ...succeededAgo(20 * MINUTE),
      latestReadings: { "price-day-ahead": "2026-11-19T22:45:00.000Z" },
    });
    renderApp("/");
    expect(await screen.findByText(/^Newest data:/)).toHaveTextContent(
      "Newest data: prices up to Nov 19, 2026, 23:45 CET.",
    );
  });

  it("shows no line when the API knows no newest readings", async () => {
    stubStatus(succeededAgo(20 * MINUTE));
    renderApp("/");
    expect(await screen.findByText("Data updated 20 minutes ago")).toBeInTheDocument();
    expect(screen.queryByText(/^Newest data:/)).not.toBeInTheDocument();
  });

  it("is written in German for a German reader", async () => {
    await i18n.changeLanguage("de");
    renderApp("/");
    expect(await screen.findByText(/^Neueste Daten:/)).toHaveTextContent(
      "Neueste Daten: Preise bis 11.11.2026, 23:45 MEZ und Erzeugung bis 10.11.2026, 15:00 MEZ.",
    );
  });
});
