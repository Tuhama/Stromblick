import { DAY } from "@stromblick/shared";

/** The lengths of time the Explorer offers. */
export const RANGES = ["day", "week", "month", "year"] as const;
export type RangeName = (typeof RANGES)[number];

/** How many calendar days each range covers. A year is 365 days: the API takes up to 366. */
const LENGTH: Record<RangeName, number> = { day: 1, week: 7, month: 30, year: 365 };

/** `day` moved by a number of calendar days, which may be negative. Calendar arithmetic, in UTC. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(day) + days * DAY).toISOString().slice(0, 10);
}

/** The first and the last day of a range that ends on `end`: the `from` and `to` of a request. */
export function rangeBounds(range: RangeName, end: string): { from: string; to: string } {
  return { from: addDays(end, 1 - LENGTH[range]), to: end };
}

/**
 * The last day after stepping one whole range earlier or later. Never later than `today`: there
 * are no readings in the future, so the latest view ends today.
 */
export function stepEnd(range: RangeName, end: string, direction: -1 | 1, today: string): string {
  const next = addDays(end, direction * LENGTH[range]);
  return next > today ? today : next;
}
