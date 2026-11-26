import { describe, expect, it } from "vitest";
import { REMOVED, pathOf, scrubEvent } from "./error-report";

const QUESTION = "What is my salary at Muster GmbH, Hauptstrasse 1?";
const options = { sensitivePathPrefixes: ["/assistant", "/explain"] };

/** An event as Sentry's SDK builds it, with everything it likes to attach. */
function fullEvent(url: string, message = "Something broke") {
  return {
    event_id: "abc",
    timestamp: 1_700_000_000,
    level: "error",
    platform: "node",
    environment: "production",
    release: "1234abcd",
    server_name: "railway-host-1",
    message: `Failed for: ${QUESTION}`,
    exception: { values: [{ type: "Error", value: message, stacktrace: { frames: [] } }] },
    request: {
      method: "POST",
      url,
      query_string: `q=${QUESTION}`,
      data: { question: QUESTION },
      cookies: { session: "secret" },
      headers: { authorization: "Bearer secret" },
    },
    user: { ip_address: "203.0.113.7", id: "42" },
    extra: { toolArgs: { question: QUESTION } },
    contexts: { device: { name: "laptop" } },
    breadcrumbs: [{ category: "console", message: QUESTION }],
    tags: { request_id: "req-1", source: "http", secret_tag: QUESTION },
    modules: { express: "5.3.0" },
    sdkProcessingMetadata: { normalizedRequest: { data: QUESTION } },
  };
}

describe("scrubEvent", () => {
  it("never lets a visitor's question or tool arguments through", () => {
    const scrubbed = scrubEvent(fullEvent("https://api.example.com/assistant"), options);
    expect(JSON.stringify(scrubbed)).not.toContain("salary");
    expect(JSON.stringify(scrubbed)).not.toContain("Hauptstrasse");
  });

  it("drops what the SDK attaches on its own: bodies, cookies, headers, user, breadcrumbs, extra", () => {
    const scrubbed = scrubEvent(fullEvent("https://api.example.com/series"), options);
    expect(Object.keys(scrubbed).sort()).toEqual([
      "environment",
      "event_id",
      "exception",
      "level",
      "platform",
      "release",
      "request",
      "tags",
      "timestamp",
    ]);
  });

  it("keeps the request ID and the other allowed tags, and only those", () => {
    const scrubbed = scrubEvent(fullEvent("https://api.example.com/series"), options);
    expect(scrubbed.tags).toEqual({ request_id: "req-1", source: "http" });
  });

  it("reduces the request to a method and a URL without a query string", () => {
    const event = fullEvent("https://api.example.com/series?series=price&from=2026-03-01#top");
    expect(scrubEvent(event, options).request).toEqual({
      method: "POST",
      url: "https://api.example.com/series",
    });
  });

  it("keeps the error message and the stack outside the sensitive paths", () => {
    const scrubbed = scrubEvent(
      fullEvent("https://api.example.com/series", "Query timed out"),
      options,
    );
    expect(scrubbed.exception.values[0]).toEqual({
      type: "Error",
      value: "Query timed out",
      stacktrace: { frames: [] },
    });
  });

  it.each([
    "https://api.example.com/assistant",
    "/assistant",
    "https://stromblick.de/explain?day=1",
  ])("removes the error message on %s but keeps the type and the stack", (url) => {
    const scrubbed = scrubEvent(fullEvent(url, `Model failed on: ${QUESTION}`), options);
    expect(scrubbed.exception.values[0]).toEqual({
      type: "Error",
      value: REMOVED,
      stacktrace: { frames: [] },
    });
  });

  it("uses the route tag when the event has no request, as events from the API do", () => {
    const event = {
      tags: { route: "/assistant", request_id: "req-1" },
      exception: { values: [{ type: "Error", value: `Failed on: ${QUESTION}` }] },
    };
    expect(scrubEvent(event, options).exception.values[0]).toEqual({
      type: "Error",
      value: REMOVED,
    });
  });

  it("leaves an exception without a message as it is", () => {
    const event = { exception: { values: [{ type: "TypeError" }] } };
    expect(scrubEvent(event, options).exception.values[0]).toEqual({ type: "TypeError" });
  });

  it("does not add fields to an event that has none", () => {
    expect(scrubEvent({}, options)).toEqual({});
  });
});

describe("pathOf", () => {
  it.each([
    ["https://a.example/assistant?x=1", "/assistant"],
    ["/explain#top", "/explain"],
    [undefined, ""],
  ])("%s -> %s", (url, path) => {
    expect(pathOf(url)).toBe(path);
  });
});
