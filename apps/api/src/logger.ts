import { pino, type Logger } from "pino";
import type { Env } from "./env";

export function createLogger(env: Pick<Env, "LOG_LEVEL" | "NODE_ENV">): Logger {
  return pino({
    level: env.LOG_LEVEL,
    // Never write credentials to the logs (the ingest secret arrives in this header).
    redact: ["req.headers.authorization", "req.headers.cookie"],
    ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}),
  });
}
