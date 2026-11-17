import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface FeatureBoundaryProps {
  /** A short name for the log, e.g. "generation". Not shown to the reader. */
  feature: string;
  /** The feature's name in the reader's language, for the message. */
  label: string;
  children: ReactNode;
}

interface FeatureBoundaryState {
  failed: boolean;
}

/**
 * Keeps a crash inside one feature: if anything below throws while rendering (a bug, a chart that
 * can't start, a script file that failed to load), only this feature's place on the page shows
 * the message, and the rest of the page keeps working.
 * React only supports this as a class: there is no hook for catching render errors.
 */
export class FeatureBoundary extends Component<FeatureBoundaryProps, FeatureBoundaryState> {
  override state: FeatureBoundaryState = { failed: false };

  static getDerivedStateFromError(): FeatureBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // There is no error service yet; the browser console is where this can be found.
    console.error(`[${this.props.feature}] crashed while rendering`, error, info.componentStack);
  }

  override render() {
    if (this.state.failed) return <FeatureError label={this.props.label} />;
    return this.props.children;
  }
}

/** What stands in a feature's place after a crash. Reloading is the one thing that always helps. */
function FeatureError({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md bg-muted px-4 py-8 text-center"
    >
      <p className="text-sm">{t("error.section", { section: label })}</p>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      >
        {t("error.reload")}
      </button>
    </div>
  );
}
