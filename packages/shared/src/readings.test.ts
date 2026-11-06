import { describe, expect, it } from "vitest";
import { ReadingsQuery, ReadingsResponse } from "./readings";

const HOUR = 3_600_000;
const start = Date.UTC(2026, 10, 5, 23); // 6 Nov 2026, 00:00 in Berlin

const response = {
  series: "price-day-ahead",
  region: "DE-LU",
  resolution: "hour",
  unit: "EUR/MWh",
  points: [
    [start, 92.4],
    [start + HOUR, -3.1],
  ],
};

describe("ReadingsQuery", () => {
  it("accepts a range without a resolution", () => {
    expect(ReadingsQuery.parse({ from: "2026-11-01", to: "2026-11-06" })).toEqual({
      from: "2026-11-01",
      to: "2026-11-06",
    });
  });

  it("accepts a single day", () => {
    expect(ReadingsQuery.safeParse({ from: "2026-11-06", to: "2026-11-06" }).success).toBe(true);
  });

  it("rejects from after to", () => {
    const result = ReadingsQuery.safeParse({ from: "2026-11-07", to: "2026-11-06" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["to"]);
  });

  it.each(["2026-13-01", "06.11.2026", "2026-11-06T00:00:00Z"])("rejects the day %s", (day) => {
    expect(ReadingsQuery.safeParse({ from: day, to: "2026-11-06" }).success).toBe(false);
  });

  it("rejects an unknown resolution", () => {
    const query = { from: "2026-11-01", to: "2026-11-06", resolution: "minute" };
    expect(ReadingsQuery.safeParse(query).success).toBe(false);
  });
});

describe("ReadingsResponse", () => {
  it("accepts negative prices", () => {
    expect(ReadingsResponse.parse(response).points[1]).toEqual([start + HOUR, -3.1]);
  });

  it("accepts an empty range", () => {
    expect(ReadingsResponse.safeParse({ ...response, points: [] }).success).toBe(true);
  });

  it("rejects points out of order", () => {
    const points = [...response.points].reverse();
    expect(ReadingsResponse.safeParse({ ...response, points }).success).toBe(false);
  });

  it("rejects duplicate timestamps", () => {
    const points = [
      [start, 1],
      [start, 2],
    ];
    expect(ReadingsResponse.safeParse({ ...response, points }).success).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects the value %s", (value) => {
    const points = [[start, value]];
    expect(ReadingsResponse.safeParse({ ...response, points }).success).toBe(false);
  });

  it("rejects timestamps as strings", () => {
    const points = [["2026-11-06T00:00:00Z", 1]];
    expect(ReadingsResponse.safeParse({ ...response, points }).success).toBe(false);
  });
});
