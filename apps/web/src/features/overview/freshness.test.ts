import { describe, expect, it } from "vitest";
import { HOUR } from "../../time/units";
import { isOutdated, STALE_AFTER } from "./freshness";

describe("isOutdated", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");

  it("accepts an update from a minute ago", () => {
    expect(isOutdated(now - 60_000, now)).toBe(false);
  });

  it("accepts one missed hourly run", () => {
    expect(isOutdated(now - 2 * HOUR, now)).toBe(false);
  });

  it("accepts exactly the limit, and warns just after it", () => {
    expect(isOutdated(now - STALE_AFTER, now)).toBe(false);
    expect(isOutdated(now - STALE_AFTER - 1, now)).toBe(true);
  });
});
