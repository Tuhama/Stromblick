# 0005. Alias the root `typescript` to 6.x for typescript-eslint

- Status: Accepted
- Date: 2026-11-10
- Issue: #57

## Context

The packages compile and type-check with TypeScript 7, the native compiler. TypeScript 7 doesn't
yet offer the programmatic API that tools built on the compiler load. typescript-eslint is one of
them: version 8.72 declares the peer range `>=4.8.4 <6.1.0`, and its maintainers say they can't
support TypeScript 7 until that API exists. Our lint setup uses its type-aware rules, so ESLint
needs a TypeScript it can load. The decision was made when the repository was set up; this record
writes it down afterwards.

## Decision

We install two TypeScript versions side by side. The root `package.json` declares `typescript` as
an alias, `npm:@typescript/typescript6@^6.0.2`, and ESLint, which runs from the root, loads that.
The three packages take `typescript` from the pnpm catalog (`^7.0.2`), so `tsc` in every
`typecheck` and `build` script is TypeScript 7. A Dependabot rule stops the root alias from being
raised to 7.

## Alternatives considered

- **TypeScript 6 everywhere**: one version and no alias, but it gives up the native compiler's
  speed for every type-check, locally and in CI.
- **TypeScript 7 everywhere, linting without type information**: typescript-eslint doesn't load
  with TypeScript 7 at all, so this would mean dropping it, not only its type-aware rules.
- **Another linter (such as Biome or oxlint)**: no dependency on the compiler API, but a different
  rule set, and the strict type-aware rules the project relies on would be lost or replaced.

## Consequences

Linting and type-checking read the same code with different compiler versions. If they ever
disagree, `tsc` (TypeScript 7) decides, because it is what builds the code. The root dependency
looks like a mistake to a new reader, so it is explained here, in `CLAUDE.md` and in the Dependabot
configuration.

The alias is temporary. When typescript-eslint supports TypeScript 7, the root takes `typescript`
from the catalog like the packages, the Dependabot rule goes, and a new record supersedes this one.
