import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, beforeEach, vi } from "vitest";
import { HealthResponse } from "@stromblick/shared";
import { initI18n } from "../i18n";
import { mockSystemTheme } from "./media";

initI18n();

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockSystemTheme("light");
  // Pages call the API; tests get a healthy one unless they stub fetch themselves.
  const health: HealthResponse = { status: "ok", service: "api", database: "ok" };
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => Promise.resolve(Response.json(health))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});
