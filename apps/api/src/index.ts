import { existsSync } from "node:fs";
import { createApp } from "./app";
import { createDb } from "./db";
import { loadEnv } from "./env";
import { createLogger } from "./logger";

// Local development reads apps/api/.env; in production the platform sets real env vars.
if (existsSync(".env")) process.loadEnvFile(".env");

const env = loadEnv();
const logger = createLogger(env);
const db = createDb(env.DATABASE_URL);
const app = createApp({
  logger,
  corsOrigins: env.CORS_ORIGINS,
  checkDatabase: async () => {
    await db.$queryRaw`SELECT 1`;
  },
});

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${String(env.PORT)}`);
});

// Railway sends SIGTERM before replacing a deployment: finish open requests, then exit.
function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "Shutting down");
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
