import { lazy, Suspense, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DAY_AHEAD_PRICE_KEY, type Point } from "@stromblick/shared";
import { useReadings } from "../../api/queries";
import { currentLanguage } from "../../i18n";
import { berlinZoneName, formatClock, todayInBerlin } from "../../time/berlin";
import { formatPrice, summarizePrices } from "./price";
import { convertPrice, PRICE_UNITS, usePriceUnit } from "./price-unit";

// Its own chunk: ECharts is downloaded after the page is on screen, not before.
const PriceChart = lazy(() => import("./PriceChart"));

/** Today's day-ahead price: a chart, with its lowest, highest and average price as text. */
export function PriceToday() {
  const { t } = useTranslation();
  const titleId = useId();
  const unitId = useId();
  const { unit, setUnit } = usePriceUnit();
  const today = todayInBerlin();
  const readings = useReadings(DAY_AHEAD_PRICE_KEY, { from: today, to: today });

  // Converted once, so the chart, the figures and the text alternative all show the same numbers.
  const apiPoints = readings.data?.points;
  const points = useMemo(
    () => apiPoints?.map(([time, price]): Point => [time, convertPrice(price, unit)]),
    [apiPoints, unit],
  );

  return (
    <section aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold">
          {t("overview.price.title")}
        </h2>
        <div>
          <label htmlFor={unitId} className="sr-only">
            {t("overview.price.unit")}
          </label>
          <select
            id={unitId}
            value={unit}
            onChange={(event) => {
              setUnit(event.target.value);
            }}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {PRICE_UNITS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">{content()}</div>
    </section>
  );

  function content() {
    if (readings.isPending) return <Note>{t("overview.loading")}</Note>;
    if (readings.isError) return <Note>{t("overview.price.error")}</Note>;

    const summary = points && summarizePrices(points);
    if (!summary) return <Note>{t("overview.price.empty")}</Note>;

    const language = currentLanguage();
    const figures = [
      { label: t("overview.price.low"), value: summary.min[1], time: summary.min[0] },
      { label: t("overview.price.high"), value: summary.max[1], time: summary.max[0] },
      { label: t("overview.price.average"), value: summary.average, time: null },
    ];
    const chartLabel = t("overview.price.chartLabel", {
      unit,
      low: formatPrice(summary.min[1], language),
      high: formatPrice(summary.max[1], language),
    });

    return (
      <>
        <Suspense fallback={<div className="h-72" />}>
          <PriceChart points={points} unit={unit} label={chartLabel} />
        </Suspense>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          {figures.map((figure) => (
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
        <Note>{t("overview.price.note", { zone: berlinZoneName(summary.min[0], language) })}</Note>
      </>
    );
  }
}

function Note({ children }: { children: string }) {
  return <p className="mt-4 text-sm text-muted-foreground first:mt-0">{children}</p>;
}
