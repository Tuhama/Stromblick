import type { AssistantRequest, AssistantStreamEvent } from "@stromblick/shared";
import { toApiError } from "./client";
import { readAssistantStream } from "./assistant-stream";

/**
 * The assistant is called on the API's own address (VITE_CHAT_API_URL), not through the Vercel
 * rewrite: there the API sees Vercel's address instead of the visitor's, and a stream is not
 * guaranteed to pass through (ADR 0009). Without the setting it uses "/api", as every other request does.
 */
const BASE_URL = (import.meta.env.VITE_CHAT_API_URL ?? "/api").replace(/\/+$/, "");

/**
 * Sends a question and yields the answer's events as they arrive. Throws ApiError for an error
 * status before the stream starts (400, 429, 503); a failure after that arrives as an `error` event.
 * Not part of getJson(): it POSTs and reads a stream, but it raises the same ApiError.
 */
export async function* streamAnswer(
  request: Pick<AssistantRequest, "question" | "history">,
  options: { signal?: AbortSignal } = {},
): AsyncGenerator<AssistantStreamEvent> {
  const res = await fetch(`${BASE_URL}/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(request),
    signal: options.signal,
  });
  if (!res.ok) throw await toApiError(res);
  if (res.body === null) throw new Error("The answer has no body");
  yield* readAssistantStream(res.body);
}
