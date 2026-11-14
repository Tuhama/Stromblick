import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { convertPrice, PRICE_UNIT_STORAGE_KEY, usePriceUnit } from "./price-unit";

describe("convertPrice", () => {
  it("keeps the market's unit as it is", () => {
    expect(convertPrice(98.5, "EUR/MWh")).toBe(98.5);
  });

  it("turns EUR/MWh into ct/kWh", () => {
    expect(convertPrice(98.5, "ct/kWh")).toBeCloseTo(9.85);
    expect(convertPrice(-5.5, "ct/kWh")).toBeCloseTo(-0.55);
  });
});

describe("usePriceUnit", () => {
  it("starts with the market's unit", () => {
    const { result } = renderHook(() => usePriceUnit());
    expect(result.current.unit).toBe("EUR/MWh");
  });

  it("remembers the chosen unit", () => {
    const { result } = renderHook(() => usePriceUnit());

    act(() => {
      result.current.setUnit("ct/kWh");
    });

    expect(result.current.unit).toBe("ct/kWh");
    expect(localStorage.getItem(PRICE_UNIT_STORAGE_KEY)).toBe("ct/kWh");
    expect(renderHook(() => usePriceUnit()).result.current.unit).toBe("ct/kWh");
  });

  it("falls back to the market's unit when storage holds something else", () => {
    localStorage.setItem(PRICE_UNIT_STORAGE_KEY, "USD/barrel");
    const { result } = renderHook(() => usePriceUnit());
    expect(result.current.unit).toBe("EUR/MWh");
  });
});
