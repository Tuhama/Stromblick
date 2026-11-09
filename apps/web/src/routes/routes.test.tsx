import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/render";

describe("routes", () => {
  it("shows the overview at /, with its link marked as the current page", async () => {
    renderApp("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("API status: ok")).toBeInTheDocument();
  });

  it.each([
    ["/tomorrow", "Tomorrow"],
    ["/explorer", "Explorer"],
    ["/explain", "Explain a day"],
  ])("shows %s", async (path, title) => {
    renderApp(path);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it("navigates with the header links", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await user.click(await screen.findByRole("link", { name: "Tomorrow" }));

    expect(screen.getByRole("heading", { level: 1, name: "Tomorrow" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tomorrow" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("sets the browser tab title per page", async () => {
    renderApp("/explorer");
    await waitFor(() => {
      expect(document.title).toBe("Explorer · Stromblick");
    });
  });

  it("shows a not-found page inside the layout for unknown paths", async () => {
    renderApp("/does-not-exist");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the overview" })).toHaveAttribute("href", "/");
  });

  it("offers a skip link to the main content", async () => {
    renderApp("/");
    expect(await screen.findByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main",
    );
  });
});
