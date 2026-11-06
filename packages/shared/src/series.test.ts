import { describe, expect, it } from "vitest";
import { Series, SeriesKey } from "./series";

const windOnshore = {
  key: "generation-wind-onshore",
  kind: "generation",
  unit: "MWh",
  name: { en: "Wind onshore", de: "Wind an Land" },
};

describe("SeriesKey", () => {
  it.each(["price-day-ahead", "load", "generation-wind-onshore"])("accepts %s", (key) => {
    expect(SeriesKey.safeParse(key).success).toBe(true);
  });

  it.each(["Price", "price_day_ahead", "-price", "price-", "price--day", ""])(
    "rejects %j",
    (key) => {
      expect(SeriesKey.safeParse(key).success).toBe(false);
    },
  );
});

describe("Series", () => {
  it("accepts a valid series", () => {
    expect(Series.parse(windOnshore)).toEqual(windOnshore);
  });

  it("requires a name in both languages", () => {
    expect(Series.safeParse({ ...windOnshore, name: { en: "Wind onshore" } }).success).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(Series.safeParse({ ...windOnshore, kind: "forecast" }).success).toBe(false);
  });
});
