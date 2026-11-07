import { z } from "zod";

/** POST /ingest: a successful run. Failed runs answer with problem details instead. */
export const IngestResponse = z.object({
  runId: z.number().int().positive(),
  status: z.literal("SUCCEEDED"),
  rowsWritten: z.number().int().nonnegative(),
});
export type IngestResponse = z.infer<typeof IngestResponse>;
