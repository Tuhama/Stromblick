import type { Resolution } from "@stromblick/shared";
import { formatDate } from "../../time/berlin";

/** A range of Berlin calendar days for the reader: "Nov 14, 2026" for one day, else "Nov 8 – Nov 14, 2026". */
export function formatPeriod(from: string, to: string, language: string): string {
  // Noon UTC is early afternoon in Berlin in every season, so it is the same calendar day there.
  const first = formatDate(Date.parse(`${from}T12:00:00Z`), language);
  const last = formatDate(Date.parse(`${to}T12:00:00Z`), language);
  return from === to ? first : `${first} – ${last}`;
}

/** Whether a reading covers a whole day, so its time of day means nothing. */
export function isDaily(resolution: Resolution): boolean {
  return resolution === "day";
}
