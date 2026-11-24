import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/render";

describe("Footer", () => {
  it("credits the data source with its licence", async () => {
    renderApp("/does-not-exist");

    expect(
      await screen.findByRole("link", { name: "Bundesnetzagentur | SMARD.de" }),
    ).toHaveAttribute("href", "https://www.smard.de/");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by/4.0/deed.en",
    );
  });

  it("links the licence in German for German readers", async () => {
    await i18n.changeLanguage("de");
    renderApp("/does-not-exist");

    expect(await screen.findByRole("link", { name: "CC BY 4.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by/4.0/deed.de",
    );
  });

  it("links the legal pages from every page, and they open", async () => {
    const user = userEvent.setup();
    renderApp("/does-not-exist");

    await user.click(await screen.findByRole("link", { name: "Legal notice" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Legal notice (Impressum)" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Privacy notice" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Privacy notice" }),
    ).toBeInTheDocument();
  });
});
