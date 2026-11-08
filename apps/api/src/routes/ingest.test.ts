import { pino } from "pino";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { IngestResponse, ProblemDetails } from "@stromblick/shared";
import { createApp } from "../app";
import type { IngestResult } from "../ingest/run";

const SECRET = "test-secret-".padEnd(32, "x");

function appWithIngest(result: IngestResult) {
  const run = vi.fn(() => Promise.resolve(result));
  const app = createApp({
    logger: pino({ level: "silent" }),
    corsOrigins: [],
    checkDatabase: () => Promise.resolve(),
    ingest: { secret: SECRET, run },
    readings: () => Promise.resolve([]),
  });
  return { app, run };
}

const succeeded: IngestResult = { runId: 7, status: "SUCCEEDED", rowsWritten: 576, failures: [] };

describe("POST /ingest", () => {
  it("runs the ingest with the right secret", async () => {
    const { app, run } = appWithIngest(succeeded);
    const res = await request(app).post("/ingest").set("Authorization", `Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    expect(IngestResponse.parse(res.body)).toEqual({
      runId: 7,
      status: "SUCCEEDED",
      rowsWritten: 576,
    });
    expect(run).toHaveBeenCalledOnce();
  });

  it.each([
    ["no header", undefined],
    ["a wrong secret", `Bearer ${SECRET.slice(0, -1)}y`],
    ["another scheme", `Basic ${SECRET}`],
  ])("answers 401 without running for %s", async (_case, header) => {
    const { app, run } = appWithIngest(succeeded);
    const req = request(app).post("/ingest");
    const res = header === undefined ? await req : await req.set("Authorization", header);

    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe("Bearer");
    expect(ProblemDetails.parse(res.body).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("answers 502 when the run failed, naming the failed series", async () => {
    const { app } = appWithIngest({
      runId: 8,
      status: "FAILED",
      rowsWritten: 100,
      failures: [{ series: "generation-solar", error: "SMARD answered 503" }],
    });
    const res = await request(app).post("/ingest").set("Authorization", `Bearer ${SECRET}`);

    expect(res.status).toBe(502);
    expect(ProblemDetails.parse(res.body).detail).toBe("Ingest run 8 failed for: generation-solar");
  });

  it("only accepts POST", async () => {
    const { app } = appWithIngest(succeeded);
    const res = await request(app).get("/ingest").set("Authorization", `Bearer ${SECRET}`);
    expect(res.status).toBe(404);
  });
});
