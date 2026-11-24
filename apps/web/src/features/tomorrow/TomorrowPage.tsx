import { lazy, Suspense, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import type { Point } from "@stromblick/shared";
import { tooManyRequestsMessage } from "../../api/error-message";
import { useTomorrow } from "../../api/queries";
import { useChartColors } from "../../charts/chart-colors";
import { ChartPanel, type ChartStatus } from "../../charts/ChartPanel";
import { DataTable } from "../../charts/DataTable";
import { currentLanguage } from "../../i18n";
import { Notice } from "../../layout/Notice";
import { Page } from "../../layout/Page";
import { berlinZoneName } from "../../time/berlin";
import { formatMoment } from "../overview/newest-data";
import { formatPrice } from "../overview/price";
import { convertPrice, usePriceUnit } from "../overview/price-unit";
import { PriceUnitSelect } from "../overview/PriceUnitSelect";
import { useNewestData } from "../overview/use-newest-data";
import { formatLongDay, formatRange } from "./tomorrow-text";
import { WindowPicker } from "./WindowPicker";
import { chooseHours, parseHours } from "./window-length";

// Its own chunk: ECharts is downloaded after the page is on screen, not before.
const TomorrowChart = lazy(() => import("./TomorrowChart"));

/** Tomorrow's day-ahead prices, with the cheapest and the most expensive window of a chosen length. */
function TomorrowPrices() {
  const { t } = useTranslation();
  const titleId = useId();
  const language = currentLanguage();
  const colors = useChartColors();
  const { unit, setUnit } = usePriceUnit();
  const [searchParams, setSearchParams] = useSearchParams();
  const tomorrow = useTomorrow();
  const newest = useNewestData();

  const data = tomorrow.data;
  const published = data?.status === "published" ? data : undefined;

  // Converted once, so the chart, the windows and the text alternative all show the same numbers.
  const apiPoints = published?.points;
  const points = useMemo(
    () => apiPoints?.map(([time, price]): Point => [time, convertPrice(price, unit)]),
    [apiPoints, unit],
  );

  const available = useMemo(
    () => published?.windows.map((found) => found.hours) ?? [],
    [published],
  );
  const hours = chooseHours(parseHours(searchParams.get("hours")), available);
  const found = published?.windows.find((windows) => windows.hours === hours);

  const cheapest = useMemo(
    () =>
      found && {
        ...found.cheapest,
        average: convertPrice(found.cheapest.average, unit),
        label: t("tomorrow.chart.cheapest"),
      },
    [found, unit, t],
  );
  const mostExpensive = useMemo(
    () =>
      found && {
        ...found.mostExpensive,
        average: convertPrice(found.mostExpensive.average, unit),
        label: t("tomorrow.chart.mostExpensive"),
      },
    [found, unit, t],
  );

  let status: ChartStatus = "ready";
  if (tomorrow.isPending) status = "loading";
  // An error only counts when there is nothing to show: a failed refresh keeps the last prices.
  else if (tomorrow.isError && !tomorrow.data) status = "error";
  else if (!published || !points) status = "empty";

  const day = data ? formatLongDay(data.day, language) : "";
  const waiting =
    newest.prices === null
      ? t("tomorrow.notPublished", { day })
      : t("tomorrow.notPublishedNewest", { day, time: formatMoment(newest.prices, language) });

  const firstMoment = points?.[0]?.[0];
  const zone = firstMoment === undefined ? "" : berlinZoneName(firstMoment, language);

  function choose(next: number) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set("hours", String(next));
        return params;
      },
      { replace: true },
    );
  }

  return (
    <section aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold">
          {t("tomorrow.heading", { day })}
        </h2>
        <PriceUnitSelect unit={unit} onChange={setUnit} />
      </div>
      <div className="mt-3">
        <ChartPanel
          status={status}
          messages={{
            loading: t("tomorrow.loading"),
            error: tooManyRequestsMessage(t, tomorrow.error) ?? t("tomorrow.error"),
            empty: waiting,
          }}
          refreshFailed={tomorrow.isRefetchError}
          onRetry={() => void tomorrow.refetch()}
        >
          {published && points && (
            <>
              {!published.complete && (
                <div className="mb-3">
                  <Notice>{t("tomorrow.incomplete", { day })}</Notice>
                </div>
              )}
              <WindowPicker value={hours} available={available} onChange={choose} />
              {found && cheapest && mostExpensive ? (
                <>
                  <div className="mt-3">
                    <Suspense fallback={<div className="h-72" />}>
                      <TomorrowChart
                        points={points}
                        unit={unit}
                        cheapest={cheapest}
                        mostExpensive={mostExpensive}
                        label={t("tomorrow.chartLabel", {
                          unit,
                          hours: found.hours,
                          cheapest: formatRange(cheapest.start, cheapest.end),
                          expensive: formatRange(mostExpensive.start, mostExpensive.end),
                        })}
                      />
                    </Suspense>
                  </div>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      {
                        key: "cheapest",
                        title: t("tomorrow.cheapest", { count: found.hours }),
                        window: cheapest,
                        color: colors.series[0],
                        dashed: false,
                      },
                      {
                        key: "mostExpensive",
                        title: t("tomorrow.mostExpensive", { count: found.hours }),
                        window: mostExpensive,
                        color: colors.series[1],
                        dashed: true,
                      },
                    ].map(({ key, title, window, color, dashed }) => (
                      <div key={key}>
                        <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span
                            aria-hidden="true"
                            className="inline-block size-3 rounded-sm"
                            style={{
                              backgroundColor: color,
                              border: `1.5px ${dashed ? "dashed" : "solid"} ${color ?? "currentColor"}`,
                              opacity: 0.8,
                            }}
                          />
                          {title}
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {formatRange(window.start, window.end)}
                        </dd>
                        <dd className="text-sm text-muted-foreground tabular-nums">
                          {t("tomorrow.average", {
                            price: formatPrice(window.average, language),
                            unit,
                          })}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t("tomorrow.noWindow")}</p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                {t("overview.price.note", { zone })}
              </p>
              <DataTable
                caption={t("tomorrow.tableCaption", { day, zone })}
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
}

export function TomorrowPage() {
  const { t } = useTranslation();
  return (
    <Page title={t("tomorrow.title")} intro={t("tomorrow.intro")}>
      <TomorrowPrices />
    </Page>
  );
}
