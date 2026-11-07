import { describe, expect, it } from "vitest";
import { describeDatabase, monthsBefore, parseBackfillArgs } from "./backfill";

describe("parseBackfillArgs", () => {
  it("defaults to 12 months", () => {
    expect(parseBackfillArgs([])).toEqual({ months: 12 });
  });

  it("reads --months", () => {
    expect(parseBackfillArgs(["--months", "3"])).toEqual({ months: 3 });
    expect(parseBackfillArgs(["--months=24"])).toEqual({ months: 24 });
  });

  it("skips the `--` that pnpm passes through", () => {
    expect(parseBackfillArgs(["--", "--months", "3"])).toEqual({ months: 3 });
  });

  it.each(["0", "37", "1.5", "abc"])("rejects --months %s", (months) => {
    expect(() => parseBackfillArgs(["--months", months])).toThrow(/from 1 to 36/);
  });

  it("rejects unknown options", () => {
    expect(() => parseBackfillArgs(["--weeks", "4"])).toThrow();
  });
});

describe("monthsBefore", () => {
  it("goes back calendar months", () => {
    expect(monthsBefore(new Date("2026-11-07T19:00:00Z"), 12)).toEqual(
      new Date("2025-11-07T19:00:00Z"),
    );
    expect(monthsBefore(new Date("2026-03-15T00:00:00Z"), 3)).toEqual(
      new Date("2025-12-15T00:00:00Z"),
    );
  });
});

describe("describeDatabase", () => {
  it("keeps host and database but drops the credentials", () => {
    const described = describeDatabase(
      "postgresql://stromblick:s3cret@ep-cool-name.eu-central-1.aws.neon.tech:5432/stromblick?sslmode=require",
    );
    expect(described).toBe("ep-cool-name.eu-central-1.aws.neon.tech:5432/stromblick");
    expect(described).not.toContain("s3cret");
  });
});
