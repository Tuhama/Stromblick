import { z } from "zod";
import { SeriesKey } from "./series";

/** A moment in UTC as an ISO 8601 string, e.g. "2026-11-10T20:00:04.512Z". */
const Timestamp = z.iso.datetime();

/** GET /status: how fresh the data is. The web app decides what counts as stale. */
export const StatusResponse = z.object({
  /** When an ingest last finished successfully: the dashboard's "data as of". Null before the first one. */
  lastSuccessAt: Timestamp.nullable(),
  /** The latest finished run, successful or not. A run that is still going doesn't count. */
  lastRun: z
    .object({
      status: z.enum(["SUCCEEDED", "FAILED"]),
      finishedAt: Timestamp,
    })
    .nullable(),
  /**
   * The start of the newest reading of each series, by series key; null for a series with no
   * readings. The data can be late or have holes, so "when did the ingest run" is not "how new is
   * the data". An answer without it (an older API) counts as no information.
   */
  latestReadings: z.record(SeriesKey, Timestamp.nullable()).default({}),
});
export type StatusResponse = z.infer<typeof StatusResponse>;
