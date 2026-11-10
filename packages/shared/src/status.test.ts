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
});
