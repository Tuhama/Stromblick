import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportError, startErrorReporting, type ErrorSink } from "./report-error";

let stop: (() => void) | undefined;

/** The test dispatches errors on purpose: keep the browser's own error reporting out of the output. */
const swallow = (event: ErrorEvent) => {
  event.preventDefault();
};
beforeEach(() => {
  window.addEventListener("error", swallow);
});

afterEach(() => {
  window.removeEventListener("error", swallow);
  stop?.();
  stop = undefined;
  vi.useRealTimers();
});

/** Lets the timer that starts loading, and the promise chain after it, run. */
async function settle() {
  await vi.advanceTimersByTimeAsync(10);
}

function setup() {
  vi.useFakeTimers();
  const sink = vi.fn<ErrorSink>();
  const createSink = vi.fn(() => sink);
  const load = vi.fn(() => Promise.resolve({ createSink }));
  return { sink, createSink, load };
}

describe("error reporting", () => {
  it("does nothing without a DSN: it does not even load Sentry", async () => {
    const { load } = setup();
    stop = startErrorReporting({ dsn: undefined, load });
    reportError(new Error("boom"));
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("uncaught") }));
    await settle();
    expect(load).not.toHaveBeenCalled();
  });

  it("loads Sentry after the first render, not during start", async () => {
    const { load, createSink } = setup();
    stop = startErrorReporting({ dsn: "https://key@o1.ingest.de.sentry.io/1", load });
    expect(load).not.toHaveBeenCalled();
    await settle();
    expect(load).toHaveBeenCalledOnce();
    expect(createSink).toHaveBeenCalledWith("https://key@o1.ingest.de.sentry.io/1");
  });

  it("keeps an error from before Sentry has loaded, and sends it once it has", async () => {
    const { load, sink } = setup();
    stop = startErrorReporting({ dsn: "https://key@o1.ingest.de.sentry.io/1", load });
    const early = new Error("early");
    reportError(early, { feature: "generation" });
    expect(sink).not.toHaveBeenCalled();

    await settle();
    expect(sink).toHaveBeenCalledExactlyOnceWith(early, { feature: "generation" });

    const late = new Error("late");
    reportError(late, { requestId: "req-1" });
    expect(sink).toHaveBeenLastCalledWith(late, { requestId: "req-1" });
  });

  it("queues at most 20 errors while it waits", async () => {
    const { load, sink } = setup();
    stop = startErrorReporting({ dsn: "https://key@o1.ingest.de.sentry.io/1", load });
    for (let index = 0; index < 50; index += 1) reportError(new Error(`error ${String(index)}`));
    await settle();
    expect(sink).toHaveBeenCalledTimes(20);
  });

  it("reports errors that nobody caught, and promises that nobody handled", async () => {
    const { load, sink } = setup();
    stop = startErrorReporting({ dsn: "https://key@o1.ingest.de.sentry.io/1", load });
    await settle();

    const thrown = new Error("uncaught");
    window.dispatchEvent(new ErrorEvent("error", { error: thrown }));
    expect(sink).toHaveBeenLastCalledWith(thrown, {});

    const reason = new Error("rejected");
    const rejection = new Event("unhandledrejection");
    Object.defineProperty(rejection, "reason", { value: reason });
    window.dispatchEvent(rejection);
    expect(sink).toHaveBeenLastCalledWith(reason, {});
  });

  it("ignores the bare 'Script error.' of a script from another address", async () => {
    const { load, sink } = setup();
    stop = startErrorReporting({ dsn: "https://key@o1.ingest.de.sentry.io/1", load });
    await settle();
    window.dispatchEvent(new ErrorEvent("error", { message: "Script error." }));
    expect(sink).not.toHaveBeenCalled();
  });

  it("drops its reports quietly when the Sentry file cannot be loaded", async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => Promise.reject(new Error("blocked")));
    stop = startErrorReporting({ dsn: "https://key@o1.ingest.de.sentry.io/1", load });
    reportError(new Error("early"));
    await settle();
    expect(load).toHaveBeenCalledOnce();
    // Nothing throws, and a later error is simply ignored.
    expect(() => {
      reportError(new Error("later"));
    }).not.toThrow();
  });

  it("stops listening when stopped", async () => {
    const { load, sink } = setup();
    const stopNow = startErrorReporting({ dsn: "https://key@o1.ingest.de.sentry.io/1", load });
    await settle();
    stopNow();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("after stop") }));
    reportError(new Error("also after"));
    expect(sink).not.toHaveBeenCalled();
  });
});
