import type { LlmClient, LlmEvent, LlmRequest, ToolCall } from "./llm-client";

/** One scripted model turn: what the fake "says" and which tools it asks for. */
export interface FakeTurn {
  text?: string[];
  calls?: Omit<ToolCall, "id">[];
  reason?: "stop" | "length";
  /** Handed back on the `end` event, like a provider's own data for this turn. */
  providerData?: unknown;
}

/** Plays a list of events back as an async stream, like a provider's response would arrive. */
function playback(events: LlmEvent[]): AsyncIterable<LlmEvent> {
  return {
    [Symbol.asyncIterator]: () => {
      const iterator = events[Symbol.iterator]();
      return { next: () => Promise.resolve(iterator.next()) };
    },
  };
}

/**
 * A model that follows a script and records every request it gets. Tests use it instead of a real
 * provider, so they never touch the network. A run that needs more turns than scripted fails loudly.
 */
export function scriptedLlm(script: FakeTurn[]): LlmClient & { requests: LlmRequest[] } {
  const requests: LlmRequest[] = [];
  let next = 0;

  return {
    requests,
    stream(request) {
      // Copy, because the loop keeps appending to the same messages array.
      requests.push({ ...request, messages: [...request.messages] });
      const turn = script[next];
      next += 1;
      if (turn === undefined) throw new Error("The fake model ran out of scripted turns");

      const events: LlmEvent[] = [
        ...(turn.text ?? []).map((text): LlmEvent => ({ type: "text", text })),
        ...(turn.calls ?? []).map((call, index): LlmEvent => ({
          type: "tool_call",
          call: { ...call, id: `call-${String(next)}-${String(index)}` },
        })),
        { type: "end", reason: turn.reason ?? "stop", providerData: turn.providerData },
      ];
      return playback(events);
    },
  };
}
