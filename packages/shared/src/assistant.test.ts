import { describe, expect, it } from "vitest";
import { AssistantRequest, AssistantStreamEvent } from "./assistant";

describe("AssistantRequest", () => {
  it("defaults the history to empty", () => {
    expect(AssistantRequest.parse({ question: "Price today?" })).toEqual({
      question: "Price today?",
      history: [],
    });
  });

  it("rejects an unknown role and a missing question", () => {
    expect(
      AssistantRequest.safeParse({ question: "Hi", history: [{ role: "system", text: "x" }] })
        .success,
    ).toBe(false);
    expect(AssistantRequest.safeParse({}).success).toBe(false);
  });
});

describe("AssistantStreamEvent", () => {
  it("accepts the four event types and nothing else", () => {
    for (const event of [
      { type: "text", text: "Hi" },
      { type: "tool", name: "get_readings" },
      { type: "done", truncated: false },
      { type: "error", code: "rate_limited" },
    ]) {
      expect(AssistantStreamEvent.parse(event)).toEqual(event);
    }
    expect(AssistantStreamEvent.safeParse({ type: "error", code: "other" }).success).toBe(false);
    expect(AssistantStreamEvent.safeParse({ type: "ping" }).success).toBe(false);
  });
});
