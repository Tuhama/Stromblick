import { DAY_AHEAD_PRICE_KEY } from "@stromblick/shared";
import { berlinZoneName, formatDateTime } from "../../time/berlin";

/** The newest reading of the data the overview shows, as milliseconds since the epoch; null when unknown. */
export interface NewestData {
  prices: number | null;
  generation: number | null;
}

function parse(time: string | null | undefined): number | null {
  if (time === null || time === undefined) return null;
  const moment = Date.parse(time);
  return Number.isNaN(moment) ? null : moment;
}

/**
 * The newest price, and the newest generation figure. Generation is several series; the page shows
 * it as complete up to the time every series has reached, so the oldest of their newest readings.
 * `latestReadings` is what /status sends: the start of the newest reading of each series, by key.
 */
export function newestData(latestReadings: Readonly<Record<string, string | null>>): NewestData {
  const times = Object.entries(latestReadings)
    .filter(([key]) => key.startsWith("generation-"))
    .map(([, time]) => parse(time));
  const known = times.filter((time): time is number => time !== null);
  // One series without any reading means generation is not complete at any time.
  const complete = times.length > 0 && known.length === times.length;
  return {
    prices: parse(latestReadings[DAY_AHEAD_PRICE_KEY]),
    generation: complete ? Math.min(...known) : null,
  };
}

/** A moment for the reader, in German time with its zone name: "Nov 22, 2026, 23:45 CET". */
export function formatMoment(moment: number, language: string): string {
  return `${formatDateTime(moment, language)} ${berlinZoneName(moment, language)}`;
}
