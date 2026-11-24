import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Series, SeriesKind } from "@stromblick/shared";
import { currentLanguage } from "../../i18n";

const KINDS: readonly SeriesKind[] = ["price", "load", "generation"];

interface SeriesSelectProps {
  series: readonly Series[];
  value: string;
  onChange: (key: string) => void;
}

/** Every series the dashboard has, grouped by what it measures. */
export function SeriesSelect({ series, value, onChange }: SeriesSelectProps) {
  const { t } = useTranslation();
  const language = currentLanguage();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {t("explorer.series.label")}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      >
        {KINDS.map((kind) => {
          const members = series.filter((item) => item.kind === kind);
          if (members.length === 0) return null;
          return (
            <optgroup key={kind} label={t(`explorer.series.kind.${kind}`)}>
              {members.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name[language]}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}
