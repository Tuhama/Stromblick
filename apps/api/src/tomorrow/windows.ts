import type { Point, PriceWindow } from "@stromblick/shared";
import { HOUR } from "../time-units";
import { SLOT_MS } from "./berlin-day";

export interface CheapestAndDearest {
  cheapest: PriceWindow;
  mostExpensive: PriceWindow;
}

/**
 * The cheapest and the most expensive stretch of `hours` hours in a day of quarter-hour prices
 * (ascending in time). A window counts only when its quarter-hours follow each other without a
 * gap, so a hole in the data is never averaged over. Returns null when there is no such window.
 *
 * Prices have two decimals, so the sums are made in whole cents: that way two windows with the
 * same price are really equal, and a tie goes to the earlier one, instead of to rounding noise.
 */
export function findWindows(points: readonly Point[], hours: number): CheapestAndDearest | null {
  const length = (hours * HOUR) / SLOT_MS;
  const cents = points.map(([, price]) => Math.round(price * 100));

  let cheapest: { first: number; sum: number } | undefined;
  let dearest: { first: number; sum: number } | undefined;
  for (let first = 0; first + length <= points.length; first += 1) {
    const last = first + length - 1;
    // Times ascend strictly and every step is a whole number of quarter-hours, so a span of exactly
    // length - 1 quarter-hours means every step in between is one quarter-hour.
    const start = points[first]?.[0];
    const lastStart = points[last]?.[0];
    if (start === undefined || lastStart === undefined) continue;
    if (lastStart - start !== (length - 1) * SLOT_MS) continue;

    let sum = 0;
    for (let index = first; index <= last; index += 1) sum += cents[index] ?? 0;
    if (cheapest === undefined || sum < cheapest.sum) cheapest = { first, sum };
    if (dearest === undefined || sum > dearest.sum) dearest = { first, sum };
  }
  if (cheapest === undefined || dearest === undefined) return null;

  const toWindow = ({ first, sum }: { first: number; sum: number }): PriceWindow => {
    const start = points[first]?.[0] ?? 0;
    return {
      start,
      end: start + length * SLOT_MS,
      average: Math.round(sum / length) / 100,
    };
  };
  return { cheapest: toWindow(cheapest), mostExpensive: toWindow(dearest) };
}
