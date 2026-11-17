import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError } from "../errors";

const WINDOW_MS = 60_000;

/** Per minute and client address on the data routes; RATE_LIMIT_PER_MINUTE overrides it. */
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 300;

/**
 * Allows `limit` requests per minute from one client address, then answers 429.
 * The counters live in this process's memory: fine for one API instance, and a restart resets them.
 * RateLimit and Retry-After headers (IETF draft 7) tell the caller when to try again.
 */
export function rateLimiter(limit: number): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Hand over to the shared error handler so a 429 has the same problem-details shape as every error.
    handler: (_req, _res, next) => {
      next(new HttpError(429, "Too many requests. Try again in a minute."));
    },
  });
}
