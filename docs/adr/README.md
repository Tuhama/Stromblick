# Architecture decision records

Short records of the decisions that shape Stromblick: what we chose, why, and what it costs.

One file per decision, numbered in order. A record is never rewritten: when a decision changes,
a new record supersedes the old one, and the old one's status links to it.

| #                                               | Decision                                                     | Status   |
| ----------------------------------------------- | ------------------------------------------------------------ | -------- |
| [0001](0001-record-architecture-decisions.md)   | Record architecture decisions                                | Accepted |
| [0002](0002-aggregate-readings-in-postgres.md)  | Aggregate readings in Postgres instead of LTTB               | Accepted |
| [0003](0003-design-tokens-before-components.md) | Design tokens now, shadcn/ui components when they are needed | Accepted |

## Adding a record

1. Copy `template.md` to the next number, for example `0003-short-title.md`.
2. Fill it in, then add a row to the table above.
3. Commit it in the same pull request as the code it explains.
