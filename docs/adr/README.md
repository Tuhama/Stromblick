# Architecture decision records

Short records of the decisions that shape Stromblick: what we chose, why, and what it costs.

One file per decision, numbered in order. A record is never rewritten: when a decision changes,
a new record supersedes the old one, and the old one's status links to it.

| #                                                               | Decision                                                                  | Status   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md)                   | Record architecture decisions                                             | Accepted |
| [0002](0002-aggregate-readings-in-postgres.md)                  | Aggregate readings in Postgres instead of LTTB                            | Accepted |
| [0003](0003-design-tokens-before-components.md)                 | Design tokens now, shadcn/ui components when they are needed              | Accepted |
| [0004](0004-ingest-timer-inside-the-api.md)                     | Run the ingest on a timer inside the API                                  | Accepted |
| [0005](0005-typescript-6-alias-for-linting.md)                  | Alias the root `typescript` to 6.x for typescript-eslint                  | Accepted |
| [0006](0006-echarts-for-charts.md)                              | Draw charts with ECharts, imported part by part                           | Accepted |
| [0007](0007-rate-limit-by-client-address-in-memory.md)          | Rate-limit the API by client address, in memory                           | Accepted |
| [0008](0008-gemini-behind-a-neutral-llm-interface.md)           | Use Gemini behind a provider-neutral LLM interface                        | Accepted |
| [0009](0009-stream-assistant-answers-directly-from-the-api.md)  | Stream assistant answers over SSE, called directly on the API             | Accepted |
| [0010](0010-compute-cheapest-windows-in-the-api.md)             | Compute the cheapest windows in the API and serve them from GET /tomorrow | Accepted |
| [0011](0011-run-the-gemini-api-on-a-billing-enabled-project.md) | Run the Gemini API on a project with billing enabled                      | Accepted |
| [0012](0012-enforce-a-strict-content-security-policy.md)        | Enforce a strict Content Security Policy with no inline code              | Accepted |
| [0013](0013-end-to-end-tests-against-a-test-only-api-entry.md)  | Test the built app in a browser against a test-only API entry             | Accepted |

## Adding a record

1. Copy `template.md` to the next number, for example `0003-short-title.md`.
2. Fill it in, then add a row to the table above.
3. Commit it in the same pull request as the code it explains.
