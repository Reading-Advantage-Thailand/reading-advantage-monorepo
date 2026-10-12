import { PRINT_FONT_FILE, type PrintKit } from "./contracts.js";

/**
 * Checks that the print kit holds no script, no external URL, and only allowlisted font files.
 * @param kit The print kit to check.
 * @throws When the template or CSS has a script tag, an external URL, or an unknown font file.
 */
export function assertPrintKitSafe(kit: PrintKit): void {
  if (/<script\b/i.test(kit.template)) throw new Error("print kit: the template has a script tag");
  if (/\bon[a-z]+\s*=\s*["']/i.test(kit.template)) throw new Error("print kit: the template has an event handler");
  if (/https?:\/\//i.test(kit.template)) throw new Error("print kit: the template has an external URL");
  if (/@import\b|url\(\s*["']?(?:https?:)?\/\//i.test(kit.css)) {
    throw new Error("print kit: the CSS loads an external resource");
  }
  for (const font of kit.fonts) {
    if (!PRINT_FONT_FILE.test(font)) throw new Error(`print kit: font file not allowed: ${font}`);
  }
}
