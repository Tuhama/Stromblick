# 0006. Draw charts with ECharts, imported part by part

- Status: Accepted
- Date: 2026-11-15
- Issue: #17

## Context

The overview needs a stepped price line and a stacked generation chart, later a year of data with
tooltips and a table fallback. Charts must stay readable in both themes and for color-blind
readers, and must not freeze the page: a year of 15-minute data is 35,040 points per series.
The decision was taken when the first chart was built (#62); this record writes it down with the
chart components of #17.

## Decision

We draw charts with ECharts 6 on a canvas, behind one small wrapper (`EChart`). Code imports only
from `echarts/core` and registers the parts it uses (line chart, grid, tooltip, canvas renderer),
and the chart components are loaded lazily, so ECharts is a separate download after the page has
text. A chart is described by a pure function that returns an option, which tests check without a
canvas.

Three rules keep large ranges fast, each measured with a year of 15-minute data in 8 stacked
layers (the two chart measurements in headless Chromium without a GPU, so absolute times will be
better on real hardware):

- A chart draws at most 800 points per series (`downsample`), averaged in round buckets (an hour,
  a day, a week) so a daily cycle doesn't beat against the buckets. Averaging is what the API does
  too (ADR 0002), so a point in a tooltip is never one arbitrary quarter hour.
- The canvas repaints only what changed (`useDirtyRect`). Without it, each mouse move over the
  stacked layers took about 240 ms; with it, under 30 ms.
- Times are formatted with cached `Intl.DateTimeFormat` objects. Building one per call took 1.75 s
  for 35,040 moments, against 42 ms with a cached one.

Series colors are the tokens `--series-1` to `--series-8` in `index.css`, in a fixed order that is
also the stacking order. The set was checked for color-blind separation in both themes.

## Alternatives considered

- **An SVG chart library (such as Recharts)**: simpler to write, and styled like the rest of the
  page, but every point becomes a DOM node, which is slow for tens of thousands of points.
- **A small canvas library (such as uPlot)**: very fast and small, but low-level: axes, tooltips,
  stacking and legends would be ours to build and keep accessible.
- **Importing all of ECharts**: less to register, but ships every chart type, though we use only
  the line chart.

## Consequences

The registered parts and the `ChartOption` type are kept in step by hand: a new chart type needs
both a `use` entry and a type. Canvas can't read CSS variables, so colors are read from `<html>`
and read again when the theme changes. A chart is one opaque image to a screen reader, so every
chart needs a text alternative and a table (#20). Three of the eight light-theme series colors
are under 3:1 against white, so a legend is always shown beside a stacked chart.

If a chart ever needs to show a peak that averaging hides, it should ask the API for a finer
resolution rather than sample on the client.
