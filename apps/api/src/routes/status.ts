import { Router } from "express";
import { StatusResponse } from "@stromblick/shared";
import { sendJson } from "../respond";
import type { LoadStatus } from "../status/load-status";

/** An ingest runs at most once an hour, so the answer may be a minute old. */
const STATUS_CACHE = "public, max-age=60";

export function statusRouter(loadStatus: LoadStatus) {
  const router = Router();

  router.get("/status", async (_req, res) => {
    const status = await loadStatus();
    res.set("Cache-Control", STATUS_CACHE);
    sendJson(res, StatusResponse, status);
  });

  return router;
}
