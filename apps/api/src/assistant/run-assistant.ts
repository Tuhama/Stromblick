import type { Logger } from "pino";
import { HttpError } from "../errors";
import type { ChatMessage, LlmClient, ToolCall } from "./llm-client";
import { SYSTEM_PROMPT } from "./system-prompt";
import type { AssistantTool } from "./tools";

export interface AssistantLimits {
  /** Longest question a visitor may ask. */
  maxQuestionChars: number;
  /** Longest single earlier message the client may send back as history. */
  maxHistoryChars: number;
  /** Most earlier messages that are kept; older ones are dropped. */
  maxHistoryMessages: number;
  /** Tool calls allowed for one answer. */
  maxToolCalls: number;
  /** Tokens the model may write in one turn. */
  maxOutputTokens: number;
  /** A tool result longer than this is replaced by an error telling the model to ask for less. */
  maxToolResultChars: number;
}

export const DEFAULT_LIMITS: AssistantLimits = {
  maxQuestionChars: 500,
  maxHistoryChars: 2_000,
  maxHistoryMessages: 10,
  maxToolCalls: 4,
  maxOutputTokens: 800,
  maxToolResultChars: 8_000,
};

/** An earlier message of the conversation, as the client sends it back. */
export interface Turn {
  role: "user" | "assistant";
  text: string;
}

export type AssistantEvent =
  | { type: "text"; text: string }
  /** A tool is being used; the UI can show "looking up data". */
  | { type: "tool"; name: string }
  /** `truncated`: the answer hit the token cap and may end mid-sentence. */
  | { type: "done"; truncated: boolean };

export interface AssistantRun {
  llm: LlmClient;
  tools: AssistantTool[];
  logger: Logger;
  question: string;
  history?: Turn[];
  limits?: AssistantLimits;
  signal?: AbortSignal;
}

function tooLong(what: string, max: number): HttpError {
  return new HttpError(400, `${what} may have at most ${max} characters`);
}

function errorResult(message: string): string {
  return JSON.stringify({ error: message });
}

interface ToolOutcome {
  result: string;
  ok: boolean;
}

/** Runs one tool call. Never throws: a failure becomes an error result the model can react to. */
async function executeTool(
  call: ToolCall,
  tools: AssistantTool[],
  logger: Logger,
  limits: AssistantLimits,
  alreadyUsed: number,
): Promise<ToolOutcome> {
  const started = performance.now();
  const tool = tools.find((candidate) => candidate.spec.name === call.name);
  let outcome: ToolOutcome;

  if (alreadyUsed >= limits.maxToolCalls) {
    outcome = {
      ok: false,
      result: errorResult("Tool call limit reached. Answer with what you already have."),
    };
  } else if (!tool) {
    outcome = { ok: false, result: errorResult("Unknown tool") };
  } else {
    try {
      const result = await tool.run(call.args);
      outcome =
        result.length > limits.maxToolResultChars
          ? { ok: false, result: errorResult("The result was too large. Ask for less data.") }
          : { ok: true, result };
    } catch (err) {
      if (err instanceof HttpError) {
        outcome = { ok: false, result: errorResult(err.message) };
      } else {
        logger.error({ err, tool: call.name }, "Assistant tool failed");
        outcome = { ok: false, result: errorResult("The tool failed.") };
      }
    }
  }

  // The arguments are logged only when the tool accepted them, so what lands in the log is
  // already validated (series keys, dates, enums), never free text the model copied from the user.
  logger.info(
    {
      tool: call.name,
      args: outcome.ok ? call.args : undefined,
      ok: outcome.ok,
      durationMs: Math.round(performance.now() - started),
      resultChars: outcome.result.length,
    },
    "Assistant tool call",
  );
  return outcome;
}

/**
 * Answers one question: streams the model's text, runs the tools it asks for (at most
 * `maxToolCalls`), and stops. The question goes only into the user message; the system prompt is
 * fixed. Throws HttpError(400) for an empty or too long question or history message.
 */
export async function* runAssistant({
  llm,
  tools,
  logger,
  question,
  history = [],
  limits = DEFAULT_LIMITS,
  signal,
}: AssistantRun): AsyncGenerator<AssistantEvent> {
  const trimmed = question.trim();
  if (trimmed === "") throw new HttpError(400, "Ask a question");
  if (trimmed.length > limits.maxQuestionChars) {
    throw tooLong("A question", limits.maxQuestionChars);
  }
  const recent = history.slice(-limits.maxHistoryMessages);
  if (recent.some((turn) => turn.text.length > limits.maxHistoryChars)) {
    throw tooLong("An earlier message", limits.maxHistoryChars);
  }

  const messages: ChatMessage[] = [
    ...recent.map((turn): ChatMessage => {
      return turn.role === "user"
        ? { role: "user", text: turn.text }
        : { role: "assistant", text: turn.text, toolCalls: [] };
    }),
    { role: "user", text: trimmed },
  ];
  const specs = tools.map((tool) => tool.spec);
  let used = 0;
  let truncated = false;

  // One round per model turn. After the last allowed tool call the model gets no tools, so it must answer.
  for (let round = 0; round <= limits.maxToolCalls; round += 1) {
    const calls: ToolCall[] = [];
    let text = "";
    truncated = false;

    for await (const event of llm.stream({
      system: SYSTEM_PROMPT,
      messages,
      tools: used < limits.maxToolCalls ? specs : [],
      maxOutputTokens: limits.maxOutputTokens,
      signal,
    })) {
      if (event.type === "text") {
        text += event.text;
        yield { type: "text", text: event.text };
      } else if (event.type === "tool_call") {
        calls.push(event.call);
      } else {
        truncated = event.reason === "length";
      }
    }

    if (calls.length === 0) break;

    messages.push({ role: "assistant", text, toolCalls: calls });
    for (const call of calls) {
      yield { type: "tool", name: call.name };
      const { result } = await executeTool(call, tools, logger, limits, used);
      used += 1;
      messages.push({ role: "tool", callId: call.id, name: call.name, result });
    }
  }

  yield { type: "done", truncated };
}
