import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db";
import { SMARD_SERIES } from "../smard/catalog";
import { loadStatus } from "./load-status";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI sets it). The tests empty its tables,
// so never point it at a database whose data you want to keep.
const url = process.env.TEST_DATABASE_URL;

/** Every catalog series, without a reading. */
const noReadings = Object.fromEntries(SMARD_SERIES.map((item) => [item.key, null]));

describe.skipIf(url === undefined)("loadStatus (database)", () => {
  const db = createDb(url ?? "");

  beforeEach(async () => {
    await db.$executeRaw`TRUNCATE readings, series, ingest_runs RESTART IDENTITY`;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("has nothing to report before the first run", async () => {
    expect(await loadStatus(db)).toEqual({
      lastSuccessAt: null,
      lastRun: null,
      latestReadings: noReadings,
    });
  });

  it("reports the latest successful run", async () => {
    await db.ingestRun.createMany({
      data: [
        {
          startedAt: new Date("2026-11-10T18:00:00Z"),
          finishedAt: new Date("2026-11-10T18:00:04Z"),
          status: "SUCCEEDED",
        },
        {
          startedAt: new Date("2026-11-10T19:00:00Z"),
          finishedAt: new Date("2026-11-10T19:00:05Z"),
          status: "SUCCEEDED",
        },
      ],
    });

    expect(await loadStatus(db)).toEqual({
      lastSuccessAt: "2026-11-10T19:00:05.000Z",
      lastRun: { status: "SUCCEEDED", finishedAt: "2026-11-10T19:00:05.000Z" },
      latestReadings: noReadings,
    });
  });

  it("keeps the last success when a later run fails", async () => {
    await db.ingestRun.createMany({
      data: [
        {
          startedAt: new Date("2026-11-10T19:00:00Z"),
          finishedAt: new Date("2026-11-10T19:00:05Z"),
          status: "SUCCEEDED",
        },
        {
          startedAt: new Date("2026-11-10T20:00:00Z"),
          finishedAt: new Date("2026-11-10T20:00:02Z"),
          status: "FAILED",
          error: "price-day-ahead: SMARD answered 503",
        },
      ],
    });

    expect(await loadStatus(db)).toEqual({
      lastSuccessAt: "2026-11-10T19:00:05.000Z",
      lastRun: { status: "FAILED", finishedAt: "2026-11-10T20:00:02.000Z" },
      latestReadings: noReadings,
    });
  });

  it("skips a run that is still going", async () => {
    await db.ingestRun.createMany({
      data: [
        {
          startedAt: new Date("2026-11-10T19:00:00Z"),
          finishedAt: new Date("2026-11-10T19:00:05Z"),
          status: "SUCCEEDED",
        },
        { startedAt: new Date("2026-11-10T20:00:00Z") },
      ],
    });

    expect(await loadStatus(db)).toEqual({
      lastSuccessAt: "2026-11-10T19:00:05.000Z",
      lastRun: { status: "SUCCEEDED", finishedAt: "2026-11-10T19:00:05.000Z" },
      latestReadings: noReadings,
    });
  });
  it("reports the newest reading of each series, even when a day in between is missing", async () => {
    const price = SMARD_SERIES.find((item) => item.key === "price-day-ahead");
    const load = SMARD_SERIES.find((item) => item.key === "load");
    if (!price || !load) throw new Error("The catalog has no price or load series");
    await db.series.createMany({
      data: [price, load].map((item) => ({
        id: item.filter,
        key: item.key,
        nameEn: item.name.en,
        nameDe: item.name.de,
        unit: item.unit,
        kind: item.kind === "price" ? "PRICE" : "LOAD",
      })),
    });
    // Prices: the 19th, nothing on the 20th and 21st, then the 22nd. Load: only the 20th.
    const rows = [
      { at: "2026-11-19T22:45:00Z", item: price },
      { at: "2026-11-22T22:45:00Z", item: price },
      { at: "2026-11-20T12:00:00Z", item: load },
    ];
    await db.reading.createMany({
      data: rows.map(({ at, item }) => ({
        seriesId: item.filter,
        region: item.region,
        resolution:
          item.resolution === "quarterhour" ? ("QUARTERHOUR" as const) : ("HOUR" as const),
        ts: new Date(at),
        value: 1,
      })),
    });

    const { latestReadings } = await loadStatus(db);
    expect(latestReadings).toEqual({
      ...noReadings,
      "price-day-ahead": "2026-11-22T22:45:00.000Z",
      load: "2026-11-20T12:00:00.000Z",
    });
  });
});
