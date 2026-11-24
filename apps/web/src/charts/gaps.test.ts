import { HOUR, MINUTE } from "@stromblick/shared";
import type { Point } from "@stromblick/shared";
import { describe, expect, it } from "vitest";
import { breakAtGaps } from "./gaps";

const START = Date.parse("2026-11-19T00:00:00Z");
const series = (times: number[]): Point[] => times.map((time, index) => [time, index]);

describe("breakAtGaps", () => {
  it("leaves a series without holes as it is", () => {
    const points = series([0, 1, 2, 3].map((index) => START + index * 15 * MINUTE));
    expect(breakAtGaps(points)).toEqual(points);
  });

  it("puts a point without a value right after the last reading before a hole", () => {
    // 00:00, 00:15, 00:30, then nothing until 02:00.
    const points = series([0, 15, 30, 120, 135].map((minute) => START + minute * MINUTE));
    expect(breakAtGaps(points)).toEqual([
      [START, 0],
      [START + 15 * MINUTE, 1],
      [START + 30 * MINUTE, 2],
      [START + 45 * MINUTE, null],
      [START + 120 * MINUTE, 3],
      [START + 135 * MINUTE, 4],
    ]);
  });

  it("breaks once for a hole of days, not once per missing interval", () => {
    // The 19th, nothing on the 20th and 21st, then the 22nd, in hours.
    const day = (offset: number) =>
      Array.from({ length: 24 }, (_, hour) => START + offset * 24 * HOUR + hour * HOUR);
    const result = breakAtGaps(series([...day(0), ...day(3)]));
    expect(result.filter(([, value]) => value === null)).toHaveLength(1);
    expect(result).toHaveLength(49);
  });

  it("works for hourly and daily series too", () => {
    const hourly = series([0, 1, 2, 5, 6].map((hour) => START + hour * HOUR));
    expect(breakAtGaps(hourly).filter(([, value]) => value === null)).toHaveLength(1);

    const days = series([0, 1, 2, 3].map((day) => START + day * 24 * HOUR));
    expect(breakAtGaps(days)).toEqual(days);
  });

  it("does not take the 25-hour day of the clock change for a hole", () => {
    // Daily averages sit at Berlin midnights; 25 October 2026 has 25 hours (the clocks go back).
    const midnights = ["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26"].map(
      (day) => Date.parse(`${day}T00:00:00+02:00`) - (day === "2026-10-26" ? HOUR : 0),
    );
    const points = series(midnights);
    expect(breakAtGaps(points)).toEqual(points);
  });

  it("has no usual interval for fewer than three points", () => {
    expect(breakAtGaps([])).toEqual([]);
    expect(breakAtGaps(series([START, START + 5 * HOUR]))).toEqual(
      series([START, START + 5 * HOUR]),
    );
  });
});
