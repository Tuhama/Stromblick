import express from "express";
import { createApp } from "../app";
import { createModelBudget } from "../assistant/model-budget";
import { createTools } from "../assistant/tools";
import { createDb } from "../db";
import { loadEnv } from "../env";
import { createLogger } from "../logger";
import { loadLatest, type LatestRequest } from "../series/load-latest";
import { loadReadings, type ReadingsRequest } from "../series/load-readings";
import { loadStatus } from "../status/load-status";
import { createE2eModel } from "./fake-model";
import { assertThrowawayDatabase } from "./safe-database";
import { E2E_NOW, HOLE_DAY, seedDatabase, TODAY, TOMORROW } from "./seed";

/**
 * The API as the end-to-end tests run it. Never part of the production build (tsdown bundles only
 * src/index.ts). It differs from index.ts in four ways:
 *  - the database is emptied and filled with the fixed seed at startup,
 *  - the assistant talks to a fake model, never to Gemini,
 *  - there is no ingest timer and no SMARD client, so nothing can reach SMARD,
 *  - the clock is fixed, and a test can move it with POST /__e2e/now.
 */
const env = loadEnv();
assertThrowawayDatabase(env.DATABASE_URL);
const logger = createLogger(env);
const db = createDb(env.DATABASE_URL);

const seeded = await seedDatabase(db);
logger.info(`Seeded ${String(seeded)} readings`);

let now = E2E_NOW;

const readings = (request: ReadingsRequest) => loadReadings(db, request);
const latest = (request: LatestRequest) => loadLatest(db, request);
const status = () => loadStatus(db);

const api = createApp({
  logger,
  corsOrigins: env.CORS_ORIGINS,
  checkDatabase: async () => {
    await db.$queryRaw`SELECT 1`;
  },
  // POST /ingest exists but has nothing to call: it answers with the failure of a missing client.
  ingest: {
    secret: env.INGEST_SECRET,
    run: () => Promise.reject(new Error("Ingest is switched off in the end-to-end server")),
  },
  readings,
  status,
  rateLimitPerMinute: 100_000,
  assistant: {
    llm: createE2eModel(TODAY),
    tools: createTools({ readings, latest, status }),
    logger,
    budget: createModelBudget({ perMinute: 100_000, perDay: 1_000_000 }),
    questionsPerMinute: 1_000,
  },
  now: () => now,
});

// The test control lives outside the real app, so it cannot leak into it.
const server = express();
server.use(express.json());
server.post("/__e2e/now", (req, res) => {
  const body: unknown = req.body;
  const value = typeof body === "object" && body !== null && "now" in body ? String(body.now) : "";
  const moved = new Date(value);
  if (Number.isNaN(moved.getTime())) {
    res.status(400).json({ error: "Send { now: <ISO time> }" });
    return;
  }
  now = moved;
  res.json({ now: now.toISOString() });
});
// What the tests need to know about the seed, so they never repeat its dates.
server.get("/__e2e/facts", (_req, res) => {
  res.json({ now: E2E_NOW.toISOString(), today: TODAY, tomorrow: TOMORROW, holeDay: HOLE_DAY });
});
server.post("/__e2e/reset", (_req, res) => {
  now = E2E_NOW;
  res.json({ now: now.toISOString() });
});
server.use(api);

const listener = server.listen(env.PORT, () => {
  logger.info(`End-to-end API on http://localhost:${String(env.PORT)}, clock ${now.toISOString()}`);
});

function shutdown() {
  listener.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
