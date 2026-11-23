import type { Point } from "@stromblick/shared";
import { describe, expect, it } from "vitest";
import { daysWithoutData } from "./missing-days";

const HOUR = 3_600_000;
const point = (iso: string): Point => [Date.parse(iso), 1];

/** One reading at noon Berlin time (11:00 UTC in winter) on each of the given days. */
const noonOn = (days: string[]): Point[] => days.map((day) => point(`${day}T11:00:00Z`));

describe("daysWithoutData", () => {
  it("finds nothing when every day has a reading", () => {
    const points = noonOn(["2026-11-16", "2026-11-17", "2026-11-18"]);
    expect(daysWithoutData("2026-11-16", "2026-11-18", points)).toEqual({ days: [], more: 0 });
  });

  it("names the days SMARD left out of the middle of a week", () => {
    // The 16th to 19th and the 22nd have prices; the 20th and 21st do not.
    const points = noonOn(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-22"]);
    expect(daysWithoutData("2026-11-16", "2026-11-22", points)).toEqual({
      days: ["2026-11-20", "2026-11-21"],
      more: 0,
    });
  });

  it("names days at the start and at the end of the range too", () => {
    const points = noonOn(["2026-11-17", "2026-11-18"]);
    expect(daysWithoutData("2026-11-16", "2026-11-19", points).days).toEqual([
      "2026-11-16",
      "2026-11-19",
    ]);
  });

  it("counts a day by Berlin time, not by UTC", () => {
    // 23:30 UTC on the 19th is 00:30 on the 20th in Berlin (UTC+1): the 20th has data, the 19th has not.
    const points = [point("2026-11-19T23:30:00Z")];
    expect(daysWithoutData("2026-11-19", "2026-11-20", points).days).toEqual(["2026-11-19"]);
  });

  it("treats daily points at Berlin midnight as that day", () => {
    // A day reading is stamped at Berlin midnight: 22:00 UTC on 24 October is 25 October (UTC+2).
    const points = [point("2026-10-24T22:00:00Z"), point("2026-10-25T23:00:00Z")];
    expect(daysWithoutData("2026-10-25", "2026-10-26", points).days).toEqual([]);
  });

  it("does not list the 25-hour day of the clock change twice, or as missing", () => {
    // 25 October 2026 has 25 hours: hourly readings from 22:00 UTC on the 24th to 22:00 UTC on the 25th.
    const start = Date.parse("2026-10-24T22:00:00Z");
    const points = Array.from({ length: 25 }, (_, hour): Point => [start + hour * HOUR, 1]);
    expect(daysWithoutData("2026-10-25", "2026-10-25", points)).toEqual({ days: [], more: 0 });
  });

  it("lists a single day of a one-day range when it is empty", () => {
    expect(daysWithoutData("2026-11-20", "2026-11-20", []).days).toEqual(["2026-11-20"]);
  });

  it("lists at most 31 days and counts the rest", () => {
    const result = daysWithoutData("2026-01-01", "2026-02-09", []);
    expect(result.days).toHaveLength(31);
    expect(result.days[0]).toBe("2026-01-01");
    expect(result.days.at(-1)).toBe("2026-01-31");
    expect(result.more).toBe(9);
  });
});
