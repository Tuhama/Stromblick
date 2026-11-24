import {
  berlinDay,
  DAY_AHEAD_PRICE_KEY,
  nextDay,
  WINDOW_HOURS,
  type TomorrowResponse,
  type WindowsOfLength,
} from "@stromblick/shared";
import type { LoadReadings } from "../series/load-readings";
import { queryReadings } from "../series/query-readings";
import { slotsInDay } from "./berlin-day";
import { findWindows } from "./windows";

/** Tomorrow's day-ahead prices and their cheapest and most expensive windows of 1 to 4 hours. */
export async function buildTomorrow(
  loadReadings: LoadReadings,
  now: Date,
): Promise<TomorrowResponse> {
  const day = nextDay(berlinDay(now));
  // Always quarter-hours: a window of an hour is four of them.
  const { points, unit } = await queryReadings(loadReadings, DAY_AHEAD_PRICE_KEY, {
    from: day,
    to: day,
    resolution: "quarterhour",
  });
  if (points.length === 0) return { status: "not-published", day };

  const windows = WINDOW_HOURS.flatMap((hours): WindowsOfLength[] => {
    const found = findWindows(points, hours);
    return found ? [{ hours, ...found }] : [];
  });
  return {
    status: "published",
    day,
    unit,
    complete: points.length === slotsInDay(day),
    points,
    windows,
  };
}
