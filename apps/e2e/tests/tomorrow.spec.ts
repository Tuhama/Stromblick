import { expect, test } from "../support/test";

test.describe("tomorrow", () => {
  test("shows the published day with its cheapest and most expensive window", async ({ page }) => {
    await page.goto("/tomorrow");

    await expect(
      page.getByRole("heading", { name: "Day-ahead price on Thursday, March 19" }),
    ).toBeVisible();
    await expect(page.getByText("Cheapest 2 hours")).toBeVisible();
    await expect(page.getByText("08:30–10:30")).toBeVisible();
    await expect(page.getByText("Most expensive 2 hours")).toBeVisible();
    await expect(page.getByText("18:00–20:00")).toBeVisible();
  });

  test("changes the windows when another window length is chosen", async ({ page }) => {
    await page.goto("/tomorrow");

    const lengths = page.getByRole("group", { name: "Window length" });
    await lengths.getByText("1 hour", { exact: true }).click();
    await expect(page.getByText("Cheapest hour", { exact: true })).toBeVisible();
    await expect(page.getByText("Most expensive hour", { exact: true })).toBeVisible();

    await lengths.getByText("4 hours", { exact: true }).click();
    await expect(page.getByText("Cheapest 4 hours", { exact: true })).toBeVisible();
  });

  test("says when the prices are not out yet, on the day before they are published", async ({
    page,
    clock,
  }) => {
    // A day later, "tomorrow" is a day the seed has no prices for.
    await clock.moveTo("2026-03-19T10:30:00Z");
    await page.goto("/tomorrow");

    await expect(
      page.getByText(/The prices for .*March 20.* aren't published yet\./),
    ).toBeVisible();
    await expect(page.getByText("Cheapest 2 hours")).toHaveCount(0);
  });
});
