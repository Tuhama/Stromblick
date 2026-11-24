import { describe, expect, it } from "vitest";
import { chooseHours, parseHours } from "./window-length";

describe("parseHours", () => {
  it("reads a length from 1 to 4", () => {
    expect(parseHours("1")).toBe(1);
    expect(parseHours("4")).toBe(4);
  });

  it("falls back to 2 hours for a missing or invalid value", () => {
    for (const value of [null, "", "0", "5", "-1", "2.5", "abc"]) {
      expect(parseHours(value)).toBe(2);
    }
  });
});

describe("chooseHours", () => {
  it("keeps the asked-for length when a window of that length exists", () => {
    expect(chooseHours(3, [1, 2, 3, 4])).toBe(3);
  });

  it("takes the shortest length that exists when the asked-for one is missing", () => {
    expect(chooseHours(4, [2, 3])).toBe(2);
  });

  it("has no length when there is no window at all", () => {
    expect(chooseHours(2, [])).toBeNull();
  });
});
