import type { Point } from "@stromblick/shared";

/** A tooltip's value arrives as `unknown`: a [time, amount] pair when it is one of our points. */
export function readPoint(value: unknown): Point | null {
  if (!Array.isArray(value)) return null;
  const pair: unknown[] = value;
  const [time, amount] = pair;
  return typeof time === "number" && typeof amount === "number" ? [time, amount] : null;
}
