import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  ReadingsResponse,
  SeriesListResponse,
  StatusResponse,
  type ReadingsQuery,
  type SeriesKey,
} from "@stromblick/shared";
import { MINUTE } from "../time/units";
import { getJson } from "./client";

// staleTime follows the API's Cache-Control: no refetch while the browser would answer from its cache anyway.

/** GET /series: the catalog only changes with a deploy. */
export function seriesListQuery() {
  return queryOptions({
    queryKey: ["series"],
    queryFn: ({ signal }) => getJson("/series", SeriesListResponse, { signal }),
    staleTime: 60 * MINUTE,
  });
}

/** GET /series/:key/readings: one series over a range of Berlin calendar days. */
export function readingsQuery(key: SeriesKey, query: ReadingsQuery) {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.resolution) params.set("resolution", query.resolution);

  return queryOptions({
    // Every part that changes the answer is in the key, so each range is cached on its own.
    queryKey: ["series", key, "readings", query.from, query.to, query.resolution ?? "auto"],
    queryFn: ({ signal }) =>
      getJson(`/series/${key}/readings?${params.toString()}`, ReadingsResponse, { signal }),
    staleTime: 5 * MINUTE,
  });
}

/** GET /status: when the data was last updated. Asked again every minute while a page shows it. */
export function statusQuery() {
  return queryOptions({
    queryKey: ["status"],
    queryFn: ({ signal }) => getJson("/status", StatusResponse, { signal }),
    staleTime: MINUTE,
    refetchInterval: MINUTE,
  });
}

// Each hook returns TanStack Query's result: `data`, plus `isPending`, `isError` and `error`
// for the loading and error states.

export function useSeriesList() {
  return useQuery(seriesListQuery());
}

export function useReadings(key: SeriesKey, query: ReadingsQuery) {
  return useQuery(readingsQuery(key, query));
}

export function useStatus() {
  return useQuery(statusQuery());
}
