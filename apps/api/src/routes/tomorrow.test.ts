import { pino } from "pino";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { TomorrowResponse, type Point } from "@stromblick/shared";
import { createApp } from "../app";
import type { LoadReadings } from "../series/load-readings";
import { SLOT_MS } from "../tomorrow/berlin-day";

// 13:00 in Berlin on Monday 23 November 2026: tomorrow is the 24th, which starts at 23:00 UTC.
const NOON = new Date("2026-11-23T12:00:00Z");
const TOMORROW_START = Date.parse("2026-11-23T23:00:00Z");

function day(prices: number[]): Point[] {
  return prices.map((price, index): Point => [TOMORROW_START + index * SLOT_MS, price]);
}

function appWith(points: Point[], now = NOON) {
  const readings = vi.fn<LoadReadings>(() => Promise.resolve(points));
  const app = createApp({
    logger: pino({ level: "silent" }),
    corsOrigins: [],
    checkDatabase: () => Promise.resolve(),
    ingest: { secret: "x".repeat(32), run: () => Promise.reject(new Error("not used")) },
    readings,
    status: () => Promise.resolve({ lastSuccessAt: null, lastRun: null, latestReadings: {} }),
    now: () => now,
  });
  return { app, readings };
}

describe("GET /tomorrow", () => {
  it("says the prices are not published yet when tomorrow has no readings", async () => {
    const { app } = appWith([]);
    const res = await request(app).get("/tomorrow");

    expect(res.status).toBe(200);
    expect(TomorrowResponse.parse(res.body)).toEqual({
      status: "not-published",
      day: "2026-11-24",
    });
    expect(res.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("asks for the quarter-hours of tomorrow's Berlin day", async () => {
    const { app, readings } = appWith([]);
    await request(app).get("/tomorrow");

    expect(readings).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: "quarterhour",
        from: "2026-11-24",
        to: "2026-11-24",
      }),
    );
  });

  it("returns the prices and the cheapest and most expensive windows of 1 to 4 hours", async () => {
    // A cheap midday (slots 48 to 63) and an expensive evening (slots 72 to 87).
    const prices = Array.from({ length: 96 }, (_, index) => {
      if (index >= 48 && index < 64) return -5;
      if (index >= 72 && index < 88) return 250;
      return 100;
    });
    const { app } = appWith(day(prices));
    const res = await request(app).get("/tomorrow");

    const body = TomorrowResponse.parse(res.body);
    expect(body.status).toBe("published");
    if (body.status !== "published") return;
    expect(body).toMatchObject({ day: "2026-11-24", unit: "EUR/MWh", complete: true });
    expect(body.points).toHaveLength(96);
    expect(body.windows.map((window) => window.hours)).toEqual([1, 2, 3, 4]);
    const four = body.windows.find((window) => window.hours === 4);
    expect(four?.cheapest).toEqual({
      start: TOMORROW_START + 48 * SLOT_MS,
      end: TOMORROW_START + 64 * SLOT_MS,
      average: -5,
    });
    expect(four?.mostExpensive.average).toBe(250);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
  });

  it("marks a day with missing quarter-hours as incomplete and keeps the windows it can find", async () => {
    const { app } = appWith(day(Array.from({ length: 90 }, () => 100)));
    const res = await request(app).get("/tomorrow");

    const body = TomorrowResponse.parse(res.body);
    expect(body.status === "published" && body.complete).toBe(false);
    expect(body.status === "published" && body.windows.length).toBe(4);
    expect(res.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("leaves out a window length that no run of quarter-hours is long enough for", async () => {
    // Two hours of data, in two runs of one hour with a hole between them.
    const points = day(Array.from({ length: 12 }, () => 100)).filter((_, index) => index !== 5);
    const { app } = appWith(points);
    const res = await request(app).get("/tomorrow");

    const body = TomorrowResponse.parse(res.body);
    expect(body.status === "published" && body.windows.map((window) => window.hours)).toEqual([1]);
  });

  it("counts a full day of 92 or 100 quarter-hours as complete when the clocks change", async () => {
    const springStart = Date.parse("2026-03-28T23:00:00Z");
    const spring = Array.from({ length: 92 }, (_, index): Point => [
      springStart + index * SLOT_MS,
      50,
    ]);
    const { app } = appWith(spring, new Date("2026-03-28T12:00:00Z"));
    const res = await request(app).get("/tomorrow");

    const body = TomorrowResponse.parse(res.body);
    expect(body).toMatchObject({ day: "2026-03-29", complete: true });
  });

  it("changes to the next day at Berlin midnight, not at UTC midnight", async () => {
    // 23:30 UTC is already 00:30 on the 24th in Berlin, so tomorrow is the 25th.
    const { app } = appWith([], new Date("2026-11-23T23:30:00Z"));
    const res = await request(app).get("/tomorrow");

    expect(TomorrowResponse.parse(res.body).day).toBe("2026-11-25");
  });
});
