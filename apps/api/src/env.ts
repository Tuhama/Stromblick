import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Bearer secret for POST /ingest. Generate one with: openssl rand -hex 32
  INGEST_SECRET: z.string().min(32, "Use at least 32 random characters (openssl rand -hex 32)"),
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
