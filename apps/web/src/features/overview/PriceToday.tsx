import { lazy, Suspense, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DAY_AHEAD_PRICE_KEY, type Point } from "@stromblick/shared";
import { tooManyRequestsMessage } from "../../api/error-message";
import { useReadings } from "../../api/queries";
import { ChartPanel, type ChartStatus } from "../../charts/ChartPanel";
import { DataTable } from "../../charts/DataTable";
import { currentLanguage } from "../../i18n";
import { berlinZoneName, formatClock, todayInBerlin } from "../../time/berlin";
import { formatMoment } from "./newest-data";
import { formatPrice, summarizePrices, type PriceSummary } from "./price";
import { convertPrice, usePriceUnit } from "./price-unit";
import { PriceUnitSelect } from "./PriceUnitSelect";
import { useNewestData } from "./use-newest-data";

// Its own chunk: ECharts is downloaded after the page is on screen, not before.
const PriceChart = lazy(() => import("./PriceChart"));

/** Today's day-ahead price: a chart, with its lowest, highest and average price as text. */
export function PriceToday() {
  const { t } = useTranslation();
  const titleId = useId();
  const { unit, setUnit } = usePriceUnit();
  const today = todayInBerlin();
  const readings = useReadings(DAY_AHEAD_PRICE_KEY, { from: today, to: today });

  // Converted once, so the chart, the figures and the text alternative all show the same numbers.
  const apiPoints = readings.data?.points;
  const points = useMemo(
    () => apiPoints?.map(([time, price]): Point => [time, convertPrice(price, unit)]),
    [apiPoints, unit],
  );

  const language = currentLanguage();
  const newest = useNewestData();
  const summary = points && summarizePrices(points);
  let status: ChartStatus = "ready";
  if (readings.isPending) status = "loading";
  // An error only counts when there is nothing to show: a failed refresh keeps the last prices.
  else if (readings.isError && !readings.data) status = "error";
  else if (!summary) status = "empty";

  return (
    <section aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold">
          {t("overview.price.title")}
        </h2>
        <PriceUnitSelect unit={unit} onChange={setUnit} />
      </div>
      <div className="mt-3">
        <ChartPanel
          status={status}
          messages={{
            loading: t("overview.loading"),
            error: tooManyRequestsMessage(t, readings.error) ?? t("overview.price.error"),
            // Without prices for today, say how far the data does reach.
            empty:
              newest.prices === null
                ? t("overview.price.empty")
                : t("overview.price.emptyNewest", { time: formatMoment(newest.prices, language) }),
          }}
          refreshFailed={readings.isRefetchError}
          onRetry={() => void readings.refetch()}
        >
          {summary && (
            <>
              <Suspense fallback={<div className="h-72" />}>
                <PriceChart points={points} unit={unit} label={chartLabel(summary)} />
              </Suspense>
              <dl className="mt-4 grid grid-cols-3 gap-4">
                {figures(summary).map((figure) => (
                  <div key={figure.label}>
                    <dt className="text-sm text-muted-foreground">{figure.label}</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatPrice(figure.value, language)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">{unit}</span>
                    </dd>
                    {figure.time !== null && (
                      <dd className="text-sm text-muted-foreground">
                        {t("overview.price.at", { time: formatClock(figure.time) })}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                {t("overview.price.note", { zone: berlinZoneName(summary.min[0], language) })}
              </p>
              <DataTable
                caption={t("overview.price.tableCaption", {
                  zone: berlinZoneName(summary.min[0], language),
                })}
                columns={[t("overview.price.column", { unit })]}
                rows={points.map(([time, price]) => ({ time, values: [price] }))}
                formatValue={(value) => formatPrice(value, language)}
              />
            </>
          )}
        </ChartPanel>
      </div>
    </section>
  );

  function figures(prices: PriceSummary) {
    return [
      { label: t("overview.price.low"), value: prices.min[1], time: prices.min[0] },
      { label: t("overview.price.high"), value: prices.max[1], time: prices.max[0] },
      { label: t("overview.price.average"), value: prices.average, time: null },
    ];
  }

  function chartLabel(prices: PriceSummary) {
    return t("overview.price.chartLabel", {
      unit,
      low: formatPrice(prices.min[1], language),
      high: formatPrice(prices.max[1], language),
    });
  }
}
