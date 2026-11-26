# 0013. Test the built app in a browser against a test-only API entry

- Status: Accepted
- Date: 2026-11-25
- Issue: #29, #83

## Context

Unit and component tests run in jsdom. It has no layout and no real CSP, so it cannot show the
things we most need to know before a release: whether the enforced Content Security Policy breaks
a page (ADR 0012), whether a table that scrolls can be reached by keyboard, and whether the colors
meet contrast. The assistant also needs a model, and a test must never call Gemini or SMARD.

## Decision

- A new workspace package, `apps/e2e`, runs Playwright and axe in Chromium. Its script is `e2e`,
  not `test`, so `pnpm test` stays fast and needs no browser. CI has its own workflow.
- The tests open the **built** web app, served by `apps/e2e/server/web.ts`. That server reads
  `apps/web/vercel.json` and sends the same headers and the same rewrites as Vercel, so the tests
  run under the real CSP. It fails to start if `vercel.json` loses those parts.
- The API for the tests is a second entry, `apps/api/src/e2e/server.ts`. It is not imported by the
  production entry and not part of the `tsdown` bundle. It seeds a throwaway Postgres with fixed
  data (a published tomorrow, a day with a hole in the data, a day before publication), uses a fake
  model client, has no ingest timer and no SMARD client, and takes its clock from a control route.
- The seed and the server refuse to start unless the database is on localhost and its name ends in
  `_e2e` or `_test`, because they empty it.
- The browser sees the API through the same-origin `/api` rewrite, like production.
- A guard runs on every test and fails it on a `securitypolicyviolation` event, a console error or
  warning, or an uncaught exception. A test that expects one must say so with `allowConsole`.
- axe runs on all pages in light and dark, English and German, at desktop and phone width, with the
  data tables open, using the WCAG 2.x A and AA tags plus best practices. On the overview the test
  also checks that `color-contrast` and `scrollable-region-focusable` were really evaluated.
- Text that ECharts draws on a canvas is not visible to axe. It is a known gap, written down in
  `apps/e2e/README.md`. Each chart has its values as text and as a table.

## Alternatives considered

- **Test against a Vercel preview.** It uses the real deployment, but the preview toolbar adds
  console errors and CSP violations, the API would be live data, and a failing run cannot be
  repeated locally.
- **Mock `/api` in the browser (`page.route`).** Simple, but the API's own responses, the SSE
  stream and the real validation would not be tested.
- **Put the tests in `apps/web`.** It would run in `pnpm test` and pull a browser and a database
  into every local run.
- **A feature flag in the production API for a fake model.** It would put test code and a way to
  switch the model into the production bundle.

## Consequences

- A change that breaks the CSP, a keyboard path or contrast now fails a pull request.
- CI gets a second job of about three minutes and needs a Chromium download.
- The seed has to be kept in step with the schema. The fixed clock means the seed dates are
  in March 2026, before the daylight-saving change, on purpose.
- The canvas text is still checked by hand.
