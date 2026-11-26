import { expect, test } from "../support/test";

test.describe("overview", () => {
  test("shows how old the data is, the renewable share and today's price figures", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText("Data updated 20 minutes ago")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Renewable share today" })).toBeVisible();
    await expect(page.getByText(/^\d{1,3}%$/)).toBeVisible();

    const price = page.getByRole("region", { name: "Day-ahead price today" });
    await expect(price.getByText("27.17 EUR/MWh")).toBeVisible();
    await expect(price.getByText("112.00 EUR/MWh")).toBeVisible();
    await expect(price.getByText("68.45 EUR/MWh")).toBeVisible();
  });

  test("describes each chart for screen readers, with the same figures", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("img", {
        name: "Line chart of today's day-ahead price in EUR/MWh. Lowest 27.17, highest 112.00.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /^Stacked area chart of electricity generation/ }),
    ).toBeVisible();
  });

  test("shows the prices in ct/kWh when that unit is chosen, and keeps the choice after a reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Price unit").selectOption("ct/kWh");
    await expect(page.getByText("2.72 ct/kWh")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Price unit")).toHaveValue("ct/kWh");
    await expect(page.getByText("2.72 ct/kWh")).toBeVisible();
  });

  test("opens each chart's data as a table, with a row for every hour of generation", async ({
    page,
  }) => {
    await page.goto("/");
    // The generation chart comes first on the page, the price chart second.
    await page.getByText("Show the data as a table").first().click();
    const table = page.getByRole("table").first();
    await expect(table).toBeVisible();
    // 00:00 to 10:00 Berlin time: at 11:30 the hour from 11:00 is not complete yet.
    await expect(table.getByRole("row")).toHaveCount(1 + 11);
  });

  test("switches to German and keeps it after a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Language").selectOption("de");
    await expect(page.getByRole("heading", { level: 1, name: "Überblick" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Überblick" })).toBeVisible();
  });

  test("applies the dark theme when it is chosen", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Color theme").selectOption("dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
