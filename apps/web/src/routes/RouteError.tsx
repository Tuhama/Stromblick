import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router";
import { Page } from "../layout/Page";
import { reportError } from "../observability/report-error";

/** Shown inside the layout when a page throws while rendering. */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  useEffect(() => {
    reportError(error);
  }, [error]);
  return <Page title={t("error.title")} intro={t("error.text")} />;
}
