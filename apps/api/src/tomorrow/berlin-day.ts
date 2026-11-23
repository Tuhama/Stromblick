import { MARKET_TIME_ZONE } from "@stromblick/shared";
import { DAY, MINUTE } from "../time-units";

/** The length of one price slot of the day-ahead market. */
export const SLOT_MS = 15 * MINUTE;

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: MARKET_TIME_ZONE });
const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  timeZoneName: "longOffset",
});

/** A moment's calendar day in Berlin, e.g. "2026-11-23". */
export function berlinDay(moment: Date | number): string {
  return dayFormat.format(moment);
}

/** The calendar day after `day`. Calendar arithmetic, so a 23 or 25 hour day changes nothing. */
export function nextDay(day: string): string {
  return new Date(Date.parse(day) + DAY).toISOString().slice(0, 10);
}

/** Berlin's offset from UTC at a moment, in milliseconds (+1 h in winter, +2 h in summer). */
function offsetAt(moment: number): number {
  const name = offsetFormat.formatToParts(moment).find((part) => part.type === "timeZoneName");
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name?.value ?? "");
  if (!match) return 0; // "GMT" alone: an offset of zero
  const [, sign, hours, minutes] = match;
  return (sign === "-" ? -1 : 1) * (Number(hours) * 60 + Number(minutes)) * MINUTE;
}

/**
 * The moment a Berlin day starts. The clocks change at 01:00 UTC, after the day has started, so the
 * offset at UTC midnight is the one that holds at Berlin midnight.
 */
function startOfDay(day: string): number {
  const utcMidnight = Date.parse(day);
  return utcMidnight - offsetAt(utcMidnight);
}

/** How many quarter-hours a Berlin day has: 96, or 92 and 100 when the clocks change. */
export function slotsInDay(day: string): number {
  return (startOfDay(nextDay(day)) - startOfDay(day)) / SLOT_MS;
}
