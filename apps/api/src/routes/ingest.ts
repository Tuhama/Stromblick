import { Router } from "express";
import { IngestResponse } from "@stromblick/shared";
import { HttpError } from "../errors";
import { requireBearer } from "../ingest/auth";
import type { IngestResult } from "../ingest/run";
import { sendJson } from "../respond";

export interface IngestRouteOptions {
  secret: string;
  run: () => Promise<IngestResult>;
}

export function ingestRouter({ secret, run }: IngestRouteOptions) {
  const router = Router();

  router.post("/ingest", requireBearer(secret), async (req, res) => {
    const result = await run();
    if (result.status === "FAILED") {
      req.log.error({ failures: result.failures, runId: result.runId }, "Ingest run failed");
      const keys = result.failures.map((failure) => failure.series).join(", ");
      // 502: the API works, but its upstream (SMARD) or a write failed. The caller's job fails visibly.
      throw new HttpError(502, `Ingest run ${String(result.runId)} failed for: ${keys}`);
    }
    sendJson(res, IngestResponse, {
      runId: result.runId,
      status: result.status,
      rowsWritten: result.rowsWritten,
    });
  });

  return router;
}
