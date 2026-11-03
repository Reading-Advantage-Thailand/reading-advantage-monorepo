import { mkdirSync, statSync } from "node:fs";
import { chromium } from "@playwright/test";

const port = Number(process.env.PORT);
const output = process.env.CAPTURE_DIR;
if (!port || !output) throw new Error("PORT and CAPTURE_DIR are required");
mkdirSync(output, { recursive: true });
const captures = [];

async function capture(locale, label, url, width, height, locate) {
  const path = `${output}/${locale}-${label}-desktop.png`;
  console.log(`Capturing ${locale}-${label}-desktop at ${width}x${height} -> ${path}`);
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    const response = await page.goto(`http://127.0.0.1:${port}/${locale}${url}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    if (response?.status() !== 200) throw new Error(`${locale}-${label}: HTTP ${response?.status()}`);
    await locate(page);
    await page.screenshot({ path, fullPage: false, animations: "disabled", timeout: 60000 });
    const file = statSync(path);
    if (file.size === 0) throw new Error(`${locale}-${label}: screenshot file is empty`);
    captures.push({ path, status: response.status(), width, size: file.size });
    await page.close();
  } catch (error) {
    console.error(`${locale}-${label} capture failed:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

for (const locale of ["en", "th"]) {
  for (const [label, width, height] of [["desktop", 1440, 900], ["phone", 390, 844]]) {
    const path = `${output}/${locale}-${label}.png`;
    console.log(`Capturing ${locale}-${label} at ${width}x${height} -> ${path}`);
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--disable-dev-shm-usage", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);
      const response = await page.goto(`http://127.0.0.1:${port}/${locale}/products/storytime-advantage`, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (response?.status() !== 200) throw new Error(`${locale}-${label}: HTTP ${response?.status()}`);
      await page.waitForFunction(() => {
        const images = Array.from(document.querySelectorAll("[data-testid^='st-'] img"));
        if (images.length !== 10) return false;
        for (const image of images) image.loading = "eager";
        return images.every((image) => image.complete);
      }, { timeout: 60000 });
      const report = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        images: Array.from(document.querySelectorAll("[data-testid^='st-'] img"), (image) => ({
          src: image.currentSrc || image.src,
          loaded: image.complete && image.naturalWidth > 0,
        })),
      }));
      const failed = report.images.filter((image) => !image.loaded);
      if (report.document > width || report.body > width) {
        throw new Error(`${locale}-${label}: horizontal overflow ${report.document}/${report.body} at ${width}`);
      }
      if (report.images.length !== 10 || failed.length) {
        throw new Error(`${locale}-${label}: found ${report.images.length} images and ${failed.length} broken image(s): ${failed.map(({ src }) => src).join(", ")}`);
      }
      await page.screenshot({ path, fullPage: true, animations: "disabled" });
      const file = statSync(path);
      if (file.size === 0) throw new Error(`${locale}-${label}: screenshot file is empty`);
      captures.push({ path, status: response.status(), width, images: report.images.length, overflow: false });
      await page.close();
    } catch (error) {
      console.error(`${locale}-${label} capture failed:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

for (const locale of ["en", "th"]) {
  await capture(locale, "products", "/products", 1440, 1000, async (page) => {
    await page.getByRole("heading", { name: "Storytime Advantage" }).last().scrollIntoViewIfNeeded();
  });
  await capture(locale, "nav", "/products", 1440, 1000, async (page) => {
    const productsNavLabel = locale === "en" ? "Products" : "ผลิตภัณฑ์";
    if (!(await page.locator("header nav").getByRole("link", { name: productsNavLabel }).isVisible())) {
      throw new Error(`${locale}-nav: product navigation is not visible`);
    }
    const storytimeLink = page.locator('a[href*="storytime-advantage"]').last();
    await storytimeLink.scrollIntoViewIfNeeded();
    if (!(await storytimeLink.isVisible())) throw new Error(`${locale}-nav: Storytime navigation link is not visible`);
  });
  await capture(locale, "home", "", 1440, 1000, async (page) => {
    await page.locator('a[href*="storytime-advantage"]').last().scrollIntoViewIfNeeded();
  });
}

console.log(JSON.stringify(captures, null, 2));
