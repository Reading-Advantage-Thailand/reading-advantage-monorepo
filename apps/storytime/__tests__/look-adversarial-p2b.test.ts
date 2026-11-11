/**
 * Adversarial source and model cases for the brand chrome of Phase 2b (track
 * storytime_look_20261107, spec FR-4, strategy P2b.6).
 *
 * These cases read files. They prove which declaration wins and which pair of colors holds. They
 * prove no painted box: the paint checks are the browser rows and the UX browser review. The DOM
 * cases of the same round are in `look-adversarial-p2b.test.tsx`.
 *
 * The cases of this file:
 *   M1 the current word holds its brand pair in both themes, and the dark band keeps the text readable.
 *   M2 the look sheet is unlayered, so it beats the Tailwind utilities of the package words.
 *   M3 no control rule, no inline style, and no important utility can hide the focus ring.
 *   M4 the tab stops of the app sources are the two known files.
 *   M5 the source checks reject broken copies (self-test).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCss, selectorParts, stripCssComments } from "./helpers/css-rules";

const app = resolve(import.meta.dirname, "..");
const repo = resolve(app, "../..");
const css = readFileSync(resolve(app, "app/look.css"), "utf8");

/** The ring rule selector of the focus ring. */
const RING_SELECTOR = ":is(a, button, [tabindex]):focus-visible";

/**
 * Converts an OKLCH color to sRGB, the form of the Tailwind v4 palette.
 * @param lightness The lightness from 0 to 1.
 * @param chroma The chroma.
 * @param hue The hue in degrees.
 * @returns The sRGB channels from 0 to 255.
 */
function oklchToRgb(lightness: number, chroma: number, hue: number): [number, number, number] {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const encode = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    return Math.round((clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055) * 255);
  };
  return [encode(linear[0]!), encode(linear[1]!), encode(linear[2]!)];
}

/**
 * Reads one hex color.
 * @param hex The color as `#rrggbb`.
 * @returns The sRGB channels.
 */
function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as [number, number, number];
}

/**
 * Gives the WCAG 2 relative luminance of a color.
 * @param rgb The sRGB channels.
 * @returns The luminance from 0 to 1.
 */
function luminance(rgb: readonly number[]): number {
  const scaled = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * scaled[0]! + 0.7152 * scaled[1]! + 0.0722 * scaled[2]!;
}

/**
 * Gives the WCAG 2 contrast ratio of two colors.
 * @param first One color.
 * @param other The other color.
 * @returns The ratio from 1 to 21.
 */
function ratio(first: readonly number[], other: readonly number[]): number {
  const a = luminance(first);
  const b = luminance(other);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Composites a color with an alpha over a ground.
 * @param color The top color.
 * @param ground The ground color.
 * @param alpha The alpha from 0 to 1.
 * @returns The sRGB channels of the result.
 */
function over(color: readonly number[], ground: readonly number[], alpha: number): [number, number, number] {
  return color.map((channel, index) => Math.round(channel * alpha + ground[index]! * (1 - alpha))) as [
    number,
    number,
    number,
  ];
}

/**
 * Reads one color of the Tailwind v4 palette from its theme file.
 * @param theme The theme file text.
 * @param name The palette name, for example `amber-800`.
 * @returns The sRGB channels, or `null` when the name is absent.
 */
function paletteColor(theme: string, name: string): [number, number, number] | null {
  const match = new RegExp(`--color-${name}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`).exec(theme);
  if (!match) return null;
  return oklchToRgb(Number(match[1]) / 100, Number(match[2]), Number(match[3]));
}

/** The parts of the current-word highlight classes for one theme. */
interface Pair {
  background: string[];
  text: string[];
}

/**
 * Splits the class string of the current word into its light and dark pairs.
 * @param classes The class string.
 * @returns The two pairs, as the raw arbitrary values.
 */
function themePairs(classes: string): { light: Pair; dark: Pair; hover: string[] } {
  const tokens = classes.split(/\s+/).filter(Boolean);
  const pairOf = (list: string[]): Pair => ({
    background: list.filter((token) => token.startsWith("bg-")),
    text: list.filter((token) => token.startsWith("text-")),
  });
  const dark = tokens.filter((token) => token.startsWith("dark:")).map((token) => token.slice(5));
  const light = tokens.filter((token) => !token.includes(":"));
  const hover = tokens.filter((token) => token.includes("hover:"));
  return { light: pairOf(light), dark: pairOf(dark), hover };
}

/**
 * Reads an arbitrary hex value from a Tailwind class such as `bg-[#92400e]`.
 * @param token The class.
 * @returns The sRGB channels, or `null` for any other class.
 */
function arbitraryHex(token: string): [number, number, number] | null {
  const match = /\[(#[0-9a-fA-F]{6})\]$/.exec(token);
  return match ? hexToRgb(match[1]!) : token === "text-white" ? [255, 255, 255] : null;
}

/**
 * Checks the current-word highlight in both themes.
 * @param classes The class string of the current word.
 * @param bandClass The class string of the playing sentence band.
 * @param theme The Tailwind theme file text.
 * @returns The failure texts, and the measured ratios.
 */
function highlightFindings(
  classes: string,
  bandClass: string,
  theme: string,
): { failures: string[]; measures: Record<string, number> } {
  const failures: string[] = [];
  const measures: Record<string, number> = {};
  const { light, dark, hover } = themePairs(classes);
  const ink = hexToRgb("#3b1d0a");
  const cream = hexToRgb("#fffaf0");
  if (hover.length > 0) failures.push(`the current word must hold no hover class, found ${hover.join(",")}`);
  for (const [name, pair] of [["light", light], ["dark", dark]] as const) {
    if (pair.background.length !== 1 || pair.text.length !== 1) {
      failures.push(`the ${name} pair must hold one background and one text class`);
      continue;
    }
    const background = arbitraryHex(pair.background[0]!);
    const text = arbitraryHex(pair.text[0]!);
    if (!background || !text) {
      failures.push(`the ${name} pair must use hex values: ${pair.background[0]} ${pair.text[0]}`);
      continue;
    }
    measures[`${name}_word_text`] = ratio(background, text);
    if (measures[`${name}_word_text`]! < 4.5) {
      failures.push(`the ${name} current word pair measures ${measures[`${name}_word_text`]!.toFixed(2)}:1, below 4.5:1`);
    }
  }
  // The band of the playing sentence. The look sheet keeps the reading card cream in both themes,
  // so the dark band is the dark class composited over cream.
  const bandTokens = bandClass.split(/\s+/).filter(Boolean);
  const lightBand = /^bg-(amber-\d+)$/.exec(bandTokens.find((token) => !token.includes(":")) ?? "");
  const darkBand = /^dark:bg-(amber-\d+)\/(\d+)$/.exec(bandTokens.find((token) => token.startsWith("dark:bg-")) ?? "");
  const lightGround = lightBand ? paletteColor(theme, lightBand[1]!) : null;
  const darkTop = darkBand ? paletteColor(theme, darkBand[1]!) : null;
  if (!lightGround || !darkBand || !darkTop) {
    failures.push(`the band classes must name the amber palette: ${bandClass}`);
    return { failures, measures };
  }
  const darkGround = over(darkTop, cream, Number(darkBand[2]) / 100);
  const lightWord = light.background[0] ? arbitraryHex(light.background[0]) : null;
  const darkWord = dark.background[0] ? arbitraryHex(dark.background[0]) : null;
  measures.light_ink_band = ratio(ink, lightGround);
  measures.dark_ink_band = ratio(ink, darkGround);
  if (lightWord) measures.light_word_band = ratio(lightWord, lightGround);
  if (darkWord) measures.dark_word_band = ratio(darkWord, darkGround);
  if (measures.light_ink_band! < 4.5) failures.push(`the ink on the light band measures ${measures.light_ink_band!.toFixed(2)}:1`);
  if (measures.dark_ink_band! < 4.5) failures.push(`the ink on the dark band measures ${measures.dark_ink_band!.toFixed(2)}:1`);
  if ((measures.light_word_band ?? 0) < 3) failures.push(`the light word against its band measures ${(measures.light_word_band ?? 0).toFixed(2)}:1, below 3:1`);
  return { failures, measures };
}

/**
 * Lists the source files that the focus checks read: the app sources and the read-along package.
 * @returns The absolute paths of the non-test TypeScript and TSX files.
 */
function sourceFiles(): string[] {
  const roots = [resolve(app, "app"), resolve(repo, "packages/read-along/components"), resolve(repo, "packages/read-along/lib")];
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        if (entry === "__tests__" || entry === "node_modules") continue;
        walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
        found.push(path);
      }
    }
  };
  for (const root of roots) walk(root);
  return found;
}

/**
 * Finds the declarations that can hide the focus ring.
 * @param styleSheet The style sheet text.
 * @returns The failure texts, and the count of rules read.
 */
function ringFindings(styleSheet: string): { failures: string[]; rules: number } {
  const rules = parseCss(styleSheet).filter((rule) => !rule.keyframes);
  const failures: string[] = [];
  const ring = rules.find((rule) => selectorParts(rule.selector).includes(RING_SELECTOR));
  if (!ring) {
    failures.push("the focus ring rule must exist");
    return { failures, rules: rules.length };
  }
  const ringShadow = ring.declarations.find((declaration) => declaration.property === "box-shadow");
  if (!ringShadow?.important) failures.push("the ring box shadow must be important");
  const outline = ring.declarations.find((declaration) => declaration.property === "outline");
  if (!outline || !/^\d+px\s+solid\s+#fff(fff)?$/i.test(outline.value)) {
    failures.push(`the ring must draw a solid white outline, found ${outline?.value ?? "none"}`);
  }
  for (const rule of rules) {
    if (rule === ring) continue;
    for (const declaration of rule.declarations) {
      if (/^outline(-|$)/.test(declaration.property)) {
        failures.push(`the rule ${rule.selector} sets ${declaration.property}, which can hide the white outline`);
      }
      if (declaration.important && /^(box-shadow|outline)/.test(declaration.property)) {
        failures.push(`the rule ${rule.selector} sets an important ${declaration.property}, which competes with the ring`);
      }
    }
  }
  return { failures, rules: rules.length };
}

/**
 * Finds the sources that can hide the ring: an inline shadow or outline, or an important utility.
 * @param files The file names with their text.
 * @returns The failure texts.
 */
function sourceRingFindings(files: { name: string; text: string }[]): string[] {
  const failures: string[] = [];
  for (const { name, text } of files) {
    if (/\b(boxShadow|outlineStyle|outlineColor|outlineWidth|outline)\s*:/.test(text)) {
      failures.push(`${name} sets an inline shadow or outline`);
    }
    if (/(?:^|[\s"'`])(?:[\w:-]*:)?(?:!(?:shadow|ring|outline)[\w[\]#./%-]*|(?:shadow|ring|outline)[\w[\]#./%-]*!)(?=[\s"'`]|$)/m.test(text)) {
      failures.push(`${name} names an important shadow, ring, or outline utility`);
    }
  }
  return failures;
}

/**
 * Counts the tab stop sites of the sources.
 * @param files The file names with their text.
 * @returns The sites as `name:count` entries.
 */
function tabIndexSites(files: { name: string; text: string }[]): string[] {
  const sites: string[] = [];
  for (const { name, text } of files) {
    const count = (stripCssComments(text).match(/\btabIndex\s*[:=]/g) ?? []).length;
    if (count > 0) sites.push(`${name}:${count}`);
  }
  return sites;
}

describe("adversarial brand chrome source cases of Phase 2b", () => {
  it("M1 the current word holds its brand pair in both themes, and the dark band keeps the text readable", async () => {
    const themePath = resolve(repo, "node_modules/tailwindcss/theme.css");
    expect(existsSync(themePath), "the Tailwind theme file must exist").toBe(true);
    const theme = readFileSync(themePath, "utf8");
    expect(paletteColor(theme, "amber-200"), "the palette must hold amber-200").not.toBeNull();
    expect(paletteColor(theme, "amber-800"), "the palette must hold amber-800").not.toBeNull();
    const highlightPath = resolve(repo, "packages/read-along/lib/highlight.ts");
    const { HIGHLIGHT_CLASSES } = (await import(/* @vite-ignore */ highlightPath)) as {
      HIGHLIGHT_CLASSES: { currentWord: string; playingSentence: string };
    };
    const result = highlightFindings(HIGHLIGHT_CLASSES.currentWord, HIGHLIGHT_CLASSES.playingSentence, theme);
    expect(result.failures.join(" | "), "the highlight pairs").toBe("");
    // The pair values of AC-4.9: white on brown, brown on amber, and the two band ratios.
    expect(result.measures.light_word_text!, "white on brown").toBeCloseTo(7.09, 1);
    expect(result.measures.dark_word_text!, "brown on amber").toBeCloseTo(4.92, 1);
    expect(`measures=${Object.keys(result.measures).length}`, "every measure must be taken").toBe("measures=6");
    // The dark word against the dark band is recorded, not gated: spec AC-4.9 binds the text pair.
    // The value goes to the UX browser review, which captures a forced dark scheme.
    expect(result.measures.dark_word_band!, "the dark word must differ from its band").toBeGreaterThan(1.5);
  });

  it("M2 the look sheet is unlayered, so it beats the Tailwind utilities of the package words", () => {
    const globals = readFileSync(resolve(app, "app/globals.css"), "utf8");
    expect(globals, "the Tailwind v4 entry holds its layers").toMatch(/@import\s+"tailwindcss"/);
    const sheet = stripCssComments(css);
    expect(sheet, "the look sheet must hold no @layer block").not.toMatch(/@layer\b/);
    const layout = readFileSync(resolve(app, "app/[locale]/layout.tsx"), "utf8");
    expect(layout, "the locale layout imports the look sheet").toMatch(/import\s+"\.\.\/look\.css"/);
    const wrapped = `@layer utilities { ${css} }`;
    expect(stripCssComments(wrapped), "a layered look sheet must be flagged").toMatch(/@layer\b/);
  });

  it("M3 no control rule, no inline style, and no important utility can hide the focus ring", () => {
    const sheet = ringFindings(css);
    expect(`rules_read=${sheet.rules}`, "the rules must be read").toMatch(/^rules_read=[1-9]\d*$/);
    expect(sheet.failures.join(" | "), "the look sheet and the ring").toBe("");
    const files = sourceFiles().map((path) => ({ name: relative(repo, path), text: readFileSync(path, "utf8") }));
    expect(`source_files=${files.length}`, "the source scan must read files").toMatch(/^source_files=[1-9]\d*$/);
    expect(sourceRingFindings(files).join(" | "), "the sources and the ring").toBe("");
  });

  it("M4 the tab stops of the app sources are the two known files", () => {
    const files = sourceFiles().map((path) => ({ name: relative(repo, path), text: readFileSync(path, "utf8") }));
    const sites = tabIndexSites(files);
    // The ring rule names [tabindex]. A new tab stop on a container would draw the 6 px ring around
    // the container, so a new site must pass a UX review before it joins this list (Review C C3-F1).
    // The teacher end region of commit f76d58624 holds tabIndex={-1}. It is a focus target after a
    // lesson ends, and it takes no place in the tab order. The UX review of that region passed.
    expect(sites, "the tab stop sites").toEqual([
      "apps/storytime/app/[locale]/teacher/[level]/[week]/[day]/lesson-flow.tsx:1",
      "packages/read-along/components/read-along/read-along-passage.tsx:2",
    ]);
  });

  it("M5 the source checks reject broken copies (self-test)", async () => {
    const themePath = resolve(repo, "node_modules/tailwindcss/theme.css");
    const theme = readFileSync(themePath, "utf8");
    const highlightPath = resolve(repo, "packages/read-along/lib/highlight.ts");
    const { HIGHLIGHT_CLASSES } = (await import(/* @vite-ignore */ highlightPath)) as {
      HIGHLIGHT_CLASSES: { currentWord: string; playingSentence: string };
    };
    const word = HIGHLIGHT_CLASSES.currentWord;
    const band = HIGHLIGHT_CLASSES.playingSentence;
    const highlightMutants: Record<string, string> = {
      "a dark label turned white": word.replace("dark:text-[#92400e]", "dark:text-white"),
      "a light ground turned amber": word.replace("bg-[#92400e]", "bg-[#fcd34d]"),
      "a hover class on the word": `${word} hover:bg-emerald-200`,
      "a dark pair without a label": word.replace(" dark:text-[#92400e]", ""),
    };
    let rejected = 0;
    for (const [name, mutant] of Object.entries(highlightMutants)) {
      expect(mutant, `${name}: the mutant must change the classes`).not.toBe(word);
      expect(highlightFindings(mutant, band, theme).failures.length, `${name}: the check must reject it`).toBeGreaterThan(0);
      rejected += 1;
    }
    const ringMutants: Record<string, string> = {
      "a control that removes the outline": `${css}\nbutton { outline: none; }`,
      "a later important shadow": `${css}\nmain[data-place] button { box-shadow: 0 0 0 2px #000 !important; }`,
      "a ring without the important shadow": css.replace("0 0 0 6px var(--st-brown) !important", "0 0 0 6px var(--st-brown)"),
      "a ring with a dark outline": css.replace("outline: 3px solid #fff;", "outline: 3px solid #000;"),
    };
    for (const [name, mutant] of Object.entries(ringMutants)) {
      expect(mutant, `${name}: the mutant must change the sheet`).not.toBe(css);
      expect(ringFindings(mutant).failures.length, `${name}: the check must reject it`).toBeGreaterThan(0);
      rejected += 1;
    }
    const sourceMutants: Record<string, string> = {
      "an inline shadow": 'const x = <button style={{ boxShadow: "none" }} />;',
      "an inline outline": "const x = <a style={{ outline: 0 }} />;",
      "a trailing important utility": 'const x = <button className="rounded shadow-md!" />;',
      "a leading important utility": 'const x = <button className="!ring-0 p-2" />;',
      "a variant important utility": 'const x = <a className="focus-visible:outline-none! p-2" />;',
    };
    for (const [name, text] of Object.entries(sourceMutants)) {
      expect(sourceRingFindings([{ name: "mutant.tsx", text }]).length, `${name}: the check must reject it`).toBeGreaterThan(0);
      rejected += 1;
    }
    expect(sourceRingFindings([{ name: "ok.tsx", text: 'const x = <button className="rounded p-2 shadow-md" />;' }]), "a plain utility passes").toEqual([]);
    expect(tabIndexSites([{ name: "a.tsx", text: "const x = <div tabIndex={0} />;" }]), "a new tab stop is counted").toEqual(["a.tsx:1"]);
    expect(`mutants_rejected=${rejected}/13`, "every mutant must be rejected").toBe("mutants_rejected=13/13");
  });
});
