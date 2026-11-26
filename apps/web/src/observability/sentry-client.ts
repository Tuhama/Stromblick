import { captureException, init, withScope } from "@sentry/react";
// The subpath, not the package root: the root also holds the Zod schemas, and importing them here
// would split them into a shared file that loads before the strict-CSP setup in main.tsx runs.
import { scrubEvent } from "@stromblick/shared/error-report";
import type { ErrorSink } from "./report-error";

/** Questions typed on the assistant page are user text: errors there lose their messages. */
const SENSITIVE_PATH_PREFIXES = ["/explain"] as const;

/**
 * Starts the Sentry SDK for errors only. No replay, no tracing, no breadcrumbs, no user data,
 * no automatic integrations: the global handlers are in report-error.ts. Everything that is sent
 * passes the scrubber first. Loaded as its own file, after the first render.
 */
export function createSink(dsn: string): ErrorSink {
  init({
    dsn,
    environment: import.meta.env.MODE,
    defaultIntegrations: false,
    integrations: [],
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (event) => scrubEvent(event, { sensitivePathPrefixes: SENSITIVE_PATH_PREFIXES }),
  });

  return (error, details) => {
    withScope((scope) => {
      scope.setTag("source", "web");
      // The path only, never the query string.
      scope.setTag("route", window.location.pathname);
      if (details.requestId !== undefined) scope.setTag("request_id", details.requestId);
      if (details.feature !== undefined) scope.setTag("feature", details.feature);
      captureException(error);
    });
  };
}
