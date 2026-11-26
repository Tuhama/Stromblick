import { flush } from "@sentry/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSink } from "./sentry-client";

const QUESTION = "What is my salary at Muster GmbH, Hauptstrasse 1?";

let sent: string[];

beforeEach(() => {
  sent = [];
  // Sentry's browser transport posts the envelope with fetch: catch it instead of sending it.
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      const body = init?.body;
      sent.push(typeof body === "string" ? body : new TextDecoder().decode(body as Uint8Array));
      return Promise.resolve(new Response("{}", { status: 200 }));
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});

describe("the Sentry sink, with the real SDK", () => {
  it("sends the request ID and the route, and leaves a typed question and the query string out", async () => {
    window.history.pushState({}, "", `/explain?question=${encodeURIComponent(QUESTION)}`);
    const report = createSink("https://publickey@o1.ingest.de.sentry.io/1");

    report(new Error(`The answer failed on: ${QUESTION}`), { requestId: "req-1234" });
    await flush(2000);

    const everything = sent.join("\n");
    expect(everything).toContain("req-1234");
    expect(everything).toContain('"route":"/explain"');
    expect(everything).not.toContain("salary");
    expect(everything).not.toContain("Hauptstrasse");
    expect(everything).not.toContain("question=");
  });

  it("keeps the error message on other pages", async () => {
    window.history.pushState({}, "", "/explorer?series=price-day-ahead");
    const report = createSink("https://publickey@o1.ingest.de.sentry.io/1");

    report(new Error("A chart could not start"), { feature: "explorer" });
    await flush(2000);

    const everything = sent.join("\n");
    expect(everything).toContain("A chart could not start");
    expect(everything).toContain('"feature":"explorer"');
    expect(everything).not.toContain("series=price-day-ahead");
  });
});
