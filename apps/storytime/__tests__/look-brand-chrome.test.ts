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
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { lastCompound, lengthPx, parseCss, selectorParts, type CssRule } from "./helpers/css-rules";

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
      // The font size may fit the title length, so it may hold calc(), clamp(), or var()
      // (remediation r2, A-F4). The heights stay plain px values.
      const fitted = declaration.property === "font-size" && /(calc|clamp|var)\(/.test(declaration.value);
      if (!fitted && !/^[0-9]+(\.[0-9]+)?px$/.test(declaration.value)) {
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
 * One vertical band of a box, measured in px above the bottom edge of the hero.
 */
interface Band {
  /** The lower edge of the band. */
  lo: number;
  /** The upper edge of the band. */
  hi: number;
}

/**
 * Reads the last value of one property of one rule.
 * @param rule The rule, or undefined.
 * @param property The property.
 * @returns The value, or null.
 */
function ruleValue(rule: CssRule | undefined, property: string): string | null {
  if (!rule) return null;
  const found = rule.declarations.filter((declaration) => declaration.property === property);
  return found.length > 0 ? found[found.length - 1]!.value : null;
}

/**
 * Reads the vertical band of one rule, in px above the bottom edge of the hero.
 * @param rule The rule, or undefined.
 * @param heroHeight The height of the hero, for a rule that anchors its box to the top.
 * @returns The band, or null when the rule gives no numbers.
 */
function bandOf(rule: CssRule | undefined, heroHeight: number | null): Band | null {
  const height = lengthPx(ruleValue(rule, "height") ?? ruleValue(rule, "min-height") ?? "");
  if (height === null) return null;
  const bottom = lengthPx(ruleValue(rule, "bottom") ?? "");
  if (bottom !== null) return { lo: bottom, hi: bottom + height };
  const top = lengthPx(ruleValue(rule, "top") ?? "");
  if (top !== null && heroHeight !== null) return { lo: heroHeight - top - height, hi: heroHeight - top };
  return null;
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

/**
 * Gives the hex of one colour token of the brand, or of one hex colour.
 * @param value The colour text.
 * @returns The hex colour, or null for a colour the tables do not hold.
 */
function hexFrom(value: string): string | null {
  const text = value.trim().toLowerCase();
  if (text === "var(--st-brown)") return "#92400e";
  if (text === "var(--st-amber)") return "#fcd34d";
  if (text === "var(--sq-cream)") return "#fffaf0";
  if (text === "white") return "#ffffff";
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (!match) return null;
  const digits = match[1]!;
  if (digits.length === 3) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`;
  }
  return `#${digits}`;
}

/**
 * Gives the colour channels of one hex colour.
 * @param hex The colour as #rgb or #rrggbb.
 * @returns The red, green, and blue channels, or null for another text.
 */
function hexChannels(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(hex.trim().toLowerCase());
  if (!match) return null;
  const digits = match[1]!;
  const full = digits.length === 3
    ? `${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
    : digits;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * Tells whether one colour reads as blue: the blue channel is the largest, and it leads by 40.
 * @param channels The red, green, and blue channels.
 * @returns Whether the colour reads as blue.
 */
function isBlueChannels(channels: [number, number, number]): boolean {
  const [r, g, b] = channels;
  return b >= g && b >= r && b - Math.max(r, g) >= 40;
}

/**
 * Tells whether one value holds a blue colour.
 * @param value The value text.
 * @returns Whether the value holds a blue hex colour or a blue rgb colour.
 */
function holdsBlue(value: string): boolean {
  for (const hex of value.match(/#[0-9a-f]{3,8}/gi) ?? []) {
    const channels = hexChannels(hex);
    if (channels && isBlueChannels(channels)) return true;
  }
  for (const match of value.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)) {
    const channels = [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number];
    if (isBlueChannels(channels)) return true;
  }
  return false;
}

/**
 * Tells whether one value holds a brown tone of the brand.
 * @param value The value text.
 * @returns Whether the value holds a brown colour.
 */
function holdsBrown(value: string): boolean {
  if (value.includes("var(--st-brown)")) return true;
  for (const hex of value.match(/#[0-9a-f]{3,8}/gi) ?? []) {
    const channels = hexChannels(hex);
    if (!channels) continue;
    const [r, g, b] = channels;
    if (r > g && g > b && r >= 100 && g <= 120 && b <= 80) return true;
  }
  return false;
}

/**
 * Gives the specificity of one selector part: the IDs, the classes, and the elements.
 * @param part One selector part.
 * @returns The three counts.
 */
function specificityOf(part: string): [number, number, number] {
  const text = part.replace(/::[\w-]+/g, " ");
  const ids = (text.match(/#[\w-]+/g) ?? []).length;
  const classes = (text.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;
  const elements = (text.match(/(^|[\s>+~])([a-zA-Z][\w-]*)/g) ?? []).length
    + (part.match(/::[\w-]+/g) ?? []).length;
  return [ids, classes, elements];
}

/**
 * Gives the strongest specificity of a list of selector parts.
 * @param parts The selector parts of one rule.
 * @returns The three counts of the strongest part.
 */
function bestSpecificity(parts: string[]): [number, number, number] {
  let best: [number, number, number] = [0, 0, 0];
  for (const part of parts) {
    const spec = specificityOf(part);
    if (compareSpec(spec, best) > 0) best = spec;
  }
  return best;
}

/**
 * Compares two specificities.
 * @param first The first specificity.
 * @param second The second specificity.
 * @returns A positive number when the first wins, 0 when they are equal.
 */
function compareSpec(first: [number, number, number], second: [number, number, number]): number {
  for (let index = 0; index < 3; index += 1) {
    if (first[index] !== second[index]) return first[index]! - second[index]!;
  }
  return 0;
}

/**
 * Gives the relative luminance of one hex colour (WCAG 2).
 * @param hex The colour as #rrggbb.
 * @returns The luminance from 0 to 1.
 */
function luminanceOf(hex: string): number {
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255);
  const scaled = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * scaled[0]! + 0.7152 * scaled[1]! + 0.0722 * scaled[2]!;
}

/**
 * Gives the contrast ratio of two hex colours.
 * @param first The first colour.
 * @param second The second colour.
 * @returns The ratio from 1 to 21.
 */
function contrastOf(first: string, second: string): number {
  const one = luminanceOf(first);
  const other = luminanceOf(second);
  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05);
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
    expect(`banner_height_rule=${found.banner_height_rule}`, "the banner rule must set a font size").toMatch(
      /^banner_height_rule=[a-z-]+=.+$/,
    );
    expect(found.failures.join(" | "), "the banner rule").toBe("");
  });

  it("F-1 the logo rule keeps the logo out of the plaque box (AC-4.1)", () => {
    const css = readLookCss();
    const rules = parseCss(css).filter((rule) => !rule.keyframes && rule.media.length === 0);
    const failures: string[] = [];
    const pick = (test: (part: string) => boolean): CssRule | undefined =>
      rules.find((rule) => selectorParts(rule.selector).some(test));
    const isPlaque = (part: string): boolean =>
      part.includes("header[data-hero") && lastCompound(part) === "h1";
    const isLogo = (part: string): boolean =>
      part.includes("header[data-hero") && part.includes("[data-logo]");
    const heroHeight = (variant: string): number | null =>
      lengthPx(ruleValue(pick((part) => part === `header[data-hero="${variant}"]`), "height") ?? "");
    const variants = [
      {
        name: "cover",
        plaque: pick((part) => isPlaque(part) && !part.includes("\"band\"")),
        logo: pick((part) => isLogo(part) && !part.includes("\"band\"")),
        hero: heroHeight("cover"),
      },
      {
        name: "band",
        plaque: pick((part) => isPlaque(part) && part.includes("\"band\"")),
        logo: pick((part) => isLogo(part) && part.includes("\"band\"")),
        hero: heroHeight("band"),
      },
    ];
    let measured = 0;
    let overlap = 0;
    let heightMin = 999;
    for (const variant of variants) {
      const plaque = bandOf(variant.plaque, variant.hero);
      const logo = bandOf(variant.logo, variant.hero);
      if (!plaque || !logo) {
        failures.push(`the plaque band and the logo band of the ${variant.name} hero must be measurable in px`);
        continue;
      }
      measured += 1;
      const shared = Math.max(0, Math.min(plaque.hi, logo.hi) - Math.max(plaque.lo, logo.lo));
      overlap = Math.max(overlap, Math.round(shared));
      if (shared > 0) {
        failures.push(
          `the logo band of the ${variant.name} hero sits on the plaque band by ${Math.round(shared)} px`
          + ` (logo_plaque_overlap_px=${Math.round(shared)})`,
        );
      }
      const height = lengthPx(ruleValue(variant.logo, "height") ?? "");
      if (height === null) {
        failures.push(`the logo height of the ${variant.name} hero must be a px value`);
      } else {
        heightMin = Math.min(heightMin, height);
        if (height < 48) {
          failures.push(`the logo height of the ${variant.name} hero must be 48 px or more, found ${height} px`);
        }
      }
    }
    expect(`logo_bands_measured=${measured}`, "the logo and the plaque bands must be measured").toMatch(
      /^logo_bands_measured=[1-9][0-9]*$/,
    );
    expect(`logo_h_px_min=${heightMin === 999 ? 0 : heightMin}`, "the logo height must be read").toMatch(
      /^logo_h_px_min=([1-9][0-9]*)$/,
    );
    expect(failures.join(" | "), "the logo and the plaque bands").toBe("");
  });

  it("F-2 the plaque rule sets a line rule so the height follows the font (AC-4.6)", () => {
    const css = readLookCss();
    const rules = parseCss(css).filter((rule) => !rule.keyframes && rule.media.length === 0);
    const plaqueRules = rules.filter((rule) =>
      selectorParts(rule.selector).some(
        (part) => part.includes("header[data-hero") && lastCompound(part) === "h1",
      ),
    );
    const failures: string[] = [];
    if (plaqueRules.length < 1) failures.push("the plaque rule must exist outside a media block");
    let lineRules = 0;
    for (const rule of plaqueRules) {
      const lineRule = ["white-space", "text-wrap", "word-break"]
        .map((property) => ruleValue(rule, property))
        .filter((value) => value !== null);
      if (lineRule.length > 0) lineRules += 1;
    }
    if (lineRules < 1) failures.push("the plaque rule must set white-space or another line rule");
    expect(failures.join(" | "), "the plaque rule").toBe("");
    expect(`plaque_line_rules=${lineRules}`, "the plaque rule must set a line rule").toMatch(
      /^plaque_line_rules=[1-9][0-9]*$/,
    );
  });

  it("F-3 the crystal tips of the plaque are gone (AC-4.6)", () => {
    const failures: string[] = [];
    const pieces = resolve(app, "app/look/pieces");
    for (const name of ["q-tip-l.svg", "q-tip-r.svg"]) {
      if (existsSync(resolve(pieces, name))) failures.push(`the piece ${name} must be gone`);
    }
    const css = readLookCss();
    for (const match of css.matchAll(/q-tip-[lr]\.svg/g)) {
      failures.push(`look.css names the tip ${match[0]}`);
    }
    for (const rule of parseCss(css)) {
      const isPlaquePseudo = selectorParts(rule.selector).some(
        (part) => part.includes("h1::before") || part.includes("h1::after"),
      );
      if (!isPlaquePseudo) continue;
      for (const declaration of rule.declarations) {
        if (!/^background(-image)?$/.test(declaration.property)) continue;
        if (/url\(/i.test(declaration.value)) {
          failures.push(`the plaque pseudo-element paints ${declaration.value}`);
        }
      }
    }
    expect(failures.join(" | "), "the crystal tips").toBe("");
  });

  it("F-2b the frame hands the title length to the CSS and the plaque rule fits the font (AC-4.6)", () => {
    const frame = readFileSync(resolve(app, "app/[locale]/frame.tsx"), "utf8");
    const failures: string[] = [];
    if (!frame.includes("--title-chars")) {
      failures.push("the frame must set the title length in --title-chars");
    }
    if (/fontSize\s*:/.test(frame)) {
      failures.push("the frame must set no inline font size");
    }
    const css = readLookCss();
    // Every plaque rule must fit the font: the base, the band, and the landscape block.
    const plaqueRules = parseCss(css).filter((rule) =>
      selectorParts(rule.selector).some(
        (part) => part.includes("header[data-hero") && lastCompound(part) === "h1",
      ),
    );
    if (plaqueRules.length < 1) {
      failures.push("the plaque rule must exist");
    }
    for (const rule of plaqueRules) {
      const fontSize = ruleValue(rule, "font-size");
      if (fontSize === null || !fontSize.includes("var(--title-chars)")) {
        failures.push(
          `the plaque rule ${rule.selector} must fit the font from var(--title-chars), found ${fontSize ?? "none"}`,
        );
      }
    }
    const plaque = plaqueRules[0];
    if (plaque) {
      const lineHeight = ruleValue(plaque, "line-height");
      if (lineHeight === null || Number.parseFloat(lineHeight) !== 1.25) {
        failures.push(`the plaque rule must set line-height 1.25, found ${lineHeight ?? "none"}`);
      }
      const padding = ruleValue(plaque, "padding");
      if (padding !== null) {
        const parts = padding.trim().split(/\s+/).filter(Boolean);
        const vertical = parts.length >= 4 ? parts[1] : parts[0];
        if (!/^0(px)?$/.test(vertical)) {
          failures.push(`the plaque rule must set no vertical padding, found ${padding}`);
        }
      }
    }
    expect(failures.join(" | "), "the fitted plaque rule").toBe("");
  });

  it("F-3b the landscape block keeps the logo off the label (AC-4.1)", () => {
    const css = readLookCss();
    const failures: string[] = [];
    const rules = parseCss(css);
    const landscape = rules.filter((rule) =>
      rule.media.some((condition) => condition.includes("max-height: 500px")),
    );
    if (landscape.length < 1) {
      failures.push("the landscape block must exist");
    }
    const heroRule = landscape.find((rule) =>
      selectorParts(rule.selector).some((part) => part.includes("header[data-hero]")),
    );
    const heroHeight = heroRule ? lengthPx(ruleValue(heroRule, "height") ?? "") : null;
    const merged = (match: (part: string) => boolean): Map<string, string> => {
      const values = new Map<string, string>();
      for (const rule of rules) {
        if (!selectorParts(rule.selector).some(match)) continue;
        for (const declaration of rule.declarations) values.set(declaration.property, declaration.value);
      }
      return values;
    };
    const label = merged((part) => part.includes("[data-level-week]"));
    const logo = merged((part) => part.includes("[data-logo]"));
    const fontSize = lengthPx(label.get("font-size") ?? "") ?? 0;
    const lineHeight = Number.parseFloat(label.get("line-height") ?? "1");
    const padding = (label.get("padding") ?? "").trim().split(/\s+/).filter(Boolean);
    const side = padding.length === 1 ? padding[0]! : padding.length === 2 ? padding[1]! : padding[1] ?? padding[0]!;
    const top = padding[0] ?? "0";
    const bottom = padding.length >= 3 ? padding[2]! : top;
    const labelLeft = lengthPx(label.get("left") ?? "") ?? 0;
    const labelTop = lengthPx(label.get("top") ?? "") ?? 0;
    // The label box holds one character of the label text at the font size, plus the padding.
    const labelWidth = fontSize + 2 * (lengthPx(side) ?? 0);
    const labelHeight = fontSize * lineHeight + (lengthPx(top) ?? 0) + (lengthPx(bottom) ?? 0);
    const logoLeft = lengthPx(logo.get("left") ?? "") ?? 0;
    const logoHeight = lengthPx(logo.get("height") ?? "") ?? 0;
    const logoWidth = lengthPx(logo.get("width") ?? "") ?? 0;
    let logoTop = lengthPx(logo.get("top") ?? "");
    if (logoTop === null) {
      const bottomAnchor = lengthPx(logo.get("bottom") ?? "");
      if (bottomAnchor !== null && heroHeight !== null) logoTop = heroHeight - bottomAnchor - logoHeight;
    }
    if (logoTop === null) {
      failures.push("the logo box of the landscape block must be measurable in px");
    } else {
      const width = Math.max(
        0,
        Math.min(labelLeft + labelWidth, logoLeft + logoWidth) - Math.max(labelLeft, logoLeft),
      );
      const height = Math.max(
        0,
        Math.min(labelTop + labelHeight, logoTop + logoHeight) - Math.max(labelTop, logoTop),
      );
      if (width * height > 0) {
        failures.push(
          `the logo box of the landscape block sits on the label box by ${width} x ${height} px`
          + ` (logo_box=${logoLeft},${logoTop},${logoWidth},${logoHeight}`
          + ` label_box=${labelLeft},${labelTop},${labelWidth},${labelHeight})`,
        );
      }
    }
    expect(failures.join(" | "), "the landscape logo and label boxes").toBe("");
  });

  it("C-F1 the focus ring is two-tone and reaches 3:1 on the three backgrounds", () => {
    const css = readLookCss();
    const failures: string[] = [];
    const rule = parseCss(css).find((entry) =>
      selectorParts(entry.selector).some(
        (part) => part.includes(":focus-visible") && (part.includes("button") || part.includes("a:")),
      ),
    );
    if (!rule) {
      failures.push("the focus rule must exist");
    } else {
      const tones = new Set<string>();
      for (const declaration of rule.declarations) {
        if (!["outline", "outline-color", "box-shadow", "border", "border-color"].includes(declaration.property)) {
          continue;
        }
        for (const token of declaration.value.match(/#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\)|\bwhite\b/gi) ?? []) {
          const hex = hexFrom(token);
          if (hex) tones.add(hex);
        }
      }
      const list = [...tones];
      if (!list.includes("#ffffff")) failures.push("the focus rule must name a white tone");
      if (!list.includes("#92400e")) failures.push("the focus rule must name a brown tone");
      for (const background of ["#92400e", "#fcd34d", "#fffaf0"]) {
        const best = list.reduce((top, tone) => Math.max(top, contrastOf(tone, background)), 0);
        if (best < 3) {
          failures.push(`the focus ring must reach 3:1 on ${background}, found ${best.toFixed(2)}:1`);
        }
      }
    }
    const passage = readFileSync(
      resolve(repo, "packages/read-along/components/read-along/read-along-passage.tsx"),
      "utf8",
    );
    if (!passage.includes("focus-visible:ring-")) {
      failures.push("the reader word focus must name a ring");
    }
    if (!passage.includes("focus-visible:ring-offset-")) {
      failures.push("the reader word focus must name a ring offset");
    }
    expect(failures.join(" | "), "the focus ring").toBe("");
  });

  it("C-F2 the pressed decodable sound button pair reaches 4.5:1", () => {
    const css = readLookCss();
    const rules = parseCss(css);
    const failures: string[] = [];
    const pressed = rules.find((rule) =>
      selectorParts(rule.selector).some(
        (part) => part.includes('aria-pressed="true"') && part.includes("decodable"),
      ),
    );
    if (!pressed) {
      failures.push("the pressed decodable sound button rule must exist");
    } else {
      const background = ruleValue(pressed, "background-color");
      const backgroundHex = background === null ? null : hexFrom(background);
      if (backgroundHex === null) {
        failures.push(`the pressed sound button must set a hex background, found ${background ?? "none"}`);
      } else {
        const base = rules.find((rule) =>
          selectorParts(rule.selector).some(
            (part) => part.includes('data-part="decodable"') && lastCompound(part) === "button",
          ),
        );
        const color = ruleValue(pressed, "color") ?? (base ? ruleValue(base, "color") : null);
        const colorHex = color === null ? null : hexFrom(color);
        if (colorHex === null) {
          failures.push(`the pressed sound button must hold a brand label, found ${color ?? "none"}`);
        } else {
          const ratio = contrastOf(backgroundHex, colorHex);
          if (ratio < 4.5) {
            failures.push(`the pressed sound button pair must reach 4.5:1, found ${ratio.toFixed(2)}:1`);
          }
        }
      }
    }
    expect(failures.join(" | "), "the pressed decodable sound button").toBe("");
  });

  it("C-F1b the focus ring wins the cascade against the rules that set a box shadow", () => {
    const css = readLookCss();
    const failures: string[] = [];
    const rules = parseCss(css).filter((rule) => !rule.keyframes);
    const focusIndex = rules.findIndex((rule) =>
      selectorParts(rule.selector).some((part) => part.includes(":focus-visible")),
    );
    if (focusIndex < 1) {
      failures.push("the focus rule must exist");
    } else {
      const focus = rules[focusIndex]!;
      const shadows = focus.declarations.filter((declaration) => declaration.property === "box-shadow");
      if (shadows.length < 1) failures.push("the focus rule must set a box shadow ring");
      const important = shadows.some((declaration) => declaration.important);
      const focusSpec = bestSpecificity(selectorParts(focus.selector));
      let lost = 0;
      rules.forEach((rule, index) => {
        if (index === focusIndex) return;
        const ruleShadows = rule.declarations.filter((declaration) => declaration.property === "box-shadow");
        if (ruleShadows.length < 1) return;
        if (important && !ruleShadows.some((declaration) => declaration.important)) return;
        const ruleSpec = bestSpecificity(selectorParts(rule.selector));
        // The focus rule wins when its specificity is stronger, or when it comes later in the file.
        const wins = compareSpec(focusSpec, ruleSpec) > 0
          || (compareSpec(focusSpec, ruleSpec) === 0 && focusIndex > index);
        if (wins) return;
        lost += 1;
        if (failures.length < 6) {
          failures.push(`the focus ring loses the box shadow of the rule ${rule.selector}`);
        }
      });
      if (lost > failures.length) {
        failures.push(`and ${lost - failures.length} more rules that set a box shadow`);
      }
    }
    expect(failures.join(" | "), "the focus ring and the box shadow rules").toBe("");
  });

  it("P-2 no blue ink or ground stays on the child screens (AC-4.4, AC-4.7)", () => {
    const css = readLookCss();
    const failures: string[] = [];
    const banned = [
      "--sq-ink",
      "--sq-ink-soft",
      "--sq-navy",
      "--sq-blue",
      "--sq-blue-top",
      "--sq-blue-dark",
      "--sq-ice",
    ];
    const rules = parseCss(css);
    let checked = 0;
    let blueRefs = 0;
    const note = (text: string): void => {
      blueRefs += 1;
      if (failures.length < 6) failures.push(text);
    };
    for (const rule of rules) {
      if (rule.keyframes) continue;
      // The token definitions may stay. The rules that use them may not (finding P-2).
      if (selectorParts(rule.selector).some((part) => part === ":root")) continue;
      if (isArtRule(rule)) continue;
      checked += 1;
      for (const declaration of rule.declarations) {
        for (const token of banned) {
          if (declaration.value.includes(token)) {
            note(`the rule ${rule.selector} names the blue token ${token}`);
          }
        }
        if (holdsBlue(declaration.value)) {
          note(`the rule ${rule.selector} paints the blue ${declaration.value}`);
        }
      }
    }
    if (blueRefs > failures.length) {
      failures.push(`and ${blueRefs - failures.length} more blue references`);
    }
    // The ground of the page and the vignette over the place must be brown.
    const ground = rules.find((rule) => selectorParts(rule.selector).some((part) => part === "html"));
    const groundValue = ground
      ? lastValue(ground, "background") ?? lastValue(ground, "background-color")
      : null;
    if (groundValue === null || !holdsBrown(groundValue)) {
      failures.push(`the ground of the page must use a brown tone, found ${groundValue ?? "none"}`);
    }
    const vignette = rules.find((rule) =>
      selectorParts(rule.selector).some(
        (part) => part.includes("main[data-place]") && part.includes("::after"),
      ),
    );
    const vignetteValue = vignette ? lastValue(vignette, "background") : null;
    if (vignetteValue === null || !holdsBrown(vignetteValue) || holdsBlue(vignetteValue)) {
      failures.push(`the vignette over the place must use a brown tone, found ${vignetteValue ?? "none"}`);
    }
    expect(`rules_checked=${checked}`, "the blue scan must read the rules of the style sheet").toMatch(
      /^rules_checked=[1-9][0-9]*$/,
    );
    expect(`blue_refs=${blueRefs}`, "the blue references must be counted").toMatch(/^blue_refs=[0-9]+$/);
    expect(failures.join(" | "), "the blue ink and the blue ground").toBe("");
  });

  it("F-4 the per-word timing files did not change since the phase base (AC-4.7)", () => {
    const result = spawnSync(
      "git",
      [
        "diff",
        "3480f904c509dc2d66fa827dba73df95b3768c65",
        "--",
        "packages/read-along/hooks",
        "apps/storytime/lib/highlight-windows.ts",
      ],
      { cwd: repo, encoding: "utf8" },
    );
    expect(result.status, "the git diff of the timing files must run").toBe(0);
    expect(result.stdout.trim(), "the timing files must not change since the phase base").toBe("");
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
