import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useStatus } from "../../api/queries";
import { FeatureBoundary } from "../../errors/FeatureBoundary";
import { currentLanguage, type Language } from "../../i18n";
import { Notice } from "../../layout/Notice";
import { Page } from "../../layout/Page";
import { berlinZoneName, formatDateTime } from "../../time/berlin";
import { formatTimeAgo } from "../../time/relative";
import { MINUTE } from "../../time/units";
import { useNow } from "../../time/use-now";
import { isOutdated } from "./freshness";
import { GenerationToday } from "./GenerationToday";
import { formatMoment, newestData, type NewestData } from "./newest-data";
import { PriceToday } from "./PriceToday";
import { RenewableShare } from "./RenewableShare";

/** One sentence on how new the data is, or null when nothing is known (an older API, no readings). */
function newestLine(t: TFunction, language: Language, { prices, generation }: NewestData) {
  const when = (moment: number) => formatMoment(moment, language);
  const items: string[] = [];
  if (prices !== null) items.push(t("overview.newest.prices", { time: when(prices) }));
  if (generation !== null) {
    items.push(t("overview.newest.generation", { time: when(generation) }));
  }
  if (items.length === 0) return null;
  const list = new Intl.ListFormat(language, { style: "long", type: "conjunction" });
  return t("overview.newest.line", { items: list.format(items) });
}

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

  // How new the data itself is: the ingest can run on time while SMARD has a day missing.
  const newest = status.data
    ? newestLine(t, language, newestData(status.data.latestReadings))
    : null;

  return (
    <Page title={t("overview.title")} intro={t("overview.intro")}>
      <p className="text-sm text-muted-foreground" title={exactTime}>
        {statusLine}
      </p>
      {newest !== null && <p className="text-sm text-muted-foreground">{newest}</p>}

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
