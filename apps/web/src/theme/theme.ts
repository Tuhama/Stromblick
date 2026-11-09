import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
/** Anything read from storage that isn't a known theme becomes "system". */
const StoredTheme = z.enum(THEMES).catch("system");

/** Where the chosen theme is remembered. public/theme-init.js reads the same key. */
export const THEME_STORAGE_KEY = "stromblick.theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The theme chosen before, or "system" when there is none (or storage is blocked). */
export function readStoredTheme(): Theme {
  try {
    return StoredTheme.parse(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Puts the theme on <html>: the .dark class for Tailwind, color-scheme for scrollbars and forms. */
export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
  // makes the browser’s own parts (scrollbars, the select’s dropdown) match the theme too.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** The chosen theme and a setter that remembers it. "system" follows the OS, also while the page is open. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia(DARK_QUERY);
    const follow = () => {
      applyTheme("system");
    };
    media.addEventListener("change", follow);
    return () => {
      media.removeEventListener("change", follow);
    };
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private browsing); the choice then lasts for this visit only.
    }
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
