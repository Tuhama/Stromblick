import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ReadingsResponse, SeriesListResponse, StatusResponse } from "@stromblick/shared";
import { ApiError } from "./client";
import { useReadings, useSeriesList, useStatus } from "./queries";

/** Answers every request with this body; returns the mock to check the URL. */
function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** A fresh client per test, without retries, so an error shows at once. */
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useStatus", () => {
  it("is pending first, then has the parsed status", async () => {
    const status: StatusResponse = {
      lastSuccessAt: "2026-11-10T19:00:05.000Z",
      lastRun: { status: "SUCCEEDED", finishedAt: "2026-11-10T19:00:05.000Z" },
    };
    const fetchMock = stubFetch(status);

    const { result } = renderHook(() => useStatus(), { wrapper });
    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(status);
    expect(fetchMock).toHaveBeenCalledWith("/api/status", expect.anything());
  });

  it("exposes the API's problem details as the error", async () => {
    stubFetch({ type: "about:blank", title: "Internal Server Error", status: 500 }, 500);

    const { result } = renderHook(() => useStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ status: 500 });
    expect(result.current.data).toBeUndefined();
  });

  it("is an error when a 200 body breaks the contract", async () => {
    stubFetch({ lastSuccessAt: "yesterday", lastRun: null });

    const { result } = renderHook(() => useStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.name).toBe("ZodError");
  });
});

describe("useSeriesList", () => {
  it("has the parsed series", async () => {
    const list: SeriesListResponse = {
      series: [
        {
          key: "price-day-ahead",
          kind: "price",
          unit: "EUR/MWh",
          name: { en: "Day-ahead price", de: "Day-Ahead-Preis" },
        },
      ],
    };
    const fetchMock = stubFetch(list);

    const { result } = renderHook(() => useSeriesList(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(list);
    expect(fetchMock).toHaveBeenCalledWith("/api/series", expect.anything());
  });
});

describe("useReadings", () => {
  const readings: ReadingsResponse = {
    series: "price-day-ahead",
    region: "DE-LU",
    resolution: "hour",
    unit: "EUR/MWh",
    points: [
      [Date.parse("2026-11-09T23:00:00Z"), 98.5],
      [Date.parse("2026-11-10T00:00:00Z"), 91.2],
    ],
  };

  it("asks for the range and resolution, and has the parsed points", async () => {
    const fetchMock = stubFetch(readings);

    const { result } = renderHook(
      () =>
        useReadings("price-day-ahead", {
          from: "2026-11-10",
          to: "2026-11-10",
          resolution: "hour",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(readings);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/series/price-day-ahead/readings?from=2026-11-10&to=2026-11-10&resolution=hour",
      expect.anything(),
    );
  });

  it("leaves the resolution to the API when none is given", async () => {
    const fetchMock = stubFetch(readings);

    const { result } = renderHook(
      () => useReadings("price-day-ahead", { from: "2026-11-10", to: "2026-11-10" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/series/price-day-ahead/readings?from=2026-11-10&to=2026-11-10",
      expect.anything(),
    );
  });

  it("asks again when the range changes", async () => {
    const fetchMock = stubFetch(readings);

    const { result, rerender } = renderHook(
      ({ day }: { day: string }) => useReadings("price-day-ahead", { from: day, to: day }),
      { wrapper, initialProps: { day: "2026-11-10" } },
    );
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    rerender({ day: "2026-11-11" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/series/price-day-ahead/readings?from=2026-11-11&to=2026-11-11",
      expect.anything(),
    );
  });
});
