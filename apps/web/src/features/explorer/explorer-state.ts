import { CalendarDay, DAY_AHEAD_PRICE_KEY, SeriesKey } from "@stromblick/shared";
import { RANGES, type RangeName } from "./explorer-range";

/** What the page shows when the link says nothing, or something that makes no sense. */
export const DEFAULT_SERIES = DAY_AHEAD_PRICE_KEY;
export const DEFAULT_RANGE: RangeName = "week";

/** Everything the Explorer shows. It lives in the URL, so a link reproduces the view. */
export interface ExplorerView {
  series: string;
  range: RangeName;
  /** The last day of the range, a Berlin calendar day. */
  end: string;
}

/**
 * The view from `?series=&range=&end=`. Each part that is missing or invalid falls back on its own
 * default, so a half-broken link still opens something sensible. The last day can't be in the
 * future: there are no readings yet. `today` is a parameter, so the function can be tested.
 */
export function parseView(params: URLSearchParams, today: string): ExplorerView {
  const series = SeriesKey.safeParse(params.get("series"));
  const end = CalendarDay.safeParse(params.get("end"));
  return {
    series: series.success ? series.data : DEFAULT_SERIES,
    range: RANGES.find((range) => range === params.get("range")) ?? DEFAULT_RANGE,
    end: end.success && end.data <= today ? end.data : today,
  };
}

/** The query string of a view. All three parts are written, so a shared link shows the same days. */
export function viewToParams(view: ExplorerView): URLSearchParams {
  return new URLSearchParams({ series: view.series, range: view.range, end: view.end });
}
