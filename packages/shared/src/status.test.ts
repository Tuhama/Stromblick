import { describe, expect, it } from "vitest";
import { StatusResponse } from "./index";

describe("StatusResponse", () => {
  it("accepts a status before the first ingest", () => {
    expect(StatusResponse.parse({ lastSuccessAt: null, lastRun: null })).toBeTruthy();
  });

  it("accepts a failed run after an earlier success", () => {
    expect(
      StatusResponse.parse({
        lastSuccessAt: "2026-11-10T19:00:04.512Z",
        lastRun: { status: "FAILED", finishedAt: "2026-11-10T20:00:03.100Z" },
      }),
    ).toBeTruthy();
  });

  it("rejects a run that is still going", () => {
    expect(() =>
      StatusResponse.parse({
        lastSuccessAt: null,
        lastRun: { status: "RUNNING", finishedAt: "2026-11-10T20:00:03.100Z" },
      }),
    ).toThrow();
  });

  it("rejects a timestamp that isn't ISO 8601 in UTC", () => {
    expect(() =>
      StatusResponse.parse({ lastSuccessAt: "10.11.2026 20:00", lastRun: null }),
    ).toThrow();
  });
  it("accepts the newest reading of each series, and null for one without readings", () => {
    const status = StatusResponse.parse({
      lastSuccessAt: null,
      lastRun: null,
      latestReadings: { "price-day-ahead": "2026-11-22T22:45:00.000Z", load: null },
    });
    expect(status.latestReadings).toEqual({
      "price-day-ahead": "2026-11-22T22:45:00.000Z",
      load: null,
    });
  });

  it("reads an answer without latestReadings (an older API) as no information", () => {
    expect(StatusResponse.parse({ lastSuccessAt: null, lastRun: null }).latestReadings).toEqual({});
  });

  it("rejects a newest reading that isn't ISO 8601 in UTC, and a key that isn't a series key", () => {
    expect(() =>
      StatusResponse.parse({
        lastSuccessAt: null,
        lastRun: null,
        latestReadings: { load: "22.11.2026" },
      }),
    ).toThrow();
    expect(() =>
      StatusResponse.parse({
        lastSuccessAt: null,
        lastRun: null,
        latestReadings: { "Not A Key": null },
      }),
    ).toThrow();
  });
});
