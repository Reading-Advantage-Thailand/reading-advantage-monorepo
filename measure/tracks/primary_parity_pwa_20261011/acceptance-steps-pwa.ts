import type { Page } from "playwright";

/**
 * Shows the legacy header install button in a capture browser.
 * Desktop Chromium never fires `beforeinstallprompt`, so the header button stays hidden; a
 * synthetic event opens the same state the real event opens. Then waits for the dismiss control
 * that renders next to the button in both the iOS and the Chrome branch.
 */
export async function showLegacyInstallButton(page: Page): Promise<void> {
  await page.locator("main").first().waitFor({ timeout: 30000 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeinstallprompt"));
  });
  await page.locator('button[aria-label="Dismiss install prompt"]').first().waitFor({ timeout: 30000 });
}

/**
 * Shows the new pinned install notice in a capture browser.
 * Desktop Chromium never fires `beforeinstallprompt`, so the notice stays hidden; a synthetic
 * event opens the same `install-button` state the real event opens. Then waits for the notice
 * title in the student home guild hall.
 */
export async function showInstallNotice(page: Page): Promise<void> {
  await page.locator("main").first().waitFor({ timeout: 30000 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeinstallprompt"));
  });
  await page.locator("#pwa-install-title").waitFor({ timeout: 30000 });
}

/** Steps for the legacy app. */
export { showLegacyInstallButton as legacy };

/** Steps for the new app. */
export { showInstallNotice as new };
