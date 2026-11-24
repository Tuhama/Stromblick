import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/render";
import { contentDe } from "./content-de";
import { contentEn } from "./content-en";
import type { LegalDocument } from "./legal-types";
import { OPERATOR } from "./operator";

describe("legal content", () => {
  const pages = ["imprint", "privacy"] as const;

  it.each(pages)("has the same sections in the same order in both languages (%s)", (page) => {
    const ids = (document: LegalDocument) => document.sections.map((section) => section.id);
    expect(ids(contentDe[page])).toEqual(ids(contentEn[page]));
  });

  it.each(pages)("gives every section something to show (%s)", (page) => {
    for (const content of [contentEn, contentDe]) {
      for (const section of content[page].sections) {
        const shown =
          (section.paragraphs?.length ?? 0) +
          (section.items?.length ?? 0) +
          (section.address ? 1 : 0) +
          (section.email ? 1 : 0);
        expect(shown, section.id).toBeGreaterThan(0);
      }
    }
  });
});

describe("the legal notice", () => {
  it("shows who runs the site and how to reach them", async () => {
    renderApp("/impressum");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Legal notice (Impressum)" }),
    ).toBeInTheDocument();
    const provider = screen.getByRole("region", { name: "Information according to § 5 DDG" });
    expect(within(provider).getByText(/Tuhama Qlyshi/)).toBeInTheDocument();
    expect(within(provider).getByText(/Mathilde-Rösch-Straße 5/)).toBeInTheDocument();
    expect(within(provider).getByText(/63263 Neu-Isenburg/)).toBeInTheDocument();
    expect(within(provider).getByText(/Germany/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: OPERATOR.email })).toHaveAttribute(
      "href",
      `mailto:${OPERATOR.email}`,
    );
  });

  it("is written in German when German is chosen, and keeps its address", async () => {
    await i18n.changeLanguage("de");
    renderApp("/impressum");

    expect(await screen.findByRole("heading", { level: 1, name: "Impressum" })).toBeInTheDocument();
    const provider = screen.getByRole("region", { name: "Angaben gemäß § 5 DDG" });
    expect(within(provider).getByText(/Deutschland/)).toBeInTheDocument();
    expect(screen.getByText("Stand: 24. November 2026")).toBeInTheDocument();
  });

  it("sets the tab title", async () => {
    renderApp("/impressum");
    await waitFor(() => {
      expect(document.title).toBe("Legal notice (Impressum) · Stromblick");
    });
  });
});

describe("the privacy notice", () => {
  it("names the controller and the authority to complain to", async () => {
    renderApp("/datenschutz");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Privacy notice" }),
    ).toBeInTheDocument();
    const controller = screen.getByRole("region", { name: "Who is responsible" });
    expect(within(controller).getByText(/Mathilde-Rösch-Straße 5/)).toBeInTheDocument();
    expect(screen.getByText(/Postfach 3163, 65021 Wiesbaden/)).toBeInTheDocument();
  });

  it("tells what the assistant sends to Google", async () => {
    renderApp("/datenschutz");

    const assistant = await screen.findByRole("region", { name: "AI assistant" });
    expect(within(assistant).getByText(/up to ten earlier messages/)).toBeInTheDocument();
    expect(
      within(assistant).getByText(/does not use your prompts and answers/),
    ).toBeInTheDocument();
  });

  it("follows a language change without a reload", async () => {
    const user = userEvent.setup();
    renderApp("/datenschutz");
    await screen.findByRole("heading", { level: 1, name: "Privacy notice" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "de");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Datenschutzerklärung" }),
    ).toBeInTheDocument();
  });
});
