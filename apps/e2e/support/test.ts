import { expect, test as base } from "@playwright/test";
import { readFacts, setApiNow, type Facts } from "./facts";

declare global {
  interface Window {
    /** Added by the test (exposeFunction); the page calls it for every CSP violation. */
    reportCspViolation: (description: string) => void;
  }
}

interface Clock {
  /** Today's date and the other facts of the seed. */
  facts: Facts;
  /** Moves the API's clock and this page's clock to the same moment. */
  moveTo: (iso: string) => Promise<void>;
}

interface Guard {
  /** Lets one known console message through, for a test that provokes it on purpose. */
  allowConsole: (pattern: RegExp) => void;
}

/**
 * Every test of the app runs with two guards. After the test, it fails when the page logged a
 * console error or warning, threw an exception, or broke the Content Security Policy. And it starts
 * at the seed's fixed moment: the API's clock and the browser's clock agree and stand still.
 */
export const test = base.extend<{ clock: Clock; guard: Guard }>({
  clock: [
    async ({ page }, use) => {
      const facts = await readFacts();
      await setApiNow(facts.now);
      await page.clock.setFixedTime(facts.now);
      await use({
        facts,
        moveTo: async (iso) => {
          await setApiNow(iso);
          await page.clock.setFixedTime(iso);
        },
      });
      await setApiNow(facts.now);
    },
    { auto: true },
  ],

  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      const allowed: RegExp[] = [];

      await page.exposeFunction("reportCspViolation", (description: string) => {
        problems.push(`CSP violation: ${description}`);
      });
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
          window.reportCspViolation(
            `${event.violatedDirective} blocked ${event.blockedURI || "inline code"} ` +
              `(${event.sourceFile}:${String(event.lineNumber)}, ${event.disposition})`,
          );
        });
      });
      page.on("console", (message) => {
        const type = message.type();
        if (type !== "error" && type !== "warning") return;
        const text = message.text();
        if (allowed.some((pattern) => pattern.test(text))) return;
        problems.push(`console.${type}: ${text}`);
      });
      page.on("pageerror", (error) => {
        problems.push(`uncaught exception: ${error.message}`);
      });

      await use({
        allowConsole: (pattern) => {
          allowed.push(pattern);
        },
      });

      expect(problems, "The page must stay free of CSP violations and console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
