# 0007. Rate-limit the API by client address, in memory

- Status: Accepted
- Date: 2026-11-17
- Issue: #63

## Context

The API is public and `POST /ingest` guards only with a bearer secret. Nothing stopped a script from
hammering the data routes or guessing the secret. The web app reaches the API through a Vercel
rewrite (`/api/*` to Railway). Railway's edge replaces `X-Forwarded-For` and `X-Real-IP` with the
address it saw (its staff say the hop count is not fixed and not published), and for rewritten
traffic that address is Vercel's, not the visitor's. A visitor therefore cannot forge the address,
but the API also cannot tell two visitors apart when they arrive through the site. Measured on
17 November 2026: six direct calls to Railway counted down 299, 299, 299, 298, 299, 297, so `req.ip`
(the last `X-Forwarded-For` entry with `trust proxy` 1) is not stable between requests. Railway's
staff recommend `X-Real-IP` for rate limiting. Vercel also caches `GET /status` for 60 seconds
(`Cache-Control: public, max-age=60`), so most of the site's requests never reach the API.

## Decision

We use `express-rate-limit` with its in-memory store, keyed on the `X-Real-IP` header Railway sets
(`req.ip` is the fallback without it, and IPv6 addresses are grouped by their /64 subnet).
`GET /series` and `GET /status` share 300 requests per minute per address (`RATE_LIMIT_PER_MINUTE`),
`POST /ingest` allows 10 per minute (wrong secrets count too), and `GET /health` is never limited.
A limited request gets a 429 problem-details body with `Retry-After` and IETF `RateLimit` headers.

## Alternatives considered

- **Redis or Postgres as the store**: needed only with several API instances; one more service to run
  and pay for. The in-memory counters reset on a restart, which is acceptable here.
- **Limit per visitor through a header set by Vercel**: a header carrying the visitor's address would
  be forgeable by anyone who calls Railway directly, unless Vercel also signed it; we found no simple
  supported way to do either.
- **Cloudflare or another WAF in front**: the right tool for real abuse, but a new account and domain
  for a portfolio project.

## Consequences

Direct callers are limited one by one, as long as `X-Real-IP` comes from Railway: anyone who reaches
the API without Railway's edge could set the header themselves and dodge the limit.
Visitors on the site share Vercel's addresses, so the 300 per minute is a cap on the whole site's traffic; a page load makes only a handful of requests, so ordinary use should stay far below it.
The same blind spot means a per-visitor limit for the AI feature (#25) cannot rest on `req.ip`: that feature needs its own budget (a global daily cap and the
Anthropic Console spending limit).
Revisit if a second API instance is added (counters would be per instance) or if Railway publishes a client-IP contract.
