import { z } from "zod";
import { ReadingsQuery, type ReadingsResponse } from "@stromblick/shared";
import { HttpError } from "../errors";
import { SMARD_SERIES } from "../smard/catalog";
import type { LoadReadings } from "./load-readings";
import { aggregateFor, chooseResolution, dayCount } from "./resolution";

/**
 * One series over a range, already downsampled. The REST route and the assistant's tools both use
 * this, so they validate and downsample the same way. Throws HttpError (404 unknown series,
 * 400 bad range) with a message that is safe to show.
 */
export async function queryReadings(
  loadReadings: LoadReadings,
  seriesKey: string,
  rawQuery: unknown,
): Promise<ReadingsResponse> {
  const series = SMARD_SERIES.find((item) => item.key === seriesKey);
  if (!series) throw new HttpError(404, "Unknown series");

  const query = ReadingsQuery.safeParse(rawQuery);
  if (!query.success) throw new HttpError(400, z.prettifyError(query.error));
  const { from, to, resolution: requested } = query.data;

  const choice = chooseResolution(series.resolution, dayCount(from, to), requested);
  if ("error" in choice) throw new HttpError(400, choice.error);

  const points = await loadReadings({
    seriesId: series.filter,
    region: series.region,
    native: series.resolution,
    resolution: choice.resolution,
    aggregate: aggregateFor(series.kind),
    from,
    to,
  });

  return {
    series: series.key,
    region: series.region,
    resolution: choice.resolution,
    unit: series.unit,
    points,
  };
}
