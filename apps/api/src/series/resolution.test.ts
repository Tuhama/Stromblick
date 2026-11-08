import { describe, expect, it } from "vitest";
import { aggregateFor, chooseResolution, dayCount, MAX_RANGE_DAYS } from "./resolution";

describe("dayCount", () => {
  it("counts both days", () => {
    expect(dayCount("2026-11-06", "2026-11-06")).toBe(1);
    expect(dayCount("2026-10-01", "2026-10-31")).toBe(31);
  });

  it("isn't thrown off by the clock change", () => {
    expect(dayCount("2026-10-24", "2026-10-26")).toBe(3);
  });
});

describe("chooseResolution", () => {
  it.each([
    [1, "quarterhour"],
    [7, "quarterhour"],
    [14, "hour"],
    [31, "hour"],
    [92, "day"],
    [MAX_RANGE_DAYS, "day"],
  ] as const)(
    "picks the finest resolution that fits %i days of quarter-hour data",
    (days, expected) => {
      expect(chooseResolution("quarterhour", days)).toEqual({ resolution: expected });
    },
  );

  it("never picks a resolution finer than the stored data", () => {
    expect(chooseResolution("hour", 1)).toEqual({ resolution: "hour" });
  });

  it("uses a requested resolution", () => {
    expect(chooseResolution("quarterhour", 31, "quarterhour")).toEqual({
      resolution: "quarterhour",
    });
  });

  it("rejects a resolution finer than the stored data", () => {
    expect(chooseResolution("hour", 1, "quarterhour")).toEqual({
      error: "This series has no data finer than hour",
    });
  });

  it("rejects too many points", () => {
    expect(chooseResolution("quarterhour", 60, "quarterhour")).toHaveProperty("error");
  });

  it("rejects ranges longer than the maximum", () => {
    expect(chooseResolution("hour", MAX_RANGE_DAYS + 1)).toHaveProperty("error");
  });
});

describe("aggregateFor", () => {
  it("sums energy and averages prices", () => {
    expect(aggregateFor("generation")).toBe("sum");
    expect(aggregateFor("load")).toBe("sum");
    expect(aggregateFor("price")).toBe("avg");
  });
});
