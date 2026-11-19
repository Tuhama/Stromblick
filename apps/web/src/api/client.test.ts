import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthResponse } from "@stromblick/shared";
import { ApiError, getJson, parseRetryAfter } from "./client";

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(body: unknown, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": contentType } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getJson", () => {
  it("returns the parsed body", async () => {
    const fetchMock = mockFetch(json({ status: "ok", service: "api", database: "ok" }));

    await expect(getJson("/health", HealthResponse)).resolves.toEqual({
      status: "ok",
      service: "api",
      database: "ok",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.anything());
  });

  it("rejects a 200 body that breaks the contract", async () => {
    mockFetch(json({ status: "ok", service: "api" }));

    await expect(getJson("/health", HealthResponse)).rejects.toThrow(/database/);
  });

  it("throws an ApiError with the problem details", async () => {
    const problem = {
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      detail: "Database unreachable",
      requestId: "abc-123",
    };
    mockFetch(json(problem, 503, "application/problem+json"));

    const error = await getJson("/health", HealthResponse).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, message: "Database unreachable", problem });
  });

  it("throws an ApiError when the error body is not JSON", async () => {
    mockFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    const error = await getJson("/health", HealthResponse).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, problem: undefined });
  });

  it("passes the abort signal to fetch", async () => {
    const fetchMock = mockFetch(json({ status: "ok", service: "api", database: "ok" }));
    const controller = new AbortController();

    await getJson("/health", HealthResponse, { signal: controller.signal });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
describe("Retry-After", () => {
  async function errorFor(retryAfter: string | null) {
    const headers: Record<string, string> = { "Content-Type": "application/problem+json" };
    if (retryAfter !== null) headers["Retry-After"] = retryAfter;
    mockFetch(new Response("{}", { status: 429, headers }));
    return getJson("/health", HealthResponse).catch((e: unknown) => e);
  }

  it("is read from a 429 response", async () => {
    expect(await errorFor("42")).toMatchObject({ status: 429, retryAfterSeconds: 42 });
  });

  it("is absent when the header is missing", async () => {
    expect(await errorFor(null)).toMatchObject({ status: 429, retryAfterSeconds: undefined });
  });

  it.each(["soon", "-5", "0", "1.5", "Wed, 21 Oct 2026 07:28:00 GMT", ""])(
    "is absent when the header is %j",
    async (value) => {
      expect(await errorFor(value)).toMatchObject({ retryAfterSeconds: undefined });
    },
  );
});

describe("parseRetryAfter", () => {
  it("accepts whole seconds, with spaces around", () => {
    expect(parseRetryAfter(" 7 ")).toBe(7);
  });

  it("returns undefined for no header", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});
