import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import i18n from "i18next";
import { createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import {
  DAY_AHEAD_PRICE_KEY,
  type ReadingsResponse,
  type StatusResponse,
} from "@stromblick/shared";
import { initI18n } from "../i18n";
import { MINUTE } from "../time/units";
import { mockSystemTheme } from "./media";

initI18n();

// The first test of a file waits for the lazily loaded chart chunk, which takes 1 to 3 s on a busy
// machine: longer than the default 1 s for findBy queries, which made those tests fail at random.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no canvas, so ECharts can't draw in tests. The stand-in keeps the chart's text alternative.
vi.mock("../features/overview/PriceChart", () => ({
  default: ({ label }: { label: string }) =>
    createElement("div", { role: "img", "aria-label": label }),
}));

vi.mock("../features/overview/GenerationChart", () => ({
  default: ({ layers }: { layers: { id: string }[] }) =>
    createElement("div", {
      role: "img",
      "aria-label": "generation chart",
      "data-layers": layers.map((layer) => layer.id).join(","),
    }),
}));

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockSystemTheme("light");
  // Pages call the API; tests get one with fresh data unless they stub fetch themselves.
  const updated = new Date(Date.now() - 20 * MINUTE).toISOString();
  const status: StatusResponse = {
    lastSuccessAt: updated,
    lastRun: { status: "SUCCEEDED", finishedAt: updated },
    // Prices are published for tomorrow; generation reaches into today. Fixed, so texts are stable.
    latestReadings: {
      "price-day-ahead": "2026-11-11T22:45:00.000Z",
      "generation-solar": "2026-11-10T15:00:00.000Z",
      "generation-wind-onshore": "2026-11-10T14:00:00.000Z",
    },
  };
  const readings: ReadingsResponse = {
    series: DAY_AHEAD_PRICE_KEY,
    region: "DE-LU",
    resolution: "quarterhour",
    unit: "EUR/MWh",
    points: [[Date.parse("2026-11-10T19:00:00Z"), 98.5]],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (!url.includes("/readings")) return Promise.resolve(Response.json(status));
      // Generation series: 100 MWh in each of two hours; the price series: one quarter hour.
      const key = /\/series\/([^/]+)\/readings/.exec(url)?.[1] ?? DAY_AHEAD_PRICE_KEY;
      if (key.startsWith("generation-")) {
        const generation: ReadingsResponse = {
          ...readings,
          series: key,
          region: "DE",
          resolution: "hour",
          unit: "MWh",
          points: [
            [Date.parse("2026-11-10T09:00:00Z"), 100],
            [Date.parse("2026-11-10T10:00:00Z"), 100],
          ],
        };
        return Promise.resolve(Response.json(generation));
      }
      return Promise.resolve(Response.json(readings));
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});
