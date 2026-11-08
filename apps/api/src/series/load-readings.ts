import type { Point, Region, Resolution } from "@stromblick/shared";
import type { Db } from "../db";

export interface ReadingsRequest {
  /** SMARD filter ID, which is also the series' primary key. */
  seriesId: number;
  region: Region;
  /** The resolution the readings are stored in. */
  native: Resolution;
  /** The resolution to answer with: `native`, or coarser. */
  resolution: Resolution;
  aggregate: "sum" | "avg";
  /** Calendar days in Europe/Berlin, both included. */
  from: string;
  to: string;
}

export type LoadReadings = (request: ReadingsRequest) => Promise<Point[]>;

const BERLIN = "Europe/Berlin";

const DB_RESOLUTION = {
  quarterhour: "QUARTERHOUR",
  hour: "HOUR",
  day: "DAY",
} as const satisfies Record<Resolution, string>;

const SECONDS = { quarterhour: 900, hour: 3600, day: 86_400 } as const satisfies Record<
  Resolution,
  number
>;

/**
 * How readings are grouped into a coarser resolution. Hours are cut in UTC, so the hour that
 * repeats when clocks go back isn't merged into one; days are cut at midnight in Berlin.
 */
const BUCKETS = {
  hour: { unit: "hour", zone: "UTC", step: "1 hour" },
  day: { unit: "day", zone: BERLIN, step: "1 day" },
} as const;

interface Row {
  t: number;
  value: number;
}

/** Points of one series between two Berlin calendar days, aggregated to the requested resolution. */
export async function loadReadings(db: Db, request: ReadingsRequest): Promise<Point[]> {
  const rows =
    request.resolution === request.native
      ? await loadNative(db, request)
      : await loadAggregated(db, request);
  return rows.map((row): Point => [Math.round(row.t), row.value]);
}

function loadNative(db: Db, { seriesId, region, native, from, to }: ReadingsRequest) {
  return db.$queryRaw<Row[]>`
    SELECT extract(epoch FROM ts)::float8 * 1000 AS t, value
    FROM readings
    WHERE series_id = ${seriesId}
      AND region = ${region}
      AND resolution = ${DB_RESOLUTION[native]}::resolution
      AND ts >= (${from}::date)::timestamp AT TIME ZONE ${BERLIN}
      AND ts < (${to}::date + 1)::timestamp AT TIME ZONE ${BERLIN}
    ORDER BY ts`;
}

function loadAggregated(db: Db, request: ReadingsRequest) {
  const { seriesId, region, native, resolution, aggregate, from, to } = request;
  if (resolution === "quarterhour") {
    throw new Error("Nothing is stored finer than a quarter hour, so it is never aggregated");
  }
  const { unit, zone, step } = BUCKETS[resolution];

  // Only complete buckets: a day with missing hours (today, for example) would show a false dip.
  // A bucket is complete when its readings cover its length, which is 23 or 25 hours on the days
  // the clocks change.
  return db.$queryRaw<Row[]>`
    SELECT extract(epoch FROM bucket)::float8 * 1000 AS t,
           CASE WHEN ${aggregate} = 'sum' THEN sum(value) ELSE avg(value) END AS value
    FROM (
      SELECT date_trunc(${unit}, ts, ${zone}) AS bucket, value
      FROM readings
      WHERE series_id = ${seriesId}
        AND region = ${region}
        AND resolution = ${DB_RESOLUTION[native]}::resolution
        AND ts >= (${from}::date)::timestamp AT TIME ZONE ${BERLIN}
        AND ts < (${to}::date + 1)::timestamp AT TIME ZONE ${BERLIN}
    ) AS r
    GROUP BY bucket
    HAVING count(*) * ${SECONDS[native]}::float8
      = extract(epoch FROM (((bucket AT TIME ZONE ${zone}) + ${step}::interval) AT TIME ZONE ${zone}) - bucket)
    ORDER BY bucket`;
}
