import { describe, expect, it } from "vitest";
import { formatTimeAgo } from "./relative";

const NOW = Date.parse("2026-11-14T10:00:00Z");
const MINUTE = 60_000;

describe("formatTimeAgo", () => {
  it("counts in minutes, then hours, then days", () => {
    expect(formatTimeAgo(NOW - 20 * MINUTE, NOW, "en")).toBe("20 minutes ago");
    expect(formatTimeAgo(NOW - 59 * MINUTE, NOW, "en")).toBe("59 minutes ago");
    expect(formatTimeAgo(NOW - 60 * MINUTE, NOW, "en")).toBe("1 hour ago");
    expect(formatTimeAgo(NOW - 26 * 60 * MINUTE, NOW, "en")).toBe("1 day ago");
  });

  it("speaks the reader's language", () => {
    expect(formatTimeAgo(NOW - 20 * MINUTE, NOW, "de")).toBe("vor 20 Minuten");
    expect(formatTimeAgo(NOW - 3 * 60 * MINUTE, NOW, "de")).toBe("vor 3 Stunden");
  });

  it("leaves less than a minute to the caller", () => {
    expect(formatTimeAgo(NOW - 30_000, NOW, "en")).toBeNull();
    // A server clock slightly ahead of the reader's must not produce "in 1 minute".
    expect(formatTimeAgo(NOW + 5_000, NOW, "en")).toBeNull();
  });
});
