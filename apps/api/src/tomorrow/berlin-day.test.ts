import { describe, expect, it } from "vitest";
import { slotsInDay } from "./berlin-day";

describe("slotsInDay", () => {
  it("has 96 quarter-hours on an ordinary day, in winter and in summer", () => {
    expect(slotsInDay("2026-11-24")).toBe(96);
    expect(slotsInDay("2026-07-15")).toBe(96);
  });

  it("has 92 when the clocks go forward and 100 when they go back", () => {
    expect(slotsInDay("2026-03-29")).toBe(92);
    expect(slotsInDay("2026-10-25")).toBe(100);
  });

  it("is back to 96 the day after a change", () => {
    expect(slotsInDay("2026-03-30")).toBe(96);
    expect(slotsInDay("2026-10-26")).toBe(96);
  });
});
