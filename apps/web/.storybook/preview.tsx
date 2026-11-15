import type { Preview } from "@storybook/react-vite";
import i18n from "i18next";
import { useEffect } from "react";
import "../src/index.css";
import { initI18n, LANGUAGES } from "../src/i18n";
import { applyTheme, THEMES } from "../src/theme/theme";

// The same i18next instance the app uses, so stories show the real texts.
initI18n();

const preview: Preview = {
  // Two toolbar menus: the theme and the language of every story.
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: { title: "Theme", icon: "circlehollow", items: [...THEMES], dynamicTitle: true },
    },
    language: {
      description: "Language",
      toolbar: { title: "Language", icon: "globe", items: [...LANGUAGES], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light", language: "en" },
  decorators: [
    (Story, { globals }) => (
      <Appearance theme={String(globals.theme)} language={String(globals.language)}>
        <Story />
      </Appearance>
    ),
  ],
};

function Appearance({
  theme,
  language,
  children,
}: {
  theme: string;
  language: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyTheme(theme === "dark" ? "dark" : "light");
  }, [theme]);
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);
  return <div className="max-w-3xl p-4">{children}</div>;
}

export default preview;
