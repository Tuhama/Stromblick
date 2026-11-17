import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render";

// The price section crashes while rendering; the other sections must not notice.
vi.mock("./PriceToday", () => ({
  PriceToday: (): never => {
    throw new Error("boom");
  },
}));

describe("overview error boundaries", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the other sections working when one crashes", async () => {
    renderApp("/");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "“Day-ahead price today” couldn't be shown.",
    );
    // The renewable share and the generation chart still load their data.
    expect(await screen.findByText("55%")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "generation chart" })).toBeInTheDocument();
    // The navigation and the page heading are untouched.
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
  });
});
