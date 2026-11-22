import type { Point } from "@stromblick/shared";

/** A point of a line chart: a value, or a time without one, where the line must break. */
export type ChartPoint = Point | [number, null];

/** A step this much longer than the usual one counts as a hole in the data. */
const GAP_FACTOR = 1.5;

/** The middle of the steps between neighbouring times: the series' usual interval. */
function usualStep(points: readonly Point[]): number {
  const steps: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const [previous, current] = [points[index - 1], points[index]];
    if (previous && current) steps.push(current[0] - previous[0]);
  }
  steps.sort((a, b) => a - b);
  return steps[Math.floor(steps.length / 2)] ?? 0;
}

/**
 * Puts a point without a value where a run of readings is missing, so the line stops there. Without
 * it a chart joins the two sides, and a stepped line draws one flat price across the whole hole, as
 * if the price had held. The usual interval is the middle step of the series, so quarter hours,
 * hours and days all work. Fewer than three points have no usual interval and are returned as they are.
 */
export function breakAtGaps(points: readonly Point[]): ChartPoint[] {
  if (points.length < 3) return points.map(([time, value]) => [time, value]);
  const step = usualStep(points);
  if (step <= 0) return points.map(([time, value]) => [time, value]);

  const result: ChartPoint[] = [];
  points.forEach(([time, value], index) => {
    const previous = points[index - 1];
    if (previous && time - previous[0] > step * GAP_FACTOR) result.push([previous[0] + step, null]);
    result.push([time, value]);
  });
  return result;
}
