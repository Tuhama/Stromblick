import { expect, test } from "../support/test";

// The guard in support/test.ts is what stops a broken page from passing. These tests prove that it
// works: each one breaks the page on purpose and is marked as expected to fail. A guard that stopped
// working would turn them green-to-red, so the suite notices.
test.describe("the guard", () => {
  test("serves the enforced policy from vercel.json, not a report-only one", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};
    expect(headers["content-security-policy"]).toContain("script-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy-report-only"]).toBeUndefined();
  });

  test("fails a test whose page breaks the policy", async ({ page }) => {
    test.fail();
    await page.goto("/");
    await page.evaluate(() => {
      document.body.setAttribute("style", "color: red");
    });
  });

  test("fails a test whose page writes a console error", async ({ page }) => {
    test.fail();
    await page.goto("/");
    await page.evaluate(() => {
      console.error("something broke");
    });
  });

  test("fails a test whose page writes a console warning", async ({ page }) => {
    test.fail();
    await page.goto("/");
    await page.evaluate(() => {
      console.warn("something is odd");
    });
  });

  test("fails a test whose page throws", async ({ page }) => {
    test.fail();
    await page.goto("/");
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("uncaught");
      }, 0);
    });
    await page.waitForTimeout(100);
  });

  test("lets a message through when the test allows it", async ({ page, guard }) => {
    guard.allowConsole(/expected on purpose/);
    await page.goto("/");
    await page.evaluate(() => {
      console.error("this is expected on purpose");
    });
  });
});
