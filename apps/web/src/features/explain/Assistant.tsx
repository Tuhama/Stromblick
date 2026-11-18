import { AssistantView } from "./AssistantView";
import { useAssistant } from "./use-assistant";

/** The assistant: the conversation's state from the hook, shown by the view. */
export function Assistant() {
  const { messages, busy, lookingUp, problem, ask, stop, retry, reset } = useAssistant();
  return (
    <AssistantView
      messages={messages}
      busy={busy}
      lookingUp={lookingUp}
      problem={problem}
      onAsk={(question) => void ask(question)}
      onStop={stop}
      onRetry={retry}
      onReset={reset}
    />
  );
}
