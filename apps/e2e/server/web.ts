import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingHttpHeaders } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { z } from "zod";

/**
 * Serves the built web app the way Vercel does, from the same vercel.json: its headers (the Content
 * Security Policy above all) go on every response, /api/* goes to the API, and every other path that
 * is not a file gets index.html. The tests thus check the policy that ships, not a copy of it.
 *
 * Needs `pnpm --filter @stromblick/web build` first. Test-only: nothing deploys this.
 */
const webRoot = resolve(import.meta.dirname, "../../web");
const dist = join(webRoot, "dist");
const port = Number(process.env.E2E_WEB_PORT ?? 4173);
const apiOrigin = process.env.E2E_API_URL ?? "http://localhost:3101";

const VercelConfig = z.object({
  rewrites: z.array(z.object({ source: z.string(), destination: z.string() })),
  headers: z.array(
    z.object({
      source: z.string(),
      headers: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
});
const config = VercelConfig.parse(JSON.parse(readFileSync(join(webRoot, "vercel.json"), "utf8")));

// This server understands exactly the shape vercel.json has today. Anything else fails loudly, so a
// change to the file cannot silently stop being tested.
const API_SOURCE = "/api/:path*";
const SPA_SOURCE = "/(.*)";
if (
  !config.rewrites.some((entry) => entry.source === API_SOURCE) ||
  !config.rewrites.some(
    (entry) => entry.source === SPA_SOURCE && entry.destination === "/index.html",
  )
) {
  throw new Error(`vercel.json needs the rewrites ${API_SOURCE} and ${SPA_SOURCE} -> /index.html`);
}
const headerGroup = config.headers.find((entry) => entry.source === SPA_SOURCE);
if (!headerGroup) throw new Error(`vercel.json needs headers for ${SPA_SOURCE}`);
const securityHeaders = headerGroup.headers;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Request headers that must not be copied to the API: the connection's own. */
const HOP_BY_HOP = new Set(["host", "connection", "content-length", "transfer-encoding"]);

function forwardedHeaders(incoming: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming)) {
    if (HOP_BY_HOP.has(name) || value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

/** The file for a URL path, or undefined (also for paths that try to leave dist). */
function fileFor(pathname: string): string | undefined {
  const target = normalize(join(dist, decodeURIComponent(pathname)));
  if (!target.startsWith(dist)) return undefined;
  return existsSync(target) && statSync(target).isFile() ? target : undefined;
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", "http://localhost");
    for (const { key, value } of securityHeaders) res.setHeader(key, value);

    if (url.pathname.startsWith("/api/")) {
      const method = req.method ?? "GET";
      const chunks: Buffer[] = [];
      if (method !== "GET" && method !== "HEAD") {
        for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
      }
      const upstream = await fetch(
        `${apiOrigin}${url.pathname.slice("/api".length)}${url.search}`,
        {
          method,
          headers: forwardedHeaders(req.headers),
          // Requests are small JSON bodies. Only the answer (server-sent events) is streamed.
          body: chunks.length > 0 ? new Uint8Array(Buffer.concat(chunks)) : undefined,
        },
      );
      const headers: Record<string, string> = {};
      upstream.headers.forEach((value, name) => {
        if (
          !["content-encoding", "content-length", "transfer-encoding", "connection"].includes(name)
        ) {
          headers[name] = value;
        }
      });
      res.writeHead(upstream.status, headers);
      if (upstream.body) {
        // Chunk by chunk, so the server-sent events of the assistant arrive as they are written.
        const reader = upstream.body.getReader();
        res.on("close", () => void reader.cancel().catch(() => undefined));
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
      return;
    }

    const file = fileFor(url.pathname) ?? join(dist, "index.html");
    res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(res);
  })().catch((error: unknown) => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`The test web server failed: ${String(error)}`);
  });
});

server.listen(port, () => {
  console.log(`Web app (dist + vercel.json) on http://localhost:${String(port)}, API ${apiOrigin}`);
});
process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
