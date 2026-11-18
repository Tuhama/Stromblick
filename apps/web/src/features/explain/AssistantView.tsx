import { useId, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ASSISTANT_MAX_QUESTION_CHARS } from "@stromblick/shared";
import { Notice } from "../../layout/Notice";
import type { AssistantProblem, ChatMessage } from "./use-assistant";

const STARTERS = ["priceRange", "windSolar", "updated"] as const;

/** A failure that asking again could fix. The assistant being off, or a too long question, won't change. */
function canRetry(problem: AssistantProblem): boolean {
  return problem !== "off" && problem !== "invalid";
}

const buttonClass =
  "rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted";

export interface AssistantViewProps {
  messages: ChatMessage[];
  /** An answer is on its way. */
  busy: boolean;
  /** The model is using a tool, so the answer's text has not started. */
  lookingUp: boolean;
  problem: AssistantProblem | null;
  onAsk: (question: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onReset: () => void;
}

/** The conversation and the question box. It holds only the text being typed; everything else comes from props. */
export function AssistantView({
  messages,
  busy,
  lookingUp,
  problem,
  onAsk,
  onStop,
  onRetry,
  onReset,
}: AssistantViewProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState("");

  const waitingForText =
    busy && messages.at(-1)?.role === "assistant" && messages.at(-1)?.text === "";
  const status = lookingUp
    ? t("assistant.lookingUp")
    : waitingForText
      ? t("assistant.thinking")
      : null;

  function submit() {
    const question = draft.trim();
    if (question === "" || busy) return;
    onAsk(question);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter makes a new line. While an input method is composing (for example
    // for Chinese or Japanese), Enter confirms the composition and must not send.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <section aria-label={t("assistant.label")} className="flex max-w-3xl flex-col gap-4">
      {/* aria-busy makes screen readers wait for the whole answer instead of reading every word. */}
      <div role="log" aria-live="polite" aria-busy={busy} className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("assistant.emptyIntro")}</p>
            <ul className="flex flex-wrap gap-2">
              {STARTERS.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => onAsk(t(`assistant.starters.${key}`))}
                  >
                    {t(`assistant.starters.${key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages
            .filter((message) => message.text !== "")
            .map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-md px-3 py-2 ${
                  message.role === "user" ? "self-end bg-muted" : "self-start border border-border"
                }`}
              >
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t(message.role === "user" ? "assistant.you" : "assistant.assistant")}
                </p>
                <p className="break-words whitespace-pre-wrap">{message.text}</p>
                {message.truncated && (
                  <p className="mt-2 text-sm text-muted-foreground">{t("assistant.truncated")}</p>
                )}
              </div>
            ))
        )}
      </div>

      {status && (
        <p role="status" className="text-sm text-muted-foreground motion-safe:animate-pulse">
          {status}
        </p>
      )}

      {problem && (
        <Notice>
          {t(`assistant.errors.${problem}`)}{" "}
          {canRetry(problem) && (
            <button
              type="button"
              onClick={onRetry}
              className="font-medium underline underline-offset-4"
            >
              {t("assistant.retry")}
            </button>
          )}
        </Notice>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          {t("assistant.inputLabel")}
        </label>
        <textarea
          id={inputId}
          rows={2}
          maxLength={ASSISTANT_MAX_QUESTION_CHARS}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("assistant.placeholder")}
          aria-describedby={hintId}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2"
        />
        <div className="flex flex-wrap items-center gap-2">
          <p id={hintId} className="text-xs text-muted-foreground">
            {t("assistant.hint")}{" "}
            <span>
              {t("assistant.count", { used: draft.length, max: ASSISTANT_MAX_QUESTION_CHARS })}
            </span>
          </p>
          <div className="ml-auto flex gap-2">
            {messages.length > 0 && !busy && (
              <button type="button" onClick={onReset} className={buttonClass}>
                {t("assistant.newChat")}
              </button>
            )}
            {busy ? (
              <button type="button" onClick={onStop} className={buttonClass}>
                {t("assistant.stop")}
              </button>
            ) : (
              <button
                type="submit"
                disabled={draft.trim() === ""}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {t("assistant.send")}
              </button>
            )}
          </div>
        </div>
      </form>

      <p className="text-xs text-muted-foreground">{t("assistant.privacy")}</p>
    </section>
  );
}
