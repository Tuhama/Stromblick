# 0010. Compute the cheapest windows in the API and serve them from GET /tomorrow

- Status: Accepted
- Date: 2026-11-23
- Issue: #22

## Context

The Tomorrow page needs tomorrow's day-ahead prices and the cheapest and most expensive window of
1 to 4 hours. SMARD publishes the prices around noon, so before that there is nothing to show. A
window is a run of consecutive quarter-hours, and the data can have holes (SMARD had none for two
days in November 2026). On the days the clocks change a Berlin day has 92 or 100 quarter-hours.

## Decision

We calculate the windows in the API, in a pure function over the quarter-hour points, and send them
with the prices from `GET /tomorrow`. The response is a Zod schema in `packages/shared`. Before the
prices are out the answer is `status: "not-published"`, with HTTP 200, because waiting is a normal
state and not an error.

A window counts only when its quarter-hours follow each other without a gap. Sums are made in whole
cents, so equal prices are equal and a tie goes to the earlier window.

## Alternatives considered

- **Calculate in the web app**: one less endpoint, but every client would repeat the rules for
  holes, ties and clock changes, and the assistant could not reuse them. The web app also only
  talks to the API for data.
- **Calculate in SQL**: fast, but the rules (gaps, ties, cents) are harder to read and to test than
  a small function.
- **Calculate at ingest and store the result**: a second copy of the data that can go out of date
  when SMARD corrects a day. One day of points is small, so calculating per request is cheap.

## Consequences

- The web page only shows what the API sends; the edge cases are tested once, on the API side.
- `complete: false` tells the page that a day has holes. Windows that would cross a hole are left
  out, so a length may be missing from `windows`.
- Short caching (60 seconds) while the day is not final, five minutes when it is.
- The assistant could get a tool for the windows later without new logic.
