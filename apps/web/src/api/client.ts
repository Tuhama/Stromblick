import { ProblemDetails } from "@stromblick/shared";

/** Vite proxies /api to the API in development (see vite.config.ts). */
const BASE_URL = "/api";

/** Anything with Zod's parse(): checks unknown data and returns it typed, or throws. */
interface Schema<T> {
  parse: (data: unknown) => T;
}

/** The API answered with an error status. Carries its problem details when it sent valid ones. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | undefined;

  constructor(status: number, problem?: ProblemDetails) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

/**
 * GETs a path from the API and parses the body with its shared schema.
 * Throws ApiError for error statuses, and a ZodError when a 2xx body breaks the contract.
 */
export async function getJson<T>(
  path: string,
  schema: Schema<T>,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });
  // A proxy or gateway error page is not JSON; treat it as no body.
  const body: unknown = await res.json().catch(() => undefined);

  if (!res.ok) {
    const problem = ProblemDetails.safeParse(body);
    throw new ApiError(res.status, problem.success ? problem.data : undefined);
  }
  return schema.parse(body);
}
