import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ProblemDetails } from "@stromblick/shared";
import { HttpError } from "../errors";

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

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const httpError = toHttpError(err);
  if (!httpError) req.log.error({ err }, "Unhandled error");

  const status = httpError?.status ?? 500;
  const body: ProblemDetails = {
    type: "about:blank",
    title: httpError?.title ?? "Internal Server Error",
    status,
    ...(httpError ? { detail: httpError.message } : {}),
    instance: req.originalUrl,
    ...(typeof req.id === "string" ? { requestId: req.id } : {}),
  };
  res.status(status).type("application/problem+json").json(body);
};
