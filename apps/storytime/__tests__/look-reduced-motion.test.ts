/**
 * Task 2.2: motion sits under `prefers-reduced-motion: no-preference` (AC-2.3, motion part;
 * strategy P2.2).
 *
 * Every `animation*`, `transition*`, and `scroll-behavior: smooth` declaration of `look.css`, and
 * every `@keyframes` block, sits inside `@media (prefers-reduced-motion: no-preference)`. A
 * top-level rule, a rule inside `(prefers-reduced-motion: reduce)`, and a rule inside a
 * `(max-height: ...)` block alone all fail. `motion_rules` is a labeled integer above 0 (the crest
 * bob and the lyric glow of the study), so a file with no motion is not a pass (A4). The proof of
 * the computed style under a reduced-motion browser is row 7 of the browser gate.
 *
 * At the base `app/look.css` and `app/[locale]/frame.tsx` do not exist, so the file cases fail
 * with a named assertion. The parser self-tests pass at the base: they test the parser.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { parseCss } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");
const framePath = resolve(app, "app/[locale]/frame.tsx");
const layoutPath = resolve(app, "app/[locale]/layout.tsx");
const MOTION_OK = "(prefers-reduced-motion: no-preference)";
const MOTION_REDUCE = "(prefers-reduced-motion: reduce)";

/**
 * Finds the motion rules of a style sheet and the ones that sit outside the no-preference block.
 * @param css The style sheet text.
 * @returns The count of motion rules and the violations.
 */
function checkMotion(css: string): { motionRules: number; violations: string[] } {
  const violations: string[] = [];
  let motionRules = 0;
  for (const rule of parseCss(css)) {
    const inside = rule.media.includes(MOTION_OK) && !rule.media.includes(MOTION_REDUCE);
    const isKeyframes = /^@(-\w+-)?keyframes\b/i.test(rule.selector);
    if (isKeyframes) {
      motionRules += 1;
      if (!inside) violations.push(`${rule.selector} sits outside ${MOTION_OK}`);
    }
    for (const declaration of rule.declarations) {
      const { property, value } = declaration;
      const motion =
        /^(animation|transition)(-.+)?$/.test(property) ||
        (property === "scroll-behavior" && /smooth/i.test(value));
      if (!motion || rule.keyframes) continue;
      motionRules += 1;
      if (!inside) violations.push(`${rule.selector} { ${property}: ${value} } sits outside ${MOTION_OK}`);
    }
  }
  return { motionRules, violations };
}

/**
 * Finds the class tokens and imports of a component source that bring motion with no guard.
 * @param source The source text.
 * @returns The violations.
 */
function checkSourceMotion(source: string): string[] {
  const violations: string[] = [];
  const file = ts.createSourceFile("source.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      if (/^(framer-motion|motion(\/react)?)$/.test(node.moduleSpecifier.text)) violations.push("motion import");
    }
    // Only string text counts: a comment that names a class is not a class (A1, A7).
    const text =
      ts.isStringLiteralLike(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node)
        ? node.text
        : null;
    if (text !== null && !ts.isImportDeclaration(node.parent)) {
      for (const token of text.split(/\s+/)) {
        const parts = token.split(":");
        const base = parts.at(-1) ?? "";
        if (/^(animate-[\w-]+|transition(-[\w-]+)?)$/.test(base) && !parts.slice(0, -1).includes("motion-safe")) {
          violations.push(`unguarded class ${token}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return violations;
}

/**
 * Reads one file with a named assertion when it is absent.
 * @param path The absolute path.
 * @param label The label of the missing-file message.
 * @returns The text.
 */
function readNamed(path: string, label: string): string {
  expect(existsSync(path), `Missing ${label}`).toBe(true);
  return readFileSync(path, "utf8");
}

/** A style sheet whose motion sits under the no-preference block. */
const GOOD_CSS = `
.sq-card { color: #111; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes sq-bob { from { transform: none; } to { transform: translateY(-2px); } }
  [data-crest] { animation: sq-bob 3s ease-in-out infinite; }
  .sq-line { transition: background-color 120ms; }
}
`;

describe("look.css motion rules (AC-2.3)", () => {
  it("every animation, transition, and keyframes block of look.css sits under no-preference", () => {
    const { motionRules, violations } = checkMotion(readNamed(lookCssPath, "apps/storytime/app/look.css"));
    expect(`motion_rules=${motionRules}`, "the look must hold motion rules").toMatch(/^motion_rules=[1-9][0-9]*$/);
    expect(violations).toEqual([]);
  });

  it("frame.tsx and layout.tsx hold no unguarded animate or transition class and no motion library", () => {
    const frame = readNamed(framePath, "apps/storytime/app/[locale]/frame.tsx");
    const layout = readNamed(layoutPath, "apps/storytime/app/[locale]/layout.tsx");
    expect(checkSourceMotion(frame), "frame.tsx").toEqual([]);
    expect(checkSourceMotion(layout), "layout.tsx").toEqual([]);
  });

  it("the parser counts motion under no-preference and finds no violation (self-test)", () => {
    const result = checkMotion(GOOD_CSS);
    expect(`motion_rules=${result.motionRules}`).toBe("motion_rules=3");
    expect(result.violations).toEqual([]);
  });

  it("a top-level animation fails (self-test)", () => {
    const css = `${GOOD_CSS}\n[data-crest] { animation: sq-bob 1s; }`;
    expect(checkMotion(css).violations).toHaveLength(1);
  });

  it("a transition inside the reduce block fails (self-test)", () => {
    const css = `@media (prefers-reduced-motion: reduce) { .sq-line { transition: color 1s; } }`;
    expect(checkMotion(css).violations).toHaveLength(1);
  });

  it("a motion rule inside a max-height block alone, and a top-level keyframes block, fail (self-test)", () => {
    const tall = `@media (max-height: 500px) { .sq-line { transition: color 1s; } }`;
    expect(checkMotion(tall).violations, "a max-height block is not a reduced-motion guard").toHaveLength(1);
    const keyframes = `@keyframes sq-bob { from { opacity: 0; } to { opacity: 1; } }`;
    expect(checkMotion(keyframes).violations, "a top-level keyframes block fails").toHaveLength(1);
  });

  it("smooth scrolling at the top level fails (self-test)", () => {
    expect(checkMotion("html { scroll-behavior: smooth; }").violations).toHaveLength(1);
    expect(checkMotion("html { scroll-behavior: auto; }").violations).toEqual([]);
  });

  it("the text animation inside a comment is not a rule (self-test)", () => {
    const css = `/* animation: sq-bob 3s; @keyframes x {} */ .sq-card { color: #111; }`;
    const result = checkMotion(css);
    expect(`motion_rules=${result.motionRules}`, "a comment holds no motion rule").toBe("motion_rules=0");
    expect(result.violations).toEqual([]);
  });

  it("the source check flags animate and transition classes and the motion library (self-test)", () => {
    expect(checkSourceMotion('<div className="animate-bounce" />')).not.toEqual([]);
    expect(checkSourceMotion('<div className="transition-colors" />')).not.toEqual([]);
    expect(checkSourceMotion('<div className="motion-safe:animate-bounce motion-safe:transition" />')).toEqual([]);
    expect(checkSourceMotion('import { motion } from "framer-motion";')).not.toEqual([]);
    expect(
      checkSourceMotion('// the animate-bounce class stays off\nexport const a = <div className="p-2" />;'),
      "a comment that names a class is not a class",
    ).toEqual([]);
  });
});
