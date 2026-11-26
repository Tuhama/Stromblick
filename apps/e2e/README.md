# End-to-end tests

Playwright and axe, in Chromium, against the built web app. See
[ADR 0013](../../docs/adr/0013-end-to-end-tests-against-a-test-only-api-entry.md) for why it is built
this way.

## What runs

- `server/web.ts` serves `apps/web/dist` with the headers and rewrites from `apps/web/vercel.json`.
  `/api` goes to the test API.
- `apps/api/src/e2e/server.ts` is the test API: seeded Postgres, a fake model, a fixed clock. It
  never calls SMARD or Gemini.
- `support/test.ts` adds two fixtures to every test: the clock (page and API both stand at
  18 March 2026, 11:30 Berlin time) and a guard that fails the test on a CSP violation, a console
  error or warning, or an uncaught exception.

## Run it

You need a database and a Chromium. The database is emptied by the run, so the server only accepts a
database on localhost whose name ends in `_e2e` or `_test`.

```bash
docker compose exec db createdb -U stromblick stromblick_e2e
DATABASE_URL=postgresql://stromblick:stromblick@localhost:5432/stromblick_e2e pnpm --filter @stromblick/api exec prisma migrate deploy
pnpm --filter @stromblick/e2e exec playwright install chromium
pnpm e2e            # builds the web app, then runs the tests
```

- `E2E_DATABASE_URL` points the run at another database.
- `E2E_CHROME_PATH` uses an installed Chrome instead of the Playwright download.
- `pnpm --filter @stromblick/e2e e2e:ui` opens the Playwright UI. Build the web app first.
- A failed run leaves `playwright-report/` and `test-results/` (both ignored by git).

## Rules for tests

- A test that expects a console message or error calls `allowConsole(pattern)`. Nothing else is
  allowed to write one.
- Use the fixed dates from `clock.facts` (`today`, `tomorrow`, `holeDay`), not the real date.
- The React Router warning about a missing `HydrateFallback` is shown once per page load. It is
  tested in the web app's own tests, not here.

## Accessibility (axe)

`tests/axe.spec.ts` checks all pages, with the data tables open, in light and dark, English and
German, at 1280 and 375 px width. It uses the WCAG 2.0, 2.1 and 2.2 A and AA tags and best practices.
On the overview it also checks that `color-contrast` and `scrollable-region-focusable` are among the
rules that passed, so an empty result cannot mean the rule did not run.

**Known gap:** axe reads the DOM. Text that ECharts draws on a canvas (axis labels, legend, labels
on the bars) has no DOM, so its contrast is not checked here. The chart colors come from the same
tokens as the page, and each chart offers its values as text and as a table, which axe does check.
Check the canvas text by eye after a change to the chart theme.
