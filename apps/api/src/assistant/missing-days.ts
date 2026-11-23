import { MARKET_TIME_ZONE, type Point } from "@stromblick/shared";
import { dayCount } from "../series/resolution";

/** A long range with many holes would fill the model's context with dates; the rest is counted. */
const MAX_LISTED_DAYS = 31;

const DAY_MS = 86_400_000;
const berlinDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: MARKET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
  const withData = new Set(points.map(([time]) => berlinDate.format(time)));
  const start = Date.parse(from);
  const missing: string[] = [];
  for (let offset = 0; offset < dayCount(from, to); offset += 1) {
    const day = new Date(start + offset * DAY_MS).toISOString().slice(0, 10);
    if (!withData.has(day)) missing.push(day);
  }
  return {
    days: missing.slice(0, MAX_LISTED_DAYS),
    more: Math.max(0, missing.length - MAX_LISTED_DAYS),
  };
}
