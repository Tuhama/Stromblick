import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export function createDb(connectionString: string) {
  const adapter = new PrismaPg({
    connectionString,
    // Fail fast instead of hanging when the database is unreachable.
    connectionTimeoutMillis: 2_000,
    // Prisma's pg adapter reads and writes timestamps as if the session were UTC. Make sure it is,
    // whatever the server's default (Docker and Neon use UTC, a self-hosted server may not).
    options: "-c TimeZone=UTC",
  });
  return new PrismaClient({ adapter });
}

export type Db = ReturnType<typeof createDb>;
