import request from "supertest";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { ProblemDetails } from "@stromblick/shared";
import { createApp } from "../app";

function makeApp(rateLimitPerMinute: number) {
  return createApp({
    logger: pino({ level: "silent" }),
    corsOrigins: [],
    checkDatabase: () => Promise.resolve(),
    ingest: { secret: "x".repeat(32), run: () => Promise.reject(new Error("not used")) },
    readings: () => Promise.resolve([]),
    status: () => Promise.resolve({ lastSuccessAt: null, lastRun: null, latestReadings: {} }),
    rateLimitPerMinute,
  });
}

describe("rate limiting", () => {
  it("answers 429 problem details with Retry-After once the limit is used up", async () => {
    const app = makeApp(2);
    expect((await request(app).get("/status")).status).toBe(200);
    expect((await request(app).get("/status")).status).toBe(200);

    const res = await request(app).get("/status");
    expect(res.status).toBe(429);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(ProblemDetails.parse(res.body)).toMatchObject({ status: 429, instance: "/status" });
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(res.headers["ratelimit"]).toBeTruthy();
  });

  it("counts every data route together", async () => {
    const app = makeApp(2);
    await request(app).get("/status");
    await request(app).get("/status");
    expect((await request(app).get("/series")).status).toBe(429);
  });

  it("keeps a separate count per client address behind the proxy", async () => {
    const app = makeApp(1);
    expect((await request(app).get("/status").set("X-Forwarded-For", "203.0.113.1")).status).toBe(
      200,
    );
    expect((await request(app).get("/status").set("X-Forwarded-For", "203.0.113.1")).status).toBe(
      429,
    );
    expect((await request(app).get("/status").set("X-Forwarded-For", "203.0.113.2")).status).toBe(
      200,
    );
  });
  it("prefers the X-Real-IP header Railway sets over the proxy chain", async () => {
    const app = makeApp(1);
    const first = request(app).get("/status").set("X-Real-IP", "198.51.100.7");
    // Different proxy addresses, same caller: still one count.
    expect((await first.set("X-Forwarded-For", "10.0.0.1")).status).toBe(200);
    const again = request(app).get("/status").set("X-Real-IP", "198.51.100.7");
    expect((await again.set("X-Forwarded-For", "10.0.0.2")).status).toBe(429);
    const other = request(app).get("/status").set("X-Real-IP", "198.51.100.8");
    expect((await other.set("X-Forwarded-For", "10.0.0.1")).status).toBe(200);
  });

  it("groups IPv6 addresses of one /64 together", async () => {
    const app = makeApp(1);
    expect((await request(app).get("/status").set("X-Real-IP", "2001:db8::1")).status).toBe(200);
    expect((await request(app).get("/status").set("X-Real-IP", "2001:db8::2")).status).toBe(429);
  });

  it("never limits the health check", async () => {
    const app = makeApp(1);
    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).get("/health")).status).toBe(200);
    }
  });

  it("limits POST /ingest to 10 tries a minute, also when the secret is wrong", async () => {
    const app = makeApp(1000);
    for (let i = 0; i < 10; i += 1) {
      expect((await request(app).post("/ingest")).status).toBe(401);
    }
    expect((await request(app).post("/ingest")).status).toBe(429);
  });
});
