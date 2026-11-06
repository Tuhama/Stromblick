import { z } from "zod";

/** Every error response from the API: RFC 9457 problem details, plus our request ID. */
export const ProblemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetails>;
