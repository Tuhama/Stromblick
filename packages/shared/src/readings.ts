import { z } from "zod";
import { Region, Resolution, SeriesKey, Unit } from "./series";

/** A calendar day in Europe/Berlin, e.g. "2026-11-06". Readable in URLs; the API converts it to UTC. */
export const CalendarDay = z.iso.date();
export type CalendarDay = z.infer<typeof CalendarDay>;

/** Query of GET /series/:key/readings. Both days are inclusive; without a resolution the API picks one. */
export const ReadingsQuery = z
  .object({
    from: CalendarDay,
    to: CalendarDay,
    resolution: Resolution.optional(),
  })
  // ISO dates sort as strings, so a string comparison is a date comparison.
  .refine((query) => query.from <= query.to, {
    message: "from must not be after to",
    path: ["to"],
  });
export type ReadingsQuery = z.infer<typeof ReadingsQuery>;

/** Start of an interval as Unix epoch milliseconds (UTC). ECharts' time axis takes it as is. */
export const EpochMs = z.number().int().nonnegative();

/** One chart point: [interval start, value]. A tuple keeps long series small on the wire. */
export const Point = z.tuple([EpochMs, z.number()]);
export type Point = z.infer<typeof Point>;

function isStrictlyAscending(points: readonly Point[]): boolean {
  let previous = -Infinity;
  for (const [timestamp] of points) {
    if (timestamp <= previous) return false;
    previous = timestamp;
  }
  return true;
}

/** GET /series/:key/readings: one series over a range, already downsampled to `resolution`. */
export const ReadingsResponse = z.object({
  series: SeriesKey,
  region: Region,
  resolution: Resolution,
  unit: Unit,
  // Charts and the cheapest-window calculation rely on time order.
  points: z.array(Point).refine(isStrictlyAscending, {
    message: "Points must be in ascending time order, without duplicates",
  }),
});
export type ReadingsResponse = z.infer<typeof ReadingsResponse>;
