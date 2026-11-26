import { describe, expect, it } from "vitest";
import { HOUR } from "@stromblick/shared";
import { SMARD_SERIES } from "../smard/catalog";
import { slotsInDay } from "../tomorrow/berlin-day";
import { buildSeedReadings, E2E_NOW, HOLE_DAY, TOMORROW } from "./seed";

const readings = buildSeedReadings();
const price = SMARD_SERIES.find((item) => item.kind === "price");

/** Readings of one series that fall on one Berlin day (all seed days are UTC+1). */
function onDay(seriesId: number, day: string) {
  const start = Date.parse(`${day}T00:00:00Z`) - HOUR;
  return readings.filter(
    (reading) =>
      reading.seriesId === seriesId &&
      reading.ts.getTime() >= start &&
      reading.ts.getTime() < start + 24 * HOUR,
  );
}

describe("the end-to-end seed", () => {
  it("is the same list every time", () => {
    expect(buildSeedReadings()).toEqual(readings);
  });

  it("has no two readings for the same series, resolution and time", () => {
    const keys = readings.map(
      (reading) =>
        `${String(reading.seriesId)}/${reading.resolution}/${String(reading.ts.getTime())}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has every day of tomorrow's prices, so the Tomorrow page shows a published day", () => {
    if (!price) throw new Error("no price series");
    expect(onDay(price.filter, TOMORROW)).toHaveLength(slotsInDay(TOMORROW));
  });

  it("has a hole of four hours in the prices and the generation of one day", () => {
    if (!price) throw new Error("no price series");
    expect(onDay(price.filter, HOLE_DAY)).toHaveLength(slotsInDay(HOLE_DAY) - 16);
    const solar = SMARD_SERIES.find((item) => item.key === "generation-solar");
    expect(onDay(solar?.filter ?? 0, HOLE_DAY)).toHaveLength(24 - 4);
  });

  it("has generation up to the last complete hour at 'now', and not beyond it", () => {
    const solar = SMARD_SERIES.find((item) => item.key === "generation-solar");
    const times = readings
      .filter((reading) => reading.seriesId === solar?.filter)
      .map((reading) => reading.ts.getTime());
    expect(new Date(Math.max(...times)).toISOString()).toBe("2026-03-18T09:00:00.000Z");
    expect(Math.max(...times) + HOUR).toBeLessThanOrEqual(E2E_NOW.getTime());
  });

  it("makes midday cheaper than the evening, so the cheapest window is not the dearest", () => {
    if (!price) throw new Error("no price series");
    const day = onDay(price.filter, TOMORROW);
    const at = (hourUtc: number) =>
      day.find(
        (reading) => reading.ts.getUTCHours() === hourUtc && reading.ts.getUTCMinutes() === 0,
      )?.value ?? NaN;
    expect(at(11)).toBeLessThan(at(18));
  });
});
