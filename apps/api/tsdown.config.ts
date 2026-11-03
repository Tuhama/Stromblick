import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "node",
  format: "esm",
  dts: false,
  clean: true,
  fixedExtension: false,
  deps: { alwaysBundle: ["@stromblick/shared"] },
});
