import { describe, expect, it } from "vitest";
import { HealthResponse } from "./index";

describe("HealthResponse", () => {
    it("accepts a valid response", () => {
        expect(HealthResponse.parse({ status: "ok", service: "api" })).toBeTruthy();
    });
    it("rejects an invalid status", () => {
        expect(() => HealthResponse.parse({ status: "down", service: "api" })).toThrow();
    });
});