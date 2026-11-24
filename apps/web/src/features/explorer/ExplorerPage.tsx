import { lazy, Suspense, useCallback, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDay, type Point, type Resolution } from "@stromblick/shared";
import { tooManyRequestsMessage } from "../../api/error-message";
import { readingsQuery, useSeriesList } from "../../api/queries";
import { ChartPanel, type ChartStatus } from "../../charts/ChartPanel";
import { DataTable } from "../../charts/DataTable";
import { currentLanguage } from "../../i18n";
import { Page } from "../../layout/Page";
import { berlinZoneName, formatDate, formatDateTime, todayInBerlin } from "../../time/berlin";
import { formatEnergy } from "../overview/generation";
import { formatPrice, summarizePrices, type PriceSummary } from "../overview/price";
import { convertPrice, usePriceUnit } from "../overview/price-unit";
import { PriceUnitSelect } from "../overview/PriceUnitSelect";
import { rangeBounds, stepEnd, type RangeName } from "./explorer-range";
import { DEFAULT_SERIES, parseView, viewToParams, type ExplorerView } from "./explorer-state";
import { formatPeriod, isDaily } from "./explorer-text";
import { RangePicker } from "./RangePicker";
import { SeriesSelect } from "./SeriesSelect";

// Its own chunk: ECharts is downloaded after the page is on screen, not before.
const ExplorerChart = lazy(() => import("./ExplorerChart"));

export function ExplorerPage() {
  const { t } = useTranslation();
  return (
    <Page title={t("explorer.title")} intro={t("explorer.intro")}>
      <Explorer />
    </Page>
  );
}

/** One series over a range of days. The series, the range and its last day live in the URL. */
function Explorer() {
  const { t } = useTranslation();
  const titleId = useId();
  const dateId = useId();
  const language = currentLanguage();
  const { unit: priceUnit, setUnit } = usePriceUnit();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayInBerlin();
  const view = parseView(searchParams, today);
  const { from, to } = rangeBounds(view.range, view.end);

  const list = useSeriesList();
  const allSeries = list.data?.series;
  // A key the catalog doesn't know falls back on the price, like any other broken link.
  const series =
    allSeries?.find((item) => item.key === view.series) ??
    allSeries?.find((item) => item.key === DEFAULT_SERIES);

  const readings = useQuery({
    ...readingsQuery(series?.key ?? view.series, { from, to }),
    // Wait for the catalog: an unknown key in the link would otherwise ask the API for nothing.
    enabled: series !== undefined,
  });

  const isPrice = series?.kind === "price";
  const unit = isPrice ? priceUnit : (series?.unit ?? "");
  const apiPoints = readings.data?.points;
  // Converted once, so the chart, the figures and the text alternative all show the same numbers.
  const points = useMemo(
    () =>
      apiPoints?.map(([time, value]): Point => [
        time,
        isPrice ? convertPrice(value, priceUnit) : value,
      ]),
    [apiPoints, isPrice, priceUnit],
  );
  const formatValue = useCallback(
    (value: number) => (isPrice ? formatPrice(value, language) : formatEnergy(value, language)),
    [isPrice, language],
  );

  const summary = points && summarizePrices(points);
  let status: ChartStatus = "ready";
  if (list.isPending || (series !== undefined && readings.isPending)) status = "loading";
  // An error only counts when there is nothing to show: a failed refresh keeps the last figures.
  else if ((list.isError && !list.data) || (readings.isError && !readings.data)) status = "error";
  else if (!series || !summary) status = "empty";

  const seriesName = series?.name[language] ?? "";
  const period = formatPeriod(from, to, language);
  const resolution = readings.data?.resolution;
  const firstMoment = points?.[0]?.[0];
  const zone = firstMoment === undefined ? "" : berlinZoneName(firstMoment, language);

  function update(next: Partial<ExplorerView>) {
    setSearchParams(viewToParams({ ...view, series: series?.key ?? view.series, ...next }));
  }

  return (
    <section aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {allSeries && (
          <SeriesSelect
            series={allSeries}
            value={series?.key ?? DEFAULT_SERIES}
            onChange={(key) => {
              update({ series: key });
            }}
          />
        )}
        <RangePicker
          value={view.range}
          onChange={(range: RangeName) => {
            update({ range });
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm"
            onClick={() => {
              update({ end: stepEnd(view.range, view.end, -1, today) });
            }}
          >
            {t("explorer.earlier")}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:text-muted-foreground"
            disabled={view.end >= today}
            onClick={() => {
              update({ end: stepEnd(view.range, view.end, 1, today) });
            }}
          >
            {t("explorer.later")}
          </button>
          <label htmlFor={dateId} className="text-sm text-muted-foreground">
            {t("explorer.end")}
          </label>
          <input
            id={dateId}
            type="date"
            value={view.end}
            max={today}
            onChange={(event) => {
              const day = CalendarDay.safeParse(event.target.value);
              // An empty or half-typed date is not a day yet.
              if (day.success && day.data <= today) update({ end: day.data });
            }}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        {isPrice && <PriceUnitSelect unit={priceUnit} onChange={setUnit} />}
      </div>

      <h2 id={titleId} className="mt-6 text-lg font-semibold">
        {t("explorer.heading", { series: seriesName, period })}
      </h2>
      <div className="mt-3">
        <ChartPanel
          status={status}
          messages={{
            error: tooManyRequestsMessage(t, readings.error) ?? t("explorer.error"),
            empty: t("explorer.empty"),
          }}
          refreshFailed={readings.isRefetchError}
          onRetry={() => void readings.refetch()}
        >
          {summary && resolution && (
            <>
              <Suspense fallback={<div className="h-72" />}>
                <ExplorerChart
                  points={points}
                  unit={unit}
                  resolution={resolution}
                  steps={isPrice}
                  formatValue={formatValue}
                  label={t("explorer.chartLabel", {
                    series: seriesName,
                    period,
                    unit,
                    low: formatValue(summary.min[1]),
                    high: formatValue(summary.max[1]),
                  })}
                />
              </Suspense>
              <dl className="mt-4 grid grid-cols-3 gap-4">
                {figures(summary, resolution).map((figure) => (
                  <div key={figure.label}>
                    <dt className="text-sm text-muted-foreground">{figure.label}</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatValue(figure.value)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">{unit}</span>
                    </dd>
                    {figure.time !== null && (
                      <dd className="text-sm text-muted-foreground">{figure.time}</dd>
                    )}
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                {t(isPrice ? "explorer.note" : "explorer.noteEnergy", {
                  resolution: resolutionText(resolution),
                  zone,
                })}
              </p>
              <DataTable
                caption={t("explorer.tableCaption", { series: seriesName, period, unit, zone })}
                columns={[t("explorer.column", { unit })]}
                rows={points.map(([time, value]) => ({ time, values: [value] }))}
                formatValue={formatValue}
                formatTime={(time) =>
                  isDaily(resolution) ? formatDate(time, language) : formatDateTime(time, language)
                }
              />
            </>
          )}
        </ChartPanel>
      </div>
    </section>
  );

  function figures(prices: PriceSummary, shown: Resolution) {
    const at = (time: number) =>
      isDaily(shown) ? formatDate(time, language) : formatDateTime(time, language);
    return [
      { label: t("explorer.figures.low"), value: prices.min[1], time: at(prices.min[0]) },
      { label: t("explorer.figures.high"), value: prices.max[1], time: at(prices.max[0]) },
      { label: t("explorer.figures.average"), value: prices.average, time: null },
    ];
  }

  function resolutionText(shown: Resolution): string {
    if (shown === "quarterhour") return t("explorer.resolution.quarterhour");
    if (shown === "hour") return t("explorer.resolution.hour");
    return t("explorer.resolution.day");
  }
}
