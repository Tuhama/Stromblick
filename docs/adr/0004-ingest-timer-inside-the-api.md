# 0004. Run the ingest on a timer inside the API

- Status: Accepted
- Date: 2026-11-10
- Issue: #<N>

## Context

The hourly ingest ran on a GitHub Actions schedule (#12). Measured between 8 and 10 November,
GitHub started 5 of 41 hourly slots, each 17 to 27 minutes late. No data was lost, because every
run re-reads the whole current week, but the dashboard was up to 11 hours behind, which defeats a
"live" dashboard and the overview's "data as of" line. The API is a long-running process on
Railway, so it can keep time itself.

## Decision

The API starts an ingest 15 seconds after startup and then on a fixed interval, set by
`INGEST_INTERVAL_MINUTES` (production: 60; unset means off, as in development and tests). A
single-flight guard shared with `POST /ingest` makes overlapping runs impossible: a second caller
joins the running ingest, and a timer tick that lands during a run skips its slot. The GitHub
workflow stays as the manual button and a six-hourly backup.

## Alternatives considered

- **Keep the GitHub schedule**: measured as running about one slot in eight.
- **An external scheduler (such as cron-job.org)**: exact timing, but the ingest secret would live
  with a third party, and the project gains another account to manage.
- **A Railway cron service**: Railway's cron runs a service that starts, works and exits; the API
  is a long-running server, so this would mean a second deployable just for timing.
- **Answering 409 when a run is already going** instead of joining it: more explicit for callers,
  but the backup workflow's curl would fail red on harmless collisions with the timer.

## Consequences

Scheduling now lives and dies with the API process: a redeploy resets the phase, and the first run
after each deploy refreshes the data within seconds. The timer assumes one API instance; more
instances would each run their own timer, which upserts make harmless but wasteful. Revisit if the
API ever scales out. Run outcomes stay visible in `ingest_runs` and the logs; the six-hourly backup
covers the API being down at the top of an hour.
