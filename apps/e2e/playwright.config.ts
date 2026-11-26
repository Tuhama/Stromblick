import { defineConfig, devices } from "@playwright/test";

const API_PORT = 3101;
const WEB_PORT = 4173;
const API_URL = `http://localhost:${String(API_PORT)}`;
const WEB_URL = `http://localhost:${String(WEB_PORT)}`;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://stromblick:stromblick@localhost:5432/stromblick_e2e";
const CI = process.env.CI !== undefined;

export default defineConfig({
  testDir: "./tests",
  // The tests share one database and one clock, so they run one after the other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // For a machine without Playwright's own browser: E2E_CHROME_PATH=/usr/bin/google-chrome.
    launchOptions: { executablePath: process.env.E2E_CHROME_PATH },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // The seed and the fake model live in the API's own e2e entry. Needs the migrated database.
      command: "pnpm --filter @stromblick/api e2e-server",
      url: `${API_URL}/health`,
      env: {
        NODE_ENV: "test",
        PORT: String(API_PORT),
        LOG_LEVEL: "warn",
        DATABASE_URL,
        INGEST_SECRET: "e2e-only-secret-e2e-only-secret-0000",
        CORS_ORIGINS: WEB_URL,
      },
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      // Serves apps/web/dist with the headers of apps/web/vercel.json. Build the web app first.
      command: "pnpm exec tsx server/web.ts",
      url: WEB_URL,
      env: { E2E_WEB_PORT: String(WEB_PORT), E2E_API_URL: API_URL },
      reuseExistingServer: !CI,
      timeout: 30_000,
    },
  ],
});
