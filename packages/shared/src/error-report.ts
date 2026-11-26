/**
 * What the two apps may send to the error service, and what never leaves.
 *
 * It is an allowlist: only the fields named here survive. Anything the SDK adds later (request
 * bodies, breadcrumbs, user data, extra context, local variables) is dropped without a change here.
 * Assistant questions and tool arguments are user text and must never be sent (issue #31).
 */

/** The parts of an error event that this file reads. Sentry's own event types fit it. */
export interface ScrubbableEvent {
  exception?: { values?: ScrubbableException[] | undefined } | undefined;
  request?: { url?: string | undefined; method?: string | undefined } | undefined;
  tags?: Record<string, unknown> | undefined;
}

export interface ScrubbableException {
  type?: string | undefined;
  value?: string | undefined;
}

export interface ScrubOptions {
  /**
   * Paths whose error messages are removed, because they may hold what a visitor typed (the
   * assistant). The stack trace and the error type stay. Matched on the start of the URL path.
   */
  sensitivePathPrefixes: readonly string[];
}

/** Top-level fields of an event that are kept as they are. */
const KEPT_FIELDS = new Set([
  "event_id",
  "timestamp",
  "level",
  "platform",
  "environment",
  "release",
  "type",
  "sdk",
]);

/** Tags that are kept. Anything else a tag could carry is not on this list for a reason. */
export const KEPT_TAGS = ["request_id", "source", "series", "route", "feature"] as const;

/** Placeholder for a message that was removed. */
export const REMOVED = "[removed]";

/** The path of a URL without its query string or fragment. Works for relative paths too. */
export function pathOf(url: string | undefined): string {
  if (url === undefined) return "";
  const withoutQuery = url.split(/[?#]/, 1)[0] ?? "";
  try {
    return new URL(withoutQuery, "http://placeholder.invalid").pathname;
  } catch {
    return withoutQuery;
  }
}

/** The URL without its query string or fragment, which can hold what a visitor chose or typed. */
function withoutQuery(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  return url.split(/[?#]/, 1)[0];
}

/**
 * The event as it may be sent: allowlisted fields only, tags filtered, the request reduced to its
 * method and URL without a query, and error messages removed on the sensitive paths.
 * Used as `beforeSend`. Never returns an event with more than it was given.
 * It returns the event's own type, which holds for Sentry's events: apart from the `type` field
 * (kept here) every field of theirs is optional.
 */
export function scrubEvent<E extends ScrubbableEvent>(event: E, options: ScrubOptions): E {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (KEPT_FIELDS.has(key)) kept[key] = value;
  }

  // The API does not attach a request to its events, so it sends the path as the "route" tag.
  const routeTag = event.tags?.["route"];
  const path = pathOf(event.request?.url) || (typeof routeTag === "string" ? pathOf(routeTag) : "");
  const sensitive = options.sensitivePathPrefixes.some((prefix) => path.startsWith(prefix));

  if (event.exception?.values) {
    kept["exception"] = {
      values: event.exception.values.map((entry) =>
        sensitive && entry.value !== undefined ? { ...entry, value: REMOVED } : entry,
      ),
    };
  }

  if (event.tags) {
    const tags: Record<string, unknown> = {};
    for (const name of KEPT_TAGS) {
      if (name in event.tags) tags[name] = event.tags[name];
    }
    kept["tags"] = tags;
  }

  if (event.request) {
    const url = withoutQuery(event.request.url);
    kept["request"] = {
      ...(event.request.method === undefined ? {} : { method: event.request.method }),
      ...(url === undefined ? {} : { url }),
    };
  }

  // Only fields were removed or reduced, and what stays is of the same type as before.
  return kept as E;
}
