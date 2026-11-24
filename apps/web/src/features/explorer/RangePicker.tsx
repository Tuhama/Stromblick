import { useId } from "react";
import { useTranslation } from "react-i18next";
import { RANGES, type RangeName } from "./explorer-range";

interface RangePickerProps {
  value: RangeName;
  onChange: (range: RangeName) => void;
}

/**
 * Day, week, month or year in one group. Radio buttons, so a keyboard moves between them with the
 * arrow keys and a screen reader says "2 of 4".
 */
export function RangePicker({ value, onChange }: RangePickerProps) {
  const { t } = useTranslation();
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="sr-only">{t("explorer.range.legend")}</legend>
      <div className="flex gap-1 rounded-md border border-border p-1">
        {RANGES.map((range) => {
          const id = `${name}-${range}`;
          return (
            <div key={range}>
              <input
                id={id}
                type="radio"
                name={name}
                className="peer sr-only"
                checked={value === range}
                onChange={() => {
                  onChange(range);
                }}
              />
              <label
                htmlFor={id}
                className="block cursor-pointer rounded px-3 py-1.5 text-sm peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
              >
                {t(`explorer.range.${range}`)}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
