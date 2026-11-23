import { Router } from "express";
import { TomorrowResponse } from "@stromblick/shared";
import { sendJson } from "../respond";
import type { LoadReadings } from "../series/load-readings";
import { buildTomorrow } from "../tomorrow/build-tomorrow";

/** A finished day never changes. */
const COMPLETE_CACHE = "public, max-age=300";
/** Before the prices are out, or with a hole in them, the next ingest may change the answer. */
const WAITING_CACHE = "public, max-age=60";

export function tomorrowRouter(loadReadings: LoadReadings, now: () => Date) {
  const router = Router();

  router.get("/tomorrow", async (_req, res) => {
    const body = await buildTomorrow(loadReadings, now());
    const final = body.status === "published" && body.complete;
    res.set("Cache-Control", final ? COMPLETE_CACHE : WAITING_CACHE);
    sendJson(res, TomorrowResponse, body);
  });

  return router;
}
