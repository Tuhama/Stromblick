import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSentryReporter } from "./sentry-reporter";

const QUESTION = "What is my salary at Muster GmbH, Hauptstrasse 1?";

/** A stand-in for Sentry: collects what the SDK sends, so the test sees what would leave the server. */
let server: Server;
const received: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      // The SDK may compress the envelope.
      const body = req.headers["content-encoding"] === "gzip" ? gunzipSync(raw) : raw;
      received.push(body.toString("utf8"));
      res.statusCode = 200;
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("the Sentry reporter, with the real SDK", () => {
  it("sends the request ID, and leaves the visitor's question out", async () => {
    const port = (server.address() as AddressInfo).port;
    const reporter = createSentryReporter({
      dsn: `http://publickey@127.0.0.1:${String(port)}/1`,
      environment: "test",
    });

    reporter.report(new Error(`The model failed on: ${QUESTION}`), {
      source: "http",
      route: "/assistant",
      requestId: "req-1234",
    });
    reporter.report(new Error("The database timed out"), {
      source: "http",
      route: "/series",
      requestId: "req-5678",
    });
    await reporter.flush(5000);

    const everything = received.join("\n");
    expect(everything).toContain("req-1234");
    expect(everything).toContain("req-5678");
    // An error from an ordinary route keeps its message.
    expect(everything).toContain("The database timed out");
    // A question never leaves, neither whole nor in part.
    expect(everything).not.toContain("salary");
    expect(everything).not.toContain("Hauptstrasse");
    expect(everything).not.toContain("Muster");
  });
});
