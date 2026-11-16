import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { readingsQuery } from "../../api/queries";
import type { ChartStatus } from "../../charts/ChartPanel";
import { todayInBerlin } from "../../time/berlin";
import { GENERATION_KEYS, keepCommonTimes, type GenerationSeries } from "./generation";

/** What the generation sections need to know about today's loading. */
export interface TodaysGeneration {
  status: ChartStatus;
  /** The series, cut to the hours every source has reported. */
  series: GenerationSeries[];
  /** Asks again for the series that failed. */
  retry: () => void;
}

/**
 * Today's generation, one request per series. The chart and the renewable share both call this:
 * TanStack Query answers the second call from the first, so the API is asked once.
 */
export function useTodaysGeneration(): TodaysGeneration {
  const today = todayInBerlin();
  const { isPending, isError, loaded, retry } = useQueries({
    queries: GENERATION_KEYS.map((key) => readingsQuery(key, { from: today, to: today })),
    combine: (results) => ({
      isPending: results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
      loaded: results.map((result, index): GenerationSeries => ({
        key: GENERATION_KEYS[index] ?? "",
        points: result.data?.points ?? [],
      })),
      retry: () => {
        for (const result of results) if (result.isError) void result.refetch();
      },
    }),
  });

  const series = useMemo(() => keepCommonTimes(loaded), [loaded]);

  let status: ChartStatus = "ready";
  if (isPending) status = "loading";
  else if (isError) status = "error";
  else if (series.every((entry) => entry.points.length === 0)) status = "empty";
  return { status, series, retry };
}
