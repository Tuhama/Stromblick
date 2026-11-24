import { MARKET_TIME_ZONE } from "@stromblick/shared";
import { formatClock } from "../../time/berlin";

/** A Berlin calendar day (YYYY-MM-DD) for the reader: "Tuesday, 24 November". */
export function formatLongDay(day: string, language: string): string {
  // Noon UTC is early afternoon in Berlin in every season, so it is the same calendar day there.
  return new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: MARKET_TIME_ZONE,
  }).format(Date.parse(`${day}T12:00:00Z`));
}

/** A window as clock times in German time: "13:15–15:15". */
export function formatRange(start: number, end: number): string {
  return `${formatClock(start)}–${formatClock(end)}`;
}
