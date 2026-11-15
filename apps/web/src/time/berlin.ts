import { MARKET_TIME_ZONE } from "@stromblick/shared";

// The market runs on German time: a delivery day is a Berlin calendar day, and "cheapest at 13:15"
// only means something on German clocks. So days and times are shown in it wherever the reader is,
// and the page says so. The reader's language still decides how dates are written.

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A date formatter in Berlin time, made once per locale and style. Building an Intl.DateTimeFormat
 * is slow, and a chart formats thousands of moments, so every function here reuses its formatter.
 */
function berlinFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(id);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: MARKET_TIME_ZONE });
    formatters.set(id, formatter);
  }
  return formatter;
}

/** A moment's Berlin calendar day as YYYY-MM-DD. The Canadian English locale writes it that way. */
export function berlinDay(moment: Date | number): string {
  return berlinFormatter("en-CA", {}).format(moment);
}

/** A moment's Berlin calendar month as YYYY-MM. */
export function berlinMonth(moment: Date | number): string {
  return berlinDay(moment).slice(0, 7);
}

/** Today's calendar day in Berlin, e.g. "2026-11-14": the `from` and `to` of a readings request. */
export function todayInBerlin(now: Date | number = Date.now()): string {
  return berlinDay(now);
}

/** A moment as a Berlin date and time on the 24-hour clock, with the date in the reader's language. */
export function formatDateTime(moment: Date | number, language: string): string {
  return berlinFormatter(language, {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(moment);
}

/** A moment as a Berlin clock time on the 24-hour clock, e.g. "18:15". */
export function formatClock(moment: Date | number): string {
  return berlinFormatter("de-DE", { hour: "2-digit", minute: "2-digit" }).format(moment);
}

/** A Berlin day as a short axis label: "Nov 14" or "14. Nov.". */
export function formatDayLabel(moment: Date | number, language: string): string {
  return berlinFormatter(language, { day: "numeric", month: "short" }).format(moment);
}

/** A Berlin month as a short axis label: "Nov". */
export function formatMonthLabel(moment: Date | number, language: string): string {
  return berlinFormatter(language, { month: "short" }).format(moment);
}

/** The short name of German time at a moment: "CET" or "CEST", in German "MEZ" or "MESZ". */
export function berlinZoneName(moment: Date | number, language: string): string {
  // British English knows the name "CET"; American English would write "GMT+1".
  const locale = language === "de" ? "de-DE" : "en-GB";
  const parts = berlinFormatter(locale, { timeZoneName: "short" }).formatToParts(moment);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}
