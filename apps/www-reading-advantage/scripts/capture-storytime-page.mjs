import { mkdirSync, statSync } from "node:fs";
import { chromium } from "@playwright/test";

const port = Number(process.env.PORT);
const output = process.env.CAPTURE_DIR;
const captureOverviewOnly = process.env.CAPTURE_OVERVIEW_ONLY === "1";
const captureRound2Final = process.env.CAPTURE_ROUND2_FINAL === "1";
if (!port || !output) throw new Error("PORT and CAPTURE_DIR are required");
mkdirSync(output, { recursive: true });
const captures = [];

async function prepareImages(page, locale, label) {
  let timer;
  let result;
  try {
    result = await Promise.race([
      page.evaluate(async () => {
        const step = Math.max(Math.floor(window.innerHeight * 0.75), 240);
        const maxScroll = document.documentElement.scrollHeight;
        for (let scrollY = 0; scrollY < maxScroll; scrollY += step) {
          window.scrollTo(0, scrollY);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        window.scrollTo(0, maxScroll);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const images = Array.from(document.images);
        for (const image of images) image.loading = "eager";
        const decoded = await Promise.all(images.map(async (image) => {
          try {
            await image.decode();
            return { src: image.currentSrc || image.src, naturalWidth: image.naturalWidth };
          } catch {
            return { src: image.currentSrc || image.src, naturalWidth: 0 };
          }
        }));
        window.scrollTo(0, 0);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return decoded;
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${locale}-${label}: image preparation exceeded 60 seconds`)), 60000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  const failed = result.filter(({ naturalWidth }) => naturalWidth <= 0);
  if (failed.length) throw new Error(`${locale}-${label}: ${failed.length} image(s) failed decode or width check: ${failed.map(({ src }) => src).join(", ")}`);
  console.log(`${locale}-${label}: decoded ${result.length} images with naturalWidth > 0`);
}

async function capture(locale, label, url, width, height, locate, fileName = `${locale}-${label}-desktop.png`, fullPage = false) {
  const path = `${output}/${fileName}`;
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
    const response = await page.goto(`http://127.0.0.1:${port}/${locale}${url}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    if (response?.status() !== 200) throw new Error(`${locale}-${label}: HTTP ${response?.status()}`);
    await prepareImages(page, locale, label);
    await locate(page);
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        try {
          animation.finish();
        } catch {
          // Infinite ambient animations do not have a finish time.
        }
      }
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path, fullPage, animations: "disabled", timeout: 60000 });
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

for (const locale of captureOverviewOnly && !captureRound2Final ? [] : ["en", "th"]) {
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
      await page.evaluate(async () => {
        const images = Array.from(document.images);
        for (const image of images) image.loading = "eager";
        const step = Math.max(Math.floor(window.innerHeight * 0.75), 240);
        let scrollY = 0;
        while (scrollY < document.documentElement.scrollHeight) {
          window.scrollTo(0, scrollY);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          scrollY += step;
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.scrollTo(0, 0);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await page.waitForFunction(() => {
        const images = Array.from(document.querySelectorAll("[data-testid^='st-'] img"));
        if (images.length !== 11) return false;
        for (const image of images) image.loading = "eager";
        return Promise.all(images.map(async (image) => {
          try {
            await image.decode();
            return { src: image.currentSrc || image.src, decoded: true, naturalWidth: image.naturalWidth };
          } catch {
            return { src: image.currentSrc || image.src, decoded: false, naturalWidth: image.naturalWidth };
          }
        })).then((results) => {
          window.__storytimeDecodeResults = results;
          return true;
        });
      }, undefined, { timeout: 60000 });
      await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll("[data-testid^='st-'] img"));
        for (const image of images) {
          image.scrollIntoView({ block: "center" });
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        window.scrollTo(0, 0);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const report = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        images: Array.from(document.querySelectorAll("[data-testid^='st-'] img"), (image) => ({
          src: image.currentSrc || image.src,
          naturalWidth: image.naturalWidth,
        })),
        decoded: window.__storytimeDecodeResults ?? [],
        rendered: Array.from(document.querySelectorAll("[data-testid^='st-'] img"), (image) => {
          const box = image.getBoundingClientRect();
          return { src: image.currentSrc || image.src, width: box.width, height: box.height };
        }),
      }));
      const failed = report.images.filter((image, index) => image.naturalWidth <= 0 || !report.decoded[index]?.decoded);
      const unpainted = report.rendered.filter(({ width, height }) => width <= 0 || height <= 0);
      if (report.document > width || report.body > width) {
        throw new Error(`${locale}-${label}: horizontal overflow ${report.document}/${report.body} at ${width}`);
      }
      if (report.images.length !== 11 || failed.length) {
        throw new Error(`${locale}-${label}: ${report.images.length} images; ${failed.length} failed decode or natural-width check(s): ${failed.map(({ src }) => src).join(", ")}`);
      }
      if (report.rendered.length !== 11 || unpainted.length) {
        throw new Error(`${locale}-${label}: ${report.rendered.length} story image boxes; ${unpainted.length} have zero rendered size: ${unpainted.map(({ src }) => src).join(", ")}`);
      }
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(500);
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

for (const locale of captureOverviewOnly || captureRound2Final ? [] : ["en", "th"]) {
  await capture(locale, "products", "/products", 1440, 1000, async (page) => {
    await page.getByRole("heading", { name: "Storytime Advantage" }).last().scrollIntoViewIfNeeded();
  }, `${locale}-products-desktop.png`);
  await capture(locale, "nav", "/products", 1440, 1000, async (page) => {
    const productsNavLabel = locale === "en" ? "Products" : "ผลิตภัณฑ์";
    if (!(await page.locator("header nav").getByRole("link", { name: productsNavLabel }).isVisible())) {
      throw new Error(`${locale}-nav: product navigation is not visible`);
    }
    const storytimeLink = page.locator('a[href*="storytime-advantage"]').last();
    await storytimeLink.scrollIntoViewIfNeeded();
    if (!(await storytimeLink.isVisible())) throw new Error(`${locale}-nav: Storytime navigation link is not visible`);
  }, `${locale}-nav-desktop.png`);
  await capture(locale, "home", "", 1440, 1000, async (page) => {
    await page.locator('a[href*="storytime-advantage"]').last().scrollIntoViewIfNeeded();
  }, `${locale}-home-desktop.png`);
  await capture(locale, "phone-top", "/products/storytime-advantage", 390, 844, async () => {}, `${locale}-phone-top.png`);
  await capture(locale, "phone-top-360", "/products/storytime-advantage", 360, 780, async () => {}, `${locale}-phone-top-360.png`);
}

for (const locale of captureOverviewOnly || captureRound2Final ? ["en", "th"] : []) {
  for (const [device, width, height] of [["desktop", 1440, 900], ["phone", 390, 844]]) {
    await capture(locale, `overview-${device}`, "/products", width, height, async (page) => {
      await page.getByRole("heading", { name: "Storytime Advantage" }).last().scrollIntoViewIfNeeded();
    }, `${locale}-overview-${device}.png`, true);
  }
}

console.log(JSON.stringify(captures, null, 2));
