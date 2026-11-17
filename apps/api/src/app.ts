import { randomUUID } from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { healthRouter } from "./routes/health";
import { errorHandler, notFound } from "./middleware/error-handler";
import { DEFAULT_RATE_LIMIT_PER_MINUTE, rateLimiter } from "./middleware/rate-limit";
import { ingestRouter, type IngestRouteOptions } from "./routes/ingest";
import { seriesRouter } from "./routes/series";
import { statusRouter } from "./routes/status";
import type { LoadReadings } from "./series/load-readings";
import type { LoadStatus } from "./status/load-status";

const REQUEST_ID_HEADER = "x-request-id";
/** POST /ingest is called by the timer and one workflow; anything beyond a few tries a minute is a guesser. */
const INGEST_LIMIT_PER_MINUTE = 10;

export interface AppOptions {
  logger: Logger;
  corsOrigins: string[];
  /** Resolves when the database answers; rejects when it doesn't. */
  checkDatabase: () => Promise<void>;
  /** The bearer secret for POST /ingest, and the job it starts. */
  ingest: IngestRouteOptions;
  /** Loads the points of one series; the database in production, a stub in tests. */
  readings: LoadReadings;
  /** Reads when the data was last updated; the database in production, a stub in tests. */
  status: LoadStatus;
  /** Requests per minute and client address for the data routes. Defaults to 300. */
  rateLimitPerMinute?: number;
}

export function createApp({
  logger,
  corsOrigins,
  checkDatabase,
  ingest,
  readings,
  status,
  rateLimitPerMinute = DEFAULT_RATE_LIMIT_PER_MINUTE,
}: AppOptions) {
  const app = express();

  // Behind Railway's edge, which overwrites X-Forwarded-For and X-Real-IP with the address it saw.
  // The number of proxies in front of the app is not fixed, so req.ip can change between requests;
  // the rate limiter keys on X-Real-IP instead (see middleware/rate-limit.ts). For requests that
  // come through the Vercel rewrite that address is Vercel's, not the visitor's.
  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const id =
          typeof incoming === "string" && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      // 5xx are errors, 4xx are the client's mistake: warn, everything else: info.
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      // Keep one compact line per request instead of every header.
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, exposedHeaders: [REQUEST_ID_HEADER] }));
  app.use(express.json({ limit: "100kb" }));

  // Railway's health check must never be answered with 429.
  app.use(healthRouter(checkDatabase));
  app.use("/ingest", rateLimiter(INGEST_LIMIT_PER_MINUTE));
  app.use(ingestRouter(ingest));
  app.use(rateLimiter(rateLimitPerMinute));
  app.use(seriesRouter(readings));
  app.use(statusRouter(status));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
