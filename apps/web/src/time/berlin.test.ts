import { describe, expect, it } from "vitest";
import { berlinZoneName, formatClock, formatDateTime, todayInBerlin } from "./berlin";

describe("todayInBerlin", () => {
  it("is already the next day in Berlin late in the UTC evening", () => {
    expect(todayInBerlin(new Date("2026-11-14T23:30:00Z"))).toBe("2026-11-15");
  });

  it("follows summer time", () => {
    expect(todayInBerlin(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01");
    expect(todayInBerlin(new Date("2026-07-01T22:00:00Z"))).toBe("2026-07-02");
  });
});

describe("formatClock", () => {
  it("shows Berlin time on the 24-hour clock", () => {
    expect(formatClock(Date.parse("2026-11-14T17:15:00Z"))).toBe("18:15");
    expect(formatClock(Date.parse("2026-11-13T23:00:00Z"))).toBe("00:00");
  });
});

describe("formatDateTime", () => {
  it("writes the date in the reader's language and the Berlin time on the 24-hour clock", () => {
    const moment = new Date("2026-11-10T19:00:05Z");
    expect(formatDateTime(moment, "de")).toBe("10.11.2026, 20:00");
    expect(formatDateTime(moment, "en")).toBe("Nov 10, 2026, 20:00");
  });
});

describe("berlinZoneName", () => {
  it("names winter and summer time in the reader's language", () => {
    const winter = new Date("2026-11-14T10:00:00Z");
    const summer = new Date("2026-07-14T10:00:00Z");
    expect(berlinZoneName(winter, "en")).toBe("CET");
    expect(berlinZoneName(summer, "en")).toBe("CEST");
    expect(berlinZoneName(winter, "de")).toBe("MEZ");
    expect(berlinZoneName(summer, "de")).toBe("MESZ");
  });
});
