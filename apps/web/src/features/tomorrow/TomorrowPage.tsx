import { useTranslation } from "react-i18next";
import { Page } from "../../layout/Page";

export function TomorrowPage() {
  const { t } = useTranslation();
  return <Page title={t("tomorrow.title")} intro={t("tomorrow.intro")} />;
}
