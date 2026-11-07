import { parseArgs } from "node:util";
import { z } from "zod";

// SMARD's 15-minute price files before 1 October 2025 repeat each hourly price four times.
// That is still the right price for every slot, so longer backfills are fine; 36 months keeps
// the database well inside Neon's free tier.
const Months = z.coerce.number().int().min(1).max(36);

/** Reads `--months <n>` (default 12) from the command-line arguments. */
export function parseBackfillArgs(args: string[]): { months: number } {
  const { values } = parseArgs({
    // pnpm passes a separating `--` through (`pnpm backfill -- --months 3`); skip it.
    args: args[0] === "--" ? args.slice(1) : args,
    options: { months: { type: "string", default: "12" } },
    strict: true,
  });
  const months = Months.safeParse(values.months);
  if (!months.success) throw new Error("--months must be a whole number from 1 to 36");
  return { months: months.data };
}

/** The same moment `months` calendar months earlier, in UTC. */
export function monthsBefore(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

/** host:port/database of a connection string, without user or password, to say where we write. */
export function describeDatabase(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.host}${url.pathname}`;
}
