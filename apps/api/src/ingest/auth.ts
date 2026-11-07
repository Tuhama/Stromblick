import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { HttpError } from "../errors";

/**
 * Compares two secrets in constant time. Hashing both first gives buffers of equal length,
 * so not even the secret's length leaks through the response time.
 */
export function secretsMatch(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** The token of an `Authorization: Bearer <token>` header, or null. The scheme is case-insensitive. */
export function bearerToken(header: string | undefined): string | null {
  return /^Bearer (\S+)$/i.exec(header ?? "")?.[1] ?? null;
}

/** Lets a request through only with `Authorization: Bearer <secret>`; otherwise 401. */
export function requireBearer(secret: string): RequestHandler {
  return (req, res, next) => {
    const token = bearerToken(req.headers.authorization);
    if (token !== null && secretsMatch(token, secret)) {
      next();
      return;
    }
    res.setHeader("WWW-Authenticate", "Bearer");
    next(new HttpError(401, "A valid bearer token is required"));
  };
}
