import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import i18n from "i18next";
import { createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import type { ReadingsResponse, StatusResponse } from "@stromblick/shared";
import { initI18n } from "../i18n";
import { mockSystemTheme } from "./media";

initI18n();

// jsdom has no canvas, so ECharts can't draw in tests. The stand-in keeps the chart's text alternative.
vi.mock("../features/overview/PriceChart", () => ({
  default: ({ label }: { label: string }) =>
    createElement("div", { role: "img", "aria-label": label }),
}));

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockSystemTheme("light");
  // Pages call the API; tests get one with fresh data unless they stub fetch themselves.
  const updated = new Date(Date.now() - 20 * 60_000).toISOString();
  const status: StatusResponse = {
    lastSuccessAt: updated,
    lastRun: { status: "SUCCEEDED", finishedAt: updated },
  };
  const readings: ReadingsResponse = {
    series: "price-day-ahead",
    region: "DE-LU",
    resolution: "quarterhour",
    unit: "EUR/MWh",
    points: [[Date.parse("2026-11-10T19:00:00Z"), 98.5]],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input) => {
      const url = input instanceof Request ? input.url : input.toString();
      return Promise.resolve(Response.json(url.includes("/readings") ? readings : status));
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
