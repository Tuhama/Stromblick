import { useId } from "react";
import { useTranslation } from "react-i18next";
import { WINDOW_HOURS } from "@stromblick/shared";

interface WindowPickerProps {
  /** The chosen length in hours. Null when no window exists. */
  value: number | null;
  /** The lengths the API found a window for; the others can't be chosen. */
  available: readonly number[];
  onChange: (hours: number) => void;
}

/**
 * Four choices in one group: 1 to 4 hours. Radio buttons, so a keyboard moves between them with the
 * arrow keys and a screen reader says "2 of 4".
 */
export function WindowPicker({ value, available, onChange }: WindowPickerProps) {
  const { t } = useTranslation();
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="sr-only">{t("tomorrow.picker.legend")}</legend>
      <span aria-hidden="true" className="text-sm text-muted-foreground">
        {t("tomorrow.picker.legend")}
      </span>
      <div className="flex gap-1 rounded-md border border-border p-1">
        {WINDOW_HOURS.map((hours) => {
          const id = `${name}-${String(hours)}`;
          const disabled = !available.includes(hours);
          return (
            <div key={hours}>
              <input
                id={id}
                type="radio"
                name={name}
                className="peer sr-only"
                checked={value === hours}
                disabled={disabled}
                onChange={() => {
                  onChange(hours);
                }}
              />
              <label
                htmlFor={id}
                className="block cursor-pointer rounded px-3 py-1.5 text-sm peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground peer-disabled:line-through"
              >
                {t("tomorrow.picker.option", { count: hours })}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
