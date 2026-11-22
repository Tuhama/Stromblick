import type { StatusResponse } from "@stromblick/shared";
import type { Db } from "../db";
import { loadLatest } from "../series/load-latest";
import { SMARD_SERIES } from "../smard/catalog";

export type LoadStatus = () => Promise<StatusResponse>;

/** When the data was last updated (ingest_runs) and how new each series is (readings). */
export async function loadStatus(db: Db): Promise<StatusResponse> {
  // Runs never overlap (single flight), so the newest start is also the newest finish,
  // and ordering by started_at uses its index.
  const [lastSuccess, lastFinished, latest] = await Promise.all([
    db.ingestRun.findFirst({
      where: { status: "SUCCEEDED" },
      orderBy: { startedAt: "desc" },
    }),
    // A run that is still going, or that died with the process, stays RUNNING and is skipped.
    db.ingestRun.findFirst({
      where: { status: { in: ["SUCCEEDED", "FAILED"] } },
      orderBy: { startedAt: "desc" },
    }),
    // One cheap lookup per series: the primary key starts with the series, so each is an index read.
    Promise.all(
      SMARD_SERIES.map(async (item) => {
        const time = await loadLatest(db, {
          seriesId: item.filter,
          region: item.region,
          native: item.resolution,
        });
        return [item.key, time === null ? null : new Date(time).toISOString()] as const;
      }),
    ),
  ]);

  return {
    lastSuccessAt: lastSuccess?.finishedAt?.toISOString() ?? null,
    lastRun:
      lastFinished?.finishedAt && lastFinished.status !== "RUNNING"
        ? { status: lastFinished.status, finishedAt: lastFinished.finishedAt.toISOString() }
        : null,
    latestReadings: Object.fromEntries(latest),
  };
}
