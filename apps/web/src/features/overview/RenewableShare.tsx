import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { currentLanguage } from "../../i18n";
import { formatShare, renewableShare } from "./generation";
import { useTodaysGeneration } from "./use-generation";

/** The renewable share of today's generation, as one large number with its definition. */
export function RenewableShare() {
  const { t } = useTranslation();
  const titleId = useId();
  const generation = useTodaysGeneration();
  const share = useMemo(() => renewableShare(generation.series), [generation.series]);

  let value: string;
  if (generation.status === "loading") value = t("overview.loading");
  else if (generation.status === "error") value = t("overview.renewable.error");
  else if (share === null) value = t("overview.renewable.empty");
  else value = formatShare(share, currentLanguage());

  const isNumber =
    generation.status !== "loading" && generation.status !== "error" && share !== null;

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-semibold">
        {t("overview.renewable.title")}
      </h2>
      <p
        className={
          isNumber
            ? "mt-1 min-h-10 text-4xl font-semibold tabular-nums"
            : "mt-1 flex min-h-10 items-center text-sm text-muted-foreground"
        }
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t("overview.renewable.note")}</p>
    </section>
  );
}
