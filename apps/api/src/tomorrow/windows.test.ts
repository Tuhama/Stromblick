import type { Point } from "@stromblick/shared";
import { describe, expect, it } from "vitest";
import { SLOT_MS } from "./berlin-day";
import { findWindows } from "./windows";

const START = Date.parse("2026-11-23T23:00:00Z"); // 00:00 on 24 November in Berlin

/** Quarter-hour points one after the other from `start`; a null price leaves a hole in the data. */
function slots(prices: (number | null)[], start = START): Point[] {
  return prices.flatMap((price, index): Point[] =>
    price === null ? [] : [[start + index * SLOT_MS, price]],
  );
}

describe("findWindows", () => {
  it("finds the cheapest and the most expensive hour, with the mean and the end time", () => {
    // Four-slot hours: 10,10,10,10 | then 50,50,50,50 | then 30,30,30,30
    const points = slots([10, 10, 10, 10, 50, 50, 50, 50, 30, 30, 30, 30]);
    const result = findWindows(points, 1);

    expect(result?.cheapest).toEqual({ start: START, end: START + 4 * SLOT_MS, average: 10 });
    expect(result?.mostExpensive).toEqual({
      start: START + 4 * SLOT_MS,
      end: START + 8 * SLOT_MS,
      average: 50,
    });
  });

  it("does not only look at whole hours: a window can start at any quarter-hour", () => {
    // The cheap stretch starts at the second quarter-hour.
    const points = slots([90, 5, 5, 5, 5, 90, 90, 90]);
    expect(findWindows(points, 1)?.cheapest.start).toBe(START + SLOT_MS);
  });

  it("finds windows of 2, 3 and 4 hours", () => {
    const points = slots(
      Array.from({ length: 24 }, (_, index) => (index >= 8 && index < 16 ? 1 : 9)),
    );
    const two = findWindows(points, 2);
    expect(two?.cheapest).toEqual({
      start: START + 8 * SLOT_MS,
      end: START + 16 * SLOT_MS,
      average: 1,
    });
    const four = findWindows(points, 4)?.cheapest;
    expect(four && four.end - four.start).toBe(16 * SLOT_MS);
    // Three hours hold the cheap two hours and one more: (8 × 1 + 4 × 9) / 12, in cents.
    expect(findWindows(points, 3)?.cheapest.average).toBe(3.67);
  });

  describe("negative prices", () => {
    it("treats the lowest, most negative average as the cheapest", () => {
      const points = slots([20, 20, 20, 20, -5, -10, -20, -15, 20, 20, 20, 20]);
      const result = findWindows(points, 1);
      expect(result?.cheapest.average).toBe(-12.5);
      expect(result?.cheapest.start).toBe(START + 4 * SLOT_MS);
      expect(result?.mostExpensive.average).toBe(20);
    });

    it("finds the most expensive window when every price is negative", () => {
      const points = slots([-50, -50, -50, -50, -5, -5, -5, -5]);
      const result = findWindows(points, 1);
      expect(result?.cheapest.average).toBe(-50);
      expect(result?.mostExpensive.average).toBe(-5);
    });
  });

  describe("ties", () => {
    it("gives the earlier window when two have the same mean", () => {
      const points = slots([10, 10, 10, 10, 40, 40, 40, 40, 10, 10, 10, 10, 40, 40, 40, 40]);
      const result = findWindows(points, 1);
      expect(result?.cheapest.start).toBe(START);
      expect(result?.mostExpensive.start).toBe(START + 4 * SLOT_MS);
    });

    it("gives the one window twice when all prices are the same", () => {
      const result = findWindows(slots(Array.from({ length: 8 }, () => 33.3)), 1);
      expect(result?.cheapest).toEqual(result?.mostExpensive);
      expect(result?.cheapest.start).toBe(START);
    });

    it("sees two windows as equal even when their decimal prices add up differently as floats", () => {
      // 0.1 + 0.2 + 0.3 + 0.4 and 0.4 + 0.3 + 0.2 + 0.1 are not the same float sum, but the same price.
      const points = slots([0.1, 0.2, 0.3, 0.4, 0.4, 0.3, 0.2, 0.1]);
      const result = findWindows(points, 1);
      expect(result?.cheapest.start).toBe(START);
      expect(result?.cheapest.average).toBe(0.25);
    });
  });

  describe("holes in the data", () => {
    it("never counts a window that has a missing quarter-hour inside", () => {
      // The quarter-hour at index 4 is missing. The cheap run after it is only three slots long.
      const points = slots([40, 41, 42, 43, null, 1, 1, 1]);
      const result = findWindows(points, 1);
      expect(result?.cheapest.start).toBe(START);
      expect(result?.cheapest.average).toBe(41.5);
      expect(result?.mostExpensive.start).toBe(START);
    });

    it("finds a window after the hole", () => {
      const points = slots([40, 40, null, 40, 5, 5, 5, 5, 40]);
      expect(findWindows(points, 1)?.cheapest.start).toBe(START + 4 * SLOT_MS);
    });

    it("returns null when no run of that length is left", () => {
      const points = slots([40, 41, 42, 43, null, 1, 1, 1]);
      expect(findWindows(points, 2)).toBeNull();
    });
  });

  it("returns null with fewer quarter-hours than the window needs", () => {
    expect(findWindows(slots([1, 2, 3]), 1)).toBeNull();
    expect(findWindows([], 1)).toBeNull();
  });

  describe("days the clocks change", () => {
    it("finds a window in the 100 quarter-hours of the day the clocks go back", () => {
      const start = Date.parse("2026-10-24T22:00:00Z"); // midnight 25 October in Berlin (CEST)
      // Cheap two hours at slot 8 to 15: they span the hour that is repeated at night.
      const prices = Array.from({ length: 100 }, (_, index) => (index >= 8 && index < 16 ? 1 : 80));
      const result = findWindows(slots(prices, start), 2);
      expect(result?.cheapest).toEqual({
        start: start + 8 * SLOT_MS,
        end: start + 16 * SLOT_MS,
        average: 1,
      });
    });

    it("lets a window run to the end of the 92 quarter-hours of the day the clocks go forward", () => {
      const start = Date.parse("2026-03-28T23:00:00Z"); // midnight 29 March in Berlin (CET)
      const prices = Array.from({ length: 92 }, (_, index) => (index >= 88 ? 1 : 80));
      const result = findWindows(slots(prices, start), 1);
      expect(result?.cheapest.start).toBe(start + 88 * SLOT_MS);
      expect(result?.cheapest.end).toBe(start + 92 * SLOT_MS);
    });
  });
});
