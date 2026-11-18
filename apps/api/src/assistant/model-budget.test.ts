import { describe, expect, it } from "vitest";
import { LlmError, type LlmClient } from "./llm-client";
import { createModelBudget, withBudget } from "./model-budget";
import { scriptedLlm } from "./fake-llm";

function clock(start = 1_000_000) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("createModelBudget", () => {
  it("allows the requests of the minute, then says when to come back", () => {
    const time = clock();
    const budget = createModelBudget({ perMinute: 2, perDay: 100, now: time.now });
    expect(budget.take()).toEqual({ ok: true });
    time.advance(10_000);
    expect(budget.take()).toEqual({ ok: true });
    time.advance(10_000);
    // The first request leaves the minute after 60 s, which is 40 s from now.
    expect(budget.take()).toEqual({ ok: false, retryAfterSeconds: 40 });
    time.advance(40_000);
    expect(budget.take()).toEqual({ ok: true });
  });

  it("check() does not use up a request", () => {
    const budget = createModelBudget({ perMinute: 1, perDay: 100, now: clock().now });
    expect(budget.check()).toEqual({ ok: true });
    expect(budget.check()).toEqual({ ok: true });
    expect(budget.take()).toEqual({ ok: true });
    expect(budget.check().ok).toBe(false);
  });

  it("stops at the daily limit even when the minute is free", () => {
    const time = clock();
    const budget = createModelBudget({ perMinute: 10, perDay: 3, now: time.now });
    for (let i = 0; i < 3; i += 1) {
      expect(budget.take().ok).toBe(true);
      time.advance(2 * 60_000);
    }
    const blocked = budget.take();
    expect(blocked.ok).toBe(false);
    // The oldest request is 6 minutes old; it leaves the 24 hour window after 23 h 54 min.
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 24 * 3600 - 6 * 60 });
    time.advance(24 * 3600 * 1000);
    expect(budget.take().ok).toBe(true);
  });
});

describe("withBudget", () => {
  const request = { system: "", messages: [], tools: [], maxOutputTokens: 1 };

  it("counts every model request and fails with rate_limited when the budget is gone", () => {
    const budget = createModelBudget({ perMinute: 1, perDay: 10, now: clock().now });
    const llm: LlmClient = withBudget(scriptedLlm([{ text: ["a"] }, { text: ["b"] }]), budget);
    expect(() => llm.stream(request)).not.toThrow();
    expect(() => llm.stream(request)).toThrow(LlmError);
    expect(() => llm.stream(request)).toThrow(expect.objectContaining({ kind: "rate_limited" }));
  });
});
