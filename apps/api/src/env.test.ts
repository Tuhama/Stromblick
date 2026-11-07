import { describe, expect, it } from "vitest";
import { loadEnv, loadScriptEnv } from "./env";

const DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
const INGEST_SECRET = "a".repeat(32);
const required = { DATABASE_URL, INGEST_SECRET };

describe("loadEnv", () => {
  it("applies defaults", () => {
    expect(loadEnv(required)).toMatchObject({
      PORT: 3001,
      CORS_ORIGINS: ["http://localhost:5173"],
    });
  });

  it("parses comma-separated origins", () => {
    const env = loadEnv({ ...required, CORS_ORIGINS: "https://a.example, https://b.example" });
    expect(env.CORS_ORIGINS).toEqual(["https://a.example", "https://b.example"]);
  });

  it("rejects an invalid port", () => {
    expect(() => loadEnv({ ...required, PORT: "abc" })).toThrow(/PORT/);
  });

  it("requires a postgres DATABASE_URL", () => {
    expect(() => loadEnv({ INGEST_SECRET })).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ INGEST_SECRET, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("requires an ingest secret of at least 32 characters", () => {
    expect(() => loadEnv({ DATABASE_URL })).toThrow(/INGEST_SECRET/);
    expect(() => loadEnv({ DATABASE_URL, INGEST_SECRET: "too-short" })).toThrow(/INGEST_SECRET/);
  });
});

describe("loadScriptEnv", () => {
  it("needs only DATABASE_URL", () => {
    expect(loadScriptEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: "development",
      LOG_LEVEL: "info",
      DATABASE_URL,
    });
  });

  it("still requires a postgres DATABASE_URL", () => {
    expect(() => loadScriptEnv({})).toThrow(/DATABASE_URL/);
  });
});
