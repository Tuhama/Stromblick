import { describe, expect, it } from "vitest";
import { HOUR, DAY } from "../time/units";
import { axisTicks, axisTier, tickLabel } from "./time-axis";

// 13 November, 23:00 UTC is midnight in Berlin.
const MIDNIGHT = Date.parse("2026-11-13T23:00:00Z");
const every = (start: number, step: number, count: number) =>
  Array.from({ length: count }, (_, i) => start + i * step);

describe("axisTier", () => {
  it("chooses by how much time the chart covers", () => {
    expect(axisTier(MIDNIGHT, MIDNIGHT + DAY)).toBe("hours");
    expect(axisTier(MIDNIGHT, MIDNIGHT + 7 * DAY)).toBe("days");
    expect(axisTier(MIDNIGHT, MIDNIGHT + 365 * DAY)).toBe("months");
  });
});

describe("axisTicks", () => {
  it("picks every fourth full hour on the Berlin clock for a day", () => {
    const day = every(MIDNIGHT, 900_000, 96);
    expect(axisTicks(day)).toEqual([0, 4, 8, 12, 16, 20].map((hour) => MIDNIGHT + hour * HOUR));
  });

  it("picks the first point of each Berlin day for a week", () => {
    const week = every(MIDNIGHT, HOUR, 7 * 24);
    expect(axisTicks(week)).toEqual(every(MIDNIGHT, DAY, 7));
  });

  it("picks the first point of each Berlin month for a year", () => {
    const year = every(Date.parse("2025-12-31T23:00:00Z"), HOUR, 365 * 24);
    expect(axisTicks(year)).toHaveLength(12);
    expect(axisTicks(year)[0]).toBe(Date.parse("2025-12-31T23:00:00Z"));
  });

  it("has no ticks without times", () => {
    expect(axisTicks([])).toEqual([]);
  });
});

describe("tickLabel", () => {
  it("writes labels in the style of the tier and the reader's language", () => {
    const time = Date.parse("2026-11-14T10:00:00Z");
    expect(tickLabel(time, "hours", "en")).toBe("11:00");
    expect(tickLabel(time, "days", "en")).toBe("Nov 14");
    expect(tickLabel(time, "days", "de")).toBe("14. Nov.");
    expect(tickLabel(time, "months", "en")).toBe("Nov");
    expect(tickLabel(time, "months", "de")).toBe("Nov");
  });
});
