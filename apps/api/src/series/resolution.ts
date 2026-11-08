import type { Resolution, SeriesKind } from "@stromblick/shared";

/** From finest to coarsest. */
export const RESOLUTIONS = ["quarterhour", "hour", "day"] as const satisfies readonly Resolution[];

const MINUTES = { quarterhour: 15, hour: 60, day: 1440 } as const satisfies Record<
  Resolution,
  number
>;

/** Longest range one request may cover: a leap year, both days included. */
export const MAX_RANGE_DAYS = 366;
/** Without a requested resolution, the API picks the finest one that stays at or below this. */
export const AUTO_MAX_POINTS = 1_000;
/** The most points an explicitly requested resolution may return. */
export const MAX_POINTS = 3_000;

/** Number of calendar days from `from` to `to`, both included. Both are ISO dates (YYYY-MM-DD). */
export function dayCount(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
}

/** About how many points a range has at a resolution (daylight saving time changes it by one hour). */
function pointsFor(days: number, resolution: Resolution): number {
  return Math.ceil((days * MINUTES.day) / MINUTES[resolution]);
}

export type ResolutionChoice = { resolution: Resolution } | { error: string };

/**
 * The resolution to answer with. A series can't be finer than the data we store (`native`),
 * and the answer stays small enough for a chart.
 */
export function chooseResolution(
  native: Resolution,
  days: number,
  requested?: Resolution,
): ResolutionChoice {
  if (days > MAX_RANGE_DAYS) {
    return { error: `A request may cover at most ${MAX_RANGE_DAYS} days, not ${days}` };
  }
  const usable = RESOLUTIONS.slice(RESOLUTIONS.indexOf(native));

  if (requested !== undefined) {
    if (!usable.includes(requested)) {
      return { error: `This series has no data finer than ${native}` };
    }
    if (pointsFor(days, requested) > MAX_POINTS) {
      return {
        error: `${requested} over ${days} days is more than ${MAX_POINTS} points; choose a shorter range or a coarser resolution`,
      };
    }
    return { resolution: requested };
  }

  // A day per point always fits: MAX_RANGE_DAYS is far below AUTO_MAX_POINTS.
  return { resolution: usable.find((r) => pointsFor(days, r) <= AUTO_MAX_POINTS) ?? "day" };
}

/** Energy adds up over time; a price is averaged. This is how SMARD aggregates, too. */
export function aggregateFor(kind: SeriesKind): "sum" | "avg" {
  return kind === "price" ? "avg" : "sum";
}
