/**
 * Task 2.2a: the hit area of a read-along word and the touch marker of a clip word (carried Phase 1
 * items N1 and N2; strategy P2.2 `look-hit-and-hint` and P2.7; Q27 and Q28).
 *
 * N1: a read-along word gets no layout width (AC-1.9: an even word gap) and a hit area of 48 px or
 * more in height. The width part of the old finding (a hit area wider than 10 px for "I") is a
 * recorded non-goal: a wider area takes the tap of the neighbour (M38).
 * N2: a clip word (`[data-word][tabindex]`) shows a marker that needs no hover, because a phone has
 * none. The marker is a dotted underline or a bottom border, on that selector only.
 *
 * This is an artifact test on the rules of `look.css`. The proof of the computed style and the
 * measured hit height is row 5 of the browser gate (`word_hit_h_px_min`). At the base `look.css`
 * does not exist, so the three file cases fail with `Missing apps/storytime/app/look.css`. The
 * self-test cases run the checks on broken copies; they test the checks and pass.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lengthPx, parseCss, selectorParts } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");
const WIDTH_PROPERTIES = ["min-width", "width", "max-width"];

/**
 * Reads the `look.css` text with a named assertion when the file is absent.
 * @returns The style sheet text.
 */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/**
 * Reports whether a selector part ends on a read-along word, with or without a pseudo-element.
 * @param part One selector.
 * @returns Whether the part names `[data-word]`.
 */
function namesWord(part: string): boolean {
  return /\[data-word\]/.test(part);
}

/**
 * N1-a: finds the rules that give a read-along word a width.
 * @param css The style sheet text.
 * @returns The failure messages.
 */
function checkNoWordWidth(css: string): string[] {
  const failures: string[] = [];
  for (const rule of parseCss(css)) {
    if (rule.keyframes || !selectorParts(rule.selector).some(namesWord)) continue;
    for (const declaration of rule.declarations) {
      if (WIDTH_PROPERTIES.includes(declaration.property) && !/^(0|0px|auto|none)$/i.test(declaration.value)) {
        failures.push(`${rule.selector} { ${declaration.property}: ${declaration.value} }`);
      }
    }
  }
  return failures;
}

/**
 * N1-b: finds a rule that gives a word a hit area of 48 px or more in height.
 *
 * Three forms count: a `min-height` of 48 px or more on `[data-word]`; a `::before` hit area with
 * a `height` of 48 px or more; and a `::before` hit area with `top` and `bottom` of -12 px or
 * further (a text line of 24 px or more plus 12 px on each side reaches 48 px; the browser row
 * measures the real height).
 * @param css The style sheet text.
 * @returns The forms found.
 */
function hitAreaForms(css: string): string[] {
  const forms: string[] = [];
  for (const rule of parseCss(css)) {
    if (rule.keyframes) continue;
    for (const part of selectorParts(rule.selector)) {
      if (!namesWord(part)) continue;
      const pseudo = /::?before\s*$/.test(part);
      const px = (property: string) => {
        const found = [...rule.declarations].reverse().find((declaration) => declaration.property === property);
        return found ? lengthPx(found.value) : null;
      };
      if (!pseudo && (px("min-height") ?? 0) >= 48) forms.push(`${part} min-height`);
      if (pseudo && (px("height") ?? 0) >= 48) forms.push(`${part} height`);
      if (pseudo && (px("top") ?? 0) <= -12 && (px("bottom") ?? 0) <= -12) forms.push(`${part} insets`);
    }
  }
  return forms;
}

/**
 * N2: finds the touch-visible marker rules of a clip word.
 * @param css The style sheet text.
 * @returns The marker rules: no hover or focus in the selector, with an underline or a bottom border.
 */
function markerRules(css: string): string[] {
  const found: string[] = [];
  for (const rule of parseCss(css)) {
    if (rule.keyframes || !rule.selector.includes("[data-word][tabindex]")) continue;
    if (/:hover|:focus|:active/.test(rule.selector)) continue;
    const draws = rule.declarations.some(
      (declaration) =>
        ((declaration.property === "text-decoration" || declaration.property === "text-decoration-line") &&
          /underline/i.test(declaration.value)) ||
        (declaration.property === "border-bottom" && !/^(0|none)/i.test(declaration.value)) ||
        (declaration.property === "border-bottom-width" && (lengthPx(declaration.value) ?? 0) > 0),
    );
    if (draws) found.push(rule.selector);
  }
  return found;
}

/** A style sheet with the three forms, and the marker. */
const GOOD_CSS = `
[data-word] { min-height: 48px; }
[data-word][tabindex] { text-decoration: underline dotted; text-underline-offset: 0.2em; }
[data-word]::before { content: ""; position: absolute; top: -12px; bottom: -12px; }
`;

describe("a read-along word keeps no width and a 48 px hit area (N1)", () => {
  it("N1-a no look.css rule gives a read-along word a min-width or a width", () => {
    expect(checkNoWordWidth(readLookCss())).toEqual([]);
  });

  it("N1-b a look.css rule gives [data-word] a hit area of 48 px or more in height", () => {
    const forms = hitAreaForms(readLookCss());
    expect(`hit_area_forms=${forms.length}`, "no rule gives a word a 48 px hit height").toMatch(
      /^hit_area_forms=[1-9][0-9]*$/,
    );
  });
});

describe("a clip word shows a marker with no hover (N2)", () => {
  it("N2 look.css marks [data-word][tabindex] with an underline or a bottom border", () => {
    const rules = markerRules(readLookCss());
    expect(`marker_rules=${rules.length}`, "no touch-visible marker rule").toMatch(/^marker_rules=[1-9][0-9]*$/);
  });
});

describe("the checks fail their broken copies (falsification)", () => {
  it("the good copy passes the three checks", () => {
    expect(checkNoWordWidth(GOOD_CSS)).toEqual([]);
    expect(hitAreaForms(GOOD_CSS)).toHaveLength(2);
    expect(markerRules(GOOD_CSS)).toHaveLength(1);
  });

  it("a min-width of 48px on a word fails N1-a", () => {
    const study = GOOD_CSS.replace("min-height: 48px;", "min-height: 48px; min-width: 48px;");
    expect(checkNoWordWidth(study)).toHaveLength(1);
  });

  it("a word with no height rule, and a short hit area, fail N1-b", () => {
    expect(hitAreaForms("[data-word] { color: #111; }")).toEqual([]);
    expect(hitAreaForms("[data-word] { min-height: 44px; }")).toEqual([]);
    expect(hitAreaForms("[data-word]::before { top: -6px; bottom: -6px; }")).toEqual([]);
  });

  it("a marker only on :hover fails N2", () => {
    const hoverOnly = "[data-word][tabindex]:hover { text-decoration: underline; }";
    expect(markerRules(hoverOnly)).toEqual([]);
    expect(markerRules("[data-word] { text-decoration: underline; }"), "a marker on every word is no clip hint").toEqual([]);
    expect(markerRules("[data-word][tabindex] { border-bottom: 2px dotted #333; }")).toHaveLength(1);
  });
});
