import { useTranslation } from "react-i18next";
import { useStatus } from "../../api/queries";
import { currentLanguage } from "../../i18n";
import { Page } from "../../layout/Page";

/** The market runs on German time, so times are shown in it wherever the reader is. */
function formatTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export function OverviewPage() {
  const { t } = useTranslation();
  const status = useStatus();

  let statusLine: string;
  if (status.isPending) statusLine = t("overview.loading");
  else if (status.isError) statusLine = t("overview.apiError");
  else if (status.data.lastSuccessAt === null) statusLine = t("overview.noData");
  else {
    const time = formatTime(status.data.lastSuccessAt, currentLanguage());
    statusLine = t("overview.dataAsOf", { time });
  }

  return (
    <Page title={t("overview.title")} intro={t("overview.intro")}>
      <p className="text-sm text-muted-foreground">{statusLine}</p>
    </Page>
  );
}
