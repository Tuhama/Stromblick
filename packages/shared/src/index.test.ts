import { describe, expect, it } from "vitest";
import { HealthResponse, ProblemDetails } from "./index";

describe("HealthResponse", () => {
  it("accepts a valid response", () => {
    expect(HealthResponse.parse({ status: "ok", service: "api", database: "ok" })).toBeTruthy();
  });

  it("rejects an invalid status", () => {
    expect(() =>
      HealthResponse.parse({ status: "down", service: "api", database: "ok" }),
    ).toThrow();
  });

  it("requires the database field", () => {
    expect(() => HealthResponse.parse({ status: "ok", service: "api" })).toThrow();
  });
});

describe("ProblemDetails", () => {
  it("accepts the minimal RFC 9457 fields", () => {
    expect(
      ProblemDetails.parse({ type: "about:blank", title: "Not Found", status: 404 }),
    ).toBeTruthy();
  });

  it("rejects a non-integer status", () => {
    expect(() =>
      ProblemDetails.parse({ type: "about:blank", title: "Error", status: 4.5 }),
    ).toThrow();
  });
});
