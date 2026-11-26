import { describe, expect, it } from "vitest";
import { z } from "zod";
import vercelJson from "../../vercel.json?raw";

const Header = z.object({ key: z.string(), value: z.string() });
const VercelConfig = z.object({
  rewrites: z.array(z.object({ source: z.string(), destination: z.string() })),
  headers: z.array(z.object({ source: z.string(), headers: z.array(Header) })),
});

const config = VercelConfig.parse(JSON.parse(vercelJson));

/** The Content Security Policy that Vercel sends with every page, as { directive: sources }. */
function readPolicy() {
  const header = config.headers
    .find((entry) => entry.source === "/(.*)")
    ?.headers.find((item) => item.key === "Content-Security-Policy");
  if (!header) throw new Error("vercel.json sends no enforced Content-Security-Policy for /(.*)");
  const directives = new Map<string, string[]>();
  for (const part of header.value.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives.set(name, sources);
  }
  return { key: header.key, directives };
}

describe("the Content Security Policy in vercel.json", () => {
  const { directives } = readPolicy();

  it("allows scripts and styles only from the site itself", () => {
    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("script-src")).toEqual(["'self'"]);
    expect(directives.get("style-src")).toEqual(["'self'"]);
  });

  it("never allows inline or eval code", () => {
    const all = [...directives.values()].flat();
    expect(all).not.toContain("'unsafe-inline'");
    expect(all).not.toContain("'unsafe-eval'");
    expect(all).not.toContain("*");
  });

  it("shuts the doors the app does not use", () => {
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'self'"]);
    expect(directives.get("form-action")).toEqual(["'self'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("lets the browser call the API that the /api rewrite points to, and Sentry's EU address", () => {
    const rewrite = config.rewrites.find((entry) => entry.source === "/api/:path*");
    if (!rewrite) throw new Error("vercel.json has no /api rewrite");
    const apiOrigin = new URL(rewrite.destination.replace(":path*", "")).origin;
    // Exact host, no wildcard: it is the ingest address of the stromblick-web project's DSN.
    expect(directives.get("connect-src")).toEqual([
      "'self'",
      apiOrigin,
      "https://o4512498602344448.ingest.de.sentry.io",
    ]);
  });
});
