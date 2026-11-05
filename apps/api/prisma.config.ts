import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// The Prisma CLI doesn't load .env files by itself since Prisma 7.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` needs no database, so CI can run it without DATABASE_URL.
  // Commands that do need one (migrate, studio) fail with a clear error if it's missing.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
