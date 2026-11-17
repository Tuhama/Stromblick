import { HOUR } from "../../time/units";

/**
 * How old the last successful update may be before the page warns. The API ingests hourly
 * (ADR 0004) and an occasional run is late or skipped, so one missed hour is normal. Three hours
 * means at least two runs in a row have not worked.
 */
export const STALE_AFTER = 3 * HOUR;

/** True when the last successful update (milliseconds since the epoch) is older than expected. */
export function isOutdated(lastSuccessAt: number, now: number): boolean {
  return now - lastSuccessAt > STALE_AFTER;
}
