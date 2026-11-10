import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db";
import { loadStatus } from "./load-status";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI sets it). The tests empty its tables,
// so never point it at a database whose data you want to keep.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(url === undefined)("loadStatus (database)", () => {
  const db = createDb(url ?? "");

  beforeEach(async () => {
    await db.$executeRaw`TRUNCATE ingest_runs RESTART IDENTITY`;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("has nothing to report before the first run", async () => {
    expect(await loadStatus(db)).toEqual({ lastSuccessAt: null, lastRun: null });
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
    });
  });
});
