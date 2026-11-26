import { HOUR, MINUTE } from "@stromblick/shared";
import type { Db } from "../db";
import type { SeriesKind } from "../generated/prisma/enums";
import { SMARD_SERIES } from "../smard/catalog";

/**
 * The fixed data for the end-to-end tests. Nothing here comes from SMARD: every value is a function
 * of the time, so a test can rely on the numbers and the days, and a run never depends on the network.
 *
 * "Now" is 18 March 2026, 11:30 in Berlin. Clocks change on 29 March, so every day in the data has
 * the same offset (UTC+1) and a day is easy to compute.
 */
export const E2E_NOW = new Date("2026-03-18T10:30:00Z");

/** Berlin calendar days (the market's clock). */
export const TODAY = "2026-03-18";
export const TOMORROW = "2026-03-19";
/** A day with a hole: no prices and no generation from 12:00 to 16:00 Berlin time. */
export const HOLE_DAY = "2026-03-12";
export const FIRST_DAY = "2026-03-04";

const BERLIN_OFFSET_MS = HOUR;
const QUARTER = 15 * MINUTE;

/** Midnight Berlin time at the start of a day, in UTC milliseconds. */
function dayStart(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) - BERLIN_OFFSET_MS;
}

export interface SeedReading {
  seriesId: number;
  region: "DE" | "DE-LU";
  resolution: "QUARTERHOUR" | "HOUR";
  ts: Date;
  value: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** 0 at night, a bell around noon (Berlin hour, 0 to 24). */
function sun(hour: number): number {
  return Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));
}

/** Day-ahead price in EUR/MWh: cheap around noon, dear in the evening. */
function priceAt(ts: number): number {
  const local = (ts + BERLIN_OFFSET_MS) / HOUR;
  const hour = local % 24;
  const dayIndex = Math.floor(local / 24);
  return round(
    78 + 34 * Math.cos(((hour - 19) / 24) * 2 * Math.PI) - 30 * sun(hour) + (dayIndex % 5) * 2,
  );
}

/** Generation in MWh per hour, by series key. Solar follows the sun, wind drifts, the rest is steady. */
function generationAt(key: string, ts: number): number {
  const local = (ts + BERLIN_OFFSET_MS) / HOUR;
  const hour = local % 24;
  const dayIndex = Math.floor(local / 24);
  const steady: Record<string, number> = {
    "generation-biomass": 3900,
    "generation-hydro": 1500,
    "generation-other-renewables": 120,
    "generation-lignite": 7800,
    "generation-hard-coal": 2100,
    "generation-natural-gas": 3300,
    "generation-pumped-storage": 600,
    "generation-other-conventional": 1300,
    load: 52000,
  };
  switch (key) {
    case "generation-solar":
      return round(sun(hour) * (9000 + 1200 * (dayIndex % 4)));
    case "generation-wind-onshore":
      return round(11000 + 4000 * Math.sin((local / 9) * Math.PI));
    case "generation-wind-offshore":
      return round(3000 + 900 * Math.sin((local / 13) * Math.PI));
    case "load":
      return round(46000 + 9000 * sun(hour) + 4000 * Math.cos(((hour - 19) / 24) * 2 * Math.PI));
    default:
      return round((steady[key] ?? 1000) * (1 + 0.04 * Math.sin(local / 5)));
  }
}

/** True for the missing hours of HOLE_DAY. */
function inHole(ts: number): boolean {
  const start = dayStart(HOLE_DAY) + 12 * HOUR;
  return ts >= start && ts < start + 4 * HOUR;
}

/** Every reading in the seed. Pure: the same list every time. */
export function buildSeedReadings(): SeedReading[] {
  const readings: SeedReading[] = [];
  const first = dayStart(FIRST_DAY);

  // Prices: quarter-hours until the end of tomorrow, because the day-ahead auction has run.
  const pricesEnd = dayStart(TOMORROW) + 24 * HOUR;
  const price = SMARD_SERIES.find((item) => item.kind === "price");
  if (!price) throw new Error("The catalog has no price series");
  for (let ts = first; ts < pricesEnd; ts += QUARTER) {
    if (inHole(ts)) continue;
    readings.push({
      seriesId: price.filter,
      region: price.region,
      resolution: "QUARTERHOUR",
      ts: new Date(ts),
      value: priceAt(ts),
    });
  }

  // Generation and load: complete hours only, like SMARD. At 11:30 Berlin time the last one is
  // the hour from 10:00 to 11:00.
  const lastHour = Math.floor(E2E_NOW.getTime() / HOUR - 1) * HOUR;
  for (const item of SMARD_SERIES) {
    if (item.kind === "price") continue;
    for (let ts = first; ts <= lastHour; ts += HOUR) {
      if (inHole(ts)) continue;
      readings.push({
        seriesId: item.filter,
        region: item.region,
        resolution: "HOUR",
        ts: new Date(ts),
        value: generationAt(item.key, ts),
      });
    }
  }
  return readings;
}

const DB_KIND = {
  generation: "GENERATION",
  price: "PRICE",
  load: "LOAD",
} as const satisfies Record<string, SeriesKind>;

/** Replaces everything in the database with the seed, and records one successful ingest run. */
export async function seedDatabase(db: Db): Promise<number> {
  await db.reading.deleteMany();
  await db.ingestRun.deleteMany();
  await db.series.deleteMany();

  await db.series.createMany({
    data: SMARD_SERIES.map((item) => ({
      id: item.filter,
      key: item.key,
      nameEn: item.name.en,
      nameDe: item.name.de,
      unit: item.unit,
      kind: DB_KIND[item.kind],
    })),
  });

  const readings = buildSeedReadings();
  // Batches keep each statement well under Postgres' limit of bound parameters.
  const BATCH = 5_000;
  for (let from = 0; from < readings.length; from += BATCH) {
    await db.reading.createMany({ data: readings.slice(from, from + BATCH) });
  }

  // 20 minutes before "now": the overview shows fresh data.
  const finishedAt = new Date(E2E_NOW.getTime() - 20 * MINUTE);
  await db.ingestRun.create({
    data: {
      startedAt: new Date(finishedAt.getTime() - MINUTE),
      finishedAt,
      status: "SUCCEEDED",
      rowsWritten: readings.length,
    },
  });
  return readings.length;
}
