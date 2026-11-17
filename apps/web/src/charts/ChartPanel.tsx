import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Notice } from "../layout/Notice";

export type ChartStatus = "loading" | "empty" | "error" | "ready";

interface ChartPanelProps {
  status: ChartStatus;
  /** Shown instead of the generic texts, when the page can say something more specific. */
  messages?: Partial<Record<"loading" | "empty" | "error", string>>;
  /** The last refresh failed, but older data is on hand: it is shown, with a warning. */
  refreshFailed?: boolean;
  /** Makes the error state, and the refresh warning, offer a "Try again" button. */
  onRetry?: () => void;
  /** The chart, shown when the status is "ready". */
  children: ReactNode;
}

/**
 * What stands where a chart will be. The three waiting states take the chart's height, so the page
 * does not jump when the data arrives; "ready" shows the chart itself.
 */
export function ChartPanel({
  status,
  messages,
  refreshFailed = false,
  onRetry,
  children,
}: ChartPanelProps) {
  const { t } = useTranslation();
  if (status === "ready") {
    return (
      <>
        {refreshFailed && (
          <div className="mb-3">
            <Notice>
              {t("chart.refreshFailed")}{" "}
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="font-medium underline underline-offset-4"
                >
                  {t("chart.retry")}
                </button>
              )}
            </Notice>
          </div>
        )}
        {children}
      </>
    );
  }

  const frame =
    "flex h-72 flex-col items-center justify-center gap-3 rounded-md bg-muted px-4 text-center";

  if (status === "loading") {
    return (
      <div role="status" className={`${frame} motion-safe:animate-pulse`}>
        <p className="text-sm text-muted-foreground">{messages?.loading ?? t("chart.loading")}</p>
      </div>
    );
  }
  if (status === "empty") {
    return (
      <div className={frame}>
        <p className="text-sm text-muted-foreground">{messages?.empty ?? t("chart.empty")}</p>
      </div>
    );
  }
  return (
    <div role="alert" className={frame}>
      <p className="text-sm">{messages?.error ?? t("chart.error")}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          {t("chart.retry")}
        </button>
      )}
    </div>
  );
}
