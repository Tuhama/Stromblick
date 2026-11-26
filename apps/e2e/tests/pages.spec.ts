import { expect, test } from "../support/test";

const PAGES = [
  { path: "/", heading: "Overview" },
  { path: "/tomorrow", heading: "Tomorrow" },
  { path: "/explorer", heading: "Explorer" },
  { path: "/explain", heading: "Explain a day" },
  { path: "/impressum", heading: "Legal notice" },
  { path: "/datenschutz", heading: "Privacy notice" },
];

test.describe("every page, opened straight from the address bar", () => {
  for (const { path, heading } of PAGES) {
    test(`${path} loads without console errors or CSP violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    });
  }
});
