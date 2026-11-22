import type { Region, Resolution } from "@stromblick/shared";
import type { Db } from "../db";
import { DB_RESOLUTION } from "./load-readings";

export interface LatestRequest {
  /** SMARD filter ID, which is also the series' primary key. */
  seriesId: number;
  region: Region;
  /** The resolution the readings are stored in. */
  native: Resolution;
}

/** The start of the newest stored reading of a series (milliseconds since the epoch), or null. */
export type LoadLatest = (request: LatestRequest) => Promise<number | null>;

export async function loadLatest(
  db: Db,
  { seriesId, region, native }: LatestRequest,
): Promise<number | null> {
  const [row] = await db.$queryRaw<{ t: number | null }[]>`
    SELECT extract(epoch FROM max(ts))::float8 * 1000 AS t
    FROM readings
    WHERE series_id = ${seriesId}
      AND region = ${region}
      AND resolution = ${DB_RESOLUTION[native]}::resolution`;
  const t = row?.t;
  return t === null || t === undefined ? null : Math.round(t);
}
