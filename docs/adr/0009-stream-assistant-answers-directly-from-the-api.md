# 0009. Stream assistant answers over SSE, called directly on the API

- Status: Accepted
- Date: 2026-11-18
- Issue: #94

## Context

The assistant (#25) answers in several seconds. Showing the text as it arrives makes that wait
bearable. Two facts shape the route:

- The web app normally reaches the API through a Vercel rewrite (`/api/*`). We have not verified that
  Vercel passes a stream through without holding it back, and through the rewrite the caller's
  address is Vercel's, so a per-visitor limit cannot tell visitors apart (ADR 0007).
- The model's free tier is small and shared by every visitor (ADR 0008). One answer can use up to
  five model requests.

## Decision

- `POST /assistant` streams server-sent events. Each event is one JSON line (`data: {...}`), checked
  against `AssistantStreamEvent` in `packages/shared`. We use `fetch` with a body, not `EventSource`,
  because the question and history are sent as JSON.
- Mistakes in the request (bad body, empty or too long question), a visitor over their limit and a used-up
  shared budget get a normal problem+json response (400, 429 with `Retry-After`) before the stream
  starts. Anything that fails later is sent as an `error` event with a code (`rate_limited`,
  `unavailable`, `blocked`, `failed`). The web app turns codes into text in the visitor's language.
- The web app calls the API on Railway directly for this route, so `X-Real-IP` is the visitor's own
  address and the per-visitor limit (5 questions a minute) means something. CORS already allows the
  site's origin.
- All visitors share a budget of model requests (12 a minute, 400 a day, both settable), counted in
  memory over sliding windows and kept below the free-tier limits. The route checks it before it
  starts, and every model call inside an answer takes one request from it.
- If the visitor closes the page or stops the answer, the model call is cancelled.
- Without `GEMINI_API_KEY` the route answers 503 and nothing else changes.

## Alternatives considered

- **Through the Vercel rewrite**: no new CORS or URL setting, but unverified for streaming and no
  per-visitor address. Could be tested later; the direct call stays the safe choice.
- **WebSocket**: more than a one-way text stream needs.
- **No streaming (one JSON answer)**: simpler, but a visitor stares at a spinner for the whole answer.
- **Redis or a database for the budget**: needed only with several API instances.

## Consequences

The web app needs the API's public address as a setting and a visible notice that questions go to
Google. The counters reset when the API restarts, and with more than one instance each would count
on its own, so the real limit could be exceeded; Google's own 429 is then turned into a clear
message. Revisit if Railway runs more than one instance.
