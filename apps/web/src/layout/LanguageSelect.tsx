import { useId } from "react";
import { useTranslation } from "react-i18next";
import { currentLanguage, LANGUAGES } from "../i18n";

export function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {t("language.label")}
      </label>
      <select
        id={id}
        value={currentLanguage()}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      >
        {LANGUAGES.map((language) => (
          // Each language is named in itself, so people find their own.
          <option key={language} value={language} lang={language}>
            {t(`language.${language}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
