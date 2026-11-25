# 0012. Enforce a strict Content Security Policy with no inline code

- Status: Accepted
- Date: 2026-11-25
- Issue: #28, #133

## Context

The web app is a single-page app on Vercel. It talks only to our API, loads no third-party
scripts and has no user-written HTML. A Content Security Policy (CSP) limits the damage if
a script ever gets into a page, and it is a check that the app really is as closed as we say.

The usual stumbling block is inline code. Many apps allow `'unsafe-inline'` and `'unsafe-eval'`
and so lose most of the protection. We wanted to avoid both, so we looked at what in the app needed them:

- **Inline styles.** React `style={{}}` props and ECharts' own styling work through the CSSOM,
  which `style-src 'self'` allows. The only inline `style="..."` attribute was the colored
  swatch in the HTML string of the generation chart tooltip.
- **Eval.** Zod 4 probes `Function("")` when it loads and compiles schemas with `new Function`.
  The probe is caught, but the browser still reports it as a violation.
- **The Vercel preview toolbar** (`vercel.live`) is injected into preview deployments only. It
  breaks the policy on previews but is not on production.

## Decision

- Vercel sends one enforced `Content-Security-Policy` header for every path, set in
  `apps/web/vercel.json`:
  `default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'` plus the
  Railway API origin; `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- No `'unsafe-inline'`, no `'unsafe-eval'`, no wildcard. A test reads `vercel.json` and fails if
  one of these appears or if `connect-src` differs from the origin of the `/api` rewrite.
- The tooltip swatch is a `<span>` with the classes `tooltip-swatch tooltip-swatch-N`. The color
  comes from the series tokens in CSS, not from a `style` attribute. Code that builds HTML
  strings for charts must not use `style="..."`.
- Zod runs with `jitless: true`. The setting is made in `security/strict-csp-init.ts`, which
  `main.tsx` imports first, because the shared schemas are created while the other imports load.
- The policy was first sent as `Content-Security-Policy-Report-Only`, checked on a preview, and
  enforced in a second change (#133). `frame-ancestors` only works in the enforced header.
- We do not allow `vercel.live`. Previews show console errors from the toolbar. Production is clean.

## Alternatives considered

- **`'unsafe-inline'` for styles**: simplest, but it allows any injected style attribute and
  removes the point of the `style-src` directive.
- **Hashes or nonces**: a nonce needs a new value for every response, which a static site on
  Vercel cannot give without a server in front of it. A hash covers a `<style>` block but not a
  `style` attribute without `'unsafe-hashes'`, and every tooltip would need its own hash.
- **A `<meta>` tag instead of a header**: it cannot send `frame-ancestors` or a report-only
  policy, and it applies only after the HTML is parsed.
- **Allow `vercel.live`** so that previews are quiet: this would loosen the production policy
  for a development convenience.

## Consequences

- Every new third-party service needs a change to `vercel.json` and its test: Sentry (#31) needs
  its ingest origin in `connect-src`. Analytics or Search Console would need `script-src` and
  `connect-src` entries, and a change to the privacy notice in the same pull request.
- Zod without JIT parses a little slower. The app parses small API responses, so the cost is
  not measurable in the browser, but this ADR is the place to look if it ever is.
- A violation is easy to cause by accident, for example with a new inline `style="..."` in a chart
  string. The E2E tests (#29) fail on any `securitypolicyviolation` event, so this is caught in
  CI and not by a visitor.
- Vercel preview deployments log errors for the toolbar. They can be ignored.
