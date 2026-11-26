# 0014. Report errors to Sentry, loaded late and scrubbed twice

- Status: Accepted
- Date: 2026-11-26
- Issue: #31

## Context

Until now an error in production was only visible in a browser console or in Railway's logs. We want
to see errors from both apps, with the request ID, and to see failed ingestion runs. The site
promises no tracking and no personal data (the privacy notice, #33), the assistant takes free text
from visitors, the CSP (ADR 0012) allows no inline code, and the first download has a budget of
150 kB.

## Decision

- **Sentry, EU region** (`de.sentry.io`), two projects: `stromblick-web` and `stromblick-api`.
  Errors only: no tracing, no session replay, no breadcrumbs, no default integrations.
- **API:** `@sentry/node` starts only when `SENTRY_DSN` is set. Only `apps/api/src/observability/
sentry-reporter.ts` imports the SDK; the rest of the API uses a small `ErrorReporter` interface
  (a no-op by default), so tests need no Sentry. The error handler reports unexpected errors with
  the request ID. Deliberate answers (4xx, the 503 of `/health`) are not reported. Failed ingestion
  runs and unexpected assistant failures are reported too. The DSN is a Railway variable only.
- **Web:** `@sentry/react` is its own file, loaded right after the first render, and only in a
  production build that has `VITE_SENTRY_DSN`. A tiny always-loaded module (`report-error.ts`)
  listens for uncaught errors, keeps up to 20 early ones and passes them on once Sentry is ready.
  Errors come from the feature boundary, the route error page, and failed queries (a 5xx with its
  request ID, or an answer that breaks the contract). A 4xx or a network failure is not reported.
- **Nothing the visitor typed is sent.** Two layers: the SDK is set to collect no user data, no
  cookies, no headers, no bodies and no query strings; and a `beforeSend` scrubber in
  `packages/shared` (`scrubEvent`) keeps only an allowlist of event fields and tags, cuts query
  strings from URLs, and removes the message of an error that happened on the assistant's routes
  (`/assistant` in the API, `/explain` in the web app).
- **Source maps** are uploaded by `@sentry/vite-plugin` only when `SENTRY_AUTH_TOKEN` is set (the
  Vercel build), the plugin is last in the list, and the `.map` files are deleted after the upload
  so they are not served. Development, tests and CI have no token, so nothing is uploaded.
- **CSP:** `connect-src` gets the exact ingest host of the web project, no wildcard. The Sentry
  browser SDK needs no inline script and no `eval`. A test in `vercel-csp.test.ts` fixes the list.
- Sentry is off in tests and in development: there is no DSN there, and the e2e guard (ADR 0013)
  would fail on a CSP violation.

## Alternatives considered

- **Load Sentry in the main bundle.** About 30 kB brotli more in the first download, over the
  budget. The cost of lazy loading is that errors in the first moments wait in a queue, and that a
  blocker or a failed download drops them.
- **Only the scrubber, or only the SDK settings.** Either alone depends on one thing staying
  right. Two layers, each tested with the real SDK, means a Sentry upgrade that changes a default
  does not leak text unnoticed.
- **Self-hosted GlitchTip or the Sentry tunnel option.** More to run for a portfolio site. A tunnel
  would get around ad blockers but adds a route that forwards data.
- **Log only.** No grouping, no alerts and no source-mapped stack traces for the web app.

## Consequences

- Some visitors (ad and tracker blockers) never send web errors. The API side is not affected.
  The web numbers in Sentry are a lower bound.
- A new data processor: Sentry (Functional Software, Inc., USA, stored in the EU). The privacy
  notice names it, and the setting "prevent storing of IP addresses" must be on in both projects.
- The first download grew by about 2.5 kB (the queue, the listeners, the lazy import, and a React
  chunk that is now split out). The budget for the initial JavaScript goes from 150 kB to 152 kB.
  The remaining planned work needs less than the headroom. A future language (Arabic) should load
  its texts lazily instead of raising the budget again.
- The scrubber's allowlist has to be extended on purpose when a new tag is wanted.
