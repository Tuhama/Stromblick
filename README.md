# Stromblick

[![CI](https://github.com/Tuhama/stromblick/actions/workflows/ci.yml/badge.svg)](https://github.com/Tuhama/stromblick/actions/workflows/ci.yml)

A live dashboard of Germany's electricity market: 15-minute day-ahead prices, the generation mix,
tomorrow's cheapest hours and AI explanations, built on the Bundesnetzagentur's
[SMARD](https://www.smard.de) open data.

**Live:** https://stromblick-de.vercel.app

> **Work in progress.** The data pipeline, the API, today's overview and the AI assistant are live.
> Tomorrow's prices and the explorer come next; the MVP (v0.1.0) is planned for early December 2026. Progress is tracked in the
> [issues](https://github.com/Tuhama/stromblick/issues) and the
> [v0.1.0 milestone](https://github.com/Tuhama/stromblick/milestone/1).

## Status

| Part                                                           | State   |
| -------------------------------------------------------------- | ------- |
| Data pipeline: SMARD → Postgres, 12 months of history          | Live    |
| API: series and readings, aggregated by hour or day            | Live    |
| App shell: routing, light and dark theme, English and German   | Live    |
| Overview: today's generation mix, prices and renewable share   | Live    |
| Tomorrow: day-ahead prices and the cheapest window             | Planned |
| Explorer: any series and range, shareable by link              | Planned |
| Explain a day: AI answers grounded in the dashboard's own data | Live    |

## Architecture

```mermaid
flowchart LR
  smard[SMARD API] --> api
  browser[Browser] --> web[Web app<br/>React on Vercel]
  web -- "/api" --> api[API<br/>Express on Railway]
  api --> db[(Postgres<br/>Neon, Frankfurt)]
  api -- "assistant only" --> gemini[Gemini API]
```

Data flows one way: the API ingests SMARD's data into Postgres, and the web app only talks to the
API. The browser never calls SMARD.

- **`apps/web`**: React 19, Vite, React Router, Tailwind CSS, i18next
- **`apps/api`**: Express 5, Prisma 7, Zod, Pino; shipped as a Docker image
- **`packages/shared`**: the Zod schemas both apps use, so they can't disagree on data shapes
- **Tooling**: pnpm workspaces, Turborepo, TypeScript (strict), ESLint, Prettier, Vitest, GitHub Actions

The reasons behind the main decisions are recorded in [`docs/adr`](docs/adr).

## The AI assistant

"Explain a day" has a chat box. A visitor asks a question in plain words, and the API answers it by
asking Gemini, which can only use three read-only tools (list the series, read a time range, read
the ingest status). The tools run against Stromblick's own database, and the answer streams back to
the browser word by word.

- **The model only asks, our code runs.** The tools are read-only and their arguments are validated.
  Every answer is capped (tool calls, question and history size, output length).
- **Cost is limited in layers.** There is a limit per visitor, one for the whole site, and a shared
  budget of model calls per minute and per day. It runs on a Google project with billing enabled, so
  all use is a Paid Service (ADR 0011).
- **The provider can change.** The API talks to the model through its own small interface, and
  Gemini is one adapter behind it.
- **Streaming goes straight to the API.** In production the browser calls the API's own address
  (`VITE_CHAT_API_URL`), because streaming through the Vercel rewrite is not verified.

The reasons are in [ADR 0007](docs/adr/0007-rate-limit-by-client-address-in-memory.md),
[0008](docs/adr/0008-gemini-behind-a-neutral-llm-interface.md) and
[0009](docs/adr/0009-stream-assistant-answers-directly-from-the-api.md). As a Paid Service,
Google does not use prompts to improve its products, and the page says so next to the input.

## Run it locally

You need Node 26, pnpm 12 and Docker.

```bash
pnpm install
docker compose up -d --wait
cp apps/api/.env.example apps/api/.env
```

In `apps/api/.env`, set `INGEST_SECRET` to any 32 or more characters (`openssl rand -hex 32`). Then
create the tables, load some data and start both apps:

```bash
pnpm --filter @stromblick/api exec prisma migrate deploy
pnpm --filter @stromblick/api backfill --months 1
pnpm dev
```

The web app runs on http://localhost:5173 and the API on http://localhost:3001.

The assistant is off until the API has a key. To try it, put a free key from
[Google AI Studio](https://aistudio.google.com/apikey) in `apps/api/.env` as `GEMINI_API_KEY` and
restart. Without a key the API answers the assistant with 503, and the page says it is switched off.

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

The database tests need their own database and skip themselves without it:

```bash
docker compose exec db createdb -U stromblick stromblick_test
DATABASE_URL=postgresql://stromblick:stromblick@localhost:5432/stromblick_test pnpm --filter @stromblick/api exec prisma migrate deploy
```

## How this project is built

Stromblick is built with AI, deliberately and in the open.

- **Claude writes the code; I direct the work.** I set the scope, choose between the options and
  trade-offs it proposes, and decide what gets built and what doesn't. The reasons are recorded in
  [`docs/adr`](docs/adr).
- **Nothing is merged unread.** I apply every change by hand, in small steps, so I understand what
  is in the repository. Each change goes through an issue, a pull request and CI (formatting, lint,
  strict type checks, tests and a build) before it reaches `main`.
- **Generated code is verified, not trusted.** Each change is built and tested twice: by Claude in
  a sandbox before I see it, and by me locally before I commit. The tests ship with the code.
- **The AI works inside guardrails.** [`CLAUDE.md`](CLAUDE.md) sets the conventions, and
  [`.claude/settings.json`](.claude/settings.json) with its hooks limits what Claude Code may run
  and keeps it away from secrets.

My part is the engineering judgment: direction, review and ownership.

## Data and license

Data: Bundesnetzagentur | SMARD.de, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Code: [MIT](LICENSE).
