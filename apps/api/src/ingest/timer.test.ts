import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MINUTE } from "../time-units";
import { startIngestTimer } from "./timer";

function testLogger() {
  return { warn: vi.fn(), error: vi.fn() };
}

describe("startIngestTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function timerWith(runIfIdle: () => Promise<unknown> | null) {
    const logger = testLogger();
    const stop = startIngestTimer({
      intervalMs: 60 * MINUTE,
      initialDelayMs: 15_000,
      runIfIdle,
      logger,
    });
    return { logger, stop };
  }

  it("runs once shortly after startup, then every interval", async () => {
    const runIfIdle = vi.fn(() => Promise.resolve());
    timerWith(runIfIdle);

    expect(runIfIdle).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(runIfIdle).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60 * MINUTE);
    expect(runIfIdle).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2 * 60 * MINUTE);
    expect(runIfIdle).toHaveBeenCalledTimes(4);
  });

  it("logs a skipped slot and carries on with the next one", async () => {
    const runIfIdle = vi.fn<() => Promise<unknown> | null>(() => null);
    const { logger } = timerWith(runIfIdle);

    await vi.advanceTimersByTimeAsync(15_000 + 60 * MINUTE);
    expect(logger.warn).toHaveBeenCalledTimes(2);

    runIfIdle.mockImplementation(() => Promise.resolve());
    await vi.advanceTimersByTimeAsync(60 * MINUTE);
    expect(runIfIdle).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it("logs an unexpected rejection and keeps the timer alive", async () => {
    const runIfIdle = vi.fn(() => Promise.reject(new Error("boom")));
    const { logger } = timerWith(runIfIdle);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(logger.error).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60 * MINUTE);
    expect(runIfIdle).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it("stops cleanly, even before the first run", async () => {
    const runIfIdle = vi.fn(() => Promise.resolve());
    const { stop } = timerWith(runIfIdle);

    stop();
    await vi.advanceTimersByTimeAsync(3 * 60 * MINUTE);
    expect(runIfIdle).not.toHaveBeenCalled();
  });
});
