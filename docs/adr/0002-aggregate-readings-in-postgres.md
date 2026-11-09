# 0002. Aggregate readings in Postgres instead of LTTB

- Status: Accepted
- Date: 2026-11-08
- Issue: #14

## Context

Prices are stored every 15 minutes: about 35,000 points per series and year. A chart can't use that
many, so long ranges have to be reduced. The shared contract says points arrive "already downsampled
to `resolution`", and the same points feed the chart, its accessible table fallback and the AI
explanations.

## Decision

We aggregate in Postgres per hour or per Berlin calendar day: energy (MWh) is summed, prices are
averaged, as SMARD does. Only complete buckets are returned. The API picks the finest resolution
that keeps a response at or below 1,000 points.

## Alternatives considered

- **LTTB (largest triangle three buckets)**: keeps the visual shape of a line by picking
  representative raw points. But each point is then one arbitrary quarter hour standing in for a
  whole day, which is misleading in a table, a tooltip or an AI answer.
- **Aggregating in the API code**: would load all raw rows from the database first. Postgres does
  it next to the data, using the primary key's index.

## Consequences

Every point is a real value with a clear unit and meaning. A daily average hides peaks within the
day, such as a negative price at noon; shorter ranges therefore return hours or quarter hours, where
those peaks are visible. Handling daylight saving time (23- and 25-hour days) lives in the SQL and
is covered by tests.
