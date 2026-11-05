import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export function createDb(connectionString: string) {
  // Fail fast instead of hanging when the database is unreachable.
  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 2_000 });
  return new PrismaClient({ adapter });
}

export type Db = ReturnType<typeof createDb>;
