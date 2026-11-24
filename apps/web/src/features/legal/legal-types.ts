/** One block of a legal page: a heading and what goes under it. */
export interface LegalSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  /** A bulleted list, shown after the paragraphs. */
  items?: string[];
  /** Shows the operator's name and postal address. */
  address?: boolean;
  /** Shows the contact email as a link. */
  email?: boolean;
}

/** A legal page in one language. Both languages must have the same sections in the same order. */
export interface LegalDocument {
  title: string;
  intro: string;
  /** For example "As of 24 November 2026". */
  asOf: string;
  sections: LegalSection[];
}

export interface LegalContent {
  imprint: LegalDocument;
  privacy: LegalDocument;
}
