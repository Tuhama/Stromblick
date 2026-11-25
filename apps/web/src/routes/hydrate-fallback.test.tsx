import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderApp } from "../test/render";

// React Router warns about a missing HydrateFallback only once per module, so this test has its own
// file: in routes.test.tsx an earlier test would use up the warning and this one would always pass.
it("opens a lazily loaded page straight from the address bar without a console warning", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  renderApp("/impressum");
  await screen.findByRole("heading", { level: 1 });
  expect(warn).not.toHaveBeenCalled();
});
