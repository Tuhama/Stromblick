import { describe, expect, it } from "vitest";
import { readDsn } from "./config";

describe("readDsn", () => {
  it("returns an https address as it is", () => {
    expect(readDsn("https://key@o1.ingest.de.sentry.io/2")).toBe(
      "https://key@o1.ingest.de.sentry.io/2",
    );
  });

  it.each([
    undefined,
    "",
    "not a url",
    "http://key@sentry.example/2",
    "javascript:alert(1)",
    "https://sentry.example/2",
  ])("switches reporting off for %j", (value) => {
    expect(readDsn(value)).toBeUndefined();
  });
});
