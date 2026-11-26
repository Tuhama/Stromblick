import { describe, expect, it } from "vitest";
import type { LlmEvent, LlmRequest } from "../assistant/llm-client";
import { createE2eModel, FAIL_WORD } from "./fake-model";

function request(messages: LlmRequest["messages"]): LlmRequest {
  return { system: "", messages, tools: [], maxOutputTokens: 100 };
}

async function collect(stream: AsyncIterable<LlmEvent>): Promise<LlmEvent[]> {
  const events: LlmEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

const model = createE2eModel("2026-03-18");

describe("the end-to-end model", () => {
  it("first asks for the day's prices", async () => {
    const events = await collect(model.stream(request([{ role: "user", text: "Cheapest hour?" }])));
    expect(events[0]).toMatchObject({
      type: "tool_call",
      call: { name: "get_readings", args: { series: "price-day-ahead", from: "2026-03-18" } },
    });
  });

  it("then reports the figures that the tool returned", async () => {
    const result = JSON.stringify({
      unit: "EUR/MWh",
      summary: {
        min: { time: "2026-03-18 12:00", value: 41.5 },
        max: { time: "2026-03-18 19:00", value: 112.25 },
        average: 80,
      },
    });
    const events = await collect(
      model.stream(
        request([
          { role: "user", text: "Cheapest hour?" },
          { role: "assistant", text: "", toolCalls: [] },
          { role: "tool", callId: "e2e-call-1", name: "get_readings", result },
        ]),
      ),
    );
    const text = events.flatMap((event) => (event.type === "text" ? [event.text] : [])).join("");
    expect(text).toContain("41.5 EUR/MWh");
    expect(text).toContain("112.25 EUR/MWh");
    expect(events.at(-1)).toMatchObject({ type: "end", reason: "stop" });
  });

  it("fails like an overloaded provider when the question asks for it", async () => {
    await expect(
      collect(model.stream(request([{ role: "user", text: `Is it ${FAIL_WORD}?` }]))),
    ).rejects.toMatchObject({ kind: "unavailable" });
  });
});
