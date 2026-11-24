import { berlinDay, nextDay, type Point } from "@stromblick/shared";
import { dayCount } from "../series/resolution";

/** A long range with many holes would fill the model's context with dates; the rest is counted. */
const MAX_LISTED_DAYS = 31;

export interface DaysWithoutData {
  /** Berlin calendar days (YYYY-MM-DD) of the range that have no reading at all. */
  days: string[];
  /** How many more such days there are beyond the listed ones. */
  more: number;
}

/**
 * The days of a range (both ends included, Europe/Berlin calendar days) in which no point falls.
 * An average over the range only covers the other days, and the assistant must be able to say so:
 * SMARD sometimes has no prices for a day, and a "week" can then have five days in it.
 */
export function daysWithoutData(
  from: string,
  to: string,
  points: readonly Point[],
): DaysWithoutData {
  const withData = new Set(points.map(([time]) => berlinDay(time)));
  const missing: string[] = [];
  let day = from;
  for (let counted = 0; counted < dayCount(from, to); counted += 1) {
    if (!withData.has(day)) missing.push(day);
    day = nextDay(day);
  }
  return {
    days: missing.slice(0, MAX_LISTED_DAYS),
    more: Math.max(0, missing.length - MAX_LISTED_DAYS),
  };
}
