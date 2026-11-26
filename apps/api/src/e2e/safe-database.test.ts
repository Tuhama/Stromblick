import { describe, expect, it } from "vitest";
import { assertThrowawayDatabase } from "./safe-database";

describe("assertThrowawayDatabase", () => {
  it.each([
    "postgresql://stromblick:stromblick@localhost:5432/stromblick_e2e",
    "postgresql://stromblick:stromblick@127.0.0.1:5432/stromblick_test",
  ])("accepts %s", (url) => {
    expect(() => {
      assertThrowawayDatabase(url);
    }).not.toThrow();
  });

  it.each([
    "postgresql://user:pw@ep-cool-name.eu-central-1.aws.neon.tech/stromblick_test",
    "postgresql://stromblick:stromblick@localhost:5432/stromblick",
    "postgresql://stromblick:stromblick@localhost:5432/e2e_backup",
  ])("refuses %s", (url) => {
    expect(() => {
      assertThrowawayDatabase(url);
    }).toThrow(/empties its database/);
  });
});
