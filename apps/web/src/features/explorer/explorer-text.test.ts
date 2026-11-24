import { describe, expect, it } from "vitest";
import { formatPeriod, isDaily } from "./explorer-text";

describe("formatPeriod", () => {
  it("names a single day once", () => {
    expect(formatPeriod("2026-11-20", "2026-11-20", "en")).toBe("Nov 20, 2026");
  });

  it("names the first and the last day of a longer range, with the year", () => {
    expect(formatPeriod("2026-11-14", "2026-11-20", "en")).toBe("Nov 14, 2026 – Nov 20, 2026");
    expect(formatPeriod("2025-11-21", "2026-11-20", "de")).toBe("21.11.2025 – 20.11.2026");
  });
});

describe("isDaily", () => {
  it("is true only when one reading is a whole day", () => {
    expect(isDaily("day")).toBe(true);
    expect(isDaily("hour")).toBe(false);
    expect(isDaily("quarterhour")).toBe(false);
  });
});
