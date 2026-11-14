import { DAY_AHEAD_PRICE_KEY, type Region, type Series } from "@stromblick/shared";

/** Resolutions we fetch from SMARD. Longer ones are computed by the API when it downsamples. */
export type SmardResolution = "quarterhour" | "hour";

/** Where a series lives on SMARD: the filter ID, region and resolution build its URLs. */
export interface SmardSource {
  filter: number;
  region: Region;
  resolution: SmardResolution;
}

export type SmardSeries = Series & SmardSource;

const generation = (key: string, filter: number, en: string, de: string): SmardSeries => ({
  key: `generation-${key}`,
  kind: "generation",
  unit: "MWh",
  name: { en, de },
  filter,
  region: "DE",
  resolution: "hour",
});

/** Every series Stromblick ingests. Nuclear (1224) is left out: it has been zero since April 2023. */
export const SMARD_SERIES: readonly SmardSeries[] = [
  {
    key: DAY_AHEAD_PRICE_KEY,
    kind: "price",
    unit: "EUR/MWh",
    name: { en: "Day-ahead price", de: "Day-Ahead-Preis" },
    filter: 4169,
    region: "DE-LU",
    // The day-ahead market trades 15-minute products since 1 October 2025.
    resolution: "quarterhour",
  },
  {
    key: "load",
    kind: "load",
    unit: "MWh",
    name: { en: "Grid load", de: "Netzlast" },
    filter: 410,
    region: "DE",
    resolution: "hour",
  },
  generation("solar", 4068, "Solar", "Photovoltaik"),
  generation("wind-onshore", 4067, "Wind onshore", "Wind an Land"),
  generation("wind-offshore", 1225, "Wind offshore", "Wind auf See"),
  generation("biomass", 4066, "Biomass", "Biomasse"),
  generation("hydro", 1226, "Hydropower", "Wasserkraft"),
  generation("other-renewables", 1228, "Other renewables", "Sonstige Erneuerbare"),
  generation("lignite", 1223, "Lignite", "Braunkohle"),
  generation("hard-coal", 4069, "Hard coal", "Steinkohle"),
  generation("natural-gas", 4071, "Natural gas", "Erdgas"),
  generation("pumped-storage", 4070, "Pumped storage", "Pumpspeicher"),
  generation("other-conventional", 1227, "Other conventional", "Sonstige Konventionelle"),
];
