import { useId } from "react";
import { useTranslation } from "react-i18next";
import { PRICE_UNITS, type PriceUnit } from "./price-unit";

interface PriceUnitSelectProps {
  unit: PriceUnit;
  onChange: (unit: string) => void;
}

/** The price unit choice, for every page that shows prices. Its label is only for screen readers. */
export function PriceUnitSelect({ unit, onChange }: PriceUnitSelectProps) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {t("overview.price.unit")}
      </label>
      <select
        id={id}
        value={unit}
        onChange={(event) => {
          onChange(event.target.value);
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
  );
}
