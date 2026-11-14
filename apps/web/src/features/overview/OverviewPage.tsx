import { useTranslation } from "react-i18next";
import { useStatus } from "../../api/queries";
import { currentLanguage } from "../../i18n";
import { Page } from "../../layout/Page";
import { berlinZoneName, formatDateTime } from "../../time/berlin";
import { formatTimeAgo } from "../../time/relative";
import { MINUTE } from "../../time/units";
import { useNow } from "../../time/use-now";
import { PriceToday } from "./PriceToday";

export function OverviewPage() {
  const { t } = useTranslation();
  const status = useStatus();
  const now = useNow(MINUTE);
  const language = currentLanguage();

  let statusLine: string;
  // The exact moment, for readers who hover the line.
  let exactTime: string | undefined;
  if (status.isPending) statusLine = t("overview.loading");
  else if (status.isError) statusLine = t("overview.apiError");
  else if (status.data.lastSuccessAt === null) statusLine = t("overview.noData");
  else {
    const updated = Date.parse(status.data.lastSuccessAt);
    const ago = formatTimeAgo(updated, now, language);
    statusLine = ago === null ? t("overview.dataUpdatedNow") : t("overview.dataUpdated", { ago });
    exactTime = `${formatDateTime(updated, language)} ${berlinZoneName(updated, language)}`;
  }

  return (
    <Page title={t("overview.title")} intro={t("overview.intro")}>
      <p className="text-sm text-muted-foreground" title={exactTime}>
        {statusLine}
      </p>
      <div className="mt-8">
        <PriceToday />
      </div>
    </Page>
  );
}
