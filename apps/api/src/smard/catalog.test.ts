import { describe, expect, it } from "vitest";
import { Series } from "@stromblick/shared";
import { SMARD_SERIES } from "./catalog";

describe("SMARD_SERIES", () => {
  it("matches the shared Series contract", () => {
    for (const series of SMARD_SERIES) expect(() => Series.parse(series)).not.toThrow();
  });

  it("has unique keys and filter IDs", () => {
    const keys = new Set(SMARD_SERIES.map((series) => series.key));
    const filters = new Set(SMARD_SERIES.map((series) => series.filter));
    expect(keys.size).toBe(SMARD_SERIES.length);
    expect(filters.size).toBe(SMARD_SERIES.length);
  });

  it("fetches the day-ahead price at 15-minute resolution for DE-LU", () => {
    expect(SMARD_SERIES.find((series) => series.key === "price-day-ahead")).toMatchObject({
      filter: 4169,
      region: "DE-LU",
      resolution: "quarterhour",
    });
  });
});
