import { pino } from "pino";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  ProblemDetails,
  ReadingsResponse,
  SeriesListResponse,
  type Point,
} from "@stromblick/shared";
import { createApp } from "../app";
import type { LoadReadings } from "../series/load-readings";

const POINTS: Point[] = [
  [Date.parse("2026-11-05T23:00:00Z"), 98.5],
  [Date.parse("2026-11-05T23:15:00Z"), 91.2],
];

function appWithReadings(points: Point[] = POINTS) {
  const readings = vi.fn<LoadReadings>(() => Promise.resolve(points));
  const app = createApp({
    logger: pino({ level: "silent" }),
    corsOrigins: [],
    checkDatabase: () => Promise.resolve(),
    ingest: { secret: "x".repeat(32), run: () => Promise.reject(new Error("not used")) },
    readings,
  });
  return { app, readings };
}

describe("GET /series", () => {
  it("lists every series without SMARD's internals", async () => {
    const { app } = appWithReadings();
    const res = await request(app).get("/series");

    expect(res.status).toBe(200);
    const body = SeriesListResponse.parse(res.body);
    expect(body.series).toHaveLength(13);
    expect(body.series[0]).toEqual({
      key: "price-day-ahead",
      kind: "price",
      unit: "EUR/MWh",
      name: { en: "Day-ahead price", de: "Day-Ahead-Preis" },
    });
    expect(JSON.stringify(res.body)).not.toContain("filter");
    expect(res.headers["cache-control"]).toBe("public, max-age=3600");
  });
});

describe("GET /series/:key/readings", () => {
  it("returns the points with the chosen resolution", async () => {
    const { app, readings } = appWithReadings();
    const res = await request(app)
      .get("/series/price-day-ahead/readings")
      .query({ from: "2026-11-06", to: "2026-11-06" });

    expect(res.status).toBe(200);
    expect(ReadingsResponse.parse(res.body)).toEqual({
      series: "price-day-ahead",
      region: "DE-LU",
      resolution: "quarterhour",
      unit: "EUR/MWh",
      points: POINTS,
    });
    expect(readings).toHaveBeenCalledWith({
      seriesId: 4169,
      region: "DE-LU",
      native: "quarterhour",
      resolution: "quarterhour",
      aggregate: "avg",
      from: "2026-11-06",
      to: "2026-11-06",
    });
  });

  it("picks a coarser resolution for a long range and sums energy", async () => {
    const { app, readings } = appWithReadings([]);
    const res = await request(app)
      .get("/series/generation-solar/readings")
      .query({ from: "2025-11-07", to: "2026-11-06" });

    expect(res.status).toBe(200);
    expect(ReadingsResponse.parse(res.body).resolution).toBe("day");
    expect(readings).toHaveBeenCalledWith(
      expect.objectContaining({ native: "hour", resolution: "day", aggregate: "sum" }),
    );
  });

  it("is cacheable and answers a repeated request with 304", async () => {
    const { app } = appWithReadings();
    const url = "/series/load/readings?from=2026-11-06&to=2026-11-06";
    const first = await request(app).get(url);

    expect(first.headers["cache-control"]).toBe("public, max-age=300");
    const etag = first.headers.etag;
    expect(etag).toBeTruthy();

    const second = await request(app)
      .get(url)
      .set("If-None-Match", etag ?? "");
    expect(second.status).toBe(304);
    expect(second.text).toBe("");
  });

  it("answers 404 for an unknown series", async () => {
    const { app, readings } = appWithReadings();
    const res = await request(app).get("/series/nope/readings?from=2026-11-06&to=2026-11-06");

    expect(res.status).toBe(404);
    expect(ProblemDetails.parse(res.body).detail).toBe("Unknown series");
    expect(readings).not.toHaveBeenCalled();
  });

  it.each([
    ["no range", {}],
    ["no end", { from: "2026-11-06" }],
    ["a malformed day", { from: "06.11.2026", to: "2026-11-06" }],
    ["a day that doesn't exist", { from: "2026-02-30", to: "2026-03-01" }],
    ["from after to", { from: "2026-11-07", to: "2026-11-06" }],
    ["an unknown resolution", { from: "2026-11-06", to: "2026-11-06", resolution: "minute" }],
    ["a range over a year", { from: "2025-01-01", to: "2026-01-02" }],
    [
      "a resolution finer than the data",
      { from: "2026-11-06", to: "2026-11-06", resolution: "quarterhour", key: "load" },
    ],
    ["too many points", { from: "2026-09-01", to: "2026-10-31", resolution: "quarterhour" }],
  ])(
    "answers 400 for %s",
    async (_name, { key = "price-day-ahead", ...query }: Record<string, string>) => {
      const { app, readings } = appWithReadings();
      const res = await request(app).get(`/series/${key}/readings`).query(query);

      expect(res.status).toBe(400);
      expect(ProblemDetails.parse(res.body).status).toBe(400);
      expect(readings).not.toHaveBeenCalled();
    },
  );
});
