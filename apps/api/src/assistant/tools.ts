import { z } from "zod";
import {
  CalendarDay,
  MARKET_TIME_ZONE,
  Resolution,
  SeriesKey,
  StatusResponse,
  type Point,
} from "@stromblick/shared";
import { HttpError } from "../errors";
import type { LoadLatest } from "../series/load-latest";
import type { LoadReadings } from "../series/load-readings";
import { queryReadings } from "../series/query-readings";
import { SMARD_SERIES } from "../smard/catalog";
import type { LoadStatus } from "../status/load-status";
import type { ToolSpec } from "./llm-client";
import { daysWithoutData, type DaysWithoutData } from "./missing-days";

/** More points than this are summarised instead of listed: the answer must stay small for the model. */
export const MAX_LISTED_POINTS = 200;

export interface AssistantTool {
  spec: ToolSpec;
  /** Validates the model's arguments and returns data as a JSON string. Throws HttpError with a safe message. */
  run: (args: unknown) => Promise<string>;
}

export interface ToolDeps {
  readings: LoadReadings;
  latest: LoadLatest;
  status: LoadStatus;
}

function specFor(name: string, description: string, schema: z.ZodType): ToolSpec {
  // The "$schema" marker is for validators; model providers don't want it among the parameters.
  const parameters = Object.fromEntries(
    Object.entries(z.toJSONSchema(schema, { io: "input" })).filter(([key]) => key !== "$schema"),
  );
  return { name, description, parameters };
}

function parseArgs<S extends z.ZodType>(schema: S, args: unknown): z.output<S> {
  const result = schema.safeParse(args);
  if (!result.success) throw new HttpError(400, z.prettifyError(result.error));
  return result.data;
}

const berlinTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: MARKET_TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

/** "2026-11-17 14:00": Berlin local time, which is how the dashboard labels times. */
function formatTime(epochMs: number): string {
  return berlinTime.format(epochMs);
}

/** The newest reading of a series in Berlin time, or null when it has none. */
async function latestOf(latest: LoadLatest, key: string): Promise<string | null> {
  const item = SMARD_SERIES.find((candidate) => candidate.key === key);
  if (!item) return null;
  const time = await latest({
    seriesId: item.filter,
    region: item.region,
    native: item.resolution,
  });
  return time === null ? null : formatTime(time);
}

function noteFor(
  count: number,
  listed: boolean,
  latestReading: string | null | undefined,
  missing: DaysWithoutData | null,
) {
  if (count === 0) {
    return latestReading
      ? `No readings in this range. The newest reading we have is at ${latestReading}.`
      : "No readings in this range, and the series has no readings at all.";
  }
  const notes: string[] = [];
  if (!listed) {
    notes.push(`Too many points to list (${count}). Use a shorter range or resolution "day".`);
  }
  if (missing && missing.days.length > 0) {
    const more = missing.more > 0 ? ` and ${missing.more} more days` : "";
    notes.push(
      `The summary covers only the days with readings. No readings on: ${missing.days.join(", ")}${more}.`,
    );
  }
  return notes.length > 0 ? notes.join(" ") : undefined;
}

const NoArgs = z.object({});

const ReadingsArgs = z.object({
  series: SeriesKey.describe("A series key from list_series, e.g. price-day-ahead"),
  from: CalendarDay.describe("First day, YYYY-MM-DD, Europe/Berlin calendar day"),
  to: CalendarDay.describe("Last day, YYYY-MM-DD, included"),
  resolution: Resolution.optional().describe(
    "quarterhour, hour or day; leave out to let the server choose",
  ),
});

function summarise(points: readonly Point[]) {
  const first = points[0];
  if (first === undefined) return null;
  let min = first;
  let max = first;
  let total = 0;
  for (const point of points) {
    if (point[1] < min[1]) min = point;
    if (point[1] > max[1]) max = point;
    total += point[1];
  }
  const entry = ([time, value]: Point) => ({ time: formatTime(time), value });
  return {
    min: entry(min),
    max: entry(max),
    average: total / points.length,
    total,
  };
}

export function createTools({ readings, latest, status }: ToolDeps): AssistantTool[] {
  return [
    {
      spec: specFor(
        "list_series",
        "Lists the data series you can read: key, what it measures, unit and names in English and German.",
        NoArgs,
      ),
      run: (args) => {
        parseArgs(NoArgs, args);
        const series = SMARD_SERIES.map(({ key, kind, unit, name }) => ({ key, kind, unit, name }));
        return Promise.resolve(JSON.stringify({ series }));
      },
    },
    {
      spec: specFor(
        "get_readings",
        "Reads one series between two days (Europe/Berlin calendar days, both included, at most 366 days). " +
          "Returns min, max, average and total of the range, and the points when there are at most " +
          `${MAX_LISTED_POINTS}. Lists the days of the range that have no readings at all. ` +
          "Times are Europe/Berlin local time.",
        ReadingsArgs,
      ),
      run: async (args) => {
        const { series, ...query } = parseArgs(ReadingsArgs, args);
        const result = await queryReadings(readings, series, query);
        const summary = summarise(result.points);
        const latestReading =
          result.points.length === 0 ? await latestOf(latest, series) : undefined;
        const listed = result.points.length <= MAX_LISTED_POINTS;
        // Days with no reading at all: an average over the range does not include them.
        const missing =
          result.points.length > 0 ? daysWithoutData(query.from, query.to, result.points) : null;
        return JSON.stringify({
          series: result.series,
          unit: result.unit,
          resolution: result.resolution,
          timeZone: MARKET_TIME_ZONE,
          count: result.points.length,
          // A total of prices means nothing; of energy it does.
          summary: summary && (result.unit === "MWh" ? summary : { ...summary, total: undefined }),
          points: listed
            ? result.points.map(([time, value]) => ({ time: formatTime(time), value }))
            : undefined,
          // Only when the range is empty: the newest reading the database holds for this series.
          latestReading,
          daysWithoutData: missing && missing.days.length > 0 ? missing.days : undefined,
          moreDaysWithoutData: missing && missing.more > 0 ? missing.more : undefined,
          note: noteFor(result.points.length, listed, latestReading, missing),
        });
      },
    },
    {
      spec: specFor(
        "get_status",
        "Tells when the data was last updated, whether the latest update succeeded, and the newest reading of each series. " +
          "Times are Europe/Berlin local time.",
        NoArgs,
      ),
      run: async (args) => {
        parseArgs(NoArgs, args);
        const { lastSuccessAt, lastRun, latestReadings } = StatusResponse.parse(await status());
        return JSON.stringify({
          timeZone: MARKET_TIME_ZONE,
          lastSuccessAt: lastSuccessAt && formatTime(Date.parse(lastSuccessAt)),
          // The newest reading of every series; a day can be missing before it.
          latestReadings: Object.fromEntries(
            Object.entries(latestReadings).map(([key, time]) => [
              key,
              time && formatTime(Date.parse(time)),
            ]),
          ),
          lastRun: lastRun && {
            status: lastRun.status,
            finishedAt: formatTime(Date.parse(lastRun.finishedAt)),
          },
        });
      },
    },
  ];
}
