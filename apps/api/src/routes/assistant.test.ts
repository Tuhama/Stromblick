import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AssistantStreamEvent, ProblemDetails } from "@stromblick/shared";
import { createApp } from "../app";
import { scriptedLlm } from "../assistant/fake-llm";
import { LlmError, type LlmClient } from "../assistant/llm-client";
import { createModelBudget, type ModelBudget } from "../assistant/model-budget";
import type { AssistantTool } from "../assistant/tools";
import type { ErrorReporter } from "../observability/error-reporter";
import { recordingReporter } from "../observability/recording-reporter";

const tool: AssistantTool = {
  spec: { name: "get_value", description: "d", parameters: { type: "object" } },
  run: () => Promise.resolve('{"value":42}'),
};

function appWith(
  llm: LlmClient,
  options: {
    questionsPerMinute?: number;
    perMinute?: number;
    perDay?: number;
    budget?: ModelBudget;
    reporter?: ErrorReporter;
  } = {},
) {
  const logger = pino({ level: "silent" });
  return createApp({
    logger,
    corsOrigins: ["https://site.example"],
    checkDatabase: () => Promise.resolve(),
    ingest: { secret: "x".repeat(32), run: () => Promise.reject(new Error("not used")) },
    readings: () => Promise.resolve([]),
    status: () => Promise.resolve({ lastSuccessAt: null, lastRun: null, latestReadings: {} }),
    assistant: {
      llm,
      tools: [tool],
      logger,
      budget:
        options.budget ??
        createModelBudget({ perMinute: options.perMinute ?? 100, perDay: options.perDay ?? 1000 }),
      questionsPerMinute: options.questionsPerMinute ?? 100,
      ...(options.reporter ? { reporter: options.reporter } : {}),
    },
  });
}

/** The events of a finished stream: every `data:` line is one JSON event. */
function parseEvents(text: string): AssistantStreamEvent[] {
  return text
    .split("\n\n")
    .filter((block) => block.startsWith("data: "))
    .map((block) => AssistantStreamEvent.parse(JSON.parse(block.slice("data: ".length))));
}

const ask = (app: ReturnType<typeof appWith>, body: unknown = { question: "Price today?" }) =>
  request(app)
    .post("/assistant")
    .send(body as object);

describe("POST /assistant", () => {
  it("streams the answer as server-sent events and runs the tools it asks for", async () => {
    const llm = scriptedLlm([
      { calls: [{ name: "get_value", args: {} }] },
      { text: ["It is ", "42."] },
    ]);
    const res = await ask(appWith(llm));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.headers["cache-control"]).toContain("no-cache");
    expect(parseEvents(res.text)).toEqual([
      { type: "tool", name: "get_value" },
      { type: "text", text: "It is " },
      { type: "text", text: "42." },
      { type: "done", truncated: false },
    ]);
  });

  it("sends the question and the history to the model as user data", async () => {
    const llm = scriptedLlm([{ text: ["Ok."] }]);
    await ask(appWith(llm), {
      question: "  And tomorrow?  ",
      history: [
        { role: "user", text: "Price today?" },
        { role: "assistant", text: "80." },
      ],
    });
    expect(llm.requests[0]?.messages).toMatchObject([
      { role: "user", text: "Price today?" },
      { role: "assistant", text: "80." },
      { role: "user", text: "And tomorrow?" },
    ]);
  });

  it("answers 503 when the assistant is switched off", async () => {
    const app = createApp({
      logger: pino({ level: "silent" }),
      corsOrigins: [],
      checkDatabase: () => Promise.resolve(),
      ingest: { secret: "x".repeat(32), run: () => Promise.reject(new Error("not used")) },
      readings: () => Promise.resolve([]),
      status: () => Promise.resolve({ lastSuccessAt: null, lastRun: null, latestReadings: {} }),
    });
    const res = await request(app).post("/assistant").send({ question: "Hi" });
    expect(res.status).toBe(503);
    expect(ProblemDetails.parse(res.body).detail).toBe("The assistant is switched off");
  });

  it.each([
    ["no question", {}],
    ["an empty question", { question: "   " }],
    ["a question that is too long", { question: "x".repeat(501) }],
    [
      "a history message that is too long",
      { question: "Hi", history: [{ role: "user", text: "x".repeat(2001) }] },
    ],
    [
      "a history entry with an unknown role",
      { question: "Hi", history: [{ role: "system", text: "x" }] },
    ],
  ])("answers 400 for %s, before the model is called", async (_name, body) => {
    const llm = scriptedLlm([]);
    const res = await ask(appWith(llm), body);
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(llm.requests).toHaveLength(0);
  });

  it("limits one visitor and answers 429 with Retry-After", async () => {
    const llm = scriptedLlm([{ text: ["a"] }, { text: ["b"] }, { text: ["c"] }]);
    const app = appWith(llm, { questionsPerMinute: 2 });
    expect((await ask(app).set("X-Real-IP", "203.0.113.5")).status).toBe(200);
    expect((await ask(app).set("X-Real-IP", "203.0.113.5")).status).toBe(200);
    const limited = await ask(app).set("X-Real-IP", "203.0.113.5");
    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    // Another visitor is not affected.
    expect((await ask(app).set("X-Real-IP", "203.0.113.6")).status).toBe(200);
  });

  it("answers 429 before streaming when the shared model budget is used up", async () => {
    const llm = scriptedLlm([]);
    // Another visitor's answer already used the one request of this minute.
    const budget = createModelBudget({ perMinute: 1, perDay: 10 });
    expect(budget.take().ok).toBe(true);
    const res = await ask(appWith(llm, { budget }));
    expect(res.status).toBe(429);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(llm.requests).toHaveLength(0);
  });

  it("sends an error event when the budget runs out in the middle of an answer", async () => {
    // One request fits the minute, but this answer needs two (a tool round, then the text).
    const llm = scriptedLlm([{ calls: [{ name: "get_value", args: {} }] }, { text: ["x"] }]);
    const res = await ask(appWith(llm, { perMinute: 1 }));
    expect(res.status).toBe(200);
    expect(parseEvents(res.text)).toEqual([
      { type: "tool", name: "get_value" },
      { type: "error", code: "rate_limited" },
    ]);
  });

  it("sends an error event when the model ends without any text", async () => {
    const res = await ask(appWith(scriptedLlm([{}])));
    expect(res.status).toBe(200);
    expect(parseEvents(res.text)).toEqual([{ type: "error", code: "failed" }]);
  });

  it("turns a model failure into an error event with a code, without any details", async () => {
    const failing: LlmClient = {
      stream: () => {
        throw new LlmError("unavailable", "The model service is not available", {
          cause: new Error("secret upstream detail"),
        });
      },
    };
    const res = await ask(appWith(failing));
    expect(parseEvents(res.text)).toEqual([{ type: "error", code: "unavailable" }]);
    expect(res.text).not.toContain("secret");
  });

  it("reports an unexpected failure as `failed`", async () => {
    const broken: LlmClient = {
      stream: () => {
        throw new Error("boom");
      },
    };
    const res = await ask(appWith(broken));
    expect(parseEvents(res.text)).toEqual([{ type: "error", code: "failed" }]);
    expect(res.text).not.toContain("boom");
  });

  it("reports an unexpected failure to the reporter, with the route and not the question", async () => {
    const failure = new Error("boom");
    const broken: LlmClient = {
      stream: () => {
        throw failure;
      },
    };
    const { reporter, reports } = recordingReporter();
    const res = await ask(appWith(broken, { reporter }), { question: "What is my salary?" });

    expect(parseEvents(res.text)).toEqual([{ type: "error", code: "failed" }]);
    expect(reports).toEqual([{ error: failure, context: { source: "http", route: "/assistant" } }]);
    expect(JSON.stringify(reports.map((report) => report.context))).not.toContain("salary");
  });

  it("does not report a model failure: it is expected, and only logged", async () => {
    const failing: LlmClient = {
      stream: () => {
        throw new LlmError("unavailable", "The model service is not available");
      },
    };
    const { reporter, reports } = recordingReporter();
    await ask(appWith(failing, { reporter }));
    expect(reports).toEqual([]);
  });

  it("answers a preflight request from an allowed origin, so the site can call it directly", async () => {
    const res = await request(appWith(scriptedLlm([])))
      .options("/assistant")
      .set("Origin", "https://site.example")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("https://site.example");
    expect(res.headers["access-control-allow-headers"]).toContain("content-type");
  });

  it("cancels the model call when the visitor closes the connection", async () => {
    let seenSignal: AbortSignal | undefined;
    let started!: () => void;
    const modelStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const slow: LlmClient = {
      stream(req) {
        seenSignal = req.signal;
        return (async function* () {
          yield { type: "text" as const, text: "Hello" };
          started();
          await new Promise<void>((resolve) => {
            req.signal?.addEventListener("abort", () => {
              resolve();
            });
          });
          yield { type: "end" as const, reason: "stop" as const };
        })();
      },
    };
    const server = appWith(slow).listen(0);
    await once(server, "listening");
    try {
      const { port } = server.address() as AddressInfo;
      const controller = new AbortController();
      const response = await fetch(`http://127.0.0.1:${String(port)}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Hi" }),
        signal: controller.signal,
      });
      await modelStarted;
      controller.abort();
      await response.body?.cancel().catch(() => undefined);
      await expect.poll(() => seenSignal?.aborted).toBe(true);
    } finally {
      server.close();
    }
  });
});
