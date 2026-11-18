import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASSISTANT_MAX_HISTORY_CHARS,
  ASSISTANT_MAX_HISTORY_MESSAGES,
  type AssistantErrorCode,
  type AssistantTurn,
} from "@stromblick/shared";
import { streamAnswer } from "../../api/assistant";
import { ApiError } from "../../api/client";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** The answer hit the length limit and may end mid-sentence. */
  truncated?: boolean;
}

/**
 * Why the last question got no (complete) answer. The first four come from the model service
 * through the stream; the rest from the request: `off` (503), `busy` (429), `invalid` (400),
 * `network` (no connection, or the stream broke off).
 */
export type AssistantProblem = AssistantErrorCode | "off" | "busy" | "invalid" | "network";

function problemFor(error: unknown): AssistantProblem {
  if (error instanceof ApiError) {
    if (error.status === 503) return "off";
    if (error.status === 429) return "busy";
    if (error.status === 400) return "invalid";
    return "failed";
  }
  // fetch() fails with a TypeError when there is no connection. Anything else broke the contract.
  return error instanceof TypeError ? "network" : "failed";
}

/**
 * The earlier exchanges the API gets with a new question: only questions that were answered, each
 * text cut to what the API accepts, and only the most recent ones.
 */
function toHistory(messages: ChatMessage[]): AssistantTurn[] {
  const turns: AssistantTurn[] = [];
  messages.forEach((message, index) => {
    const answer = messages[index + 1];
    if (message.role !== "user" || answer?.role !== "assistant") return;
    turns.push(
      { role: "user", text: message.text.slice(0, ASSISTANT_MAX_HISTORY_CHARS) },
      { role: "assistant", text: answer.text.slice(0, ASSISTANT_MAX_HISTORY_CHARS) },
    );
  });
  return turns.slice(-ASSISTANT_MAX_HISTORY_MESSAGES);
}

/** One conversation with the assistant, kept in memory: a reload starts a new one. */
export function useAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [problem, setProblem] = useState<AssistantProblem | null>(null);
  // The latest messages for code that runs between renders (the stream loop, retry).
  const messagesRef = useRef<ChatMessage[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

  const update = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      // One answer at a time.
      if (question === "" || controllerRef.current !== null) return;

      const history = toHistory(messagesRef.current);
      const answerId = nextId.current + 1;
      nextId.current += 2;
      update([
        ...messagesRef.current,
        { id: answerId - 1, role: "user", text: question },
        { id: answerId, role: "assistant", text: "" },
      ]);
      const change = (fn: (message: ChatMessage) => ChatMessage) => {
        update(
          messagesRef.current.map((message) => (message.id === answerId ? fn(message) : message)),
        );
      };

      const controller = new AbortController();
      controllerRef.current = controller;
      setBusy(true);
      setProblem(null);
      setLookingUp(false);

      try {
        let finished = false;
        for await (const event of streamAnswer(
          { question, history },
          { signal: controller.signal },
        )) {
          if (event.type === "text") {
            setLookingUp(false);
            change((message) => ({ ...message, text: message.text + event.text }));
          } else if (event.type === "tool") {
            setLookingUp(true);
          } else if (event.type === "done") {
            finished = true;
            if (event.truncated) change((message) => ({ ...message, truncated: true }));
          } else {
            finished = true;
            setProblem(event.code);
          }
        }
        // The server always ends with `done` or `error`: anything else means the connection broke.
        if (!finished) setProblem("network");
      } catch (error) {
        // A stop by the visitor is not a failure: the text so far stays.
        if (!controller.signal.aborted) setProblem(problemFor(error));
      } finally {
        controllerRef.current = null;
        setBusy(false);
        setLookingUp(false);
        // An answer that never got any text is not kept (it would be an empty bubble).
        update(
          messagesRef.current.filter((message) => message.role === "user" || message.text !== ""),
        );
      }
    },
    [update],
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  /** Asks the last question again, after a failure. */
  const retry = useCallback(() => {
    const lastQuestion = messagesRef.current.findLastIndex((message) => message.role === "user");
    const message = messagesRef.current[lastQuestion];
    if (message === undefined) return;
    update(messagesRef.current.slice(0, lastQuestion));
    void ask(message.text);
  }, [ask, update]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    update([]);
    setProblem(null);
  }, [update]);

  // Leaving the page cancels the model call.
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { messages, busy, lookingUp, problem, ask, stop, retry, reset };
}
