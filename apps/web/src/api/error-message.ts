import type { TFunction } from "i18next";
import { ApiError } from "./client";

/**
 * The reader's-language message for a 429, or undefined for any other error. A page uses it ahead
 * of its own error text, because "wait a moment" is the one thing that helps here.
 */
export function tooManyRequestsMessage(t: TFunction, error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 429) return undefined;
  return error.retryAfterSeconds === undefined
    ? t("error.tooManyRequestsNoWait")
    : t("error.tooManyRequests", { count: error.retryAfterSeconds });
}
