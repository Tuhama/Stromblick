import {
  ApiError,
  FinishReason,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";
import { describe, expect, it } from "vitest";
import { createGeminiClient, toContents, type GeminiModels } from "./gemini-client";
import { LlmError, type LlmEvent, type LlmRequest } from "./llm-client";

// These responses are written by hand in Gemini's format. They are NOT recorded from the live service.
function chunk(parts: object[], finishReason?: FinishReason): GenerateContentResponse {
  return {
    candidates: [{ content: { role: "model", parts }, finishReason }],
  } as GenerateContentResponse;
}

function fakeModels(
  chunks: GenerateContentResponse[],
  seen: GenerateContentParameters[] = [],
): GeminiModels {
  return {
    generateContentStream: (params) => {
      seen.push(params);
      return Promise.resolve(
        (async function* () {
          await Promise.resolve();
          for (const c of chunks) yield c;
        })(),
      );
    },
  };
}

const request: LlmRequest = {
  system: "system text",
  messages: [{ role: "user", text: "Hi" }],
  tools: [{ name: "list_series", description: "d", parameters: { type: "object" } }],
  maxOutputTokens: 800,
};

async function collect(iterable: AsyncIterable<LlmEvent>): Promise<LlmEvent[]> {
  const events: LlmEvent[] = [];
  for await (const event of iterable) events.push(event);
  return events;
}

describe("toContents", () => {
  it("maps user, assistant and tool messages, merging consecutive tool results", () => {
    const contents = toContents([
      { role: "user", text: "q" },
      {
        role: "assistant",
        text: "",
        toolCalls: [
          { id: "a", name: "list_series", args: {} },
          { id: "b", name: "get_status", args: {} },
        ],
      },
      { role: "tool", callId: "a", name: "list_series", result: '{"x":1}' },
      { role: "tool", callId: "b", name: "get_status", result: "[1,2]" },
    ]);
    expect(contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(contents[2]?.parts).toEqual([
      { functionResponse: { id: "a", name: "list_series", response: { x: 1 } } },
      { functionResponse: { id: "b", name: "get_status", response: { output: [1, 2] } } },
    ]);
  });

  it("returns the provider's own parts unchanged", () => {
    const parts = [{ functionCall: { name: "x", args: {} }, thoughtSignature: "sig" }];
    const contents = toContents([
      { role: "assistant", text: "", toolCalls: [], providerData: parts },
    ]);
    expect(contents[0]?.parts).toBe(parts);
  });
});

describe("createGeminiClient", () => {
  it("streams text, skips thoughts and ends with the stop reason and provider data", async () => {
    const seen: GenerateContentParameters[] = [];
    const client = createGeminiClient({
      model: "m",
      models: fakeModels(
        [
          chunk([{ text: "thinking", thought: true }, { text: "Hel" }]),
          chunk([{ text: "lo" }], FinishReason.STOP),
        ],
        seen,
      ),
    });
    const events = await collect(client.stream(request));
    expect(events.filter((e) => e.type === "text")).toEqual([
      { type: "text", text: "Hel" },
      { type: "text", text: "lo" },
    ]);
    const end = events.at(-1);
    expect(end).toMatchObject({ type: "end", reason: "stop" });
    expect(
      end?.type === "end" && Array.isArray(end.providerData) ? end.providerData : [],
    ).toHaveLength(3);
    expect(seen[0]?.model).toBe("m");
    expect(seen[0]?.config?.systemInstruction).toBe("system text");
    expect(seen[0]?.config?.maxOutputTokens).toBe(800);
    expect(seen[0]?.config?.httpOptions?.retryOptions?.attempts).toBe(1);
  });

  it("turns a function call into a tool_call event and makes up an id when missing", async () => {
    const client = createGeminiClient({
      model: "m",
      models: fakeModels([
        chunk([{ functionCall: { name: "get_status", args: { a: 1 } } }], FinishReason.STOP),
      ]),
    });
    const events = await collect(client.stream(request));
    expect(events[0]).toEqual({
      type: "tool_call",
      call: { id: "call-1", name: "get_status", args: { a: 1 } },
    });
  });

  it("sends no tools entry when there are no tools", async () => {
    const seen: GenerateContentParameters[] = [];
    const client = createGeminiClient({
      model: "m",
      models: fakeModels([chunk([{ text: "x" }])], seen),
    });
    await collect(client.stream({ ...request, tools: [] }));
    expect(seen[0]?.config?.tools).toBeUndefined();
  });

  it("reports MAX_TOKENS as length", async () => {
    const client = createGeminiClient({
      model: "m",
      models: fakeModels([chunk([{ text: "cut" }], FinishReason.MAX_TOKENS)]),
    });
    expect((await collect(client.stream(request))).at(-1)).toMatchObject({ reason: "length" });
  });

  it("reports a safety stop as a blocked error", async () => {
    const client = createGeminiClient({
      model: "m",
      models: fakeModels([chunk([], FinishReason.SAFETY)]),
    });
    await expect(collect(client.stream(request))).rejects.toMatchObject({ kind: "blocked" });
  });

  it.each([
    [429, "rate_limited"],
    [503, "unavailable"],
    [400, "failed"],
  ])("maps an API error %i to %s", async (status, kind) => {
    const client = createGeminiClient({
      model: "m",
      models: {
        generateContentStream: () =>
          Promise.reject(new ApiError({ message: "secret detail", status })),
      },
    });
    const error = await collect(client.stream(request)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LlmError);
    expect(error).toMatchObject({ kind });
    expect((error as Error).message).not.toContain("secret detail");
  });

  it("lets an abort through unchanged", async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new Error("aborted");
    const client = createGeminiClient({
      model: "m",
      models: { generateContentStream: () => Promise.reject(abort) },
    });
    await expect(collect(client.stream({ ...request, signal: controller.signal }))).rejects.toBe(
      abort,
    );
  });
});
