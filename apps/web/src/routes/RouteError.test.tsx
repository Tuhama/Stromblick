import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as reporting from "../observability/report-error";
import { RouteError } from "./RouteError";

function Broken(): never {
  throw new Error("page crashed");
}

describe("RouteError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the error page and reports the error that the page threw", () => {
    // React and the router both log a crash; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = vi.spyOn(reporting, "reportError").mockImplementation(() => undefined);
    const router = createMemoryRouter([
      { path: "/", element: <Broken />, errorElement: <RouteError /> },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(report).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: "page crashed" }),
    );
  });
});
