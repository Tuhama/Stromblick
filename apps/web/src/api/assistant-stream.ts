import { AssistantStreamEvent } from "@stromblick/shared";

/** One server-sent event: the `data:` lines of a block, joined. Comments and other fields are ignored. */
function dataOf(block: string): string | undefined {
  const lines = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).replace(/^ /, ""));
  return lines.length === 0 ? undefined : lines.join("\n");
}

/**
 * Reads the answer stream of POST /assistant: events are separated by a blank line, each carries
 * one JSON object in its `data:` line, checked against the shared schema. A chunk can end anywhere
 * (even inside a character), so the text is collected until a whole event has arrived. Throws when
 * an event breaks the contract. Leaving the loop early (or aborting) cancels the download.
 */
export async function* readAssistantStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AssistantStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      for (let end = buffer.indexOf("\n\n"); end !== -1; end = buffer.indexOf("\n\n")) {
        const data = dataOf(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (data !== undefined) yield AssistantStreamEvent.parse(JSON.parse(data));
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
