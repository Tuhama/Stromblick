import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ProblemDetails } from "@stromblick/shared";
import { createApp } from "../app";
import { recordingReporter } from "../observability/recording-reporter";

const logger = pino({ level: "silent" });

function appWith(overrides: {
  readings?: () => Promise<never>;
  checkDatabase?: () => Promise<void>;
}) {
  const { reporter, reports } = recordingReporter();
  const app = createApp({
    logger,
    corsOrigins: [],
    checkDatabase: overrides.checkDatabase ?? (() => Promise.resolve()),
    ingest: { secret: "x".repeat(32), run: () => Promise.reject(new Error("not used")) },
    readings: overrides.readings ?? (() => Promise.resolve([])),
    status: () => Promise.resolve({ lastSuccessAt: null, lastRun: null, latestReadings: {} }),
    reporter,
  });
  return { app, reports };
}

describe("error reporting from the error handler", () => {
  it("reports an unexpected error with the request ID that the response carries", async () => {
    const failure = new Error("connection pool exhausted");
    const { app, reports } = appWith({ readings: () => Promise.reject(failure) });

    const res = await request(app).get(
      "/series/price-day-ahead/readings?from=2026-03-01&to=2026-03-01",
    );

    expect(res.status).toBe(500);
    const problem = ProblemDetails.parse(res.body);
    expect(reports).toEqual([
      {
        error: failure,
        context: {
          source: "http",
          route: "/series/price-day-ahead/readings",
          requestId: problem.requestId,
        },
      },
    ]);
    expect(problem.requestId).toBe(res.headers["x-request-id"]);
  });

  it("does not report what the code answers on purpose: bad input, unknown routes, a database that is down", async () => {
    const { app, reports } = appWith({
      checkDatabase: () => Promise.reject(new Error("connection refused")),
    });

    expect((await request(app).get("/nope")).status).toBe(404);
    expect(
      (await request(app).get("/series/price-day-ahead/readings?from=nonsense&to=2026-03-01"))
        .status,
    ).toBe(400);
    expect((await request(app).get("/health")).status).toBe(503);
    expect(reports).toEqual([]);
  });

  it("keeps the details of the error out of the response", async () => {
    const { app } = appWith({ readings: () => Promise.reject(new Error("secret internals")) });
    const res = await request(app).get(
      "/series/price-day-ahead/readings?from=2026-03-01&to=2026-03-01",
    );
    expect(JSON.stringify(res.body)).not.toContain("secret internals");
  });
});
