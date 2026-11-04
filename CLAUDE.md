# Stromblick

Live dashboard of the German electricity market, built on Bundesnetzagentur SMARD data.
pnpm + Turborepo monorepo:

- apps/web: Vite + React + TypeScript (single-page app)
- apps/api: Express + TypeScript, built with tsdown
- packages/shared: Zod schemas and types used by both apps (internal package, no build step)

## Commands (from the repo root)

- pnpm dev: web (port 5173) and api (port 3001) together
- pnpm lint | pnpm format | pnpm typecheck | pnpm test | pnpm build
- One package only: pnpm --filter @stromblick/<web|api|shared> <script>

## Architecture rules

- The web app never calls SMARD or the database. It only talks to apps/api.
- Only apps/api/src/smard talks to SMARD.
- Every data shape that crosses web <-> api is a Zod schema in packages/shared. Never redefine it locally.
- Validate at the edges: env vars at startup, SMARD responses on arrival, API responses before sending.
- Long ranges are downsampled by the API; never send raw 15-minute series to charts.
- All user-facing text goes through i18n (EN and DE).

## Code rules

- TypeScript strict. No `any`, no non-null assertions (`!`), no `@ts-ignore`. Narrow with checks instead.
- Don't disable ESLint rules inline. If a rule seems wrong, stop and explain why.
- Every behavior change comes with tests. Tests never call SMARD live; use recorded fixtures.

## Workflow

- Use plan mode for any change touching more than 3 files.
- One issue = one branch = one PR. Conventional Commits (feat:, fix:, chore:, ci:, docs:, test:).
- Done means pnpm lint, typecheck, test and build all pass.
- Never read or edit .env files (only .env.example). Never push without asking.

## Setup details (intentional, don't "fix")

- The root `typescript` is the 6.x compatibility package for typescript-eslint; packages use TypeScript 7 for tsc.
- pnpm blocks dependency install scripts; approvals live in pnpm-workspace.yaml.
