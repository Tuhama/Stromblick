import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LANGUAGE_STORAGE_KEY } from "../i18n";
import { renderApp } from "../test/render";

describe("LanguageSelect", () => {
  it("switches the whole page to German and remembers it", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await user.selectOptions(await screen.findByLabelText("Language"), "de");

    expect(screen.getByRole("heading", { level: 1, name: "Überblick" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Morgen" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("de");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("de");
  });
});
