import { describe, expect, it } from "vitest";
import { singleFlight } from "./single-flight";

/** A promise with its resolve and reject handles, to settle a run mid-test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("singleFlight", () => {
  it("shares one run between concurrent callers", async () => {
    const work = deferred<number>();
    let calls = 0;
    const flight = singleFlight(() => {
      calls += 1;
      return work.promise;
    });

    const first = flight.run();
    const second = flight.run();
    work.resolve(7);

    await expect(first).resolves.toBe(7);
    await expect(second).resolves.toBe(7);
    expect(calls).toBe(1);
  });

  it("starts a fresh run once the previous one finished", async () => {
    let calls = 0;
    const flight = singleFlight(() => {
      calls += 1;
      return Promise.resolve(calls);
    });

    await expect(flight.run()).resolves.toBe(1);
    await expect(flight.run()).resolves.toBe(2);
  });

  it("skips runIfIdle while a run is in flight", async () => {
    const work = deferred<string>();
    const flight = singleFlight(() => work.promise);

    const started = flight.runIfIdle();
    expect(started).not.toBeNull();
    expect(flight.runIfIdle()).toBeNull();

    work.resolve("done");
    await started;
    expect(flight.runIfIdle()).not.toBeNull();
  });

  it("recovers after a failed run", async () => {
    const work = deferred<string>();
    const flight = singleFlight(() => work.promise);

    const failing = flight.run();
    work.reject(new Error("smard is down"));
    await expect(failing).rejects.toThrow("smard is down");

    const next = flight.runIfIdle();
    expect(next).not.toBeNull();
    await expect(next).rejects.toThrow("smard is down");
  });
});
