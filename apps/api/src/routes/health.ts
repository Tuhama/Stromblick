import { Router } from "express";
import { HealthResponse } from "@stromblick/shared";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json(HealthResponse.parse({ status: "ok", service: "api" }));
});
