import type { Logger } from "pino";
import type { SeriesKind } from "@stromblick/shared";
import type { Db } from "../db";
import type {
  Resolution as DbResolution,
  SeriesKind as DbSeriesKind,
} from "../generated/prisma/enums";
import { SMARD_SERIES, type SmardResolution, type SmardSeries } from "../smard/catalog";
import { weeksSince, type SmardClient, type SmardReading } from "../smard/client";

const DAY_MS = 24 * 60 * 60 * 1000;

const DB_KIND = {
  generation: "GENERATION",
  price: "PRICE",
  load: "LOAD",
} as const satisfies Record<SeriesKind, DbSeriesKind>;

const DB_RESOLUTION = {
  quarterhour: "QUARTERHOUR",
  hour: "HOUR",
} as const satisfies Record<SmardResolution, DbResolution>;

export interface IngestFailure {
  series: string;
  error: string;
}

export interface IngestResult {
  runId: number;
  status: "SUCCEEDED" | "FAILED";
  rowsWritten: number;
  failures: IngestFailure[];
}

export interface IngestOptions {
  db: Db;
  smard: SmardClient;
  logger: Logger;
  now?: () => Date;
  /** Fetch every week with data at or after this moment. Default: yesterday, see below. */
  since?: Date;
  series?: readonly SmardSeries[];
}

/**
 * Fetches the latest data of every series from SMARD and upserts it.
 * One failing series doesn't stop the others; the run is recorded in ingest_runs either way.
 */
export async function runIngest({
  db,
  smard,
  logger,
  now = () => new Date(),
  // From yesterday on: on Mondays, Sunday's last values are still in the previous week's file.
  since = new Date(now().getTime() - DAY_MS),
  series = SMARD_SERIES,
}: IngestOptions): Promise<IngestResult> {
  const run = await db.ingestRun.create({ data: {} });
  let rowsWritten = 0;
  const failures: IngestFailure[] = [];

  try {
    await upsertSeries(db, series);

    for (const item of series) {
      try {
        const written = await ingestSeries(db, smard, item, since.getTime());
        logger.info({ series: item.key, rowsWritten: written }, "Ingested series");
        rowsWritten += written;
      } catch (err) {
        logger.warn({ err, series: item.key }, "Ingesting a series failed");
        failures.push({ series: item.key, error: messageOf(err) });
      }
    }
  } catch (err) {
    logger.error({ err }, "Ingest run failed");
    failures.push({ series: "*", error: messageOf(err) });
  }

  const status = failures.length === 0 ? "SUCCEEDED" : "FAILED";
  await db.ingestRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status,
      rowsWritten,
      error:
        failures.length === 0 ? null : failures.map((f) => `${f.series}: ${f.error}`).join("\n"),
    },
  });
  return { runId: run.id, status, rowsWritten, failures };
}

/** Keeps the series table in step with the catalog, so readings always have their series row. */
async function upsertSeries(db: Db, series: readonly SmardSeries[]): Promise<void> {
  for (const item of series) {
    const data = {
      key: item.key,
      nameEn: item.name.en,
      nameDe: item.name.de,
      unit: item.unit,
      kind: DB_KIND[item.kind],
    };
    await db.series.upsert({
      where: { id: item.filter },
      create: { id: item.filter, ...data },
      update: data,
    });
  }
}

async function ingestSeries(
  db: Db,
  smard: SmardClient,
  item: SmardSeries,
  since: number,
): Promise<number> {
  const weeks = weeksSince(await smard.getWeekStarts(item), since);
  let written = 0;
  for (const weekStart of weeks) {
    written += await upsertReadings(db, item, await smard.getWeek(item, weekStart));
  }
  return written;
}

/**
 * Upserts one week in a single statement. Rows whose value is unchanged are skipped by the
 * WHERE clause, so they don't count as written: running twice reports 0 rows the second time.
 */
async function upsertReadings(
  db: Db,
  item: SmardSeries,
  readings: readonly SmardReading[],
): Promise<number> {
  if (readings.length === 0) return 0;
  const timestamps = readings.map((reading) => new Date(reading.ts).toISOString());
  const values = readings.map((reading) => reading.value);

  return db.$executeRaw`
    INSERT INTO readings (series_id, region, resolution, ts, value)
    SELECT ${item.filter}, ${item.region}, ${DB_RESOLUTION[item.resolution]}::resolution, t.ts, t.value
    FROM unnest(${timestamps}::timestamptz[], ${values}::float8[]) AS t(ts, value)
    ON CONFLICT (series_id, region, resolution, ts)
    DO UPDATE SET value = EXCLUDED.value
    WHERE readings.value IS DISTINCT FROM EXCLUDED.value`;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
