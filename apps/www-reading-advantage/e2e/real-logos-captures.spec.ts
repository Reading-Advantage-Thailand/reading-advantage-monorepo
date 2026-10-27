/**
 * Real Advantage logos — Phase 2 Green: browser captures.
 *
 * Track: www_real_logos_20261008.
 *
 * Saves the 15 named viewport captures (1280x800, not full page) under
 * measure/tracks/www_real_logos_20261008/captures/. The dark pair emulates
 * prefers-color-scheme: dark. The site has no theme switch.
 *
 * Also asserts the served favicon is the new 6507-byte ICO at the root and
 * per locale (en, th, zh), and that no <img> on a captured page returns 404.
 * No hash (repo policy).
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Playwright loads this spec as CommonJS, so import.meta is not available.
 * Resolve from the process working directory instead. Playwright runs from
 * apps/www-reading-advantage, so the repo root is two levels up.
 */
const APP_ROOT = process.cwd();
const REPO_ROOT = join(APP_ROOT, "..", "..");
const CAPTURES_DIR = join(
  REPO_ROOT,
  "measure/tracks/www_real_logos_20261008/captures",
);

const VIEWPORT = { width: 1280, height: 800 };

const ICO_BYTE_LENGTH = 6507;
const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);
const FAVICON_PATHS = [
  "/favicon.ico",
  "/en/favicon.ico",
  "/th/favicon.ico",
  "/zh/favicon.ico",
] as const;

/** Named captures. The order matches the Red test file. */
const CAPTURES = [
  { name: "en-home-light.png", path: "/en" },
  { name: "en-home-footer-light.png", path: "/en", footer: true },
  { name: "en-products-light.png", path: "/en/products" },
  { name: "en-math-light.png", path: "/en/products/math-advantage" },
  { name: "en-primary-light.png", path: "/en/products/primary-advantage" },
  { name: "en-reading-light.png", path: "/en/products/reading-advantage" },
  { name: "en-science-light.png", path: "/en/products/science-advantage" },
  { name: "en-stem-light.png", path: "/en/products/stem-advantage" },
  { name: "en-storytime-light.png", path: "/en/products/storytime-advantage" },
  { name: "en-zhongwen-light.png", path: "/en/products/zhongwen-advantage" },
  { name: "en-tutor-light.png", path: "/en/products/tutor-advantage" },
  { name: "th-home-light.png", path: "/th" },
  { name: "th-primary-light.png", path: "/th/products/primary-advantage" },
  { name: "en-home-dark.png", path: "/en", dark: true },
  { name: "en-tutor-dark.png", path: "/en/products/tutor-advantage", dark: true },
] as const;

/**
 * Records image responses that answer 404 while the page loads.
 * @param page The Playwright page to listen on.
 * @returns The array that collects offending image URLs.
 */
function collectNotFoundImages(page: Page): string[] {
  const notFound: string[] = [];
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "image" &&
      response.status() === 404
    ) {
      notFound.push(response.url());
    }
  });
  return notFound;
}

test.beforeAll(() => {
  expect(
    existsSync(join(REPO_ROOT, "measure/tracks.md")),
    `repo root not found from cwd ${APP_ROOT}`,
  ).toBe(true);
  mkdirSync(CAPTURES_DIR, { recursive: true });
});

test("serves the new 6507-byte favicon at root and per locale", async ({
  request,
}) => {
  for (const faviconPath of FAVICON_PATHS) {
    const response = await request.get(faviconPath);
    expect(
      response.status(),
      `${faviconPath} did not return 200`,
    ).toBe(200);
    const body = await response.body();
    expect(body.length, `${faviconPath} byte length`).toBe(ICO_BYTE_LENGTH);
    expect(
      body.subarray(0, 4).equals(ICO_MAGIC),
      `${faviconPath} does not start with ICO magic 00 00 01 00`,
    ).toBe(true);
  }
});

for (const capture of CAPTURES) {
  test(`captures ${capture.name}`, async ({ page }) => {
    const notFoundImages = collectNotFoundImages(page);
    await page.setViewportSize(VIEWPORT);
    if (capture.dark) {
      await page.emulateMedia({ colorScheme: "dark" });
    }
    await page.goto(capture.path, { waitUntil: "networkidle" });
    if (capture.footer) {
      const footer = page.locator("footer").first();
      if ((await footer.count()) > 0) {
        await footer.scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
      }
      await page.waitForTimeout(300);
    }
    expect(
      notFoundImages,
      `404 images on ${capture.path}: ${notFoundImages.join(", ")}`,
    ).toEqual([]);
    await page.screenshot({ path: join(CAPTURES_DIR, capture.name) });
  });
}
