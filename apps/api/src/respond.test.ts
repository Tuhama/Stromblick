import express from "express";
import { pino } from "pino";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ProblemDetails, ReadingsResponse } from "@stromblick/shared";
import { errorHandler } from "./middleware/error-handler";
import { sendJson } from "./respond";

const logger = pino({ level: "silent" });

/** A tiny app with one route that sends `body` through sendJson. */
function appSending(body: ReadingsResponse) {
  const app = express();
  app.use(pinoHttp({ logger }));
  app.get("/readings", (_req, res) => {
    sendJson(res, ReadingsResponse, body);
  });
  app.use(errorHandler);
  return app;
}

const valid: ReadingsResponse = {
  series: "price-day-ahead",
  region: "DE-LU",
  resolution: "hour",
  unit: "EUR/MWh",
  points: [
    [1_793_919_600_000, 92.4],
    [1_793_923_200_000, -3.1],
  ],
};

describe("sendJson", () => {
  it("sends a body that matches the schema", async () => {
    const res = await request(appSending(valid)).get("/readings");
    expect(res.status).toBe(200);
    expect(ReadingsResponse.parse(res.body)).toEqual(valid);
  });

  it("turns a body that breaks the contract into a 500 problem response", async () => {
    // Types can't catch this: the points are valid tuples, just in the wrong order.
    const broken = { ...valid, points: [...valid.points].reverse() };
    const res = await request(appSending(broken)).get("/readings");
    expect(res.status).toBe(500);
    expect(ProblemDetails.parse(res.body).title).toBe("Internal Server Error");
    expect(JSON.stringify(res.body)).not.toContain("points");
  });

  it("catches NaN, which JSON would silently send as null", async () => {
    const broken: ReadingsResponse = { ...valid, points: [[1_793_919_600_000, Number.NaN]] };
    const res = await request(appSending(broken)).get("/readings");
    expect(res.status).toBe(500);
  });
});
