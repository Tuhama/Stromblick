import { existsSync } from "node:fs";
import { createApp } from "./app";
import { createDb } from "./db";
import { loadEnv } from "./env";
import { runIngest } from "./ingest/run";
import { singleFlight } from "./ingest/single-flight";
import { startIngestTimer } from "./ingest/timer";
import { createLogger } from "./logger";
import { loadReadings } from "./series/load-readings";
import { createSmardClient } from "./smard/client";
import { loadStatus } from "./status/load-status";

// Local development reads apps/api/.env; in production the platform sets real env vars.
if (existsSync(".env")) process.loadEnvFile(".env");

const env = loadEnv();
const logger = createLogger(env);
const db = createDb(env.DATABASE_URL);
const smard = createSmardClient();
// One guard for both callers: a timer tick and POST /ingest can never run at the same time.
const ingest = singleFlight(() => runIngest({ db, smard, logger }));
const app = createApp({
  logger,
  corsOrigins: env.CORS_ORIGINS,
  checkDatabase: async () => {
    await db.$queryRaw`SELECT 1`;
  },
  ingest: {
    secret: env.INGEST_SECRET,
    run: ingest.run,
  },
  readings: (request) => loadReadings(db, request),
  status: () => loadStatus(db),
});

const stopIngestTimer =
  env.INGEST_INTERVAL_MINUTES === undefined
    ? undefined
    : startIngestTimer({
        intervalMs: env.INGEST_INTERVAL_MINUTES * 60_000,
        initialDelayMs: 15_000,
        runIfIdle: () => {
          const started = ingest.runIfIdle();
          if (started === null) return null;
          return started.then((result) => {
            const summary = { runId: result.runId, rowsWritten: result.rowsWritten };
            if (result.status === "SUCCEEDED") logger.info(summary, "Scheduled ingest succeeded");
            else logger.error({ ...summary, failures: result.failures }, "Scheduled ingest failed");
          });
        },
        logger,
      });
logger.info(
  env.INGEST_INTERVAL_MINUTES === undefined
    ? "Ingest timer off (INGEST_INTERVAL_MINUTES is unset)"
    : `Ingest timer on: every ${String(env.INGEST_INTERVAL_MINUTES)} minutes`,
);

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${String(env.PORT)}`);
});

// Railway sends SIGTERM before replacing a deployment: finish open requests, then exit.
function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "Shutting down");
  stopIngestTimer?.();
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
