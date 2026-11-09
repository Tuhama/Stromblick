import { useId } from "react";
import { useTranslation } from "react-i18next";
import { THEMES, useTheme, type Theme } from "../theme/theme";

export function ThemeSelect() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {t("theme.label")}
      </label>
      <select
        id={id}
        value={theme}
        onChange={(event) => {
          setTheme(event.target.value as Theme);
        }}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      >
        {THEMES.map((option) => (
          <option key={option} value={option}>
            {t(`theme.${option}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
