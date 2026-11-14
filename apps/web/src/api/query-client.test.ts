import { describe, expect, it } from "vitest";
import { StatusResponse } from "@stromblick/shared";
import { ApiError } from "./client";
import { shouldRetry } from "./query-client";

describe("shouldRetry", () => {
  it("retries a network failure and a server error", () => {
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(1, new ApiError(503))).toBe(true);
  });

  it("gives up after two retries", () => {
    expect(shouldRetry(2, new ApiError(503))).toBe(false);
  });

  it("doesn't retry a client error", () => {
    expect(shouldRetry(0, new ApiError(404))).toBe(false);
  });

  it("doesn't retry a body that breaks the contract", () => {
    const result = StatusResponse.safeParse({ lastSuccessAt: "yesterday", lastRun: null });
    if (result.success) throw new Error("The body should not parse");

    expect(shouldRetry(0, result.error)).toBe(false);
  });
});
