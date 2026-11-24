import { useTranslation } from "react-i18next";
import { currentLanguage } from "../../i18n";
import { Page } from "../../layout/Page";
import { contentDe } from "./content-de";
import { contentEn } from "./content-en";
import type { LegalContent, LegalDocument } from "./legal-types";
import { OPERATOR } from "./operator";

const CONTENT: Record<"en" | "de", LegalContent> = { en: contentEn, de: contentDe };

const LINK = "font-medium underline underline-offset-4";

function LegalView({ document }: { document: LegalDocument }) {
  const language = currentLanguage();
  return (
    <Page title={document.title} intro={document.intro}>
      <div className="max-w-prose space-y-6">
        <p className="text-sm text-muted-foreground">{document.asOf}</p>
        {document.sections.map((section) => (
          <section key={section.id} aria-labelledby={`legal-${section.id}`} className="space-y-2">
            <h2 id={`legal-${section.id}`} className="text-lg font-semibold">
              {section.heading}
            </h2>
            {section.paragraphs?.map((text) => (
              <p key={text}>{text}</p>
            ))}
            {section.address && (
              <address className="not-italic">
                {OPERATOR.name}
                <br />
                {OPERATOR.street}
                <br />
                {OPERATOR.city}
                <br />
                {OPERATOR.country[language]}
              </address>
            )}
            {section.email && (
              <p>
                <a href={`mailto:${OPERATOR.email}`} className={LINK}>
                  {OPERATOR.email}
                </a>
              </p>
            )}
            {section.items && (
              <ul className="list-disc space-y-1 pl-5">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Page>
  );
}

/** The legal notice. Its text is in this file's chunk, so the first load stays small. */
export function ImprintPage() {
  // Reading the language from the hook makes the page follow a language change.
  useTranslation();
  return <LegalView document={CONTENT[currentLanguage()].imprint} />;
}

export function PrivacyPage() {
  useTranslation();
  return <LegalView document={CONTENT[currentLanguage()].privacy} />;
}
