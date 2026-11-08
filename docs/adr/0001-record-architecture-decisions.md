# 0001. Record architecture decisions

- Status: Accepted
- Date: 2026-11-08

## Context

Stromblick makes decisions whose reasons aren't visible in the code: why a build tool, why a
database setting, why one approach over a more obvious one. Without a record, the reasons get lost,
and the same questions come up again in reviews and interviews.

## Decision

We record each significant decision as a short Markdown file in `docs/adr/`, in the same pull
request as the code it explains. Records are numbered and never rewritten; a changed decision gets
a new record that supersedes the old one.

## Alternatives considered

- **Comments in the code**: good for _how_ a piece of code works, but a decision often spans many
  files, and comments don't keep the alternatives that were rejected.
- **A wiki**: lives outside the repository, so it drifts from the code it describes.

## Consequences

Each record takes a few minutes to write. In return, the reasoning is reviewable next to the code,
and a later change of mind is a visible step instead of a silent edit.
