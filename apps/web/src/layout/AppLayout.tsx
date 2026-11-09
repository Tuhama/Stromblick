import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { Header } from "./Header";

export function AppLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh flex-col">
      {/* Lets keyboard users jump past the header straight to the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground"
      >
        {t("app.skipToContent")}
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
