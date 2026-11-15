import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useChartColors } from "../../charts/chart-colors";
import { EChart } from "../../charts/EChart";
import { currentLanguage } from "../../i18n";
import {
  GENERATION_GROUPS,
  generationOption,
  type GenerationGroupId,
  type GenerationLayer,
} from "./generation";

interface GenerationChartProps {
  layers: readonly GenerationLayer[];
  unit: string;
}

/**
 * Electricity generation by source as a stacked area chart, with a legend below it.
 * A default export, so the page can load this file, and ECharts with it, lazily.
 */
export default function GenerationChart({ layers, unit }: GenerationChartProps) {
  const { t } = useTranslation();
  const language = currentLanguage();
  const colors = useChartColors();

  const names = useMemo(
    () =>
      Object.fromEntries(
        GENERATION_GROUPS.map((group) => [group.id, t(`generation.groups.${group.id}`)]),
      ) as Record<GenerationGroupId, string>,
    // The language is the real input: `t` changes when it does.
    [t],
  );

  const option = useMemo(
    () =>
      generationOption({
        layers,
        names,
        unit,
        language,
        colors,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }),
    [layers, names, unit, language, colors],
  );

  return (
    <figure>
      <EChart
        option={option}
        label={t("generation.chartLabel", { unit })}
        className="h-72 w-full"
      />
      {/* Color alone is not enough: every layer is named here, in the order of the stack. */}
      <figcaption>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {layers.map((layer) => (
            <li key={layer.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-3 rounded-sm"
                style={{ backgroundColor: colors.series[layer.slot] }}
              />
              {names[layer.id]}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
