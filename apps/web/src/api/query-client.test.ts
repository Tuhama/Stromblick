import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusResponse } from "@stromblick/shared";
import { ApiError } from "./client";
import { shouldRetry, reportQueryError } from "./query-client";
import * as reporting from "../observability/report-error";

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

  it("doesn't retry a 429: asking again at once only makes the wait longer", () => {
    expect(shouldRetry(0, new ApiError(429, undefined, 30))).toBe(false);
  });

  it("doesn't retry a body that breaks the contract", () => {
    const result = StatusResponse.safeParse({ lastSuccessAt: "yesterday", lastRun: null });
    if (result.success) throw new Error("The body should not parse");

    expect(shouldRetry(0, result.error)).toBe(false);
  });
});

describe("reportQueryError", () => {
  const report = vi.spyOn(reporting, "reportError").mockImplementation(() => undefined);
  afterEach(() => {
    report.mockClear();
  });

  const problem = {
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    instance: "/series",
    requestId: "req-42",
  };

  it("reports a server error with the request ID of the failed response", () => {
    const error = new ApiError(500, problem);
    reportQueryError(error);
    expect(report).toHaveBeenCalledExactlyOnceWith(error, { requestId: "req-42" });
  });

  it("reports a server error that came without problem details", () => {
    const error = new ApiError(502);
    reportQueryError(error);
    expect(report).toHaveBeenCalledExactlyOnceWith(error, {});
  });

  it("reports an answer that breaks the contract", () => {
    const result = StatusResponse.safeParse({ lastSuccessAt: "yesterday", lastRun: null });
    if (result.success) throw new Error("The body should not parse");
    reportQueryError(result.error);
    expect(report).toHaveBeenCalledExactlyOnceWith(result.error);
  });

  it("does not report what is the caller's doing: a 4xx, a rate limit, a network failure", () => {
    reportQueryError(new ApiError(404));
    reportQueryError(new ApiError(429, undefined, 30));
    reportQueryError(new TypeError("Failed to fetch"));
    expect(report).not.toHaveBeenCalled();
  });
});
