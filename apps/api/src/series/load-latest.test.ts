import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db";
import { loadLatest } from "./load-latest";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI sets it). The tests empty its tables,
// so never point it at a database whose data you want to keep.
const url = process.env.TEST_DATABASE_URL;

const QUARTER = 900_000;
const price = { seriesId: 4169, region: "DE-LU", native: "quarterhour" } as const;

describe.skipIf(url === undefined)("loadLatest (database)", () => {
  const db = createDb(url ?? "");

  async function insert(seriesId: number, region: string, stamps: number[]) {
    await db.reading.createMany({
      data: stamps.map((ts, i) => ({
        seriesId,
        region,
        resolution: "QUARTERHOUR" as const,
        ts: new Date(ts),
        value: i,
      })),
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
        { id: 410, key: "load", nameEn: "Load", nameDe: "Last", unit: "MWh", kind: "LOAD" },
      ],
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("returns null for a series without readings", async () => {
    expect(await loadLatest(db, price)).toBeNull();
  });

  it("returns the newest reading, even after a gap of days", async () => {
    const start = Date.parse("2026-11-19T00:00:00Z");
    // The 19th, then nothing on the 20th and 21st, then the 22nd.
    const days = [start, start + 3 * 96 * QUARTER];
    const stamps = days.flatMap((day) => Array.from({ length: 96 }, (_, i) => day + i * QUARTER));
    await insert(4169, "DE-LU", stamps);
    expect(await loadLatest(db, price)).toBe(Date.parse("2026-11-22T23:45:00Z"));
  });

  it("looks only at the series it was asked for", async () => {
    await insert(4169, "DE-LU", [Date.parse("2026-11-19T00:00:00Z")]);
    await insert(410, "DE", [Date.parse("2026-11-20T00:00:00Z")]);
    expect(await loadLatest(db, price)).toBe(Date.parse("2026-11-19T00:00:00Z"));
  });
});
