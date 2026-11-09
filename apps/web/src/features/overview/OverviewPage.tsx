import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HealthResponse } from "@stromblick/shared";
import { getJson } from "../../api/client";
import { Page } from "../../layout/Page";

export function OverviewPage() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // StrictMode runs effects twice in development; aborting drops the first request.
    const controller = new AbortController();
    getJson("/health", HealthResponse, { signal: controller.signal })
      .then(setHealth)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <Page title={t("overview.title")} intro={t("overview.intro")}>
      {health && (
        <p className="text-sm text-muted-foreground">
          {t("overview.apiStatus", { status: health.status })}
        </p>
      )}
      {failed && <p className="text-sm text-muted-foreground">{t("overview.apiError")}</p>}
    </Page>
  );
}
