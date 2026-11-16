/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
