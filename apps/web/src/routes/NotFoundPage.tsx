import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Page } from "../layout/Page";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Page title={t("notFound.title")} intro={t("notFound.text")}>
      <Link to="/" className="font-medium underline underline-offset-4">
        {t("notFound.home")}
      </Link>
    </Page>
  );
}
