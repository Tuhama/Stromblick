/**
 * Where the web app reports errors it cannot recover from.
 *
 * This file is tiny on purpose: it is in the first download. The Sentry SDK is about 30 kB, so it
 * is a separate file that loads right after the first render (see sentry-client.ts). Errors that
 * happen before it has loaded wait in a short queue.
 */

export interface ErrorDetails {
  /** The ID of the failed API response, so the report matches the API's. */
  requestId?: string;
  /** A short name of the part of the page that failed, e.g. "generation". */
  feature?: string;
}

export type ErrorSink = (error: unknown, details: ErrorDetails) => void;

/** What the lazily loaded part must provide. */
export interface SentryModule {
  createSink: (dsn: string) => ErrorSink;
}

/** More than this means something is looping: the oldest reports are the useful ones. */
const MAX_QUEUED = 20;

let enabled = false;
let sink: ErrorSink | undefined;
let queue: [unknown, ErrorDetails][] = [];

/** Reports an error, or does nothing when reporting is off. Safe to call from anywhere. */
export function reportError(error: unknown, details: ErrorDetails = {}): void {
  if (!enabled) return;
  if (sink) {
    sink(error, details);
    return;
  }
  if (queue.length < MAX_QUEUED) queue.push([error, details]);
}

export interface ReportingOptions {
  /** Sentry's address for this project. Undefined: reporting stays off (tests, development). */
  dsn: string | undefined;
  /** Loads the Sentry part. A function, so it is not downloaded unless reporting is on. */
  load: () => Promise<SentryModule>;
}

/**
 * Starts reporting: listens for errors nobody caught, and loads Sentry once the page has been drawn.
 * Returns a function that stops it again (for tests).
 */
export function startErrorReporting({ dsn, load }: ReportingOptions): () => void {
  if (dsn === undefined) return () => undefined;
  enabled = true;

  const onError = (event: ErrorEvent) => {
    // A script from another address shows up as a bare "Script error." without an error: nothing to report.
    if (event.error !== undefined && event.error !== null) reportError(event.error);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason);
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  // After the first render, so reporting never slows down what the visitor came to see.
  const start = () => {
    void load()
      .then((module) => {
        sink = module.createSink(dsn);
        for (const [error, details] of queue) sink(error, details);
        queue = [];
      })
      .catch(() => {
        // The file did not load (offline, or a blocker): reports are dropped, and the page works.
        enabled = false;
        queue = [];
      });
  };
  const timer = window.setTimeout(start, 0);

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    enabled = false;
    sink = undefined;
    queue = [];
  };
}
