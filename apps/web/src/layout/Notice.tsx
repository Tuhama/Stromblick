import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * A warning that sits in the page without taking it over. The yellow fill draws the eye, and the
 * word "Warning:" carries the meaning for readers who don't see color.
 */
export function Notice({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
      <strong className="font-semibold">{t("notice.warning")}</strong> {children}
    </div>
  );
}
