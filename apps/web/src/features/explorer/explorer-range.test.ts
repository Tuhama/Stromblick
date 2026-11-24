import { describe, expect, it } from "vitest";
import { addDays, rangeBounds, stepEnd } from "./explorer-range";

describe("addDays", () => {
  it("moves over month and year ends, in both directions", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not thrown off by the days the clocks change", () => {
    expect(addDays("2026-03-28", 3)).toBe("2026-03-31");
    expect(addDays("2026-10-30", -7)).toBe("2026-10-23");
  });
});

describe("rangeBounds", () => {
  it("covers the last day alone for a day", () => {
    expect(rangeBounds("day", "2026-11-20")).toEqual({ from: "2026-11-20", to: "2026-11-20" });
  });

  it("counts the last day in, so a week has 7 days and a month 30", () => {
    expect(rangeBounds("week", "2026-11-20")).toEqual({ from: "2026-11-14", to: "2026-11-20" });
    expect(rangeBounds("month", "2026-11-20")).toEqual({ from: "2026-10-22", to: "2026-11-20" });
  });

  it("stays within the API's 366 days for a year, also over a leap day", () => {
    expect(rangeBounds("year", "2026-11-20")).toEqual({ from: "2025-11-21", to: "2026-11-20" });
    expect(rangeBounds("year", "2028-03-01")).toEqual({ from: "2027-03-03", to: "2028-03-01" });
  });
});

describe("stepEnd", () => {
  it("moves a whole range earlier", () => {
    expect(stepEnd("week", "2026-11-20", -1, "2026-11-24")).toBe("2026-11-13");
    expect(stepEnd("day", "2026-11-20", -1, "2026-11-24")).toBe("2026-11-19");
  });

  it("moves a whole range later", () => {
    expect(stepEnd("week", "2026-11-10", 1, "2026-11-24")).toBe("2026-11-17");
  });

  it("never goes past today: there are no readings in the future", () => {
    expect(stepEnd("week", "2026-11-20", 1, "2026-11-24")).toBe("2026-11-24");
    expect(stepEnd("day", "2026-11-24", 1, "2026-11-24")).toBe("2026-11-24");
  });
});
