/**
 * Round r4 adversarial test for the landscape title plaque of the look page (Phase 2, task 2.3h).
 *
 * The rule under test is `header[data-hero] > h1` inside `@media (max-height: 500px)` of
 * `apps/storytime/app/look.css`. The UX finding F1 was a fixed plaque height: the 60-character
 * title left the 40 px plaque by 20 px at 568x320 and at 844x390, in English and in Thai. The
 * Green commit 52f26abea gives the rule `height: auto` and keeps `min-height: 40px`, so the
 * plaque grows with the wrapped title and a one-line title still measures 40 px.
 *
 * This file is an artifact test (test strategy P2.5). jsdom loads no CSS, and jsdom proves no
 * layout. A style-sheet reader proves no layout either. The proof of the geometry is the browser
 * gate row 3 of `look-phase2-browser-gate.sh`: the Red run at 6388eb064 read `plaque_overflow_px=20`
 * in the four landscape cases with a `plaque_h_px=40` plaque, and the Green run read
 * `plaque_overflow_px=0` with `plaque_h_px=66`. This file only holds the fix in place. A later
 * edit that puts the fixed height back must fail here.
 *
 * The file reads the shipped style sheet and parses it with the helper `helpers/css-rules.ts`.
 * The three checks read declarations, so a word in a comment or in a string is not a rule.
 * The self-test mutants are one-line edits of the shipped text in memory. They change no file.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  lastDeclaration,
  lengthPx,
  parseCss,
  selectorParts,
  type CssRule,
} from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");

/** The selector of the title plaque. */
const PLAQUE = "header[data-hero] > h1";
/** The selector of the title plaque as one part of a selector list. */
const PLAQUE_PATTERN = /^header\[data-hero\]\s*>\s*h1$/;
/** The media condition of a landscape phone, where the band is 64 px high. */
const LANDSCAPE = "(max-height: 500px)";
/** The plaque height of a one-line title, in pixels. */
const ONE_LINE_PX = 40;
/** The height values that let the plaque grow with its title. */
const GROWING_HEIGHT =
  /^(auto|inherit|initial|unset|revert|revert-layer|fit-content|max-content|min-content)$/i;

/**
 * Reads the `look.css` text with a named assertion when the file is absent.
 * @returns The style sheet text.
 */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/**
 * Reports whether a rule names the title plaque.
 * @param rule The parsed rule.
 * @returns Whether the selector list holds the plaque selector.
 */
function namesPlaque(rule: CssRule): boolean {
  return selectorParts(rule.selector).some((part) => PLAQUE_PATTERN.test(part.trim()));
}

/**
 * Reports whether a rule sits inside the landscape media block.
 * @param rule The parsed rule.
 * @returns Whether the media stack holds only the landscape condition.
 */
function isLandscape(rule: CssRule): boolean {
  return rule.media.length === 1 && rule.media[0] === LANDSCAPE;
}

/**
 * Collects the landscape rules of the title plaque.
 * @param css The style sheet text.
 * @returns The rules, in source order.
 */
function landscapePlaqueRules(css: string): CssRule[] {
  return parseCss(css).filter((rule) => !rule.keyframes && isLandscape(rule) && namesPlaque(rule));
}

/**
 * P1: the landscape plaque rule sets no definite height, so the box grows with the title.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkNoDefiniteHeight(css: string): string | null {
  const rules = landscapePlaqueRules(css);
  if (rules.length === 0) return `no rule for ${PLAQUE} inside @media ${LANDSCAPE}`;
  for (const rule of rules) {
    const declaration = lastDeclaration([rule], () => true, "height");
    if (!declaration) continue;
    if (!GROWING_HEIGHT.test(declaration.value)) {
      return `${PLAQUE} height is ${declaration.value} inside @media ${LANDSCAPE}`;
    }
  }
  return null;
}

/**
 * P2: the landscape plaque rule keeps `min-height: 40px`, and that is the effective value.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkMinHeight(css: string): string | null {
  const rules = landscapePlaqueRules(css);
  if (rules.length === 0) return `no rule for ${PLAQUE} inside @media ${LANDSCAPE}`;
  const declared = lastDeclaration(rules, () => true, "min-height");
  if (!declared) return `${PLAQUE} has no min-height inside @media ${LANDSCAPE}`;
  if (lengthPx(declared.value) !== ONE_LINE_PX) {
    return `${PLAQUE} min-height is ${declared.value} inside @media ${LANDSCAPE}`;
  }
  const effective = lastDeclaration(parseCss(css), namesPlaque, "min-height");
  if (!effective || lengthPx(effective.value) !== ONE_LINE_PX) {
    return `the effective min-height of ${PLAQUE} is ${effective?.value ?? "none"}`;
  }
  return null;
}

/**
 * P3: the plaque stays anchored to its bottom edge, so it grows upward and never grows the band.
 * @param css The style sheet text.
 * @returns A failure message, or `null` when the check holds.
 */
function checkAnchored(css: string): string | null {
  const rules = parseCss(css);
  const landscape = landscapePlaqueRules(css);
  if (landscape.length === 0) return `no rule for ${PLAQUE} inside @media ${LANDSCAPE}`;
  const position = lastDeclaration(rules, namesPlaque, "position");
  if (!position || position.value.toLowerCase() !== "absolute") {
    return `the effective position of ${PLAQUE} is ${position?.value ?? "none"}`;
  }
  const bottom = lastDeclaration(landscape, () => true, "bottom");
  if (!bottom || lengthPx(bottom.value) === null) {
    return `${PLAQUE} has no bottom edge inside @media ${LANDSCAPE}`;
  }
  const top = lastDeclaration(landscape, () => true, "top");
  if (top && lengthPx(top.value) !== null) {
    return `${PLAQUE} has a top edge of ${top.value} inside @media ${LANDSCAPE}`;
  }
  return null;
}

describe("look.css landscape plaque (task 2.3h, round r4)", () => {
  it("finds the landscape plaque rule of the shipped style sheet", () => {
    const rules = landscapePlaqueRules(readLookCss());
    expect(`plaque_rules=${rules.length}`).toMatch(/^plaque_rules=[1-9][0-9]*$/);
    expect(rules.length, "the landscape rule of the plaque must be found").toBeGreaterThan(0);
  });

  it("P1 the landscape plaque sets no definite height", () => {
    expect(checkNoDefiniteHeight(readLookCss())).toBeNull();
  });

  it("P2 the landscape plaque keeps min-height 40px", () => {
    expect(checkMinHeight(readLookCss())).toBeNull();
  });

  it("P3 the landscape plaque stays anchored to its bottom edge", () => {
    expect(checkAnchored(readLookCss())).toBeNull();
  });

  it("rejects the self-test mutants of the landscape plaque rule", () => {
    const base = readLookCss();
    const checks: Record<string, (css: string) => string | null> = {
      P1: checkNoDefiniteHeight,
      P2: checkMinHeight,
      P3: checkAnchored,
    };
    const mutants = [
      {
        id: "M1",
        note: "the fixed 40 px height of the F1 bug",
        css: base.replace(/(\n\s*min-height:\s*40px;\n\s*)height:\s*auto;/, "$1height: 40px;"),
        killedBy: "P1",
      },
      {
        id: "M2",
        note: "the min-height pin removed",
        css: base.replace(/\n\s*min-height:\s*40px;/, ""),
        killedBy: "P2",
      },
      {
        id: "M3",
        note: "the plaque no longer absolute",
        css: base.replace(
          /(header\[data-hero\] > h1 \{)\n(\s*)position:\s*absolute;/,
          "$1\n$2position: static;",
        ),
        killedBy: "P3",
      },
      {
        id: "M4",
        note: "the bottom edge removed",
        css: base.replace(/(\n\s*min-height:\s*40px;\n\s*height:\s*auto;)\n\s*bottom:\s*-16px;/, "$1"),
        killedBy: "P3",
      },
    ];
    expect(`mutants_checked=${mutants.length}`).toBe("mutants_checked=4");
    expect(checkNoDefiniteHeight(base), "the shipped style sheet holds the fix").toBeNull();
    expect(checkMinHeight(base), "the shipped style sheet holds the fix").toBeNull();
    expect(checkAnchored(base), "the shipped style sheet holds the fix").toBeNull();
    let rejected = 0;
    for (const mutant of mutants) {
      expect(mutant.css, `${mutant.id} must change the style sheet`).not.toBe(base);
      const failure = checks[mutant.killedBy]!(mutant.css);
      expect(failure, `${mutant.id} (${mutant.note}) must be rejected by ${mutant.killedBy}`).not.toBeNull();
      rejected += 1;
    }
    expect(`mutants_rejected=${rejected}/${mutants.length}`).toBe(
      `mutants_rejected=${mutants.length}/${mutants.length}`,
    );
  });
});
