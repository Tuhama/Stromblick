import { expect, test } from "../support/test";

test.describe("legal pages", () => {
  test("open from the footer on every page, in English and in German", async ({ page }) => {
    await page.goto("/tomorrow");
    await page.getByRole("link", { name: "Legal notice" }).click();
    await expect(page).toHaveURL(/\/impressum$/);
    await expect(page.getByRole("heading", { level: 1, name: "Legal notice" })).toBeVisible();

    await page.getByRole("link", { name: "Privacy notice" }).click();
    await expect(page).toHaveURL(/\/datenschutz$/);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();

    await page.getByLabel("Language").selectOption("de");
    await expect(
      page.getByRole("heading", { level: 1, name: "Datenschutzerklärung" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Impressum" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Impressum" })).toBeVisible();
  });

  test("credit SMARD in the footer", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: /SMARD/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /CC BY 4\.0/ })).toBeVisible();
  });
});
