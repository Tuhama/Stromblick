import { QueryClient } from "@tanstack/react-query";
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

/** One client for the whole app; tests create their own, so nothing is cached between them. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry } },
  });
}
