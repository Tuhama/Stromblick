import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ProblemDetails } from "@stromblick/shared";
import { HttpError } from "../errors";
import { noopReporter, type ErrorReporter } from "../observability/error-reporter";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.path}`));
};

/** Errors from Express itself (e.g. malformed JSON) carry a status and `expose: true`. */
function toHttpError(err: unknown): HttpError | null {
  if (err instanceof HttpError) return err;
  if (
    err instanceof Error &&
    "status" in err &&
    typeof err.status === "number" &&
    "expose" in err &&
    err.expose === true
  ) {
    return new HttpError(err.status, err.message);
  }
  return null;
}

/**
 * Answers every error with problem details. An error nobody planned for also goes to the reporter,
 * with the request ID that the response carries, so the report can be found from a user's message.
 */
export function createErrorHandler(reporter: ErrorReporter): ErrorRequestHandler {
  return (err: unknown, req, res, _next) => {
    const httpError = toHttpError(err);
    if (!httpError) req.log.error({ err }, "Unhandled error");

    const status = httpError?.status ?? 500;
    const requestId = typeof req.id === "string" ? req.id : undefined;
    // An HttpError is an answer the code chose on purpose (a bad request, a rate limit, a database
    // that is down: /health says so to every probe). Only what nobody planned for is reported.
    if (!httpError) {
      reporter.report(err, {
        source: "http",
        route: req.path,
        ...(requestId === undefined ? {} : { requestId }),
      });
    }

    const body: ProblemDetails = {
      type: "about:blank",
      title: httpError?.title ?? "Internal Server Error",
      status,
      ...(httpError ? { detail: httpError.message } : {}),
      instance: req.originalUrl,
      ...(requestId === undefined ? {} : { requestId }),
    };
    res.status(status).type("application/problem+json").json(body);
  };
}

/** The handler without a reporter, for tests and for an API that has no Sentry. */
export const errorHandler = createErrorHandler(noopReporter);
