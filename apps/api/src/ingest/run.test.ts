import { pino } from "pino";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb } from "../db";
import { SMARD_SERIES } from "../smard/catalog";
import { SMARD_BASE_URL, createSmardClient } from "../smard/client";
import { createFixtureFetch } from "../smard/fixture-fetch";
import { runIngest } from "./run";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI sets it). The tests empty its tables,
// so never point it at a database whose data you want to keep.
const url = process.env.TEST_DATABASE_URL;

const price = SMARD_SERIES.filter((series) => series.key === "price-day-ahead");
const priceAndSolar = SMARD_SERIES.filter((series) =>
  ["price-day-ahead", "generation-solar"].includes(series.key),
);
// 6 November 2026, 13:00 in Berlin: the recorded week of 2 November is the latest one.
const now = () => new Date("2026-11-06T12:00:00Z");
const PUBLISHED_SLOTS = 576; // Monday to Saturday at 96 slots a day; Sunday was still open

const WEEK_OF_19_OCT = Date.parse("2026-10-19T00:00:00+02:00");
const WEEK_OF_2_NOV = Date.parse("2026-11-02T00:00:00+01:00");
const PRICE_INDEX_URL = `${SMARD_BASE_URL}/chart_data/4169/DE-LU/index_quarterhour.json`;

/**
 * The recorded fixtures, but with an index that lists only the two recorded price weeks,
 * so a backfill from 19 October finds a file for every week it asks for.
 */
function twoRecordedWeeks() {
  const fixtureFetch = createFixtureFetch();
  return vi.fn<typeof fetch>((input, init) =>
    input === PRICE_INDEX_URL
      ? Promise.resolve(Response.json({ timestamps: [WEEK_OF_19_OCT, WEEK_OF_2_NOV] }))
      : fixtureFetch(input, init),
  );
}

describe.skipIf(url === undefined)("runIngest (database)", () => {
  const db = createDb(url ?? "");
  const smard = createSmardClient({ fetch: createFixtureFetch() });
  const logger = pino({ level: "silent" });
  const ingest = (series = price) => runIngest({ db, smard, logger, now, series });

  beforeEach(async () => {
    await db.$executeRaw`TRUNCATE readings, series, ingest_runs RESTART IDENTITY`;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("writes the latest week and records a successful run", async () => {
    const result = await ingest();

    expect(result).toEqual({
      runId: 1,
      status: "SUCCEEDED",
      rowsWritten: PUBLISHED_SLOTS,
      failures: [],
    });
    expect(await db.reading.count()).toBe(PUBLISHED_SLOTS);
    expect(await db.series.findUnique({ where: { id: 4169 } })).toMatchObject({
      key: "price-day-ahead",
      kind: "PRICE",
      unit: "EUR/MWh",
    });
    expect(await db.ingestRun.findUnique({ where: { id: 1 } })).toMatchObject({
      status: "SUCCEEDED",
      rowsWritten: PUBLISHED_SLOTS,
      error: null,
      finishedAt: expect.any(Date) as Date,
    });
  });

  it("changes nothing when it runs twice", async () => {
    await ingest();
    const second = await ingest();

    expect(second).toMatchObject({ status: "SUCCEEDED", rowsWritten: 0 });
    expect(await db.reading.count()).toBe(PUBLISHED_SLOTS);
    expect(await db.ingestRun.count()).toBe(2);
  });

  it("updates a value SMARD has revised", async () => {
    await ingest();
    await db.$executeRaw`UPDATE readings SET value = -999 WHERE ts = '2026-11-02T00:00:00+01:00'`;

    const second = await ingest();

    expect(second.rowsWritten).toBe(1);
    const reading = await db.reading.findFirst({
      where: { ts: new Date("2026-11-02T00:00:00+01:00") },
    });
    expect(reading?.value).toBe(250.96);
  });
  it("backfills every week since `since`, and a re-run changes nothing", async () => {
    const backfill = () =>
      runIngest({
        db,
        smard: createSmardClient({ fetch: twoRecordedWeeks() }),
        logger,
        since: new Date(WEEK_OF_19_OCT),
        series: price,
      });

    // 676 slots in the week the clocks went back, plus the 576 published in the latest week.
    expect(await backfill()).toMatchObject({ status: "SUCCEEDED", rowsWritten: 676 + 576 });
    expect(await backfill()).toMatchObject({ status: "SUCCEEDED", rowsWritten: 0 });
    expect(await db.reading.count()).toBe(676 + 576);
  });
  it("records a failed series and still writes the others", async () => {
    // Solar's index wasn't recorded, so the fake SMARD answers 404 for it.
    const result = await ingest(priceAndSolar);

    expect(result).toMatchObject({ status: "FAILED", rowsWritten: PUBLISHED_SLOTS });
    expect(result.failures).toEqual([
      { series: "generation-solar", error: expect.stringMatching(/SMARD answered 404/) as string },
    ]);
    const run = await db.ingestRun.findUnique({ where: { id: result.runId } });
    expect(run?.status).toBe("FAILED");
    expect(run?.error).toMatch(/^generation-solar: SMARD answered 404/);
  });
});
