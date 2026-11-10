/** A guard around one async job: at any moment, at most one run is in flight. */
export interface SingleFlight<T> {
  /** Starts a run, or joins the one already in flight and gets its result. */
  run: () => Promise<T>;
  /** Starts a run only when none is in flight; null means it was skipped. */
  runIfIdle: () => Promise<T> | null;
}

/**
 * Wraps `work` so concurrent callers share one run instead of starting a second.
 * POST /ingest and the ingest timer go through the same wrapper, so their runs never
 * overlap: whoever comes second gets the running ingest's result (or, for the timer,
 * skips its slot).
 */
export function singleFlight<T>(work: () => Promise<T>): SingleFlight<T> {
  let current: Promise<T> | null = null;

  const run = () => {
    current ??= work().finally(() => {
      current = null;
    });
    return current;
  };

  return { run, runIfIdle: () => (current === null ? run() : null) };
}
