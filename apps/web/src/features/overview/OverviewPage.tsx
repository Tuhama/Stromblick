import { useTranslation } from "react-i18next";
import { useStatus } from "../../api/queries";
import { FeatureBoundary } from "../../errors/FeatureBoundary";
import { currentLanguage } from "../../i18n";
import { Notice } from "../../layout/Notice";
import { Page } from "../../layout/Page";
import { berlinZoneName, formatDateTime } from "../../time/berlin";
import { formatTimeAgo } from "../../time/relative";
import { MINUTE } from "../../time/units";
import { useNow } from "../../time/use-now";
import { isOutdated } from "./freshness";
import { GenerationToday } from "./GenerationToday";
import { PriceToday } from "./PriceToday";
import { RenewableShare } from "./RenewableShare";

export function OverviewPage() {
  const { t } = useTranslation();
  const status = useStatus();
  const now = useNow(MINUTE);
  const language = currentLanguage();

  let statusLine: string;
  // The exact moment, for readers who hover the line.
  let exactTime: string | undefined;
  // Set when the last successful update is older than expected: how long ago it was.
  let outdatedAgo: string | null = null;
  // The last answer stays on screen if a later check fails: "unreachable" only when there is none.
  if (status.data === undefined) {
    statusLine = status.isPending ? t("overview.loading") : t("overview.apiError");
  } else if (status.data.lastSuccessAt === null) {
    statusLine = t("overview.noData");
  } else {
    const updated = Date.parse(status.data.lastSuccessAt);
    const ago = formatTimeAgo(updated, now, language);
    statusLine = ago === null ? t("overview.dataUpdatedNow") : t("overview.dataUpdated", { ago });
    exactTime = `${formatDateTime(updated, language)} ${berlinZoneName(updated, language)}`;
    if (ago !== null && isOutdated(updated, now)) outdatedAgo = ago;
  }

  return (
    <Page title={t("overview.title")} intro={t("overview.intro")}>
      <p className="text-sm text-muted-foreground" title={exactTime}>
        {statusLine}
      </p>

      {outdatedAgo !== null && (
        <div className="mt-3">
          <Notice>{t("overview.outdated", { ago: outdatedAgo })}</Notice>
        </div>
      )}

      {/* One boundary per feature: a crash in one section leaves the others on screen. */}
      <div className="mt-8 space-y-10">
        <FeatureBoundary feature="renewable-share" label={t("overview.renewable.title")}>
          <RenewableShare />
        </FeatureBoundary>
        <FeatureBoundary feature="generation" label={t("generation.title")}>
          <GenerationToday />
        </FeatureBoundary>
        <FeatureBoundary feature="price" label={t("overview.price.title")}>
          <PriceToday />
        </FeatureBoundary>
      </div>
    </Page>
  );
}
