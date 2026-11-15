import type { Point } from "@stromblick/shared";
import { DAY, HOUR, MINUTE } from "../time/units";

/**
 * The most points a chart draws per series: about one per pixel of a wide chart. A year of
 * 15-minute data has 35,040, far more than a screen has pixels, and drawing them all only makes
 * the page slow.
 */
export const MAX_CHART_POINTS = 800;

/**
 * The bucket lengths to choose from. Round lengths keep a daily cycle from beating against the
 * buckets: with buckets of 10.9 hours, a year of solar power would be drawn as jagged spikes,
 * while whole days average the cycle out.
 */
const BUCKET_SIZES = [15 * MINUTE, 30 * MINUTE, HOUR, 3 * HOUR, 6 * HOUR, DAY, 7 * DAY];

/**
 * Shrinks series to at most `maxPoints` points each, by averaging the points in equal time buckets.
 * All series share the same buckets, so layers of a stacked chart still add up to the same total.
 * Series that are short enough are returned as they are.
 *
 * A bucket's value is the average of real values, as the API's own aggregation is (ADR 0002), so a
 * point in a tooltip never pretends to be one arbitrary quarter hour. Averaging does flatten peaks.
 */
export function downsample(
  series: readonly (readonly Point[])[],
  maxPoints: number = MAX_CHART_POINTS,
): (readonly Point[])[] {
  if (series.every((points) => points.length <= maxPoints)) return [...series];

  let first = Infinity;
  let last = -Infinity;
  for (const points of series) {
    const start = points[0];
    const end = points.at(-1);
    if (start && end) {
      first = Math.min(first, start[0]);
      last = Math.max(last, end[0]);
    }
  }
  const wanted = (last - first + 1) / maxPoints;
  // The smallest round length that is long enough; a week is the longest we use.
  const bucketMs = BUCKET_SIZES.find((size) => size >= wanted) ?? Math.ceil(wanted);

  return series.map((points) => {
    const buckets: Point[] = [];
    let current = -1;
    let sum = 0;
    let count = 0;
    const flush = () => {
      if (count > 0) buckets.push([first + current * bucketMs, sum / count]);
    };
    for (const [time, value] of points) {
      const bucket = Math.floor((time - first) / bucketMs);
      if (bucket !== current) {
        flush();
        current = bucket;
        sum = 0;
        count = 0;
      }
      sum += value;
      count += 1;
    }
    flush();
    return buckets;
  });
}
