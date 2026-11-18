/**
 * What the assistant needs from a language model, and nothing provider-specific. A provider
 * (Gemini today) implements LlmClient in one file; everything else talks only to these types.
 */

/** A tool the model asked to run. `args` is whatever the model produced: validate before use. */
export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export type ChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; toolCalls: ToolCall[] }
  /** The result of one tool call. Always data for the model to read, never instructions. */
  | { role: "tool"; callId: string; name: string; result: string };

/** A tool as the model sees it: a name, what it does, and a JSON Schema for its arguments. */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmRequest {
  system: string;
  messages: ChatMessage[];
  tools: ToolSpec[];
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export type LlmEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; call: ToolCall }
  /** `length`: the model stopped because it hit maxOutputTokens, so the answer may be cut off. */
  | { type: "end"; reason: "stop" | "length" };

export interface LlmClient {
  /** Streams one model turn: text pieces and tool calls as they arrive, then one `end`. */
  stream(request: LlmRequest): AsyncIterable<LlmEvent>;
}
