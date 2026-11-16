import { lazy, Suspense, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChartPanel } from "../../charts/ChartPanel";
import { currentLanguage } from "../../i18n";
import { berlinZoneName, todayInBerlin } from "../../time/berlin";
import { groupGeneration } from "./generation";
import { useTodaysGeneration } from "./use-generation";

// Its own chunk, like the price chart: ECharts is downloaded after the page is on screen.
const GenerationChart = lazy(() => import("./GenerationChart"));

/** Today's electricity generation by source, as a stacked chart with a legend. */
export function GenerationToday() {
  const { t } = useTranslation();
  const titleId = useId();
  const generation = useTodaysGeneration();

  // Groups without any data are left out, so the legend lists only what the chart shows.
  const layers = useMemo(
    () => groupGeneration(generation.series).filter((layer) => layer.points.length > 0),
    [generation.series],
  );
  // The zone name (CET or CEST) is that of the day shown; today's date at noon is always inside it.
  const zoneMoment = layers[0]?.points.at(-1)?.[0] ?? Date.parse(`${todayInBerlin()}T12:00:00Z`);

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-semibold">
        {t("generation.title")}
      </h2>
      {/* Tall enough for the chart, legend and note, so the sections below stay put as they appear. */}
      <div className="mt-3 min-h-[26rem]">
        <ChartPanel
          status={generation.status}
          messages={{
            loading: t("overview.loading"),
            error: t("overview.generation.error"),
            empty: t("overview.generation.empty"),
          }}
          onRetry={generation.retry}
        >
          <Suspense fallback={<div className="h-72" />}>
            <GenerationChart layers={layers} unit="MWh" />
          </Suspense>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("overview.generation.note", { zone: berlinZoneName(zoneMoment, currentLanguage()) })}
          </p>
        </ChartPanel>
      </div>
    </section>
  );
}
