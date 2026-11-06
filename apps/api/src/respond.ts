import type { Response } from "express";

/** Anything with Zod's parse(): checks unknown data and returns it typed, or throws. */
interface Schema<T> {
  parse: (data: unknown) => T;
}

/**
 * Checks a response body against its shared schema, then sends it.
 * A mismatch throws, so the client gets a 500 problem response instead of data that breaks the contract.
 */
// NoInfer: T comes from the schema only, so a wrong body is a compile error, not a widened T.
export function sendJson<T>(res: Response, schema: Schema<T>, body: NoInfer<T>): void {
  res.json(schema.parse(body));
}
