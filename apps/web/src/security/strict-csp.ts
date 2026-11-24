import { z } from "zod";

/**
 * Makes Zod work under a strict Content Security Policy. By default Zod tries to build parsing
 * functions from strings (`new Function`) and falls back when that is blocked. The fallback works,
 * but every attempt is reported as a policy violation. With `jitless` Zod never tries, so the page
 * has no `unsafe-eval` and no violation. Call it before the first schema parses something.
 */
export function configureForStrictCsp(): void {
  z.config({ jitless: true });
}
