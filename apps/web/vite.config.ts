/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";

// Source maps go to Sentry only in a build that has the token (the Vercel build). Everywhere else
// (development, tests, CI, a build on a laptop) nothing is uploaded and no map is written.
const uploadSourceMaps = Boolean(process.env["SENTRY_AUTH_TOKEN"]);

// https://vite.dev/config/
export default defineConfig({
  build: {
    // "hidden": the maps exist for the upload, but the files do not point to them.
    sourcemap: uploadSourceMaps ? "hidden" : false,
  },
  plugins: [
    react(),
    tailwindcss(),
    // Last, as the Sentry docs say: it must see the final files.
    ...(uploadSourceMaps
      ? [
          sentryVitePlugin({
            authToken: process.env["SENTRY_AUTH_TOKEN"],
            org: process.env["SENTRY_ORG"],
            project: process.env["SENTRY_PROJECT"],
            // The EU region has its own address.
            url: "https://de.sentry.io",
            telemetry: false,
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
          }),
        ]
      : []),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    // A browser-like DOM for component tests.
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Tests that render the whole app and click through it take 3 to 5 s on a busy machine in jsdom:
    // the default 5 s limit made them fail at random.
    testTimeout: 15_000,
  },
});
