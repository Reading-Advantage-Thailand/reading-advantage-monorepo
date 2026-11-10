/**
 * Task 2b.1: the brand chrome of the source files and of the style sheet (AC-4.4, AC-4.5, AC-4.7;
 * strategy P2b.2 S1 to S12).
 *
 * The chrome takes the two tones of the logo: `--st-amber: #fcd34d` and `--st-brown: #92400e`.
 * The four chrome families are the title banner, the buttons, the panel frames, and the section
 * cards. A blue chrome token and a gold chrome token must not stay in a chrome rule. The art and
 * the per-word highlight keep their colours.
 *
 * Every scan reads rules, selectors, or JSX class names. No scan reads a word in a comment. Every
 * count is a labeled integer with a floor above zero, so an empty input never passes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { lastCompound, parseCss, selectorParts, type CssRule } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const repo = resolve(app, "../..");
const lookCssPath = resolve(app, "app/look.css");
const logoPath = resolve(app, "app/look/logo/storytime-advantage.svg");

/** The blue chrome tokens of the old look. */
const BLUE_TOKENS = ["var(--sq-blue)", "var(--sq-blue-top)", "var(--sq-blue-dark)", "var(--sq-navy)"];
/** The blue plaque gradient. It paints a blue surface. */
const BLUE_PLAQUE = "var(--sq-plaque)";
/** The gold chrome tokens. Q43 lets the gold stay outside a chrome rule. */
const GOLD_TOKENS = ["var(--sq-gold)", "var(--sq-gold-img)"];
/** The two brand tones of the logo. */
const BRAND_TOKENS = ["var(--st-amber)", "var(--st-brown)"];
/** The brand tones as plain values. */
const BRAND_VALUES = { amber: "#fcd34d", brown: "#92400e" };
/** The white labels of a chrome rule. */
const WHITE_VALUES = ["#fff", "#ffffff", "white"];
/** The neutral chrome classes of the old look. */
const NEUTRAL_TOKENS = ["border-neutral-300", "border-neutral-900", "bg-neutral-900", "bg-neutral-100"];

/** The screen files that the phase covers. */
const SCREEN_FILES = [
  "app/[locale]/frame.tsx",
  "app/[locale]/st/[level]/[week]/page.tsx",
  "app/[locale]/st/[level]/[week]/reader.tsx",
  "app/[locale]/st/[level]/[week]/decodable.tsx",
  "app/[locale]/st/[level]/[week]/song.tsx",
  "app/[locale]/st/[level]/[week]/questions.tsx",
  "app/[locale]/not-found-view.tsx",
  "app/[locale]/teacher/[level]/[week]/week-view.tsx",
  "app/[locale]/teacher/[level]/[week]/[day]/page.tsx",
  "app/[locale]/teacher/forbidden.tsx",
  "app/[locale]/st/page.tsx",
  "app/[locale]/sign-in/page.tsx",
  "app/[locale]/join/page.tsx",
];
/** The place pictures of the art. */
const PLACE_FILES = ["meadow", "grove", "oak", "trail", "path"].flatMap((place) => [
  `app/look/places/${place}-p.webp`,
  `app/look/places/${place}-d.webp`,
]);

/** One class list of one element of one file. */
interface ClassSite {
  /** The file of the element. */
  file: string;
  /** The tag name of the element. */
  tag: string;
  /** The class list of the element. */
  className: string;
  /** Whether the element is a text input. The inputs keep their border. */
  input: boolean;
}

/**
 * Reads a file of the app.
 * @param relative The path of the file, relative to the app folder.
 * @returns The text of the file.
 */
function readAppFile(relative: string): string {
  return readFileSync(resolve(app, relative), "utf8");
}

/**
 * Reads the style sheet of the look.
 * @returns The text of `app/look.css`.
 */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/**
 * Finds the class lists of the JSX elements of one file. A class list that comes from a constant
 * counts once, at the place of the constant.
 * @param file The path of the file, relative to the app folder.
 * @param source The text of the file.
 * @returns The class lists of the elements.
 */
function classSitesOf(file: string, source: string): ClassSite[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const constants = new Map<string, string>();
  const collect = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      constants.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, collect);
  };
  collect(tree);
  const sites: ClassSite[] = [];
  const counted = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute) || attribute.name.getText(tree) !== "className") continue;
        const initializer = attribute.initializer;
        if (!initializer) continue;
        let text = "";
        let key = "";
        if (ts.isStringLiteral(initializer)) {
          text = initializer.text;
          key = `literal:${sites.length}`;
        } else if (ts.isJsxExpression(initializer) && initializer.expression) {
          const expression = initializer.expression;
          if (ts.isStringLiteral(expression)) {
            text = expression.text;
            key = `literal:${sites.length}`;
          } else if (ts.isIdentifier(expression)) {
            text = constants.get(expression.text) ?? "";
            key = `constant:${expression.text}`;
          }
        }
        if (text === "" || counted.has(key)) continue;
        counted.add(key);
        sites.push({ file, tag, className: text, input: tag.toLowerCase() === "input" });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return sites;
}

/**
 * Finds the class lists of the screen files.
 * @returns The class lists of the elements.
 */
function scanScreenClasses(): ClassSite[] {
  const sites: ClassSite[] = [];
  for (const file of SCREEN_FILES) sites.push(...classSitesOf(file, readAppFile(file)));
  return sites;
}

/**
 * Counts the tokens of one class list that end with one of the names.
 * @param className The class list.
 * @param names The names.
 * @returns The count of the tokens.
 */
function countTokens(className: string, names: string[]): number {
  return className.split(/\s+/).filter((entry) => names.some((name) => entry === name || entry.endsWith(name))).length;
}

/**
 * Tells whether one class list holds one Tailwind blue chrome token.
 * @param className The class list.
 * @returns Whether the list holds a blue token.
 */
function hasTailwindBlue(className: string): boolean {
  const pattern = /(^|:)(bg|border|text|ring|from|to|via|outline|divide|fill|stroke)-(blue|indigo|sky|cyan)-[0-9]+$/;
  return className.split(/\s+/).some((entry) => pattern.test(entry));
}

/**
 * The four chrome families of the look.
 */
type Family = "banner" | "buttons" | "frames" | "cards";

/**
 * Gives the chrome family of one selector part.
 * @param part One selector part.
 * @returns The family, or null when the part paints no chrome.
 */
function familyOfPart(part: string): Family | null {
  const last = lastCompound(part);
  if (last === "h1" && part.includes("header[data-hero")) return "banner";
  if (last === "button") return "buttons";
  if (last === "section[aria-label]") return "frames";
  if (last === "a" && part.includes("ul[data-week-tiles]")) return "cards";
  if (last === "ol" && part.includes('[data-part="song"]')) return "cards";
  if (last === "div" && part.includes("[data-page-content]")) return "cards";
  return null;
}

/**
 * Groups the rules of a style sheet by their chrome family.
 * @param css The text of the style sheet.
 * @returns The rules of each family.
 */
function familyRules(css: string): Map<Family, CssRule[]> {
  const grouped = new Map<Family, CssRule[]>([
    ["banner", []],
    ["buttons", []],
    ["frames", []],
    ["cards", []],
  ]);
  for (const rule of parseCss(css)) {
    if (rule.keyframes) continue;
    for (const part of selectorParts(rule.selector)) {
      const family = familyOfPart(part);
      if (!family) continue;
      grouped.get(family)!.push(rule);
      break;
    }
  }
  return grouped;
}

/**
 * Tells whether one value names one token.
 * @param value The value of a declaration.
 * @param token The token.
 * @returns Whether the value names the token.
 */
function names(value: string, token: string): boolean {
  return value.includes(token);
}

/**
 * Reads the last declaration of one property of one rule.
 * @param rule The rule.
 * @param property The property of the declaration.
 * @returns The value of the last declaration, or null.
 */
function lastValue(rule: CssRule, property: string): string | null {
  const found = rule.declarations.filter((declaration) => declaration.property === property);
  return found.length > 0 ? found[found.length - 1]!.value : null;
}

/**
 * The findings of the four chrome families of one style sheet.
 * @param css The text of the style sheet.
 * @returns The counts and the failure texts.
 */
function familyFindings(css: string): {
  family_rules: string;
  blue_family_refs: number;
  gold_family_refs: number;
  brand_family_rules: string;
  failures: string[];
} {
  const grouped = familyRules(css);
  const failures: string[] = [];
  let blueRefs = 0;
  let goldRefs = 0;
  const counts: number[] = [];
  const brandCounts: number[] = [];
  for (const family of ["banner", "buttons", "frames", "cards"] as const) {
    const rules = grouped.get(family)!;
    counts.push(rules.length);
    let brand = 0;
    for (const rule of rules) {
      for (const declaration of rule.declarations) {
        if (BLUE_TOKENS.some((token) => names(declaration.value, token))) {
          blueRefs += 1;
          failures.push(`${family} rule ${rule.selector} names ${declaration.value}`);
        }
        if (GOLD_TOKENS.some((token) => names(declaration.value, token))) {
          goldRefs += 1;
          failures.push(`${family} rule ${rule.selector} names ${declaration.value}`);
        }
        if (BRAND_TOKENS.some((token) => names(declaration.value, token))) brand += 1;
      }
    }
    brandCounts.push(brand);
    if (rules.length < 1) failures.push(`the ${family} family must hold at least one rule`);
    if (brand < 1) failures.push(`the ${family} family must use ${BRAND_TOKENS.join(" or ")}`);
  }
  return {
    family_rules: counts.join(","),
    blue_family_refs: blueRefs,
    gold_family_refs: goldRefs,
    brand_family_rules: brandCounts.join(","),
    failures,
  };
}

/**
 * The findings of the text pairs of one style sheet.
 * @param css The text of the style sheet.
 * @returns The counts and the failure texts.
 */
function pairFindings(css: string): {
  chrome_pairs_checked: number;
  pair_inherit_rules: number;
  failures: string[];
} {
  const grouped = familyRules(css);
  const failures: string[] = [];
  let pairs = 0;
  let inherit = 0;
  for (const family of ["banner", "buttons", "frames", "cards"] as const) {
    for (const rule of grouped.get(family)!) {
      const color = lastValue(rule, "color");
      const background = lastValue(rule, "background-color") ?? lastValue(rule, "background");
      if (background === null) continue;
      const brown = names(background, "var(--st-brown)");
      const amber = names(background, "var(--st-amber)");
      if (!brown && !amber) continue;
      pairs += 1;
      if (color === null) {
        inherit += 1;
        continue;
      }
      if (brown && !WHITE_VALUES.some((value) => color.toLowerCase() === value)) {
        failures.push(`${family} rule ${rule.selector} must set a white label on brown, found ${color}`);
      }
      if (amber && !names(color, "var(--st-brown)") && color.toLowerCase() !== BRAND_VALUES.brown) {
        failures.push(`${family} rule ${rule.selector} must set a brown label on amber, found ${color}`);
      }
    }
  }
  return { chrome_pairs_checked: pairs, pair_inherit_rules: inherit, failures };
}

/**
 * Tells whether one rule paints the art of the place.
 * @param rule The rule.
 * @returns Whether the rule paints art.
 */
function isArtRule(rule: CssRule): boolean {
  return selectorParts(rule.selector).some(
    (part) =>
      (part.includes("main[data-place]") && (part.includes("::before") || part.includes("::after"))) ||
      (part.includes("main[data-hero") && part.includes("> header")),
  );
}

/**
 * The findings of the blue backgrounds of the chrome families of one style sheet.
 * @param css The text of the style sheet.
 * @returns The counts and the failure texts.
 */
function backgroundFindings(css: string): {
  blue_background_refs: number;
  blue_allow_rules: number;
  family_background_rules: number;
  failures: string[];
} {
  const failures: string[] = [];
  let blue = 0;
  let allow = 0;
  let painted = 0;
  for (const rule of parseCss(css)) {
    if (rule.keyframes) continue;
    if (isArtRule(rule)) {
      allow += 1;
      continue;
    }
    const isChrome = selectorParts(rule.selector).some((part) => familyOfPart(part) !== null);
    if (!isChrome) continue;
    for (const declaration of rule.declarations) {
      if (!["background", "background-color", "background-image"].includes(declaration.property)) continue;
      painted += 1;
      const isBlue =
        BLUE_TOKENS.some((token) => names(declaration.value, token)) || names(declaration.value, BLUE_PLAQUE);
      if (!isBlue) continue;
      blue += 1;
      failures.push(`the chrome rule ${rule.selector} paints the blue ${declaration.value}`);
    }
  }
  return { blue_background_refs: blue, blue_allow_rules: allow, family_background_rules: painted, failures };
}

/**
 * The findings of the banner rule of one style sheet.
 * @param css The text of the style sheet.
 * @returns The counts and the failure texts.
 */
function bannerFindings(css: string): {
  banner_height_rule: string;
  failures: string[];
} {
  const failures: string[] = [];
  const rules = familyRules(css).get("banner")!.filter((rule) => rule.media.length === 0);
  if (rules.length < 1) {
    return { banner_height_rule: "none", failures: ["the banner rule must exist outside a media block"] };
  }
  let align: string | null = null;
  let textAlign: string | null = null;
  const sizes: string[] = [];
  for (const rule of rules) {
    align = lastValue(rule, "align-items") ?? align;
    textAlign = lastValue(rule, "text-align") ?? textAlign;
    for (const declaration of rule.declarations) {
      if (!["height", "min-height", "font-size"].includes(declaration.property)) continue;
      if (!/^[0-9]+(\.[0-9]+)?px$/.test(declaration.value)) {
        failures.push(`the banner rule must set ${declaration.property} in px, found ${declaration.value}`);
      } else {
        sizes.push(`${declaration.property}=${declaration.value}`);
      }
    }
  }
  if (align === null || align.trim() !== "center") {
    failures.push(`the banner rule must center the text on both axes, found ${align ?? "none"}`);
  }
  if (textAlign === null || textAlign.trim() !== "center") {
    failures.push(`the banner rule must set text-align: center, found ${textAlign ?? "none"}`);
  }
  if (sizes.length < 1) failures.push("the banner rule must set a height and a font size in px");
  return { banner_height_rule: sizes.join(" "), failures };
}

/**
 * The findings of the label rule of one style sheet.
 * @param css The text of the style sheet.
 * @returns The counts and the failure texts.
 */
function labelFindings(css: string): {
  label_font_px: number;
  failures: string[];
} {
  const failures: string[] = [];
  const rules = parseCss(css).filter(
    (rule) =>
      !rule.keyframes &&
      rule.media.length === 0 &&
      selectorParts(rule.selector).some((part) => part.includes("[data-level-week]")),
  );
  if (rules.length < 1) {
    return { label_font_px: 0, failures: ["the [data-level-week] rule must exist outside a media block"] };
  }
  const rule = rules[rules.length - 1]!;
  const font = lastValue(rule, "font-size");
  const pixels = font === null ? 0 : Number.parseFloat(font);
  if (font === null || !font.endsWith("px") || pixels < 14) {
    failures.push(`the [data-level-week] rule must set a font size of 14 px or more, found ${font ?? "none"}`);
  }
  for (const declaration of rule.declarations) {
    if (declaration.property === "clip-path" && /inset\(\s*50%\s*\)/.test(declaration.value)) {
      failures.push("the [data-level-week] rule must not clip the label");
    }
    if (declaration.property === "width" && declaration.value === "1px") {
      failures.push("the [data-level-week] rule must not use a 1 px box");
    }
    if (declaration.property === "height" && declaration.value === "1px") {
      failures.push("the [data-level-week] rule must not use a 1 px box");
    }
    if (declaration.property === "left" && /^-[0-9]{3,}/.test(declaration.value)) {
      failures.push(`the [data-level-week] rule must not move the label off the screen, found ${declaration.value}`);
    }
  }
  return { label_font_px: pixels, failures };
}

/**
 * The findings of the logo file.
 * @param text The text of the logo file.
 * @returns The failure texts.
 */
function logoFindings(text: string): string[] {
  const failures: string[] = [];
  if (!text.trimStart().startsWith("<svg")) failures.push("the logo file must start with an svg element");
  if (!text.includes('viewBox="0 0 700 700"')) failures.push('the logo file must hold the viewBox "0 0 700 700"');
  if (!text.includes(BRAND_VALUES.amber)) failures.push(`the logo file must hold the fill ${BRAND_VALUES.amber}`);
  if (!/<title[^>]*>\s*Storytime Advantage\s*<\/title>/.test(text)) {
    failures.push("the logo file must hold the title Storytime Advantage");
  }
  if (/<script/i.test(text)) failures.push("the logo file must hold no script");
  if (/\son[a-z]+\s*=/i.test(text)) failures.push("the logo file must hold no event handler");
  for (const match of text.matchAll(/href\s*=\s*"([^"]*)"/g)) {
    const target = match[1] ?? "";
    if (!target.startsWith("#") && !target.startsWith("data:")) {
      failures.push(`the logo file must hold no external reference, found ${target}`);
    }
  }
  return failures;
}

/**
 * The findings of the bar and the crest hooks. The counts of the style sheet and the counts of the
 * screen files stand apart, so each failure names its own place.
 * @param sources The texts of the screen files.
 * @param css The text of the style sheet.
 * @returns The counts and the failure texts.
 */
function hookFindings(sources: string[], css: string): {
  gamebar_refs: number;
  crest_refs: number;
  app_bar_refs: number;
  app_crest_refs: number;
  failures: string[];
} {
  const failures: string[] = [];
  const gamebar = (css.match(/\[data-game-bar\]/g) ?? []).length;
  const crest = (css.match(/\[data-crest\]/g) ?? []).length + (css.match(/q-crest\.svg/g) ?? []).length;
  let appBar = 0;
  let appCrest = 0;
  for (const source of sources) {
    for (const match of source.matchAll(/data-game-bar/g)) {
      appBar += 1;
      failures.push(`a screen file names data-game-bar at ${match.index}`);
    }
    for (const match of source.matchAll(/data-crest/g)) {
      appCrest += 1;
      failures.push(`a screen file names data-crest at ${match.index}`);
    }
    for (const match of source.matchAll(/q-bar\.svg/g)) {
      appBar += 1;
      failures.push(`a screen file names the piece ${match[0]} at ${match.index}`);
    }
    for (const match of source.matchAll(/q-crest\.svg/g)) {
      appCrest += 1;
      failures.push(`a screen file names the piece ${match[0]} at ${match.index}`);
    }
  }
  if (gamebar > 0) failures.push(`look.css holds ${gamebar} [data-game-bar] rules`);
  if (crest > 0) failures.push(`look.css holds ${crest} crest references`);
  if ((css.match(/q-bar\.svg/g) ?? []).length > 0) failures.push("look.css names the game bar piece");
  return { gamebar_refs: gamebar, crest_refs: crest, app_bar_refs: appBar, app_crest_refs: appCrest, failures };
}

/**
 * The findings of the protected paths of AC-4.7.
 * @returns The counts and the failure texts.
 */
function protectedPathFindings(): {
  protected_paths_checked: number;
  place_files: number;
  failures: string[];
} {
  const failures: string[] = [];
  let checked = 0;
  const readAlongDir = resolve(repo, "packages/read-along");
  expect(existsSync(readAlongDir), "Missing packages/read-along").toBe(true);
  const readAlongFiles: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) readAlongFiles.push(full);
    }
  };
  walk(readAlongDir);
  for (const file of readAlongFiles) {
    checked += 1;
    const text = readFileSync(file, "utf8");
    if (BRAND_TOKENS.some((token) => text.includes(token))) failures.push(`${file} must hold no brand tone`);
  }
  const highlightPath = resolve(app, "lib/highlight-windows.ts");
  expect(existsSync(highlightPath), "Missing apps/storytime/lib/highlight-windows.ts").toBe(true);
  checked += 1;
  const highlightText = readFileSync(highlightPath, "utf8");
  if (BRAND_TOKENS.some((token) => highlightText.includes(token))) {
    failures.push("apps/storytime/lib/highlight-windows.ts must hold no brand tone");
  }
  let places = 0;
  for (const relative of PLACE_FILES) {
    const full = resolve(app, relative);
    if (!existsSync(full)) {
      failures.push(`Missing ${relative}`);
      continue;
    }
    if (statSync(full).size <= 0) failures.push(`${relative} must hold bytes`);
    places += 1;
  }
  return { protected_paths_checked: checked, place_files: places, failures };
}

describe("the brand chrome of the source files (AC-4.4, AC-4.5, AC-4.7)", () => {
  it("S1 the logo file holds the facts of the source logo", () => {
    expect(existsSync(logoPath), "Missing apps/storytime/app/look/logo/storytime-advantage.svg").toBe(true);
    const text = readFileSync(logoPath, "utf8");
    const bytes = statSync(logoPath).size;
    expect(`logo_bytes=${bytes}`, "the logo file must hold bytes").toMatch(/^logo_bytes=[1-9][0-9]*$/);
    expect(logoFindings(text).join(" | "), "the logo file").toBe("");
  });

  it("S2 the app sources and the style sheet hold no game bar and no crest", () => {
    const sources = SCREEN_FILES.map((file) => readAppFile(file));
    const found = hookFindings(sources, readLookCss());
    expect(`gamebar_refs=${found.gamebar_refs}`, "the game bar rules of look.css must be 0").toBe(
      "gamebar_refs=0",
    );
    expect(`crest_refs=${found.crest_refs}`, "the crest rules of look.css must be 0").toBe("crest_refs=0");
    expect(`app_bar_refs=${found.app_bar_refs}`, "the game bar hooks of the screen files must be 0").toBe(
      "app_bar_refs=0",
    );
    expect(`app_crest_refs=${found.app_crest_refs}`, "the crest hooks of the screen files must be 0").toBe(
      "app_crest_refs=0",
    );
    expect(found.failures.join(" | "), "the game bar and the crest hooks").toBe("");
  });

  it("S3 the root scope defines the two tones of the logo", () => {
    const variables = new Map<string, string>();
    for (const rule of parseCss(readLookCss())) {
      if (!selectorParts(rule.selector).includes(":root")) continue;
      for (const declaration of rule.declarations) {
        if (declaration.property.startsWith("--")) variables.set(declaration.property, declaration.value);
      }
    }
    expect(
      `brand_tokens_found=${[...variables.keys()].filter((key) => key.startsWith("--st-")).length}`,
      "the root scope must define the brand tones",
    ).toMatch(/^brand_tokens_found=[1-9][0-9]*$/);
    expect(`--st-amber=${variables.get("--st-amber") ?? "none"}`, "the amber tone").toBe(
      `--st-amber=${BRAND_VALUES.amber}`,
    );
    expect(`--st-brown=${variables.get("--st-brown") ?? "none"}`, "the brown tone").toBe(
      `--st-brown=${BRAND_VALUES.brown}`,
    );
  });

  it("S4 the level and week label rule keeps the label readable", () => {
    const found = labelFindings(readLookCss());
    expect(`label_font_px=${found.label_font_px}`, "the label font size must be 14 px or more").toMatch(
      /^label_font_px=[1-9][0-9]*$/,
    );
    expect(found.failures.join(" | "), "the [data-level-week] rule").toBe("");
  });

  it("S5 the four chrome families use the brand tones and hold no blue and no gold token", () => {
    const found = familyFindings(readLookCss());
    expect(`family_rules=${found.family_rules}`, "the four families must hold rules").toMatch(
      /^family_rules=[1-9][0-9]*,[1-9][0-9]*,[1-9][0-9]*,[1-9][0-9]*$/,
    );
    expect(`blue_family_refs=${found.blue_family_refs}`, "the blue token count must be 0").toBe(
      "blue_family_refs=0",
    );
    expect(`gold_family_refs=${found.gold_family_refs}`, "the gold token count must be 0").toBe(
      "gold_family_refs=0",
    );
    expect(`brand_family_rules=${found.brand_family_rules}`, "each family must use a brand tone").toMatch(
      /^brand_family_rules=[1-9][0-9]*,[1-9][0-9]*,[1-9][0-9]*,[1-9][0-9]*$/,
    );
    expect(found.failures.join(" | "), "the four chrome families").toBe("");
  });

  it("S6 the white on brown and the brown on amber pairs hold", () => {
    const found = pairFindings(readLookCss());
    expect(`chrome_pairs_checked=${found.chrome_pairs_checked}`, "the pair count must be above 0").toMatch(
      /^chrome_pairs_checked=[1-9][0-9]*$/,
    );
    expect(`pair_inherit_rules=${found.pair_inherit_rules}`, "the inherit count must be a number").toMatch(
      /^pair_inherit_rules=[0-9]+$/,
    );
    expect(found.failures.join(" | "), "the text pairs of the chrome").toBe("");
  });

  it("S7 no chrome background paints a blue tone", () => {
    const found = backgroundFindings(readLookCss());
    expect(`blue_allow_rules=${found.blue_allow_rules}`, "the art rules must exist").toMatch(
      /^blue_allow_rules=[1-9][0-9]*$/,
    );
    expect(`family_background_rules=${found.family_background_rules}`, "the chrome backgrounds must exist").toMatch(
      /^family_background_rules=[1-9][0-9]*$/,
    );
    expect(`blue_background_refs=${found.blue_background_refs}`, "the blue background count must be 0").toBe(
      "blue_background_refs=0",
    );
    expect(found.failures.join(" | "), "the blue backgrounds").toBe("");
  });

  it("S8 the screen files hold no blue Tailwind chrome class", () => {
    const sites = scanScreenClasses();
    expect(`files_scanned=${SCREEN_FILES.length}`, "the screen files must be scanned").toMatch(
      /^files_scanned=[1-9][0-9]*$/,
    );
    expect(`class_sites_scanned=${sites.length}`, "the class lists must be scanned").toMatch(
      /^class_sites_scanned=[1-9][0-9]*$/,
    );
    const blue = sites.filter((site) => hasTailwindBlue(site.className));
    expect(`blue_chrome_classes=${blue.length}`, "the blue chrome count must be 0").toBe("blue_chrome_classes=0");
    expect(
      blue.map((site) => `${site.file} ${site.tag} ${site.className}`).join(" | "),
      "the blue chrome classes",
    ).toBe("");
  });

  it("S9 the screen files hold no neutral chrome class outside the inputs", () => {
    const sites = scanScreenClasses();
    const neutral = sites.filter((site) => !site.input && countTokens(site.className, NEUTRAL_TOKENS) > 0);
    const tokens = neutral.reduce((sum, site) => sum + countTokens(site.className, NEUTRAL_TOKENS), 0);
    expect(`neutral_chrome_classes=${tokens}`, "the neutral chrome count must be 0").toBe(
      "neutral_chrome_classes=0",
    );
    expect(
      neutral.map((site) => `${site.file} ${site.tag} ${site.className}`).join(" | "),
      "the neutral chrome classes",
    ).toBe("");
  });

  it("S10 the banner rule centers the title and uses px values", () => {
    const found = bannerFindings(readLookCss());
    expect(`banner_height_rule=${found.banner_height_rule}`, "the banner rule must set px values").toMatch(
      /^banner_height_rule=[a-z-]+=[0-9]+(\.[0-9]+)?px( [a-z-]+=[0-9]+(\.[0-9]+)?px)*$/,
    );
    expect(found.failures.join(" | "), "the banner rule").toBe("");
  });

  it("S11 the art and the read-along files hold no brand tone (AC-4.7)", () => {
    const found = protectedPathFindings();
    expect(`protected_paths_checked=${found.protected_paths_checked}`, "the protected paths must be read").toMatch(
      /^protected_paths_checked=[1-9][0-9]*$/,
    );
    expect(`place_files=${found.place_files}`, "the place pictures must exist").toMatch(/^place_files=[1-9][0-9]*$/);
    expect(found.failures.join(" | "), "the protected paths").toBe("");
  });

  it("S12 the checks reject the broken copies (self-test)", () => {
    const goodCss = `:root { --st-amber: #fcd34d; --st-brown: #92400e; }
header[data-hero] > h1 { align-items: center; text-align: center; min-height: 88px; font-size: 70px; background-color: var(--st-amber); color: var(--st-brown); }
main[data-place] button { background-color: var(--st-brown); color: #fff; }
main[data-place] > section[aria-label] + section[aria-label] { border-color: var(--st-brown); }
main[data-place] ul[data-week-tiles] a { background-color: var(--st-amber); color: var(--st-brown); }`;
    expect(familyFindings(goodCss).failures.join(" "), "the good copy passes").toBe("");
    expect(pairFindings(goodCss).failures.join(" "), "the good pairs pass").toBe("");
    expect(bannerFindings(goodCss).failures.join(" "), "the good banner passes").toBe("");
    expect(labelFindings("[data-level-week] { font-size: 14px; }").failures.join(" "), "the good label passes").toBe("");
    const blueFamily = goodCss.replace("background-color: var(--st-brown)", "background-color: var(--sq-blue-top)");
    expect(familyFindings(blueFamily).failures.join(" "), "a blue family rule fails").toContain("var(--sq-blue-top)");
    const goldFamily = goodCss.replace("color: #fff", "color: var(--sq-gold)");
    expect(familyFindings(goldFamily).failures.join(" "), "a gold family rule fails").toContain("var(--sq-gold)");
    const noBrand = goodCss.replace("background-color: var(--st-brown); color: #fff", "background-color: var(--sq-cream)");
    expect(familyFindings(noBrand).failures.join(" "), "a family without a brand tone fails").toContain(
      "must use var(--st-amber) or var(--st-brown)",
    );
    const missingFamily = goodCss.replace(/main\[data-place\] ul\[data-week-tiles\] a[^\n]*(\n|$)/, "");
    expect(familyFindings(missingFamily).failures.join(" "), "a missing family fails").toContain("cards family");
    const badPair = goodCss.replace("color: #fff", "color: #000");
    expect(pairFindings(badPair).failures.join(" "), "a wrong label fails").toContain("white label on brown");
    const badAmber = goodCss.replace("color: var(--st-brown);", "color: #fff;");
    expect(pairFindings(badAmber).failures.join(" "), "a wrong amber label fails").toContain("brown label on amber");
    const badBanner = goodCss.replace("align-items: center", "align-items: flex-end");
    expect(bannerFindings(badBanner).failures.join(" "), "a banner that ends low fails").toContain("center the text");
    const bannerVh = goodCss.replace("min-height: 88px", "min-height: 12vh");
    expect(bannerFindings(bannerVh).failures.join(" "), "a banner height in vh fails").toContain("in px");
    const hiddenLabel = "[data-level-week] { font-size: 14px; clip-path: inset(50%); }";
    expect(labelFindings(hiddenLabel).failures.join(" "), "a clipped label fails").toContain("clip");
    const smallLabel = "[data-level-week] { font-size: 10px; }";
    expect(labelFindings(smallLabel).failures.join(" "), "a small label fails").toContain("14 px");
    expect(
      logoFindings('<svg viewBox="0 0 700 700"><title>Storytime Advantage</title></svg>').join(" "),
      "a logo without a fill fails",
    ).toContain("#fcd34d");
    expect(
      logoFindings('<svg viewBox="0 0 700 700"><title>Storytime Advantage</title><script/></svg>').join(" "),
      "a logo with a script fails",
    ).toContain("no script");
    expect(hookFindings(["<p data-game-bar />"], "").failures.join(" "), "a bar hook fails").toContain(
      "data-game-bar",
    );
    expect(hookFindings(["<p data-crest />"], "").failures.join(" "), "a crest hook fails").toContain("data-crest");
    expect(hookFindings([], "[data-game-bar] { color: #fff; }").failures.join(" "), "a bar rule fails").toContain(
      "data-game-bar",
    );
    const blueClass = classSitesOf("a.tsx", 'const x = <button className="bg-blue-700" />;');
    expect(blueClass.filter((site) => hasTailwindBlue(site.className)).length, "a blue class fails").toBe(1);
    const neutralButton = classSitesOf("b.tsx", 'const x = <button className="border border-neutral-300" />;');
    expect(
      neutralButton.filter((site) => countTokens(site.className, NEUTRAL_TOKENS) > 0 && !site.input).length,
      "a neutral control fails",
    ).toBe(1);
    const neutralInput = classSitesOf("c.tsx", 'const x = <input className="border border-neutral-300" />;');
    expect(
      neutralInput.filter((site) => countTokens(site.className, NEUTRAL_TOKENS) > 0 && !site.input).length,
      "an input keeps its border",
    ).toBe(0);
  });
});
