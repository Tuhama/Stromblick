import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import {
  LlmError,
  type ChatMessage,
  type LlmClient,
  type LlmEvent,
  type LlmRequest,
} from "./llm-client";

/** The one SDK call we use; tests give the client a stand-in with the same shape. */
export interface GeminiModels {
  generateContentStream: (
    params: GenerateContentParameters,
  ) => Promise<AsyncIterable<GenerateContentResponse>>;
}

/** A model call that takes longer than this fails instead of hanging the visitor's answer. */
const TIMEOUT_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Tool results are JSON text. Gemini wants an object, so anything else is wrapped as `output`. */
function toResponseObject(result: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(result);
    return isRecord(parsed) ? parsed : { output: parsed };
  } catch {
    return { output: result };
  }
}

/** Our messages as Gemini's contents. Consecutive tool results become one user turn, as Gemini expects. */
export function toContents(messages: ChatMessage[]): Content[] {
  const contents: Content[] = [];
  let results: Part[] = [];

  const flushResults = () => {
    if (results.length > 0) contents.push({ role: "user", parts: results });
    results = [];
  };

  for (const message of messages) {
    if (message.role === "tool") {
      results.push({
        functionResponse: {
          id: message.callId,
          name: message.name,
          response: toResponseObject(message.result),
        },
      });
      continue;
    }
    flushResults();

    if (message.role === "user") {
      contents.push({ role: "user", parts: [{ text: message.text }] });
    } else {
      // The parts Gemini sent are returned as they came (they carry its thought signatures).
      const parts: Part[] = Array.isArray(message.providerData)
        ? (message.providerData as Part[])
        : [
            ...(message.text === "" ? [] : [{ text: message.text }]),
            ...message.toolCalls.map((call) => ({
              functionCall: {
                id: call.id,
                name: call.name,
                args: isRecord(call.args) ? call.args : {},
              },
            })),
          ];
      if (parts.length > 0) contents.push({ role: "model", parts });
    }
  }
  flushResults();
  return contents;
}

/** What went wrong, in terms the route can explain. The original error stays as `cause`. */
function toLlmError(error: unknown): LlmError {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new LlmError("rate_limited", "The model's quota is used up for now", { cause: error });
    }
    if (error.status === 408 || error.status >= 500) {
      return new LlmError("unavailable", "The model service is not available", { cause: error });
    }
    return new LlmError(
      "failed",
      `The model service refused the request (${String(error.status)})`,
      {
        cause: error,
      },
    );
  }
  return new LlmError("failed", "The model call failed", { cause: error });
}

function endReason(finish: FinishReason | undefined): "stop" | "length" {
  if (finish === undefined || finish === FinishReason.STOP) return "stop";
  if (finish === FinishReason.MAX_TOKENS) return "length";
  const blocked = [
    FinishReason.SAFETY,
    FinishReason.RECITATION,
    FinishReason.BLOCKLIST,
    FinishReason.PROHIBITED_CONTENT,
    FinishReason.SPII,
  ].includes(finish);
  throw new LlmError(
    blocked ? "blocked" : "failed",
    blocked ? "The model refused to answer" : `The model stopped with ${finish}`,
  );
}

export interface GeminiOptions {
  models: GeminiModels;
  model: string;
}

/** Talks to Gemini. The only file that knows Google's request and response format. */
export function createGeminiClient({ models, model }: GeminiOptions): LlmClient {
  return {
    async *stream(request: LlmRequest): AsyncGenerator<LlmEvent> {
      let chunks: AsyncIterable<GenerateContentResponse>;
      try {
        chunks = await models.generateContentStream({
          model,
          contents: toContents(request.messages),
          config: {
            systemInstruction: request.system,
            maxOutputTokens: request.maxOutputTokens,
            // Tool calls need little thinking, and thinking tokens count against maxOutputTokens.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            tools:
              request.tools.length === 0
                ? undefined
                : [
                    {
                      functionDeclarations: request.tools.map((tool) => ({
                        name: tool.name,
                        description: tool.description,
                        parametersJsonSchema: tool.parameters,
                      })),
                    },
                  ],
            abortSignal: request.signal,
            // One try: a retry would use up the per-minute quota and make the visitor wait longer.
            httpOptions: { timeout: TIMEOUT_MS, retryOptions: { attempts: 1 } },
          },
        });
      } catch (error) {
        if (request.signal?.aborted) throw error;
        throw toLlmError(error);
      }

      const received: Part[] = [];
      let finish: FinishReason | undefined;
      let callCount = 0;

      try {
        for await (const chunk of chunks) {
          const candidate = chunk.candidates?.[0];
          for (const part of candidate?.content?.parts ?? []) {
            received.push(part);
            // Thought summaries are the model's notes to itself, not part of the answer.
            if (part.thought === true) continue;
            if (part.text !== undefined && part.text !== "") {
              yield { type: "text", text: part.text };
            }
            if (part.functionCall) {
              callCount += 1;
              yield {
                type: "tool_call",
                call: {
                  id: part.functionCall.id ?? `call-${String(callCount)}`,
                  name: part.functionCall.name ?? "",
                  args: part.functionCall.args ?? {},
                },
              };
            }
          }
          if (candidate?.finishReason !== undefined) finish = candidate.finishReason;
        }
      } catch (error) {
        if (request.signal?.aborted || error instanceof LlmError) throw error;
        throw toLlmError(error);
      }

      yield { type: "end", reason: endReason(finish), providerData: received };
    },
  };
}

/** Builds the real client from the validated environment. */
export function createGeminiClientFromKey(apiKey: string, model: string): LlmClient {
  const ai = new GoogleGenAI({ apiKey });
  return createGeminiClient({ models: ai.models, model });
}
