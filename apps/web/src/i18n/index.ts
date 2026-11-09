import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import de from "./de.json";
import en from "./en.json";

export const LANGUAGES = ["en", "de"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Where the chosen language is remembered between visits. */
export const LANGUAGE_STORAGE_KEY = "stromblick.language";

// Typed as English, so a key missing from the German file is a compile error.
const german: typeof en = de;

/** Sets up i18next once. Order: a language chosen before, then the browser's, then English. */
export function initI18n() {
  if (i18n.isInitialized) return i18n;
  // Screen readers and the browser's hyphenation use <html lang>, so keep it in step.
  i18n.on("languageChanged", () => {
    document.documentElement.lang = currentLanguage();
  });
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en }, de: { translation: german } },
      supportedLngs: LANGUAGES,
      fallbackLng: "en",
      // "de-AT" or "de-CH" in the browser counts as "de".
      nonExplicitSupportedLngs: true,
      // React already escapes text it renders.
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ["localStorage"],
      },
    });
  return i18n;
}

/** The current language, narrowed to the ones we support. */
export function currentLanguage(): Language {
  return i18n.resolvedLanguage === "de" ? "de" : "en";
}
