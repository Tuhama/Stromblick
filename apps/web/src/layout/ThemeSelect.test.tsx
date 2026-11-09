import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockSystemTheme } from "../test/media";
import { renderApp } from "../test/render";
import { THEME_STORAGE_KEY } from "../theme/theme";

const html = document.documentElement;

describe("ThemeSelect", () => {
  it("follows the system by default", async () => {
    mockSystemTheme("dark");
    renderApp("/");

    expect(await screen.findByLabelText("Color theme")).toHaveValue("system");
    expect(html).toHaveClass("dark");
  });

  it("switches to dark and back to light, and remembers the choice", async () => {
    const user = userEvent.setup();
    renderApp("/");
    const select = await screen.findByLabelText("Color theme");

    await user.selectOptions(select, "dark");
    expect(html).toHaveClass("dark");
    expect(html.style.colorScheme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await user.selectOptions(select, "light");
    expect(html).not.toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("starts with the theme chosen on an earlier visit", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    renderApp("/");

    expect(await screen.findByLabelText("Color theme")).toHaveValue("dark");
    expect(html).toHaveClass("dark");
  });

  it("ignores a broken stored value", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "purple");
    renderApp("/");

    expect(await screen.findByLabelText("Color theme")).toHaveValue("system");
  });
});
