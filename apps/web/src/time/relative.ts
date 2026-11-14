const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long ago a moment was, in the reader's language: "20 minutes ago", "vor 2 Stunden".
 * Null for less than a minute, so the caller can say "just now" in its own words.
 * A duration needs no time zone, so it reads the same for every reader.
 */
export function formatTimeAgo(moment: number, now: number, language: string): string | null {
  const elapsed = now - moment;
  if (elapsed < MINUTE) return null;

  const format = new Intl.RelativeTimeFormat(language, { numeric: "always" });
  if (elapsed < HOUR) return format.format(-Math.round(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return format.format(-Math.round(elapsed / HOUR), "hour");
  return format.format(-Math.round(elapsed / DAY), "day");
}
