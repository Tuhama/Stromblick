import { DAY, MINUTE } from "@stromblick/shared";
import { LlmError, type LlmClient, type LlmRequest } from "./llm-client";

export type BudgetCheck = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Counts model requests against the free-tier limits, which all visitors share. */
export interface ModelBudget {
  /** Is there room for one more request? Does not use any. */
  check: () => BudgetCheck;
  /** Uses one request if there is room. */
  take: () => BudgetCheck;
}

export interface ModelBudgetOptions {
  perMinute: number;
  perDay: number;
  /** For tests. */
  now?: () => number;
}

/**
 * Two sliding windows (the last minute and the last 24 hours) over the times of past requests.
 * Google resets its daily quota at a fixed time, so a rolling day is a little stricter than needed,
 * which is the safe side. The counts live in memory: a restart resets them, and Google's own limit
 * then answers with a 429 that we turn into a clear message.
 */
export function createModelBudget({
  perMinute,
  perDay,
  now = Date.now,
}: ModelBudgetOptions): ModelBudget {
  let times: number[] = [];

  /** Seconds until the oldest request inside the window falls out of it. */
  function waitFor(inWindow: number[], windowMs: number, at: number): number {
    const oldest = inWindow[0] ?? at;
    return Math.max(1, Math.ceil((oldest + windowMs - at) / 1000));
  }

  function check(): BudgetCheck {
    const at = now();
    times = times.filter((time) => time > at - DAY);
    if (times.length >= perDay) {
      return { ok: false, retryAfterSeconds: waitFor(times, DAY, at) };
    }
    const lastMinute = times.filter((time) => time > at - MINUTE);
    if (lastMinute.length >= perMinute) {
      return { ok: false, retryAfterSeconds: waitFor(lastMinute, MINUTE, at) };
    }
    return { ok: true };
  }

  return {
    check,
    take() {
      const result = check();
      if (result.ok) times.push(now());
      return result;
    },
  };
}

/** Wraps a model so every request it makes is counted. Out of budget: it fails like a Google 429. */
export function withBudget(llm: LlmClient, budget: ModelBudget): LlmClient {
  return {
    stream(request: LlmRequest) {
      if (!budget.take().ok) {
        throw new LlmError("rate_limited", "The assistant has used up its model requests for now");
      }
      return llm.stream(request);
    },
  };
}
