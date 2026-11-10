import type { StatusResponse } from "@stromblick/shared";
import type { Db } from "../db";

export type LoadStatus = () => Promise<StatusResponse>;

/** When the data was last updated, read from the ingest_runs table. */
export async function loadStatus(db: Db): Promise<StatusResponse> {
  // Runs never overlap (single flight), so the newest start is also the newest finish,
  // and ordering by started_at uses its index.
  const [lastSuccess, lastFinished] = await Promise.all([
    db.ingestRun.findFirst({
      where: { status: "SUCCEEDED" },
      orderBy: { startedAt: "desc" },
    }),
    // A run that is still going, or that died with the process, stays RUNNING and is skipped.
    db.ingestRun.findFirst({
      where: { status: { in: ["SUCCEEDED", "FAILED"] } },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return {
    lastSuccessAt: lastSuccess?.finishedAt?.toISOString() ?? null,
    lastRun:
      lastFinished?.finishedAt && lastFinished.status !== "RUNNING"
        ? { status: lastFinished.status, finishedAt: lastFinished.finishedAt.toISOString() }
        : null,
  };
}
