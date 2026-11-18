import { describe, expect, it } from "vitest";
import type { AssistantStreamEvent } from "@stromblick/shared";
import { readAssistantStream } from "./assistant-stream";

/** A stream that delivers the given chunks one by one, as a network would. */
function streamOf(...chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<AssistantStreamEvent[]> {
  const events: AssistantStreamEvent[] = [];
  for await (const event of readAssistantStream(stream)) events.push(event);
  return events;
}

const text = (value: string) => `data: ${JSON.stringify({ type: "text", text: value })}\n\n`;
const done = `data: ${JSON.stringify({ type: "done", truncated: false })}\n\n`;

describe("readAssistantStream", () => {
  it("reads events that arrive together in one chunk", async () => {
    expect(await collect(streamOf(text("Hel") + text("lo") + done))).toEqual([
      { type: "text", text: "Hel" },
      { type: "text", text: "lo" },
      { type: "done", truncated: false },
    ]);
  });

  it("waits for the rest of an event that was split across chunks", async () => {
    const whole = text("Hello") + done;
    // Cut in the middle of the JSON, and between the two newlines that end an event.
    const cuts = [10, whole.indexOf("\n\n") + 1];
    const parts = [whole.slice(0, cuts[0]), whole.slice(cuts[0], cuts[1]), whole.slice(cuts[1])];
    expect(await collect(streamOf(...parts))).toEqual([
      { type: "text", text: "Hello" },
      { type: "done", truncated: false },
    ]);
  });

  it("keeps a character together when its bytes arrive in two chunks", async () => {
    const bytes = new TextEncoder().encode(text("Strompreis in € und größer"));
    const middle = bytes.indexOf(0xe2) + 1; // inside the three bytes of "€"
    expect(await collect(streamOf(bytes.slice(0, middle), bytes.slice(middle), done))).toEqual([
      { type: "text", text: "Strompreis in € und größer" },
      { type: "done", truncated: false },
    ]);
  });

  it("ignores comments and unfinished data at the end", async () => {
    const events = await collect(streamOf(": keep-alive\n\n", text("Hi"), 'data: {"type":"te'));
    expect(events).toEqual([{ type: "text", text: "Hi" }]);
  });

  it("throws when an event breaks the contract", async () => {
    await expect(collect(streamOf('data: {"type":"ping"}\n\n'))).rejects.toThrow();
    await expect(collect(streamOf("data: not json\n\n"))).rejects.toThrow();
  });

  it("cancels the download when the reader stops early", async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode(text("more")));
      },
      cancel() {
        cancelled = true;
      },
    });
    for await (const event of readAssistantStream(stream)) {
      expect(event.type).toBe("text");
      break;
    }
    expect(cancelled).toBe(true);
  });
});
