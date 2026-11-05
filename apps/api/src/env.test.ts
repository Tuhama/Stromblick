import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

describe("loadEnv", () => {
  it("applies defaults", () => {
    expect(loadEnv({ DATABASE_URL })).toMatchObject({
      PORT: 3001,
      CORS_ORIGINS: ["http://localhost:5173"],
    });
  });

  it("parses comma-separated origins", () => {
    const env = loadEnv({ DATABASE_URL, CORS_ORIGINS: "https://a.example, https://b.example" });
    expect(env.CORS_ORIGINS).toEqual(["https://a.example", "https://b.example"]);
  });

  it("rejects an invalid port", () => {
    expect(() => loadEnv({ DATABASE_URL, PORT: "abc" })).toThrow(/PORT/);
  });

  it("requires a postgres DATABASE_URL", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/DATABASE_URL/);
  });
});
