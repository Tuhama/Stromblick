import { useMemo } from "react";
import { useStatus } from "../../api/queries";
import { newestData, type NewestData } from "./newest-data";

/**
 * How new the prices and the generation figures are, from /status. The same query as the page's
 * status line, so it costs no extra request. Unknown (both null) until the answer is there.
 */
export function useNewestData(): NewestData {
  const status = useStatus();
  const latest = status.data?.latestReadings;
  return useMemo(() => newestData(latest ?? {}), [latest]);
}
