import { useTranslation } from "react-i18next";

/**
 * Shown for the very first render when the page in the address bar loads lazily (the explorer and
 * the legal pages): React Router has no layout yet to show, so this stands in until the page's code
 * has arrived. Without it React Router writes a warning to the console.
 */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div role="status" className="p-6 text-muted-foreground">
      {t("app.loadingPage")}
    </div>
  );
}
