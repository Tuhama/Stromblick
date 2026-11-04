import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("applies defaults", () => {
    expect(loadEnv({})).toMatchObject({ PORT: 3001, CORS_ORIGINS: ["http://localhost:5173"] });
  });

  it("parses comma-separated origins", () => {
    const env = loadEnv({ CORS_ORIGINS: "https://a.example, https://b.example" });
    expect(env.CORS_ORIGINS).toEqual(["https://a.example", "https://b.example"]);
  });

  it("rejects an invalid port", () => {
    expect(() => loadEnv({ PORT: "abc" })).toThrow(/PORT/);
  });
});
