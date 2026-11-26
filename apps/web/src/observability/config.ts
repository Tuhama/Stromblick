/** An https address with a key in front of the host, like https://key@o1.ingest.de.sentry.io/2. */
const DSN = /^https:\/\/[^@/\s]+@[^/\s]+\/\d+$/;

/**
 * The Sentry address from the build, or undefined when there is none or it does not look right.
 * A wrong value switches reporting off instead of breaking the page. A plain pattern, not a Zod
 * schema: the first download is on a budget (ADR 0014).
 */
export function readDsn(value: string | undefined): string | undefined {
  return value !== undefined && DSN.test(value) ? value : undefined;
}
