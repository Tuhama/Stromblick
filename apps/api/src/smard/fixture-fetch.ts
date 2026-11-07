import { readFile } from "node:fs/promises";
import { vi } from "vitest";
import { SMARD_BASE_URL } from "./client";

// Test helpers only: nothing outside *.test.ts files imports this module.

const FIXTURES = new URL("./fixtures/", import.meta.url);

/** A fake fetch that answers each SMARD URL with the recorded file at the same path, or 404. */
export function createFixtureFetch() {
  return vi.fn<typeof fetch>(async (input) => {
    if (typeof input !== "string") throw new TypeError("The SMARD client fetches URL strings");
    const path = input.slice(`${SMARD_BASE_URL}/`.length);
    try {
      const body = await readFile(new URL(path, FIXTURES), "utf8");
      return new Response(body, { headers: { "Content-Type": "application/json" } });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  });
}

/** A recorded weekly file, parsed. `path` is relative to fixtures/, e.g. "chart_data/4169/...". */
export async function readFixture(path: string): Promise<{ series: [number, number | null][] }> {
  return JSON.parse(await readFile(new URL(path, FIXTURES), "utf8")) as {
    series: [number, number | null][];
  };
}
