import { z } from "zod";

const Facts = z.object({
  /** The fixed moment of the API's clock and the browser's: an ISO time. */
  now: z.iso.datetime(),
  /** Berlin calendar days of the seed, YYYY-MM-DD. */
  today: z.iso.date(),
  tomorrow: z.iso.date(),
  /** A past day with no prices and no generation from 12:00 to 16:00. */
  holeDay: z.iso.date(),
});
export type Facts = z.infer<typeof Facts>;

export const API_URL = "http://localhost:3101";

/** The seed's dates, asked of the e2e API so that the tests never copy them. */
export async function readFacts(): Promise<Facts> {
  const response = await fetch(`${API_URL}/__e2e/facts`);
  if (!response.ok) throw new Error(`GET /__e2e/facts answered ${String(response.status)}`);
  return Facts.parse(await response.json());
}

/** Moves the API's clock. The browser's clock is moved by the `clock` fixture, which calls this. */
export async function setApiNow(iso: string): Promise<void> {
  const response = await fetch(`${API_URL}/__e2e/now`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ now: iso }),
  });
  if (!response.ok) throw new Error(`POST /__e2e/now answered ${String(response.status)}`);
}
