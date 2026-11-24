import { MARKET_TIME_ZONE } from "./market";

/** Durations in milliseconds, for timers, cache lifetimes, look-back windows and elapsed time. */
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// The Canadian English locale writes a date as YYYY-MM-DD. One formatter, because building an
// Intl.DateTimeFormat is slow and a chart names thousands of moments.
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: MARKET_TIME_ZONE });

/** A moment's calendar day in Berlin, e.g. "2026-11-23". */
export function berlinDay(moment: Date | number): string {
  return dayFormat.format(moment);
}

/** The calendar day after `day`. Calendar arithmetic, so a 23 or 25 hour day changes nothing. */
export function nextDay(day: string): string {
  return new Date(Date.parse(day) + DAY).toISOString().slice(0, 10);
}
