import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "../support/test";

/**
 * axe in a real browser, because two of its rules need layout, which jsdom does not have:
 * `scrollable-region-focusable` (a table that scrolls must be reachable by keyboard) and
 * `color-contrast`. Every page runs in light and dark, English and German, at desktop and phone
 * width, with the data tables open (they are the part that scrolls).
 *
 * Not covered: the text that ECharts draws on a canvas (axis labels, legend). axe reads the DOM, and
 * a canvas has none. That text is given the theme's colors in the chart code, and each chart has
 * its figures as text and as a table next to it.
 */
const PAGES = ["/", "/tomorrow", "/explorer", "/explain", "/impressum", "/datenschutz"];

const VIEWPORTS = [
  { name: "desktop", size: { width: 1280, height: 900 } },
  { name: "phone", size: { width: 375, height: 812 } },
] as const;

const MODES = [
  { colorScheme: "light", locale: "en-US", language: "English" },
  { colorScheme: "light", locale: "de-DE", language: "German" },
  { colorScheme: "dark", locale: "en-US", language: "English" },
  { colorScheme: "dark", locale: "de-DE", language: "German" },
] as const;

/** The rules that the issue names. They must have run, not just found nothing. */
const REQUIRED_RULES = ["color-contrast", "scrollable-region-focusable"];

/** Waits until the page has drawn: data loaded, charts present, and nothing is still moving. */
async function settle(page: Page, path: string) {
  await page.waitForLoadState("networkidle");
  if (path === "/" || path === "/tomorrow" || path === "/explorer") {
    await expect(page.locator("canvas").first()).toBeVisible();
    // ECharts animates for about a second; contrast of the page does not depend on it, but a
    // half-drawn page makes a failing report hard to read.
    await page.waitForTimeout(1200);
  }
}

/** Opens every "show the data as a table" disclosure on the page. */
async function openTables(page: Page) {
  const summaries = page.locator("details > summary");
  const count = await summaries.count();
  for (let index = 0; index < count; index += 1) await summaries.nth(index).click();
  await expect(page.locator("details:not([open]) > summary")).toHaveCount(0);
}

for (const { name, size } of VIEWPORTS) {
  for (const { colorScheme, locale, language } of MODES) {
    test.describe(`axe, ${name}, ${colorScheme}, ${language}`, () => {
      test.use({ viewport: size, colorScheme, locale });

      for (const path of PAGES) {
        test(`${path} has no accessibility violations`, async ({ page }) => {
          await page.goto(path);
          await settle(page, path);
          await openTables(page);

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();

          expect(
            results.violations.map((violation) => ({
              rule: violation.id,
              impact: violation.impact,
              help: violation.help,
              targets: violation.nodes.map((node) => node.target.join(" ")),
            })),
          ).toEqual([]);

          // On the overview the two layout rules must really have checked something.
          if (path === "/") {
            const checked = results.passes.map((rule) => rule.id);
            for (const rule of REQUIRED_RULES) expect(checked).toContain(rule);
          }
        });
      }
    });
  }
}
