// Loads the last 12 months (or --months <n>) of every catalog series into DATABASE_URL.
// Safe to re-run: readings are upserted, and each run is recorded in ingest_runs.
//
//   pnpm --filter @stromblick/api backfill
//   pnpm --filter @stromblick/api backfill --months 3
import { existsSync } from "node:fs";
import { createDb } from "../db";
import { loadScriptEnv } from "../env";
import { describeDatabase, monthsBefore, parseBackfillArgs } from "../ingest/backfill";
import { runIngest } from "../ingest/run";
import { createLogger } from "../logger";
import { createSmardClient } from "../smard/client";

// Like the API: apps/api/.env locally. A DATABASE_URL set in the shell wins over the file.
if (existsSync(".env")) process.loadEnvFile(".env");

async function main(): Promise<number> {
  const { months } = parseBackfillArgs(process.argv.slice(2));
  const env = loadScriptEnv();
  const logger = createLogger(env);
  const db = createDb(env.DATABASE_URL);
  const since = monthsBefore(new Date(), months);

  logger.info(
    { database: describeDatabase(env.DATABASE_URL), since: since.toISOString() },
    `Backfilling ${String(months)} months`,
  );
  try {
    const result = await runIngest({ db, smard: createSmardClient(), logger, since });
    if (result.status === "FAILED") {
      logger.error({ failures: result.failures }, `Backfill run ${String(result.runId)} failed`);
      return 1;
    }
    logger.info({ rowsWritten: result.rowsWritten }, `Backfill run ${String(result.runId)} done`);
    return 0;
  } finally {
    await db.$disconnect();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    // Bad arguments or env vars fail before the logger exists: print the message, not a stack.
    console.error(err instanceof Error ? err.message : err);
    //That way the finally block still disconnects from the database. Exit code 1 on failure means the script could also run in CI or a GitHub workflow later.
    process.exitCode = 1;
  },
);
