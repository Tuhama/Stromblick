import type { ErrorContext, ErrorReporter } from "./error-reporter";

export interface Report {
  error: unknown;
  context: ErrorContext;
}

/** A reporter for tests: keeps what it was given, so a test can look at it. */
export function recordingReporter(): { reporter: ErrorReporter; reports: Report[] } {
  const reports: Report[] = [];
  return {
    reports,
    reporter: {
      report: (error, context) => {
        reports.push({ error, context });
      },
      flush: () => Promise.resolve(),
    },
  };
}
