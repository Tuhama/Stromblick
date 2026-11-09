import { useTranslation } from "react-i18next";
import { Page } from "../../layout/Page";

export function ExplorerPage() {
  const { t } = useTranslation();
  return <Page title={t("explorer.title")} intro={t("explorer.intro")} />;
}
