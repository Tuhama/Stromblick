import { useTranslation } from "react-i18next";
import { Page } from "../../layout/Page";
import { Assistant } from "./Assistant";

export function ExplainPage() {
  const { t } = useTranslation();
  return (
    <Page title={t("explain.title")} intro={t("explain.intro")}>
      <Assistant />
    </Page>
  );
}
