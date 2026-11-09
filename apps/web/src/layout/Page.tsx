import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface PageProps {
  title: string;
  intro?: string;
  children?: ReactNode;
}

/** A page's heading and browser tab title. React 19 moves <title> into the document head. */
export function Page({ title, intro, children }: PageProps) {
  const { t } = useTranslation();
  return (
    <>
      <title>{`${title} · ${t("app.name")}`}</title>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {intro && <p className="mt-2 max-w-prose text-muted-foreground">{intro}</p>}
      {children && <div className="mt-6">{children}</div>}
    </>
  );
}
