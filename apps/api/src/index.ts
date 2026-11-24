import { MINUTE } from "@stromblick/shared";
import { existsSync } from "node:fs";
import { createApp } from "./app";
import { createGeminiClientFromKey } from "./assistant/gemini-client";
import { createModelBudget } from "./assistant/model-budget";
import { createTools } from "./assistant/tools";
import { createDb } from "./db";
import { loadEnv } from "./env";
import { runIngest } from "./ingest/run";
import { singleFlight } from "./ingest/single-flight";
import { startIngestTimer } from "./ingest/timer";
import { createLogger } from "./logger";
import { loadLatest, type LatestRequest } from "./series/load-latest";
import { loadReadings, type ReadingsRequest } from "./series/load-readings";
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

const readings = (request: ReadingsRequest) => loadReadings(db, request);

const latest = (request: LatestRequest) => loadLatest(db, request);
const status = () => loadStatus(db);

// Without a key the assistant is off: the route answers 503 and nothing else changes.
const assistant =
  env.GEMINI_API_KEY === undefined
    ? undefined
    : {
        llm: createGeminiClientFromKey(env.GEMINI_API_KEY, env.GEMINI_MODEL),
        tools: createTools({ readings, latest, status }),
        logger,
        budget: createModelBudget({
          perMinute: env.ASSISTANT_MODEL_REQUESTS_PER_MINUTE,
          perDay: env.ASSISTANT_MODEL_REQUESTS_PER_DAY,
        }),
        questionsPerMinute: env.ASSISTANT_QUESTIONS_PER_MINUTE,
      };

logger.info(
  assistant === undefined
    ? "Assistant off (GEMINI_API_KEY is unset)"
    : `Assistant on (model ${env.GEMINI_MODEL})`,
);

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
  readings,
  status,
  rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
  assistant,
});

const stopIngestTimer =
  env.INGEST_INTERVAL_MINUTES === undefined
    ? undefined
    : startIngestTimer({
        intervalMs: env.INGEST_INTERVAL_MINUTES * MINUTE,
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
