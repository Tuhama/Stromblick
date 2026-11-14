// The market runs on German time: a delivery day is a Berlin calendar day, and "cheapest at 13:15"
// only means something on German clocks. So days and times are shown in it wherever the reader is,
// and the page says so. The reader's language still decides how dates are written.
const BERLIN = "Europe/Berlin";

/** Today's calendar day in Berlin, e.g. "2026-11-14": the `from` and `to` of a readings request. */
export function todayInBerlin(now: Date | number = Date.now()): string {
  // The Canadian English locale writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: BERLIN }).format(now);
}

/** A moment as a Berlin date and time on the 24-hour clock, with the date in the reader's language. */
export function formatDateTime(moment: Date | number, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
    timeZone: BERLIN,
  }).format(moment);
}

/** A moment as a Berlin clock time on the 24-hour clock, e.g. "18:15". */
export function formatClock(moment: Date | number): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BERLIN,
  }).format(moment);
}

/** The short name of German time at a moment: "CET" or "CEST", in German "MEZ" or "MESZ". */
export function berlinZoneName(moment: Date | number, language: string): string {
  // British English knows the name "CET"; American English would write "GMT+1".
  const locale = language === "de" ? "de-DE" : "en-GB";
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: BERLIN,
    timeZoneName: "short",
  }).formatToParts(moment);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}
