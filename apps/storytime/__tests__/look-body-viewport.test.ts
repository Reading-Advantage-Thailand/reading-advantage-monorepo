/**
 * P3 post-acceptance launch fix: the body fills the viewport on the sign-in page.
 *
 * On a tall viewport (980 and 1280 px) a large empty dark-brown band sits under the
 * sign-in form. Cause: `html` sets `background: #6b3a14` while `body` sets only
 * `background: var(--sq-cream)` with no height floor, so the body is only as tall as
 * its content and the brown html ground shows below it. No footer exists in the DOM.
 * Green adds `body { min-height: 100dvh; }` in that body block of `app/look.css`; the
 * brown html ground stays (it serves overscroll).
 *
 * This is an artifact test: it reads the rules of `app/look.css` with the helper
 * `helpers/css-rules.ts`. A word in a comment or in a string is not a rule. The
 * falsification cases run on broken copies in memory and change no file. This file
 * needs no database.
 *
 * No existing test pins the exact body block text (checked 2026-11-25: `rg` for
 * `body` in `apps/storytime/__tests__` finds no look.css body-block pin).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lastDeclaration, parseCss, selectorParts, type CssRule } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");

/** The viewport heights that fill the page under the sign-in form. */
const VIEWPORT_MIN_HEIGHT = /^(100dvh|100svh|100vh)$/i;

/**
 * Reads the `look.css` text with a named assertion when the file is absent.
 * @returns The style sheet text.
 */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/**
 * Reports whether a rule is the top-level `body` rule (outside any media block).
 * @param rule The parsed rule.
 * @returns Whether the selector list holds `body` with no enclosing media.
 */
function isTopLevelBody(rule: CssRule): boolean {
  return (
    rule.media.length === 0 &&
    selectorParts(rule.selector).some((part) => part.trim().toLowerCase() === "body")
  );
}

/**
 * B1: the top-level `body` rule fills the viewport, so cream ends the page.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkBodyViewport(css: string): string | null {
  const rules = parseCss(css).filter(isTopLevelBody);
  if (rules.length === 0) return "no top-level body rule in look.css";
  const declared = lastDeclaration(parseCss(css), isTopLevelBody, "min-height");
  if (!declared) return "the top-level body rule sets no min-height";
  if (!VIEWPORT_MIN_HEIGHT.test(declared.value.trim())) {
    return `the body min-height is ${declared.value}, not a viewport height`;
  }
  return null;
}

/**
 * B2: the top-level `body` rule keeps the cream ground.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkBodyCream(css: string): string | null {
  const rules = parseCss(css);
  const background = lastDeclaration(rules, isTopLevelBody, "background");
  const backgroundColor = lastDeclaration(rules, isTopLevelBody, "background-color");
  const value = background?.value ?? backgroundColor?.value ?? "";
  if (!value.toLowerCase().includes("var(--sq-cream)")) {
    return `the body background is ${value || "none"}, not var(--sq-cream)`;
  }
  return null;
}

/** A style sheet copy that holds the fix. */
const GOOD_CSS = `
body { background: var(--sq-cream); color: var(--st-ink); min-height: 100dvh; }
`;

describe("look.css body fills the viewport (P3 sign-in band)", () => {
  it("finds the top-level body rule of the shipped style sheet", () => {
    const rules = parseCss(readLookCss()).filter(isTopLevelBody);
    expect(`body_rules=${rules.length}`).toMatch(/^body_rules=[1-9][0-9]*$/);
    expect(rules.length, "the top-level body rule must be found").toBeGreaterThan(0);
  });

  it("B1 the body fills the viewport (min-height is a viewport height)", () => {
    expect(checkBodyViewport(readLookCss())).toBeNull();
  });

  it("B2 the body keeps the cream ground", () => {
    expect(checkBodyCream(readLookCss())).toBeNull();
  });

  it("parses the fixture and rejects the broken copies (falsification)", () => {
    expect(checkBodyViewport(GOOD_CSS)).toBeNull();
    expect(checkBodyCream(GOOD_CSS)).toBeNull();
    const noFloor = GOOD_CSS.replace(" min-height: 100dvh;", "");
    expect(checkBodyViewport(noFloor), "a body without min-height fails B1").not.toBeNull();
    expect(checkBodyCream(noFloor), "a body without min-height still keeps cream").toBeNull();
    const pxFloor = GOOD_CSS.replace("min-height: 100dvh", "min-height: 600px");
    expect(checkBodyViewport(pxFloor), "a pixel floor fails B1").not.toBeNull();
    const grayGround = GOOD_CSS.replace("var(--sq-cream)", "#fff");
    expect(checkBodyCream(grayGround), "a non-cream ground fails B2").not.toBeNull();
    expect(checkBodyViewport(grayGround), "a non-cream ground still fills the view").toBeNull();
  });
});
