import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { HttpError } from "../errors";

const WINDOW_MS = 60_000;

/** Per minute and client address on the data routes; RATE_LIMIT_PER_MINUTE overrides it. */
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 300;

/**
 * Who is calling. Railway's edge sets X-Real-IP to the address it saw and replaces any value the
 * caller sent, so it is the address Railway documents for rate limiting; req.ip alone changed
 * between requests (measured 17 Nov 2026). Without the header (local development) req.ip is used.
 * IPv6 addresses are grouped by their /64 subnet so one machine cannot hop through its own range.
 */
export function clientKey(req: Request): string {
  const header = req.headers["x-real-ip"];
  const address = typeof header === "string" && header !== "" ? header : req.ip;
  return ipKeyGenerator(address ?? "unknown");
}

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
    keyGenerator: clientKey,
    // Hand over to the shared error handler so a 429 has the same problem-details shape as every error.
    handler: (_req, _res, next) => {
      next(new HttpError(429, "Too many requests. Try again in a minute."));
    },
  });
}
