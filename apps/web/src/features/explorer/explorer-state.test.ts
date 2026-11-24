import { describe, expect, it } from "vitest";
import { parseView, viewToParams } from "./explorer-state";

const TODAY = "2026-11-24";

function parse(query: string) {
  return parseView(new URLSearchParams(query), TODAY);
}

describe("parseView", () => {
  it("reads the series, the range and the last day", () => {
    expect(parse("series=generation-solar&range=month&end=2026-11-20")).toEqual({
      series: "generation-solar",
      range: "month",
      end: "2026-11-20",
    });
  });

  it("shows the latest week of the day-ahead price when the link says nothing", () => {
    expect(parse("")).toEqual({ series: "price-day-ahead", range: "week", end: TODAY });
  });

  it("falls back on each part on its own", () => {
    expect(parse("series=Not%20A%20Key&range=month&end=2026-11-20")).toEqual({
      series: "price-day-ahead",
      range: "month",
      end: "2026-11-20",
    });
    expect(parse("series=load&range=century&end=2026-11-20").range).toBe("week");
    expect(parse("series=load&range=day&end=yesterday").end).toBe(TODAY);
    expect(parse("end=2026-02-30").end).toBe(TODAY);
  });

  it("does not look into the future", () => {
    expect(parse("end=2026-11-25").end).toBe(TODAY);
    expect(parse("end=2999-01-01").end).toBe(TODAY);
    expect(parse("end=2026-11-24").end).toBe(TODAY);
  });
});

describe("viewToParams", () => {
  it("writes all three parts, so a shared link shows the same days", () => {
    const view = { series: "load", range: "day", end: "2026-11-20" } as const;
    expect(viewToParams(view).toString()).toBe("series=load&range=day&end=2026-11-20");
  });

  it("can be read back", () => {
    const view = { series: "generation-wind-onshore", range: "year", end: "2026-05-01" } as const;
    expect(parseView(viewToParams(view), TODAY)).toEqual(view);
  });
});
