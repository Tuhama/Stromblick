import { randomUUID } from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { healthRouter } from "./routes/health";
import { errorHandler, notFound } from "./middleware/error-handler";

const REQUEST_ID_HEADER = "x-request-id";

export interface AppOptions {
  logger: Logger;
  corsOrigins: string[];
  /** Resolves when the database answers; rejects when it doesn't. */
  checkDatabase: () => Promise<void>;
}

export function createApp({ logger, corsOrigins, checkDatabase }: AppOptions) {
  const app = express();

  // Behind Railway's proxy, so req.ip is the client, not the proxy.
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

  app.use(healthRouter(checkDatabase));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
