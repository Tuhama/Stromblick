import { WINDOW_HOURS } from "@stromblick/shared";

/** The length shown when the link says nothing, or something that is not a length. */
export const DEFAULT_HOURS = 2;

/** The hours from `?hours=`: a whole number from 1 to 4, or the default. */
export function parseHours(value: string | null): number {
  const hours = Number(value);
  return WINDOW_HOURS.some((allowed) => allowed === hours) ? hours : DEFAULT_HOURS;
}

/**
 * The length to show. The asked-for one when the API found a window of that length; otherwise the
 * shortest one it did find, because a hole in the data can leave only the shorter windows.
 * Null when there is no window at all.
 */
export function chooseHours(requested: number, available: readonly number[]): number | null {
  if (available.includes(requested)) return requested;
  return available.length > 0 ? Math.min(...available) : null;
}
