import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { currentLanguage } from "../i18n";

const LINK = "underline underline-offset-4 hover:text-foreground";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-sm text-muted-foreground sm:px-6">
        {/* The licence of SMARD data (CC BY 4.0) asks for this credit. */}
        <p>
          {t("footer.data")}{" "}
          <a href="https://www.smard.de/" className={LINK}>
            Bundesnetzagentur | SMARD.de
          </a>
          ,{" "}
          <a
            href={`https://creativecommons.org/licenses/by/4.0/deed.${currentLanguage()}`}
            className={LINK}
          >
            CC BY 4.0
          </a>
        </p>
        <nav aria-label={t("footer.label")}>
          <ul className="flex gap-4">
            <li>
              <Link to="/impressum" className={LINK}>
                {t("footer.imprint")}
              </Link>
            </li>
            <li>
              <Link to="/datenschutz" className={LINK}>
                {t("footer.privacy")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
