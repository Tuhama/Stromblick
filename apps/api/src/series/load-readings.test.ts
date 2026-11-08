import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db";
import { loadReadings, type ReadingsRequest } from "./load-readings";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI sets it). The tests empty its tables,
// so never point it at a database whose data you want to keep.
const url = process.env.TEST_DATABASE_URL;

const HOUR = 3_600_000;
const QUARTER = 900_000;

const price: Omit<ReadingsRequest, "resolution" | "from" | "to"> = {
  seriesId: 4169,
  region: "DE-LU",
  native: "quarterhour",
  aggregate: "avg",
};
const solar: Omit<ReadingsRequest, "resolution" | "from" | "to"> = {
  seriesId: 4068,
  region: "DE",
  native: "hour",
  aggregate: "sum",
};

/** `count` timestamps from `start`, `step` apart. */
function times(start: string, count: number, step: number): number[] {
  return Array.from({ length: count }, (_, i) => Date.parse(start) + i * step);
}

describe.skipIf(url === undefined)("loadReadings (database)", () => {
  const db = createDb(url ?? "");

  async function insert(
    seriesId: number,
    region: string,
    resolution: "QUARTERHOUR" | "HOUR",
    rows: [number, number][],
  ) {
    await db.reading.createMany({
      data: rows.map(([ts, value]) => ({ seriesId, region, resolution, ts: new Date(ts), value })),
    });
  }

  beforeEach(async () => {
    await db.$executeRaw`TRUNCATE readings, series, ingest_runs RESTART IDENTITY`;
    await db.series.createMany({
      data: [
        {
          id: 4169,
          key: "price-day-ahead",
          nameEn: "Price",
          nameDe: "Preis",
          unit: "EUR/MWh",
          kind: "PRICE",
        },
        {
          id: 4068,
          key: "generation-solar",
          nameEn: "Solar",
          nameDe: "Solar",
          unit: "MWh",
          kind: "GENERATION",
        },
      ],
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("returns stored readings within the Berlin calendar day", async () => {
    // 6 November in Berlin (CET, UTC+1) runs from 5 November 23:00 to 6 November 23:00 UTC.
    // One reading before and one after that day must not be returned.
    const stamps = times("2026-11-05T22:45:00Z", 98, QUARTER);
    await insert(
      4169,
      "DE-LU",
      "QUARTERHOUR",
      stamps.map((ts, i) => [ts, i]),
    );

    const points = await loadReadings(db, {
      ...price,
      resolution: "quarterhour",
      from: "2026-11-06",
      to: "2026-11-06",
    });

    expect(points).toHaveLength(96);
    expect(points[0]).toEqual([Date.parse("2026-11-05T23:00:00Z"), 1]);
    expect(points.at(-1)).toEqual([Date.parse("2026-11-06T22:45:00Z"), 96]);
  });

  it("averages prices per hour and leaves out incomplete hours", async () => {
    const complete = times("2026-11-06T10:00:00Z", 4, QUARTER).map((ts, i): [number, number] => [
      ts,
      [10, 20, 30, 40][i] ?? 0,
    ]);
    const incomplete = times("2026-11-06T11:00:00Z", 3, QUARTER).map((ts): [number, number] => [
      ts,
      50,
    ]);
    await insert(4169, "DE-LU", "QUARTERHOUR", [...complete, ...incomplete]);

    const points = await loadReadings(db, {
      ...price,
      resolution: "hour",
      from: "2026-11-06",
      to: "2026-11-06",
    });

    expect(points).toEqual([[Date.parse("2026-11-06T10:00:00Z"), 25]]);
  });

  it("sums energy per Berlin day, including the 25-hour day when clocks go back", async () => {
    // 25 October 2026 in Berlin: 24 October 22:00 UTC (CEST) to 25 October 23:00 UTC (CET) = 25 hours.
    const october25 = times("2026-10-24T22:00:00Z", 25, HOUR).map((ts): [number, number] => [
      ts,
      2,
    ]);
    // 26 October has 24 hours; with one missing it is incomplete and left out.
    const october26 = times("2026-10-25T23:00:00Z", 23, HOUR).map((ts): [number, number] => [
      ts,
      2,
    ]);
    await insert(4068, "DE", "HOUR", [...october25, ...october26]);

    const points = await loadReadings(db, {
      ...solar,
      resolution: "day",
      from: "2026-10-25",
      to: "2026-10-26",
    });

    expect(points).toEqual([[Date.parse("2026-10-24T22:00:00Z"), 50]]);
  });

  it("only reads the requested series and region", async () => {
    const stamps = times("2026-11-06T10:00:00Z", 2, HOUR);
    await insert(
      4068,
      "DE",
      "HOUR",
      stamps.map((ts) => [ts, 7]),
    );
    await insert(
      4169,
      "DE-LU",
      "QUARTERHOUR",
      stamps.map((ts) => [ts, 99]),
    );

    const points = await loadReadings(db, {
      ...solar,
      resolution: "hour",
      from: "2026-11-06",
      to: "2026-11-06",
    });

    expect(points.map(([, value]) => value)).toEqual([7, 7]);
  });
});
