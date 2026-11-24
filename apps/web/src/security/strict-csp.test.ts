import { PriceWindow } from "@stromblick/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { configureForStrictCsp } from "./strict-csp";

describe("configureForStrictCsp", () => {
  afterEach(() => {
    z.config({ jitless: false });
    vi.restoreAllMocks();
  });

  it("turns Zod's string-to-function compiler off", () => {
    configureForStrictCsp();
    expect(z.config().jitless).toBe(true);
  });

  it("still parses and rejects with the shared schemas", () => {
    configureForStrictCsp();
    expect(PriceWindow.parse({ start: 1, end: 2, average: 3 })).toEqual({
      start: 1,
      end: 2,
      average: 3,
    });
    expect(PriceWindow.safeParse({ start: 1, end: 2 }).success).toBe(false);
  });
});
