import express from "express";
import { pino } from "pino";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { HealthResponse, ProblemDetails } from "@stromblick/shared";
import { createApp } from "./app";
import { errorHandler } from "./middleware/error-handler";

const logger = pino({ level: "silent" });
const app = createApp({ logger, corsOrigins: ["http://localhost:5173"] });

describe("GET /health", () => {
  it("returns ok with a request id", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(res.body).status).toBe("ok");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("reuses a valid incoming request id", async () => {
    const res = await request(app).get("/health").set("x-request-id", "abc-123");
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("sets security headers", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS", () => {
  it("allows the configured web origin", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("does not allow other origins", async () => {
    const res = await request(app).get("/health").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("errors", () => {
  it("returns problem details for unknown routes", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(ProblemDetails.parse(res.body)).toMatchObject({ status: 404, instance: "/nope" });
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(ProblemDetails.parse(res.body).status).toBe(400);
  });

  it("hides the details of unexpected errors", async () => {
    const broken = express();
    broken.use(pinoHttp({ logger }));
    broken.get("/boom", () => {
      throw new Error("secret internals");
    });
    broken.use(errorHandler);

    const res = await request(broken).get("/boom");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret internals");
  });
});
