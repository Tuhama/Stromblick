# 0008. Use Gemini behind a provider-neutral LLM interface

- Status: Accepted
- Date: 2026-11-18
- Issue: #93

## Context

The AI assistant (#25) answers questions about the electricity data. It needs a language model that
can call our read-only tools. This is a portfolio project with no budget, so the model must have a
free tier. We have a Google AI Studio key. Free-tier limits are per model and are small: for
`gemini-3.5-flash-lite` we read about 15 requests per minute and 500 per day from the AI Studio
limits page (approximate, they change); `gemini-3.8-flash` allows only about 5 per minute and 20 per
day, which is too little. One answer costs one model request plus one per tool round (up to five).

Google says free-tier content may be used to improve its products, and we could not confirm which
terms apply to visitors in the EEA, UK and Switzerland.

## Decision

- The assistant code depends only on our own `LlmClient` interface (a stream of text, tool-call and
  end events). Only `assistant/gemini-client.ts` knows Google's format.
- The default model is `gemini-3.5-flash-lite` (`GEMINI_MODEL`). `GEMINI_API_KEY` is optional; without
  it the assistant is off. The key is never logged.
- We call `generateContentStream` of `@google/genai` with a low thinking level, one attempt (no
  automatic retries, they would burn the per-minute quota) and a 30 second timeout.
- Gemini 3 models return thought signatures that must be sent back unchanged. The adapter keeps
  the parts it received as opaque `providerData` on the assistant message and returns them with
  the next request. The loop never looks inside.
- Provider failures become `LlmError` with a kind (`rate_limited`, `unavailable`, `blocked`,
  `failed`). The messages are safe to show; the original error stays as `cause`.
- The chat UI must tell visitors that their questions are sent to Google.

## Alternatives considered

- **Anthropic or OpenAI API**: no free tier, so a cost for a demo.
- **A local or self-hosted model**: needs a GPU or a paid server.
- **Call Gemini directly from the SDK everywhere**: faster to write, but ties the loop and its tests
  to one vendor. The neutral interface also lets tests run with a scripted fake model.

## Consequences

The free quota is shared by all visitors, so the streaming route (#94) needs its own global
per-minute and per-day request budget below Google's limits, plus a strict per-visitor limit. The
adapter is tested with hand-written response fixtures, not recorded live responses; a first live
check with a real key is still needed. Revisit when Google changes the free tier or the terms.
