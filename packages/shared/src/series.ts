import { z } from "zod";

/** What a series measures. Mirrors the series_kind enum in the database. */
export const SeriesKind = z.enum(["generation", "price", "load"]);
export type SeriesKind = z.infer<typeof SeriesKind>;

/** Time between two readings, spelled as in SMARD's API. Mirrors the resolution enum in the database. */
export const Resolution = z.enum(["quarterhour", "hour", "day"]);
export type Resolution = z.infer<typeof Resolution>;

/** SMARD region codes in the MVP: DE for generation and load, DE-LU for the day-ahead market. */
export const Region = z.enum(["DE", "DE-LU"]);
export type Region = z.infer<typeof Region>;

/** Energy per interval, or the price of energy. */
export const Unit = z.enum(["MWh", "EUR/MWh"]);
export type Unit = z.infer<typeof Unit>;

/** Stable, URL-safe name of a series, e.g. "price-day-ahead". Never SMARD's numeric filter ID. */
export const SeriesKey = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words joined by hyphens");
export type SeriesKey = z.infer<typeof SeriesKey>;

/** A series as the web app sees it. Names are keyed by language, so the UI picks one with i18n. */
export const Series = z.object({
  key: SeriesKey,
  kind: SeriesKind,
  unit: Unit,
  name: z.object({ en: z.string().min(1), de: z.string().min(1) }),
});
export type Series = z.infer<typeof Series>;

/** GET /series: every series the dashboard can show. */
export const SeriesListResponse = z.object({ series: z.array(Series) });
export type SeriesListResponse = z.infer<typeof SeriesListResponse>;
