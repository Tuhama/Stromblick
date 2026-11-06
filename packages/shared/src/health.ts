import { z } from "zod";

/** GET /health: the API is up and the database answers. */
export const HealthResponse = z.object({
  status: z.literal("ok"),
  service: z.string(),
  database: z.literal("ok"),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
