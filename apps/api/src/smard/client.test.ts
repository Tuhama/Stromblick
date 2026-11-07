import { describe, expect, it } from "vitest";
import { SmardError, createSmardClient, weeksSince } from "./client";
import type { SmardSource } from "./catalog";
import { createFixtureFetch, readFixture } from "./fixture-fetch";

const price: SmardSource = { filter: 4169, region: "DE-LU", resolution: "quarterhour" };
const solar: SmardSource = { filter: 4068, region: "DE", resolution: "hour" };

// Week starts are Mondays, 00:00 in Berlin.
const WEEK_OF_19_OCT = 1_792_360_800_000; // clocks went back on Sunday 25 October
const WEEK_OF_26_OCT = 1_792_969_200_000;
const WEEK_OF_2_NOV = 1_793_574_000_000; // recorded before Sunday's prices were published

const fixtureFetch = createFixtureFetch();

/** A client whose fetch always answers with `response`. */
function clientAnswering(response: Response) {
  return createSmardClient({ fetch: () => Promise.resolve(response) });
}

const smard = createSmardClient({ fetch: fixtureFetch });

describe("getWeekStarts", () => {
  it("returns every week in SMARD's index, oldest first", async () => {
    const weeks = await smard.getWeekStarts(price);

    expect(fixtureFetch).toHaveBeenCalledWith(
      "https://www.smard.de/app/chart_data/4169/DE-LU/index_quarterhour.json",
      expect.anything(),
    );
    expect(weeks[0]).toBe(Date.parse("2018-10-01T00:00:00+02:00"));
    expect(weeks.at(-1)).toBe(WEEK_OF_2_NOV);
  });
});

describe("getWeek", () => {
  it("returns 15-minute prices, including the extra hour when the clocks go back", async () => {
    const readings = await smard.getWeek(price, WEEK_OF_19_OCT);

    // 7 days * 96 slots + 4 slots for the repeated hour on 25 October.
    expect(readings).toHaveLength(676);
    expect(readings[0]?.ts).toBe(WEEK_OF_19_OCT);
    expect(readings.at(-1)?.ts).toBe(WEEK_OF_26_OCT - 15 * 60_000);
  });

  it("leaves out slots SMARD hasn't published yet", async () => {
    const raw = await readFixture(
      `chart_data/4169/DE-LU/4169_DE-LU_quarterhour_${String(WEEK_OF_2_NOV)}.json`,
    );
    const published = raw.series.filter(([, value]) => value !== null);
    expect(published.length).toBeLessThan(raw.series.length); // the fixture has open slots

    const readings = await smard.getWeek(price, WEEK_OF_2_NOV);
    expect(readings).toEqual(published.map(([ts, value]) => ({ ts, value })));
  });

  it("returns hourly generation", async () => {
    const readings = await smard.getWeek(solar, WEEK_OF_26_OCT);

    expect(fixtureFetch).toHaveBeenCalledWith(
      `https://www.smard.de/app/chart_data/4068/DE/4068_DE_hour_${String(WEEK_OF_26_OCT)}.json`,
      expect.anything(),
    );
    expect(readings).toHaveLength(7 * 24);
    expect(readings.every(({ value }) => value >= 0)).toBe(true);
  });

  it("rejects hourly data where it asked for 15-minute data", async () => {
    const hourly = JSON.stringify(
      await readFixture(`chart_data/4068/DE/4068_DE_hour_${String(WEEK_OF_26_OCT)}.json`),
    );
    const client = clientAnswering(new Response(hourly));

    await expect(client.getWeek(price, WEEK_OF_26_OCT)).rejects.toThrow(
      /Unexpected quarterhour data/,
    );
  });

  it("rejects a file for a different week", async () => {
    await expect(smard.getWeek(price, WEEK_OF_26_OCT + 1)).rejects.toThrow(SmardError);
  });
});

describe("errors", () => {
  it("reports the status and URL when SMARD answers with an error", async () => {
    const error = await smard.getWeek(price, 0).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SmardError);
    expect(error).toMatchObject({
      status: 404,
      url: "https://www.smard.de/app/chart_data/4169/DE-LU/4169_DE-LU_quarterhour_0.json",
    });
  });

  it("rejects a response with an unexpected shape", async () => {
    const client = clientAnswering(new Response(JSON.stringify({ series: "oops" })));
    const request = client.getWeekStarts(price);

    await expect(request).rejects.toBeInstanceOf(SmardError);
    await expect(request).rejects.toThrow(/Unexpected response/);
  });

  it("rejects a body that is not JSON", async () => {
    const client = clientAnswering(new Response("<html>Wartungsarbeiten</html>"));

    await expect(client.getWeekStarts(price)).rejects.toThrow(/invalid JSON/);
  });

  it("wraps network failures", async () => {
    const client = createSmardClient({
      fetch: () => Promise.reject(new TypeError("fetch failed")),
    });
    const error = await client.getWeekStarts(price).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SmardError);
    expect(error).toMatchObject({ cause: new TypeError("fetch failed") });
  });

  it("gives up after the timeout", async () => {
    // A fetch that only ends when its signal aborts, like a server that never answers.
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    const client = createSmardClient({ fetch: hangingFetch, timeoutMs: 20 });

    await expect(client.getWeekStarts(price)).rejects.toThrow(/request failed/);
  });
});

describe("weeksSince", () => {
  const weekStarts = [WEEK_OF_19_OCT, WEEK_OF_26_OCT, WEEK_OF_2_NOV];

  it("returns the week that contains `since` and every week after it", () => {
    expect(weeksSince(weekStarts, Date.parse("2026-10-28T12:00:00Z"))).toEqual([
      WEEK_OF_26_OCT,
      WEEK_OF_2_NOV,
    ]);
  });

  it("keeps the last week open-ended", () => {
    expect(weeksSince(weekStarts, Date.parse("2026-11-20T00:00:00Z"))).toEqual([WEEK_OF_2_NOV]);
  });

  it("counts the 25-hour Sunday as part of its week", () => {
    // 23:30 Berlin time on 25 October is 22:30 UTC, after a 169-hour week began.
    expect(weeksSince(weekStarts, Date.parse("2026-10-25T22:30:00Z"))[0]).toBe(WEEK_OF_19_OCT);
  });
});
