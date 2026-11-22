import { describe, expect, it } from "vitest";
import { formatMoment, newestData } from "./newest-data";

describe("newestData", () => {
  it("takes the newest price as it is", () => {
    expect(newestData({ "price-day-ahead": "2026-11-22T22:45:00.000Z" }).prices).toBe(
      Date.parse("2026-11-22T22:45:00.000Z"),
    );
  });

  it("takes generation from the series that is furthest behind", () => {
    const result = newestData({
      "generation-solar": "2026-11-21T14:00:00.000Z",
      "generation-wind-onshore": "2026-11-21T12:00:00.000Z",
      "generation-hydro": "2026-11-21T15:00:00.000Z",
    });
    expect(result.generation).toBe(Date.parse("2026-11-21T12:00:00.000Z"));
  });

  it("has no generation time when one generation series has no readings", () => {
    expect(
      newestData({
        "generation-solar": "2026-11-21T14:00:00.000Z",
        "generation-hydro": null,
      }).generation,
    ).toBeNull();
  });

  it("ignores series that are neither price nor generation", () => {
    expect(newestData({ load: "2026-11-21T14:00:00.000Z" })).toEqual({
      prices: null,
      generation: null,
    });
  });

  it("knows nothing from an empty answer, such as an older API sends", () => {
    expect(newestData({})).toEqual({ prices: null, generation: null });
  });

  it("treats a price series without readings as unknown", () => {
    expect(newestData({ "price-day-ahead": null }).prices).toBeNull();
  });
});

describe("formatMoment", () => {
  it("writes the moment in German time with the zone's name", () => {
    expect(formatMoment(Date.parse("2026-11-22T22:45:00Z"), "en")).toBe("Nov 22, 2026, 23:45 CET");
    expect(formatMoment(Date.parse("2026-07-01T10:00:00Z"), "de")).toBe("01.07.2026, 12:00 MESZ");
  });
});
