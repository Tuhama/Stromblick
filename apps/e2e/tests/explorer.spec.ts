import { expect, test } from "../support/test";

test.describe("explorer", () => {
  test("opens on the day-ahead price of the last week, with its figures", async ({ page }) => {
    await page.goto("/explorer");

    await expect(
      page.getByRole("heading", { name: "Day-ahead price, Mar 12, 2026 – Mar 18, 2026" }),
    ).toBeVisible();
    await expect(page.getByText("27.17 EUR/MWh")).toBeVisible();
    await expect(page.getByText("120.00 EUR/MWh")).toBeVisible();
  });

  test("keeps the view in the address, and a shared link opens the same view", async ({
    page,
    context,
  }) => {
    await page.goto("/explorer");
    await page.getByLabel("Series").selectOption({ label: "Solar" });
    await page.getByRole("group", { name: "Time range" }).getByText("Day", { exact: true }).click();
    await expect(page.getByRole("heading", { name: /^Solar, / })).toBeVisible();
    await expect(page).toHaveURL(/series=generation-solar/);
    await expect(page).toHaveURL(/range=day/);

    // A new tab with the copied link, which is all a visitor with the link has.
    const shared = await context.newPage();
    await shared.goto(page.url());
    await expect(shared.getByLabel("Series")).toHaveValue("generation-solar");
    await expect(shared.getByRole("radio", { name: "Day" })).toBeChecked();
    await expect(shared.getByRole("heading", { name: /^Solar, / })).toBeVisible();
    await shared.close();
  });

  test("moves to the earlier range, and not past the last day", async ({ page }) => {
    await page.goto("/explorer?series=price-day-ahead&range=day&end=2026-03-18");
    await expect(page.getByRole("button", { name: "Later" })).toBeDisabled();

    await page.getByRole("button", { name: "Earlier" }).click();
    await expect(page).toHaveURL(/end=2026-03-17/);
    await expect(page.getByRole("button", { name: "Later" })).toBeEnabled();
  });

  test("leaves out the hours of a day with a hole in the data", async ({ page, clock }) => {
    await page.goto(`/explorer?series=generation-solar&range=day&end=${clock.facts.holeDay}`);
    await page.getByText("Show the data as a table").click();

    // 12:00 to 15:00 Berlin time are missing at the source: the table jumps from 11:00 to 16:00.
    const table = page.getByRole("table");
    await expect(table.getByText(/, 11:00$/)).toHaveCount(1);
    await expect(table.getByText(/, 16:00$/)).toHaveCount(1);
    for (const hour of ["12:00", "13:00", "14:00", "15:00"]) {
      await expect(table.getByText(new RegExp(`, ${hour}$`))).toHaveCount(0);
    }
  });

  test("says so when a range has no readings", async ({ page }) => {
    await page.goto("/explorer?series=price-day-ahead&range=day&end=2026-02-01");
    await expect(
      page.getByText("We have no readings for this range. Try a later one."),
    ).toBeVisible();
  });
});
