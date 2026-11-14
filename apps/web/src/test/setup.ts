import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, beforeEach, vi } from "vitest";
import type { StatusResponse } from "@stromblick/shared";
import { initI18n } from "../i18n";
import { mockSystemTheme } from "./media";

initI18n();

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockSystemTheme("light");
  // Pages call the API; tests get one with fresh data unless they stub fetch themselves.
  const status: StatusResponse = {
    lastSuccessAt: "2026-11-10T19:00:05.000Z",
    lastRun: { status: "SUCCEEDED", finishedAt: "2026-11-10T19:00:05.000Z" },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => Promise.resolve(Response.json(status))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});
