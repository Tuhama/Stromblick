import { describe, expect, it } from "vitest";
import { bearerToken, secretsMatch } from "./auth";

describe("secretsMatch", () => {
  const secret = "s".repeat(64);

  it("accepts the same secret", () => {
    expect(secretsMatch(secret, secret)).toBe(true);
  });

  it("rejects a different secret of the same length", () => {
    expect(secretsMatch(`${"s".repeat(63)}x`, secret)).toBe(false);
  });

  it("rejects a prefix without throwing on the length difference", () => {
    // timingSafeEqual alone would throw for buffers of different lengths.
    expect(secretsMatch("s", secret)).toBe(false);
  });
});

describe("bearerToken", () => {
  it.each([
    ["Bearer abc123", "abc123"],
    ["bearer abc123", "abc123"],
  ])("reads %j", (header, token) => {
    expect(bearerToken(header)).toBe(token);
  });

  it.each([undefined, "", "Bearer", "Bearer ", "Basic abc123", "Bearer abc 123"])(
    "returns null for %j",
    (header) => {
      expect(bearerToken(header)).toBeNull();
    },
  );
});
