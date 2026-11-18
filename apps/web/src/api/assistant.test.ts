import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantStreamEvent } from "@stromblick/shared";
import { ApiError } from "./client";
import { streamAnswer } from "./assistant";

afterEach(() => {
  vi.unstubAllGlobals();
});

function sse(...events: object[]): Response {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function collect(iterable: AsyncIterable<AssistantStreamEvent>) {
  const events: AssistantStreamEvent[] = [];
  for await (const event of iterable) events.push(event);
  return events;
}

describe("streamAnswer", () => {
  it("POSTs the question and the history as JSON and yields the events", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(sse({ type: "text", text: "Hi" }, { type: "done", truncated: false })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const history = [{ role: "user" as const, text: "Earlier" }];

    const events = await collect(streamAnswer({ question: "Price?", history }));

    expect(events).toEqual([
      { type: "text", text: "Hi" },
      { type: "done", truncated: false },
    ]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/assistant");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(typeof init?.body === "string" ? init.body : "null")).toEqual({
      question: "Price?",
      history,
    });
  });

  it("throws an ApiError with the problem details for an error status", async () => {
    const problem = { type: "about:blank", title: "Too Many Requests", status: 429 };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json(problem, {
            status: 429,
            headers: { "Content-Type": "application/problem+json" },
          }),
        ),
      ),
    );
    const error = await collect(streamAnswer({ question: "x", history: [] })).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, problem });
  });

  it("passes the abort signal on to fetch", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(sse({ type: "done", truncated: false })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    await collect(streamAnswer({ question: "x", history: [] }, { signal: controller.signal }));
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
