import { Router } from "express";
import { HealthResponse } from "@stromblick/shared";
import { HttpError } from "../errors";

export function healthRouter(checkDatabase: () => Promise<void>) {
  const router = Router();

  router.get("/health", async (req, res) => {
    try {
      await checkDatabase();
    } catch (err) {
      req.log.warn({ err }, "Database check failed");
      throw new HttpError(503, "Database unreachable");
    }
    res.json(HealthResponse.parse({ status: "ok", service: "api", database: "ok" }));
  });

  return router;
}
