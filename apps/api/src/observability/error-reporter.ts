/**
 * Where the API reports errors it cannot fix itself. The rest of the code only knows this
 * interface, so it never imports the Sentry SDK and tests use a plain fake.
 */
export interface ErrorContext {
  /** Which part of the API found the error. */
  source: "http" | "ingest";
  /** The ID that the error response carries, so a report can be matched to a user's report. */
  requestId?: string;
  /** The path of the request, without its query string. */
  route?: string;
  /** The SMARD series a failed ingest was working on. */
  series?: string;
}

export interface ErrorReporter {
  report: (error: unknown, context: ErrorContext) => void;
  /** Sends what is still waiting. Called once when the API shuts down. */
  flush: (timeoutMs: number) => Promise<void>;
}

/** Used when no DSN is set: in tests, in local development, and anywhere Sentry is not wanted. */
export const noopReporter: ErrorReporter = {
  report: () => undefined,
  flush: () => Promise.resolve(),
};
