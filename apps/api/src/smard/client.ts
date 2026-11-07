import type { z } from "zod";
import type { SmardResolution, SmardSource } from "./catalog";
import { SmardIndex, SmardWeek } from "./schemas";

export const SMARD_BASE_URL = "https://www.smard.de/app";

const STEP_MS: Record<SmardResolution, number> = {
  quarterhour: 15 * 60_000,
  hour: 60 * 60_000,
};

/** One published value: start of the interval in epoch milliseconds (UTC), and the value. */
export interface SmardReading {
  ts: number;
  value: number;
}

/** SMARD failed or answered with something we don't understand. `url` says which request. */
export class SmardError extends Error {
  readonly url: string;
  readonly status: number | undefined;

  constructor(message: string, url: string, options: { status?: number; cause?: unknown } = {}) {
    super(`${message} (${url})`, { cause: options.cause });
    this.name = "SmardError";
    this.url = url;
    this.status = options.status;
  }
}

export interface SmardClientOptions {
  /** Injected in tests, so they never call SMARD. */
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

export function createSmardClient({
  fetch: fetchFn = fetch,
  baseUrl = SMARD_BASE_URL,
  timeoutMs = 10_000,
}: SmardClientOptions = {}) {
  async function getJson<S extends z.ZodType>(url: string, schema: S): Promise<z.output<S>> {
    let res: Response;
    try {
      res = await fetchFn(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new SmardError("SMARD request failed", url, { cause: err });
    }
    if (!res.ok) {
      throw new SmardError(`SMARD answered ${String(res.status)}`, url, { status: res.status });
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch (err) {
      throw new SmardError("SMARD sent invalid JSON", url, { cause: err });
    }
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new SmardError("Unexpected response from SMARD", url, { cause: result.error });
    }
    return result.data;
  }

  return {
    /** Start of every week SMARD has a file for, oldest first. */
    async getWeekStarts({ filter, region, resolution }: SmardSource): Promise<number[]> {
      const url = `${baseUrl}/chart_data/${String(filter)}/${region}/index_${resolution}.json`;
      const index = await getJson(url, SmardIndex);
      return [...index.timestamps].sort((a, b) => a - b);
    },

    /** Published readings of the week starting at `weekStart`; unpublished (null) slots are left out. */
    async getWeek(source: SmardSource, weekStart: number): Promise<SmardReading[]> {
      const { filter, region, resolution } = source;
      const file = `${String(filter)}_${region}_${resolution}_${String(weekStart)}.json`;
      const url = `${baseUrl}/chart_data/${String(filter)}/${region}/${file}`;
      const week = await getJson(url, SmardWeek);

      const problem = checkTimeline(week, weekStart, STEP_MS[resolution]);
      if (problem) {
        throw new SmardError(`Unexpected ${resolution} data from SMARD: ${problem}`, url);
      }

      const readings: SmardReading[] = [];
      for (const [ts, value] of week.series) {
        if (value !== null) readings.push({ ts, value });
      }
      return readings;
    },
  };
}

export type SmardClient = ReturnType<typeof createSmardClient>;

/**
 * Checks that a week starts at `weekStart` and has one slot every `stepMs`.
 * In UTC every slot is the same length, even in the weeks the clocks change.
 */
function checkTimeline(week: SmardWeek, weekStart: number, stepMs: number): string | null {
  let expected = weekStart;
  for (const [ts] of week.series) {
    if (ts !== expected) return `expected a slot at ${String(expected)}, got ${String(ts)}`;
    expected += stepMs;
  }
  return null;
}

/**
 * The weeks that contain data at or after `since`, from SMARD's sorted week starts.
 * A week ends where the next one starts, so 167- and 169-hour weeks (clock changes) are handled.
 */
export function weeksSince(weekStarts: readonly number[], since: number): number[] {
  return weekStarts.filter((_start, i) => (weekStarts[i + 1] ?? Infinity) > since);
}
