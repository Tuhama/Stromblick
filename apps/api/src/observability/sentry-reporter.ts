import * as Sentry from "@sentry/node";
import { scrubEvent } from "@stromblick/shared";
import type { ErrorReporter } from "./error-reporter";

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string | undefined;
}

/** Assistant questions are user text. Errors on this route lose their messages (see scrubEvent). */
export const SENSITIVE_PATH_PREFIXES = ["/assistant"] as const;

/**
 * Starts the Sentry SDK for errors only: no tracing, no breadcrumbs, no request data, no
 * automatic instrumentation, and nothing sent unless it passes the scrubber.
 */
export function createSentryReporter(config: SentryConfig): ErrorReporter {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    // Everything the SDK could collect on its own is off. scrubEvent is the second layer.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    // The SDK's default integrations add request data, console output and HTTP calls to events.
    // We name the two that catch what the code does not handle itself.
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    // No tracing, and none of the integrations that need hooks inside other modules (Express, ...).
    enableRuntimeChannelInjection: false,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (event) => scrubEvent(event, { sensitivePathPrefixes: SENSITIVE_PATH_PREFIXES }),
  });

  return {
    report(error, context) {
      Sentry.withScope((scope) => {
        scope.setTag("source", context.source);
        if (context.requestId !== undefined) scope.setTag("request_id", context.requestId);
        if (context.route !== undefined) scope.setTag("route", context.route);
        if (context.series !== undefined) scope.setTag("series", context.series);
        Sentry.captureException(error);
      });
    },
    flush: async (timeoutMs) => {
      await Sentry.close(timeoutMs);
    },
  };
}
