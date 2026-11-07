import { z } from "zod";

// SMARD's own response shapes. They stay inside apps/api: the web app never sees them.

/** index_<resolution>.json: the start of every week SMARD has a file for, as epoch milliseconds. */
export const SmardIndex = z.object({
  timestamps: z.array(z.number().int().nonnegative()),
});

/** One weekly file. Slots SMARD hasn't published yet (e.g. the rest of the current week) are null. */
export const SmardWeek = z.object({
  meta_data: z.object({ version: z.number().int(), created: z.number().int() }),
  series: z.array(z.tuple([z.number().int().nonnegative(), z.number().nullable()])),
});
export type SmardWeek = z.infer<typeof SmardWeek>;
