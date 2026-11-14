import { useCallback, useState } from "react";
import { z } from "zod";

/** The market's unit first, then the one on a household's electricity bill. */
export const PRICE_UNITS = ["EUR/MWh", "ct/kWh"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];
/** Anything that isn't a known unit, from storage or from a select, becomes the market's unit. */
const KnownUnit = z.enum(PRICE_UNITS).catch("EUR/MWh");

/** Where the chosen unit is remembered between visits. */
export const PRICE_UNIT_STORAGE_KEY = "stromblick.priceUnit";

/** A price from the API (EUR/MWh) in the chosen unit. 1 EUR/MWh is 100 ct per 1000 kWh: 0.1 ct/kWh. */
export function convertPrice(eurPerMwh: number, unit: PriceUnit): number {
  return unit === "ct/kWh" ? eurPerMwh / 10 : eurPerMwh;
}

function readStoredUnit(): PriceUnit {
  try {
    return KnownUnit.parse(localStorage.getItem(PRICE_UNIT_STORAGE_KEY));
  } catch {
    return "EUR/MWh";
  }
}

/** The chosen price unit and a setter that remembers it. */
export function usePriceUnit() {
  const [unit, setUnitState] = useState<PriceUnit>(readStoredUnit);

  const setUnit = useCallback((value: string) => {
    const next = KnownUnit.parse(value);
    try {
      localStorage.setItem(PRICE_UNIT_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private browsing); the choice then lasts for this visit only.
    }
    setUnitState(next);
  }, []);

  return { unit, setUnit };
}
