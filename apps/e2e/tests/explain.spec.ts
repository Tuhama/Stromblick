import { expect, test } from "../support/test";

test.describe("explain a day", () => {
  test("answers a question with figures that came from the data", async ({ page }) => {
    await page.goto("/explain");

    await page.getByLabel("Your question").fill("When was electricity cheapest today?");
    await page.getByRole("button", { name: "Send" }).click();

    const log = page.getByRole("log");
    await expect(log.getByText("When was electricity cheapest today?")).toBeVisible();
    // The fake model reports what get_readings returned for the seed's today.
    await expect(log.getByText(/lowest at 2026-03-18 09:15 \(27\.17 EUR\/MWh\)/)).toBeVisible();
    await expect(log.getByText(/highest at 2026-03-18 19:00 \(112 EUR\/MWh\)/)).toBeVisible();
    await expect(log.getByText(/The average was 68\.45 EUR\/MWh\./)).toBeVisible();
  });

  test("sends a question with Enter and starts again with a new conversation", async ({ page }) => {
    await page.goto("/explain");

    const input = page.getByLabel("Your question");
    await input.fill("What was the price range?");
    await input.press("Enter");
    await expect(page.getByRole("log").getByText(/68\.45 EUR\/MWh/)).toBeVisible();

    await page.getByRole("button", { name: "New conversation" }).click();
    await expect(page.getByRole("log").getByText("What was the price range?")).toHaveCount(0);
    await expect(page.getByText("Try one of these:")).toBeVisible();
  });

  test("asks the starter question when one is clicked", async ({ page }) => {
    await page.goto("/explain");
    await page
      .getByRole("button", { name: "What was the day-ahead price range yesterday?" })
      .click();
    await expect(
      page
        .getByRole("log")
        .getByText(/EUR\/MWh/)
        .first(),
    ).toBeVisible();
  });

  test("shows a clear message and a retry when the model service is unavailable", async ({
    page,
  }) => {
    await page.goto("/explain");
    await page.getByLabel("Your question").fill("Is the model unavailable?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("The model service isn't available right now.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
