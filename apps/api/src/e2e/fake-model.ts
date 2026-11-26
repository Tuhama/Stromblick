import { z } from "zod";
import { LlmError, type LlmClient, type LlmEvent } from "../assistant/llm-client";

/** A question containing this word makes the fake model fail, like an overloaded provider. */
export const FAIL_WORD = "unavailable";

const Entry = z.object({ time: z.string(), value: z.number() });
/** The part of get_readings' answer that the fake model reads. */
const ReadingsResult = z.object({
  unit: z.string().optional(),
  summary: z.object({ min: Entry, max: Entry, average: z.number() }).nullish(),
});

/**
 * The model of the end-to-end tests: no provider, no network, and the same answer every time. It
 * asks for the day-ahead prices of the seed's "today", then reports the cheapest and the dearest
 * hour from what the tool returned, so a test can check figures that really came from the API.
 */
export function createE2eModel(today: string): LlmClient {
  return {
    stream(request) {
      const last = request.messages.at(-1);
      const question =
        [...request.messages].reverse().find((message) => message.role === "user")?.text ?? "";

      function* events(): Generator<LlmEvent> {
        if (question.toLowerCase().includes(FAIL_WORD)) {
          throw new LlmError("unavailable", "The fake model is unavailable");
        }
        if (last?.role === "tool") {
          const result = parseResult(last.result);
          const summary = result.summary;
          const text = summary
            ? `On ${today} the day-ahead price was lowest at ${summary.min.time} ` +
              `(${String(summary.min.value)} ${result.unit ?? ""}) and highest at ${summary.max.time} ` +
              `(${String(summary.max.value)} ${result.unit ?? ""}). The average was ` +
              `${summary.average.toFixed(2)} ${result.unit ?? ""}.`
            : `There are no prices for ${today}.`;
          // Several pieces, like a real stream.
          for (const piece of text.split(/(?<=\. )/)) yield { type: "text", text: piece };
          yield { type: "end", reason: "stop" };
          return;
        }
        yield {
          type: "tool_call",
          call: {
            id: "e2e-call-1",
            name: "get_readings",
            args: { series: "price-day-ahead", from: today, to: today },
          },
        };
        yield { type: "end", reason: "stop" };
      }
      return asAsync(events());
    },
  };
}

function parseResult(json: string): z.infer<typeof ReadingsResult> {
  try {
    const parsed = ReadingsResult.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Hands the events of a plain generator out as an async stream. A throw becomes a rejection. */
function asAsync(events: Iterator<LlmEvent>): AsyncIterable<LlmEvent> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => {
        try {
          return Promise.resolve(events.next());
        } catch (error) {
          return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
    }),
  };
}
