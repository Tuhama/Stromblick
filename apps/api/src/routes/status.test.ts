import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ProblemDetails, StatusResponse } from "@stromblick/shared";
import { createApp } from "../app";
import type { LoadStatus } from "../status/load-status";

function appWithStatus(status: LoadStatus) {
  return createApp({
    logger: pino({ level: "silent" }),
    corsOrigins: [],
    checkDatabase: () => Promise.resolve(),
    ingest: { secret: "x".repeat(32), run: () => Promise.reject(new Error("not used")) },
    readings: () => Promise.resolve([]),
    status,
  });
}

describe("GET /status", () => {
  it("returns when the data was last updated", async () => {
    const status: StatusResponse = {
      lastSuccessAt: "2026-11-10T19:00:05.000Z",
      lastRun: { status: "FAILED", finishedAt: "2026-11-10T20:00:02.000Z" },
    };
    const res = await request(appWithStatus(() => Promise.resolve(status))).get("/status");

    expect(res.status).toBe(200);
    expect(StatusResponse.parse(res.body)).toEqual(status);
    expect(res.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("returns nulls before the first ingest", async () => {
    const app = appWithStatus(() => Promise.resolve({ lastSuccessAt: null, lastRun: null }));
    const res = await request(app).get("/status");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lastSuccessAt: null, lastRun: null });
  });

  it("answers with problem details, uncached, when the database fails", async () => {
    const app = appWithStatus(() => Promise.reject(new Error("connection refused")));
    const res = await request(app).get("/status");

    expect(res.status).toBe(500);
    expect(ProblemDetails.parse(res.body).title).toBe("Internal Server Error");
    expect(JSON.stringify(res.body)).not.toContain("connection refused");
    expect(res.headers["cache-control"]).toBeUndefined();
  });
});
