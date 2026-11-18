import { Router } from "express";
import { ReadingsResponse, SeriesListResponse } from "@stromblick/shared";
import { sendJson } from "../respond";
import type { LoadReadings } from "../series/load-readings";
import { queryReadings } from "../series/query-readings";
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
    const body = await queryReadings(loadReadings, req.params.key, req.query);
    res.set("Cache-Control", READINGS_CACHE);
    sendJson(res, ReadingsResponse, body);
  });

  return router;
}
