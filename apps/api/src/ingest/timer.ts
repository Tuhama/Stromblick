import type { Logger } from "pino";

export interface IngestTimerOptions {
  /** Time between two scheduled runs. */
  intervalMs: number;
  /** Delay before the first run, so a fresh deployment settles first. */
  initialDelayMs: number;
  /** Starts a run unless one is already in flight; null means it was skipped. */
  runIfIdle: () => Promise<unknown> | null;
  logger: Pick<Logger, "warn" | "error">;
}

/**
 * Runs the ingest shortly after startup, then on a fixed interval. A tick that lands
 * while a run is still going is skipped: the single-flight guard keeps runs from
 * overlapping, and the next tick picks the work up again. Returns a stop function.
 */
export function startIngestTimer({
  intervalMs,
  initialDelayMs,
  runIfIdle,
  logger,
}: IngestTimerOptions): () => void {
  const tick = (trigger: "startup" | "interval") => {
    const started = runIfIdle();
    if (started === null) {
      logger.warn({ trigger }, "Skipped a scheduled ingest: a run is already in flight");
      return;
    }
    // runIngest reports expected failures in its result; a rejection here is unexpected.
    void started.catch((err: unknown) => {
      logger.error({ err, trigger }, "Scheduled ingest threw");
    });
  };

  const initial = setTimeout(() => {
    tick("startup");
  }, initialDelayMs);
  const interval = setInterval(() => {
    tick("interval");
  }, intervalMs);

  return () => {
    clearTimeout(initial);
    clearInterval(interval);
  };
}
