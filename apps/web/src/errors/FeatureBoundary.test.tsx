import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as reporting from "../observability/report-error";
import { FeatureBoundary } from "./FeatureBoundary";

function Broken(): never {
  throw new Error("boom");
}

describe("FeatureBoundary", () => {
  beforeEach(() => {
    // React and the boundary both log a crash; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows its children while nothing fails", () => {
    render(
      <FeatureBoundary feature="demo" label="Demo">
        <p>all good</p>
      </FeatureBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports the crash with the name of the feature", () => {
    const report = vi.spyOn(reporting, "reportError").mockImplementation(() => undefined);
    render(
      <FeatureBoundary feature="generation" label="Generation">
        <Broken />
      </FeatureBoundary>,
    );
    expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: "boom" }), {
      feature: "generation",
    });
  });

  it("replaces only the broken feature, and names it", () => {
    render(
      <>
        <FeatureBoundary feature="demo" label="Demo chart">
          <Broken />
        </FeatureBoundary>
        <p>the rest of the page</p>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("“Demo chart” couldn't be shown.");
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeInTheDocument();
    expect(screen.getByText("the rest of the page")).toBeInTheDocument();
  });

  it("logs the crash with the feature's name, so it can be found", () => {
    render(
      <FeatureBoundary feature="demo" label="Demo">
        <Broken />
      </FeatureBoundary>,
    );
    expect(console.error).toHaveBeenCalledWith(
      "[demo] crashed while rendering",
      expect.any(Error),
      expect.any(String),
    );
  });
});
