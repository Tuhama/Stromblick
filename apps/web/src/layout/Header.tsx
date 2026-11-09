import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router";
import { LanguageSelect } from "./LanguageSelect";
import { ThemeSelect } from "./ThemeSelect";

const NAV_ITEMS = [
  { to: "/", key: "overview" },
  { to: "/tomorrow", key: "tomorrow" },
  { to: "/explorer", key: "explorer" },
  { to: "/explain", key: "explain" },
] as const;

export function Header() {
  const { t } = useTranslation();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" className="size-7" />
          {t("app.name")}
        </Link>

        {/* On phones the navigation gets its own row below the logo and the settings. */}
        <nav aria-label={t("nav.label")} className="order-last w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `block rounded-md px-2.5 py-1.5 text-sm font-medium sm:px-3 ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelect />
          <ThemeSelect />
        </div>
      </div>
    </header>
  );
}
