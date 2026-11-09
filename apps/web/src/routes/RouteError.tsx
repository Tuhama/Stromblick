import { useTranslation } from "react-i18next";
import { Page } from "../layout/Page";

/** Shown inside the layout when a page throws while rendering. */
export function RouteError() {
  const { t } = useTranslation();
  return <Page title={t("error.title")} intro={t("error.text")} />;
}
