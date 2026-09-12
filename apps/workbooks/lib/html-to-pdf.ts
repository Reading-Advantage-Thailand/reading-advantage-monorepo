import { chromium } from "playwright";

/**
 * Converts a self-contained HTML document into print-ready PDF bytes.
 *
 * This is the provider binding for the domain's injected `WorkbookHtmlToPdf`
 * converter: the domain layer never imports a browser, so the dependency lives
 * here in the app.
 * @param html Self-contained HTML document produced by the domain renderer.
 * @returns The rendered PDF document bytes.
 */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
    });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
