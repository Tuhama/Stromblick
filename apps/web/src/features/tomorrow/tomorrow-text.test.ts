import { describe, expect, it } from "vitest";
import { formatLongDay, formatRange } from "./tomorrow-text";

describe("formatLongDay", () => {
  it("writes the weekday and the date in the reader's language", () => {
    expect(formatLongDay("2026-11-24", "en")).toBe("Tuesday, November 24");
    expect(formatLongDay("2026-11-24", "de")).toBe("Dienstag, 24. November");
  });

  it("keeps the day on the days the clocks change", () => {
    expect(formatLongDay("2026-03-29", "en")).toContain("March 29");
    expect(formatLongDay("2026-10-25", "en")).toContain("October 25");
  });
});

describe("formatRange", () => {
  it("writes the start and the end in German time", () => {
    // 12:15 UTC is 13:15 in Berlin in November; the window is two hours long.
    const start = Date.parse("2026-11-24T12:15:00Z");
    expect(formatRange(start, start + 2 * 3_600_000)).toBe("13:15–15:15");
  });

  it("writes midnight as 00:00 for a window that ends with the day", () => {
    const start = Date.parse("2026-11-24T21:00:00Z"); // 22:00 in Berlin
    expect(formatRange(start, start + 2 * 3_600_000)).toBe("22:00–00:00");
  });
});
