import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// The Prisma CLI doesn't load .env files by itself since Prisma 7.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // In production the API connects with sslmode=verify-full, which Prisma's CLI doesn't document,
  // so the CLI can get its own URL. Locally and in CI it falls back to DATABASE_URL.
  // `prisma generate` needs no database, so CI can run it without either.
  datasource: { url: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL ?? "" },
});
