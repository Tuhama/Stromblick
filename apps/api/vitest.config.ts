import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

// CI sets TEST_DATABASE_URL in the environment. Locally it can live in apps/api/.env instead.
const fromFile = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? fromFile.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    // Database tests share one test database and empty its tables before each test,
    // so test files run one after another instead of in parallel.
    fileParallelism: false,
    // Without a URL the database tests skip themselves.
    env: testDatabaseUrl === undefined ? {} : { TEST_DATABASE_URL: testDatabaseUrl },
  },
});
