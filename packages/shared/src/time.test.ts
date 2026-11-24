import { describe, expect, it } from "vitest";
import { berlinDay, DAY, HOUR, MINUTE, nextDay } from "./time";

describe("units", () => {
  it("are milliseconds", () => {
    expect(MINUTE).toBe(60_000);
    expect(HOUR).toBe(3_600_000);
    expect(DAY).toBe(86_400_000);
  });
});

describe("berlinDay", () => {
  it("names the day by Berlin time, not UTC", () => {
    expect(berlinDay(Date.parse("2026-11-23T22:59:00Z"))).toBe("2026-11-23");
    expect(berlinDay(Date.parse("2026-11-23T23:00:00Z"))).toBe("2026-11-24");
    // Summer time: midnight in Berlin is 22:00 UTC.
    expect(berlinDay(Date.parse("2026-07-01T22:00:00Z"))).toBe("2026-07-02");
  });

  it("takes a Date as well as a number", () => {
    expect(berlinDay(new Date("2026-11-23T23:00:00Z"))).toBe("2026-11-24");
  });
});

describe("nextDay", () => {
  it("moves to the next calendar day, over month and year ends", () => {
    expect(nextDay("2026-11-23")).toBe("2026-11-24");
    expect(nextDay("2026-02-28")).toBe("2026-03-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });

  it("is not thrown off by the days the clocks change", () => {
    expect(nextDay("2026-03-28")).toBe("2026-03-29");
    expect(nextDay("2026-03-29")).toBe("2026-03-30");
    expect(nextDay("2026-10-24")).toBe("2026-10-25");
    expect(nextDay("2026-10-25")).toBe("2026-10-26");
  });
});
