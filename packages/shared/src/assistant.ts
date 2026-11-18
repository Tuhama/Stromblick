import { z } from "zod";

/** What the API accepts. The web app uses the same numbers to size its input and to trim the history. */
export const ASSISTANT_MAX_QUESTION_CHARS = 500;
/** An earlier message of the conversation that is longer than this is rejected. */
export const ASSISTANT_MAX_HISTORY_CHARS = 2000;
/** Older messages than the most recent ones are dropped. */
export const ASSISTANT_MAX_HISTORY_MESSAGES = 10;

/** An earlier message of the conversation. The client keeps the history and sends it back. */
export const AssistantTurn = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});
export type AssistantTurn = z.infer<typeof AssistantTurn>;

/** Body of POST /assistant. Length limits are checked by the API, which owns them. */
export const AssistantRequest = z.object({
  question: z.string(),
  history: z.array(AssistantTurn).max(50).default([]),
});
export type AssistantRequest = z.infer<typeof AssistantRequest>;

/**
 * Why an answer stopped early. A code, not text: the web app shows the message in the visitor's
 * language. `rate_limited`: the model's quota is used up for now. `unavailable`: the model service
 * is down or slow. `blocked`: the model refused to answer. `failed`: anything else.
 */
export const AssistantErrorCode = z.enum(["rate_limited", "unavailable", "blocked", "failed"]);
export type AssistantErrorCode = z.infer<typeof AssistantErrorCode>;

/** One event of the answer stream (server-sent events: each event is one `data:` line of JSON). */
export const AssistantStreamEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  /** A tool is being used; the UI can show "looking up data". */
  z.object({ type: z.literal("tool"), name: z.string() }),
  /** `truncated`: the answer hit the token cap and may end mid-sentence. */
  z.object({ type: z.literal("done"), truncated: z.boolean() }),
  z.object({ type: z.literal("error"), code: AssistantErrorCode }),
]);
export type AssistantStreamEvent = z.infer<typeof AssistantStreamEvent>;
