import { Router } from "express";
import type { Logger } from "pino";
import { AssistantRequest, AssistantStreamEvent } from "@stromblick/shared";
import { HttpError } from "../errors";
import { LlmError, type LlmClient } from "../assistant/llm-client";
import { withBudget, type ModelBudget } from "../assistant/model-budget";
import { prepareConversation, runAssistant } from "../assistant/run-assistant";
import type { AssistantTool } from "../assistant/tools";
import { rateLimiter } from "../middleware/rate-limit";
import { noopReporter, type ErrorReporter } from "../observability/error-reporter";

export interface AssistantRouteOptions {
  llm: LlmClient;
  tools: AssistantTool[];
  logger: Logger;
  /** The model requests all visitors share (the free tier's limits). */
  budget: ModelBudget;
  /** Questions per minute and visitor. */
  questionsPerMinute: number;
  /** Where unexpected failures go. Model errors are expected and only logged. */
  reporter?: ErrorReporter;
}

function errorCode(err: unknown): LlmError["kind"] {
  return err instanceof LlmError ? err.kind : "failed";
}

/**
 * POST /assistant: answers one question as a stream of server-sent events (see
 * AssistantStreamEvent). Mistakes in the request, a visitor over their limit and a used-up shared
 * budget are answered with a normal error response before the stream starts. Anything that goes
 * wrong after that is sent as an `error` event, because the status line is already sent.
 * Without options the assistant is off and the route answers 503.
 */
export function assistantRouter(options?: AssistantRouteOptions) {
  const router = Router();
  // The visitor's limit is checked before anything else, and is stricter than the data routes.
  const perVisitor = options ? rateLimiter(options.questionsPerMinute) : undefined;

  router.post(
    "/assistant",
    (req, res, next) => {
      if (!perVisitor) {
        next(new HttpError(503, "The assistant is switched off"));
        return;
      }
      perVisitor(req, res, next);
    },
    (req, res) => {
      if (!options) return;
      const { llm, tools, logger, budget, reporter = noopReporter } = options;

      const parsed = AssistantRequest.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "The request body is not valid");
      prepareConversation(parsed.data.question, parsed.data.history);

      const room = budget.check();
      if (!room.ok) {
        res.set("Retry-After", String(room.retryAfterSeconds));
        throw new HttpError(429, "The assistant has reached its limit for now. Try again later.");
      }

      // A visitor who closes the page or stops the answer cancels the model call as well.
      const controller = new AbortController();
      res.on("close", () => {
        if (!res.writableEnded) controller.abort();
      });

      res.status(200).set({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        // Tells proxies such as nginx not to hold the stream back.
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();

      const send = (event: AssistantStreamEvent) => {
        res.write(`data: ${JSON.stringify(AssistantStreamEvent.parse(event))}\n\n`);
      };

      void (async () => {
        try {
          for await (const event of runAssistant({
            llm: withBudget(llm, budget),
            tools,
            logger,
            question: parsed.data.question,
            history: parsed.data.history,
            signal: controller.signal,
          })) {
            send(event);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            const code = errorCode(err);
            // Only the kind and our own safe message are logged for a model failure; never the question.
            if (err instanceof LlmError)
              logger.warn({ err, kind: err.kind }, "Assistant model call failed");
            else {
              logger.error({ err }, "Assistant failed");
              reporter.report(err, { source: "http", route: "/assistant" });
            }
            send({ type: "error", code });
          }
        } finally {
          res.end();
        }
      })();
    },
  );

  return router;
}
