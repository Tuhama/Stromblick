import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "./db";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(url === undefined)("createDb (database)", () => {
  const db = createDb(url ?? "");

  afterAll(async () => {
    await db.$disconnect();
  });

  it("talks to Postgres in UTC, whatever the server's default time zone", async () => {
    const [row] = await db.$queryRaw<{ TimeZone: string }[]>`SHOW TimeZone`;
    expect(row?.TimeZone).toBe("UTC");
  });
});
