import { QueryCache, QueryClient } from "@tanstack/react-query";
import { reportError } from "../observability/report-error";
import { ApiError } from "./client";

const MAX_RETRIES = 2;

/**
 * Retry only what a second try can fix: a network failure or a 5xx from the API.
 * A 4xx is our request's fault, and a body that breaks the contract (ZodError) stays broken.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof ApiError) return error.status >= 500;
  return error instanceof TypeError;
}

/**
 * Reports a request that failed for good, when the cause is ours: a 5xx from the API (with its
 * request ID) or an answer that breaks the contract. A 4xx and a network failure (the visitor is
 * offline) are not reported.
 */
export function reportQueryError(error: Error): void {
  if (error instanceof ApiError) {
    if (error.status >= 500) reportError(error, requestIdOf(error));
    return;
  }
  if (error instanceof TypeError) return;
  reportError(error);
}

function requestIdOf(error: ApiError): { requestId?: string } {
  const requestId = error.problem?.requestId;
  return requestId === undefined ? {} : { requestId };
}

/** One client for the whole app; tests create their own, so nothing is cached between them. */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: reportQueryError }),
    defaultOptions: { queries: { retry: shouldRetry } },
  });
}
