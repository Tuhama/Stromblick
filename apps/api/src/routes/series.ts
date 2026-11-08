import { Router } from "express";
import { z } from "zod";
import { ReadingsQuery, ReadingsResponse, SeriesListResponse } from "@stromblick/shared";
import { HttpError } from "../errors";
import { sendJson } from "../respond";
import type { LoadReadings } from "../series/load-readings";
import { aggregateFor, chooseResolution, dayCount } from "../series/resolution";
import { SMARD_SERIES } from "../smard/catalog";

/** The catalog only changes with a deploy. */
const LIST_CACHE = "public, max-age=3600";
/** New data arrives at most once an hour, so a few minutes of staleness is fine. */
const READINGS_CACHE = "public, max-age=300";

export function seriesRouter(loadReadings: LoadReadings) {
  const router = Router();

  router.get("/series", (_req, res) => {
    res.set("Cache-Control", LIST_CACHE);
    // The schema strips SMARD's internals (filter ID, region, stored resolution).
    sendJson(res, SeriesListResponse, { series: [...SMARD_SERIES] });
  });

  router.get("/series/:key/readings", async (req, res) => {
    const series = SMARD_SERIES.find((item) => item.key === req.params.key);
    if (!series) throw new HttpError(404, "Unknown series");

    const query = ReadingsQuery.safeParse(req.query);
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

    res.set("Cache-Control", READINGS_CACHE);
    sendJson(res, ReadingsResponse, {
      series: series.key,
      region: series.region,
      resolution: choice.resolution,
      unit: series.unit,
      points,
    });
  });

  return router;
}
