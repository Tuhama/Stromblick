import { MINUTE } from "@stromblick/shared";
import type { Point } from "@stromblick/shared";

/** A fixed start for sample data: midnight in Berlin on 1 January 2026. */
export const SAMPLE_START = Date.parse("2025-12-31T23:00:00Z");

/** A repeatable stream of numbers between 0 and 1, so stories and tests never change between runs. */
function noise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/** Points at a fixed step: `value(index, time)` gives each one's number. */
function series(
  count: number,
  stepMinutes: number,
  value: (index: number, time: number) => number,
): Point[] {
  return Array.from({ length: count }, (_, index): Point => {
    const time = SAMPLE_START + index * stepMinutes * MINUTE;
    return [time, value(index, time)];
  });
}

/** Hours since the start of the year, for daily and yearly waves. */
const hours = (time: number) => (time - SAMPLE_START) / (60 * MINUTE);

/** Day-ahead prices in EUR/MWh: an evening peak, a midday dip (negative in summer) and some noise. */
export function samplePrices(days: number, stepMinutes = 15): Point[] {
  const random = noise(7);
  const count = (days * 24 * 60) / stepMinutes;
  return series(count, stepMinutes, (_, time) => {
    const hour = hours(time);
    const dayWave = Math.sin(((hour % 24) / 24) * 2 * Math.PI - Math.PI / 2);
    const summer = Math.sin((hour / (365 * 24)) * 2 * Math.PI - Math.PI / 2);
    const midday = Math.exp(-(((hour % 24) - 13) ** 2) / 8);
    return 90 + 40 * dayWave - 70 * midday * (0.5 + 0.5 * summer) + 25 * (random() - 0.5);
  });
}

/** One generation series: a base level, a daily shape and noise. */
function sampleSource(
  days: number,
  stepMinutes: number,
  level: number,
  shape: (hourOfDay: number, hoursSinceStart: number) => number,
  seed: number,
): Point[] {
  const random = noise(seed);
  return series((days * 24 * 60) / stepMinutes, stepMinutes, (_, time) => {
    const hour = hours(time);
    return Math.max(0, level * shape(hour % 24, hour) * (0.9 + 0.2 * random()));
  });
}

/** All 11 generation series, in MWh per interval, with the keys of the API. */
export function sampleGeneration(days: number, stepMinutes = 60) {
  const sun = (h: number, total: number) =>
    Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) *
    (0.6 + 0.4 * Math.sin((total / 8_760) * 2 * Math.PI - Math.PI / 2));
  const flat = () => 1;
  const wind = (_h: number, total: number) => 0.6 + 0.4 * Math.sin(total / 37);
  const evening = (h: number) => 0.6 + 0.4 * Math.exp(-((h - 19) ** 2) / 18);
  const make = (key: string, level: number, shape: typeof sun, seed: number) => ({
    key: `generation-${key}`,
    points: sampleSource(days, stepMinutes, level, shape, seed),
  });
  return [
    make("solar", 30_000, sun, 1),
    make("wind-onshore", 20_000, wind, 2),
    make("wind-offshore", 5_000, wind, 3),
    make("biomass", 4_500, flat, 4),
    make("hydro", 1_800, flat, 5),
    make("other-renewables", 600, flat, 6),
    make("lignite", 9_000, evening, 7),
    make("hard-coal", 3_000, evening, 8),
    make("natural-gas", 5_000, evening, 9),
    make("pumped-storage", 1_200, evening, 10),
    make("other-conventional", 2_000, flat, 11),
  ];
}
