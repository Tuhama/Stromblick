import { z } from "zod";
import { CalendarDay, EpochMs, Point } from "./readings";
import { Unit } from "./series";

/** The lengths of the windows we look for, in hours. */
export const WINDOW_HOURS = [1, 2, 3, 4] as const;

/** A run of consecutive quarter-hours: from the start of the first to the end of the last. */
export const PriceWindow = z.object({
  start: EpochMs,
  end: EpochMs,
  /** The mean of the quarter-hour prices in the window, rounded to cents. */
  average: z.number(),
});
export type PriceWindow = z.infer<typeof PriceWindow>;

/** The cheapest and the most expensive window of one length. */
export const WindowsOfLength = z.object({
  hours: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  cheapest: PriceWindow,
  mostExpensive: PriceWindow,
});
export type WindowsOfLength = z.infer<typeof WindowsOfLength>;

/**
 * GET /tomorrow. Tomorrow is the next calendar day in Europe/Berlin. The prices are published
 * around noon, so before that there is nothing to show yet: that is an answer, not an error.
 */
export const TomorrowResponse = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("not-published"),
    day: CalendarDay,
  }),
  z.object({
    status: z.literal("published"),
    day: CalendarDay,
    unit: Unit,
    /**
     * False when quarter-hours of the day are missing (a hole at SMARD). A window only counts
     * when none of its quarter-hours is missing, so a length with no such window is left out.
     */
    complete: z.boolean(),
    points: z.array(Point),
    windows: z.array(WindowsOfLength),
  }),
]);
export type TomorrowResponse = z.infer<typeof TomorrowResponse>;
