import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChartPanel } from "./ChartPanel";

describe("ChartPanel", () => {
  it("shows its children when ready", () => {
    render(<ChartPanel status="ready">the chart</ChartPanel>);
    expect(screen.getByText("the chart")).toBeInTheDocument();
  });

  it("announces loading politely, and shows no chart", () => {
    render(<ChartPanel status="loading">the chart</ChartPanel>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the chart…");
    expect(screen.queryByText("the chart")).not.toBeInTheDocument();
  });

  it("says when there is nothing to show", () => {
    render(<ChartPanel status="empty">the chart</ChartPanel>);
    expect(screen.getByText("There is no data to show.")).toBeInTheDocument();
  });

  it("uses a page's own words when it has them", () => {
    render(
      <ChartPanel status="empty" messages={{ empty: "No prices yet." }}>
        the chart
      </ChartPanel>,
    );
    expect(screen.getByText("No prices yet.")).toBeInTheDocument();
  });

  it("offers a retry on an error, and only when it can retry", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ChartPanel status="error" onRetry={onRetry}>
        the chart
      </ChartPanel>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The chart couldn't be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<ChartPanel status="error">the chart</ChartPanel>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
