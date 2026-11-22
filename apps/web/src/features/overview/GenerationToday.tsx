import { lazy, Suspense, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { tooManyRequestsMessage } from "../../api/error-message";
import { ChartPanel } from "../../charts/ChartPanel";
import { DataTable } from "../../charts/DataTable";
import { currentLanguage } from "../../i18n";
import { berlinZoneName, todayInBerlin } from "../../time/berlin";
import { formatEnergy, generationRows, groupGeneration } from "./generation";
import { formatMoment } from "./newest-data";
import { useTodaysGeneration } from "./use-generation";
import { useNewestData } from "./use-newest-data";

// Its own chunk, like the price chart: ECharts is downloaded after the page is on screen.
const GenerationChart = lazy(() => import("./GenerationChart"));

/** Today's electricity generation by source, as a stacked chart with a legend. */
export function GenerationToday() {
  const { t } = useTranslation();
  const titleId = useId();
  const generation = useTodaysGeneration();
  const newest = useNewestData();

  // Groups without any data are left out, so the legend lists only what the chart shows.
  const layers = useMemo(
    () => groupGeneration(generation.series).filter((layer) => layer.points.length > 0),
    [generation.series],
  );
  // The zone name (CET or CEST) is that of the day shown; today's date at noon is always inside it.
  const zoneMoment = layers[0]?.points.at(-1)?.[0] ?? Date.parse(`${todayInBerlin()}T12:00:00Z`);
  const language = currentLanguage();
  const tableRows = useMemo(() => generationRows(layers), [layers]);

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
            error: tooManyRequestsMessage(t, generation.error) ?? t("overview.generation.error"),
            // Without figures for today, say how far the data does reach.
            empty:
              newest.generation === null
                ? t("overview.generation.empty")
                : t("overview.generation.emptyNewest", {
                    time: formatMoment(newest.generation, language),
                  }),
          }}
          refreshFailed={generation.refreshFailed}
          onRetry={generation.retry}
        >
          <Suspense fallback={<div className="h-72" />}>
            <GenerationChart layers={layers} unit="MWh" />
          </Suspense>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("overview.generation.note", { zone: berlinZoneName(zoneMoment, language) })}
          </p>
          <DataTable
            caption={t("overview.generation.tableCaption", {
              zone: berlinZoneName(zoneMoment, language),
            })}
            columns={[
              ...layers.map((layer) => t(`generation.groups.${layer.id}`)),
              t("overview.generation.total"),
            ]}
            rows={tableRows}
            formatValue={(value) => formatEnergy(value, language)}
          />
        </ChartPanel>
      </div>
    </section>
  );
}
