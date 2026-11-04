import { z } from "zod";

export const HealthResponse = z.object({
  status: z.literal("ok"),
  service: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const ProblemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetails>;
