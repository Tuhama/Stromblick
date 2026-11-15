import { describe, expect, it } from "vitest";
import type { Point } from "@stromblick/shared";
import { MINUTE } from "../time/units";
import { downsample } from "./downsample";

const START = Date.parse("2026-01-01T00:00:00Z");
const line = (count: number, value: (index: number) => number): Point[] =>
  Array.from({ length: count }, (_, i): Point => [START + i * 15 * MINUTE, value(i)]);

describe("downsample", () => {
  it("leaves short series alone", () => {
    const points = line(100, (i) => i);
    expect(downsample([points], 1_000)[0]).toBe(points);
  });

  it("shrinks a year of 15-minute points to at most the limit", () => {
    const year = line(35_040, (i) => i);
    const [small] = downsample([year], 800);
    expect(small?.length).toBeLessThanOrEqual(800);
    expect(small?.length).toBeGreaterThan(300);
  });

  it("uses whole days for a year, so a daily cycle averages out", () => {
    const year = line(35_040, (i) => i);
    const [small] = downsample([year], 800);
    expect(small?.length).toBe(365);
    expect(small?.[1]?.[0]).toBe(START + 24 * 60 * MINUTE);
  });

  it("averages the points in a bucket", () => {
    // Eight points 15 minutes apart into at most 4 buckets: pairs of 30 minutes, averaged.
    const [small] = downsample([line(8, (i) => 1 + 2 * i)], 4);
    expect(small?.map(([, value]) => value)).toEqual([2, 6, 10, 14]);
  });

  it("keeps stacked layers adding up, because all series share their buckets", () => {
    const a = line(10_000, (i) => i);
    const b = line(10_000, (i) => 2 * i + 5);
    const [smallA, smallB] = downsample([a, b], 500);
    const sums = smallA?.map(([, value], i) => value + (smallB?.[i]?.[1] ?? NaN));
    // The buckets average a and b over the same points, so the sums are the averages of a + b.
    const [both] = downsample(
      [a.map(([time, value], i): Point => [time, value + (b[i]?.[1] ?? 0)])],
      500,
    );
    expect(smallA?.map(([time]) => time)).toEqual(smallB?.map(([time]) => time));
    sums?.forEach((sum, i) => {
      expect(sum).toBeCloseTo(both?.[i]?.[1] ?? NaN, 6);
    });
  });

  it("copes with empty series", () => {
    expect(downsample([[], line(3, () => 1)], 2)[0]).toEqual([]);
  });
});
