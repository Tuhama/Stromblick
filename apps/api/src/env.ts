import { z } from "zod";
import { DEFAULT_RATE_LIMIT_PER_MINUTE } from "./middleware/rate-limit";

/** Free-tier limits differ per model; this one allows the most requests (see ADR 0008). */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Bearer secret for POST /ingest. Generate one with: openssl rand -hex 32
  INGEST_SECRET: z.string().min(32, "Use at least 32 random characters (openssl rand -hex 32)"),
  // Minutes between self-started ingest runs. Unset: the timer is off, and only POST /ingest ingests.
  INGEST_INTERVAL_MINUTES: z.coerce.number().int().min(5).max(1440).optional(),
  // Requests per minute and client address on the data routes (see app.ts for what "client" means here).
  RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(DEFAULT_RATE_LIMIT_PER_MINUTE),
  // Google AI Studio key for the assistant. Unset: the assistant is off. Never logged.
  GEMINI_API_KEY: z.string().min(20, "That does not look like a Gemini API key").optional(),
  // Which model answers. Free-tier limits differ per model: check them in AI Studio.
  GEMINI_MODEL: z.string().min(1).default(DEFAULT_GEMINI_MODEL),
  // Questions per minute and visitor (an answer can use several model requests).
  ASSISTANT_QUESTIONS_PER_MINUTE: z.coerce.number().int().min(1).max(1000).default(5),
  // What all visitors share, kept under the model's free-tier limits (see ADR 0008).
  ASSISTANT_MODEL_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(100_000).default(12),
  ASSISTANT_MODEL_REQUESTS_PER_DAY: z.coerce.number().int().min(1).max(10_000_000).default(400),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin !== ""),
    )
    .pipe(z.array(z.url())),
});

export type Env = z.infer<typeof EnvSchema>;

/** Command-line scripts (e.g. the backfill) only log and talk to the database. */
const ScriptEnvSchema = EnvSchema.pick({ NODE_ENV: true, LOG_LEVEL: true, DATABASE_URL: true });
export type ScriptEnv = z.infer<typeof ScriptEnvSchema>;

function parseEnv<S extends z.ZodType>(schema: S, source: NodeJS.ProcessEnv): z.output<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return parseEnv(EnvSchema, source);
}

export function loadScriptEnv(source: NodeJS.ProcessEnv = process.env): ScriptEnv {
  return parseEnv(ScriptEnvSchema, source);
}
