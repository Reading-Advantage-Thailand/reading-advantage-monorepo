// @vitest-environment jsdom
/**
 * Task 2.3e: the UI council round 1 fix batch (PM, 2026-11-08; round 1 score 73.3 of 100).
 *
 * Three PM items, each with the rule where it lives in code:
 *   C1 Reader mode buttons: the three buttons carry a stable hook and `look.css` gives them an
 *      opaque cream fill, a brown label, and a contrast of 4.5:1 or more (en and th).
 *   C2 HUD level and week label: the English message file holds the English words, the frame
 *      renders the label for the interface locale in its own box, and `look.css` gives it 14 CSS
 *      px or more. The browser gate measures the box overlap (`hud_overlap_px=0`).
 *   C3 Sentence spacing: the decodable keeps no layout width floor and no horizontal flex gap,
 *      and both sentences read with single spaces and no space before punctuation.
 *
 * jsdom loads no CSS, so C1 and C2 read `look.css` as an artifact and C1 finds the rendered
 * hooks in the real component. A computed style needs the browser gate (row 12).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import { lastDeclaration, lengthPx, parseCss, selectorParts } from "./helpers/css-rules";

// The media of a week comes from the signed map of the page. The mock keeps a URL for every file.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) => `https://media.example/${file}`,
}));

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const messages = {
  en: JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>,
  th: JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>,
};

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Reads `look.css` with a named assertion when the file is absent. */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/** One resolved CSS colour. */
interface Rgba {
  /** Red channel, 0 to 255. */
  r: number;
  /** Green channel, 0 to 255. */
  g: number;
  /** Blue channel, 0 to 255. */
  b: number;
  /** Alpha, 0 to 1. */
  a: number;
}

/**
 * Reads a CSS colour as channels.
 * @param value A hex, `rgb()`, or `rgba()` value.
 * @returns The channels, or `null` for any other value.
 */
function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1]!;
    const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
  if (!rgb) return null;
  const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;
  return { r: parts[0]!, g: parts[1]!, b: parts[2]!, a: parts[3] ?? 1 };
}

/**
 * Reads the `:root` custom properties of a style sheet.
 * @param css The style sheet text.
 * @returns The property map.
 */
function cssVariables(css: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of parseCss(css)) {
    if (!selectorParts(rule.selector).includes(":root")) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property.startsWith("--")) map.set(declaration.property, declaration.value);
    }
  }
  return map;
}

/**
 * Replaces the `var()` references of a value with the custom properties it finds.
 * @param value The declaration value.
 * @param variables The custom properties.
 * @returns The resolved value.
 */
function resolveValue(value: string, variables: Map<string, string>): string {
  let text = value.trim();
  for (let pass = 0; pass < 5; pass += 1) {
    const match = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/.exec(text);
    if (!match) break;
    text = text.replace(match[0], variables.get(match[1]!) ?? match[2] ?? "");
  }
  return text;
}

/**
 * The relative luminance of a colour (WCAG 2.x).
 * @param color The colour.
 * @returns The luminance.
 */
function luminance(color: Rgba): number {
  const channel = (value: number) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** The WCAG contrast ratio of two colours. */
function contrastRatio(one: Rgba, two: Rgba): number {
  const high = Math.max(luminance(one), luminance(two));
  const low = Math.min(luminance(one), luminance(two));
  return (high + 0.05) / (low + 0.05);
}

/** True when the colour reads as brown: red dominates, then green, then blue, and the colour is dark. */
function isBrown(color: Rgba): boolean {
  return color.r > color.g && color.g > color.b && color.r >= 100 && color.g <= 120 && color.b <= 80;
}

/** True when the colour reads as cream: light, warm, and not pure white. */
function isCream(color: Rgba): boolean {
  return color.r >= 240 && color.g >= 220 && color.b <= 240 && color.r >= color.g && color.g >= color.b && luminance(color) >= 0.7;
}

/**
 * C1: lists the failures of the mode-button rule of `look.css`.
 * @param css The style sheet text.
 * @returns The failure messages.
 */
function modeButtonFailures(css: string): string[] {
  const rules = parseCss(css);
  const variables = cssVariables(css);
  const isModeRule = (selector: string) => selectorParts(selector).some((part) => part.includes("[data-mode-button]"));
  const background = lastDeclaration(rules, (rule) => isModeRule(rule.selector), "background-color");
  const label = lastDeclaration(rules, (rule) => isModeRule(rule.selector), "color");
  const failures: string[] = [];
  if (!background) failures.push("Missing a [data-mode-button] rule with background-color");
  if (!label) failures.push("Missing a [data-mode-button] rule with color");
  const bg = background ? parseColor(resolveValue(background.value, variables)) : null;
  const fg = label ? parseColor(resolveValue(label.value, variables)) : null;
  if (background && !bg) failures.push(`the [data-mode-button] background is not a colour: ${background.value}`);
  if (label && !fg) failures.push(`the [data-mode-button] label is not a colour: ${label.value}`);
  if (bg && bg.a !== 1) failures.push(`the [data-mode-button] background must be opaque, alpha=${bg.a}`);
  if (bg && !isCream(bg)) failures.push(`the [data-mode-button] background must be cream, received ${background!.value}`);
  if (fg && !isBrown(fg)) failures.push(`the [data-mode-button] label must be brown, received ${label!.value}`);
  if (bg && fg) {
    const ratio = contrastRatio(bg, fg);
    if (ratio < 4.5) failures.push(`the [data-mode-button] contrast must be 4.5 or more, contrast=${ratio.toFixed(2)}`);
  }
  return failures;
}

/** The reader labels of one locale, as the server page builds them. */
function readerLabels(locale: "en" | "th") {
  const text = messages[locale];
  return {
    readToMe: text.playerReadToMe,
    myTurn: text.playerMyTurn,
    slow: text.playerSlow,
    previousPage: text.playerPreviousPage,
    nextPage: text.playerNextPage,
    audioError: text.playerAudioError,
    finished: text.playerFinished,
    playing: text.playerPlaying,
  };
}

/** Renders the real reader on page 1 of the shipped week. */
async function renderReader(locale: "en" | "th") {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  const { StorytimeReader } = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeReader: ComponentType<Record<string, unknown>>;
  };
  const book = shipped.books.find((entry) => entry.kind === "readalong")!;
  return render(<StorytimeReader book={book} locale={locale} labels={readerLabels(locale)} mediaUrls={{}} />);
}

/** Renders the real frame of one locale. */
async function renderFrame(locale: "en" | "th") {
  const modulePath = "../app/[locale]/frame";
  const { Frame } = (await import(/* @vite-ignore */ modulePath)) as {
    Frame: ComponentType<Record<string, unknown>>;
  };
  return render(<Frame level={2} week={1} title="Hello!" variant="cover" locale={locale} />);
}

/** Renders the real decodable page of the shipped week. */
async function renderDecodable(locale: "en" | "th") {
  const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
  const { StorytimeDecodable } = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeDecodable: ComponentType<Record<string, unknown>>;
  };
  return render(<StorytimeDecodable week={shipped} locale={locale} />);
}

/** Counts the runs of two or more plain spaces. */
function doubleSpaceRuns(text: string): number {
  return (text.match(/[ \t]{2,}/g) ?? []).length;
}

/** Counts the spaces that sit before the stop, comma, exclamation, or question mark. */
function spaceBeforePunct(text: string): number {
  return (text.match(/[ \t]+[.,!?]/g) ?? []).length;
}

/** The look of one word button: a layout width floor would widen the word box. */
function widthFloorViolations(button: HTMLElement): string[] {
  const tokens = button.className.split(/\s+/);
  const failures: string[] = [];
  if (tokens.some((token) => /^min-w-|^w-(\d|\[)/.test(token))) {
    failures.push(`layout width floor (${button.className})`);
  }
  if (tokens.includes("justify-center")) failures.push(`centred in a widened box (${button.className})`);
  return failures;
}

/**
 * The word gap tokens that read as wide: 8 px (0.5rem) or more, or 0.4em or more. Task 2.3f
 * allows a small gap (0.25em or more) so that the decodable shows two words; the intent of
 * task 2.3e stays: the sentence must not add a wide gap.
 * @param className The class list of the sentence paragraph.
 * @returns The wide gap tokens, if any.
 */
function wideGapTokens(className: string): string[] {
  const wide: string[] = [];
  for (const token of className.split(/\s+/)) {
    const numeric = /^gap-x-(\d+)$/.exec(token);
    if (numeric && Number(numeric[1]) >= 2) wide.push(token);
    const em = /^gap-x-\[([0-9.]+)em\]$/.exec(token);
    if (em && Number(em[1]) >= 0.4) wide.push(token);
    const px = /^gap-x-\[([0-9.]+)px\]$/.exec(token);
    if (px && Number(px[1]) >= 8) wide.push(token);
  }
  return wide;
}

describe("the council round 1 fix batch (task 2.3e)", () => {
  it("C1 the reader mode buttons carry the hook and look.css gives opaque cream, brown, 4.5:1 (en and th)", async () => {
    const failures: string[] = [];
    let buttons = 0;
    for (const locale of ["en", "th"] as const) {
      const { container } = await renderReader(locale);
      const labels = readerLabels(locale);
      for (const label of [labels.readToMe, labels.myTurn, labels.slow]) {
        const button = [...container.querySelectorAll<HTMLElement>("button[aria-pressed]")].find(
          (element) => (element.textContent ?? "").trim() === label,
        );
        if (!button) {
          failures.push(`${locale}: Missing the "${label}" mode button`);
          continue;
        }
        buttons += 1;
        if (!button.hasAttribute("data-mode-button")) {
          failures.push(`${locale}: the "${label}" button must carry data-mode-button`);
        }
      }
      cleanup();
    }
    expect(`mode_buttons=${buttons}`, "the reader must hold the three mode buttons in en and th").toBe(
      "mode_buttons=6",
    );
    expect(failures, "the mode button hooks").toEqual([]);
    expect(modeButtonFailures(readLookCss()), "the [data-mode-button] rules of look.css").toEqual([]);
  });

  it("C1 the mode button checks reject the broken copies (falsification)", () => {
    // spec FR-4 (c), Daniel 2026-11-10: no blue chrome, so the label is brown.
    const good = `:root { --cream: #fff8e1; --brown: #92400e; }
[data-mode-button] { background-color: var(--cream); color: var(--brown); }`;
    expect(modeButtonFailures(good), "the good copy passes").toEqual([]);
    const seeThrough = good.replace("--cream: #fff8e1;", "--cream: rgba(255, 248, 225, 0.5);");
    expect(modeButtonFailures(seeThrough).join(" "), "a see-through fill fails").toContain("opaque");
    const dim = good.replace("--brown: #92400e;", "--brown: #efe6c8;");
    expect(modeButtonFailures(dim).join(" "), "a dim label fails").toContain("contrast");
    const gray = good.replace("--brown: #92400e;", "--brown: #555555;");
    expect(modeButtonFailures(gray).join(" "), "a gray label fails").toContain("brown");
    const missing = ".x { background-color: #fff8e1; color: #92400e; }";
    expect(modeButtonFailures(missing).join(" "), "a missing rule fails").toContain("Missing a [data-mode-button]");
  });

  it("C2 the English message file holds the English HUD words (en.json lines 52 to 53)", () => {
    expect(`en.barLevel=${messages.en.barLevel}`, "messages/en.json barLevel must read Level {level}").toBe(
      "en.barLevel=Level {level}",
    );
    expect(`en.barWeek=${messages.en.barWeek}`, "messages/en.json barWeek must read Week {week}").toBe(
      "en.barWeek=Week {week}",
    );
    expect(`th.barLevel=${messages.th.barLevel}`, "the Thai barLevel stays Thai").toBe("th.barLevel=ระดับ {level}");
    expect(`th.barWeek=${messages.th.barWeek}`, "the Thai barWeek stays Thai").toBe("th.barWeek=สัปดาห์ {week}");
  });

  it("C2 the HUD label follows the interface language and sits outside the progress track box", async () => {
    // spec FR-4 (a), Daniel 2026-11-10: the game bar goes, so the label sits outside no track.
    const english = await renderFrame("en");
    const enLabel = english.container.querySelector<HTMLElement>("[data-level-week]");
    expect(enLabel, "Missing the [data-level-week] label of the HUD").not.toBeNull();
    expect(enLabel!.textContent?.trim(), "the English UI must show Level 2 · Week 1").toBe("Level 2 · Week 1");
    const bar = english.container.querySelector("[data-game-bar]");
    expect(bar, "the HUD must render no [data-game-bar] progress track").toBeNull();
    expect(
      english.container.querySelector('[role="progressbar"]'),
      "the HUD must render no [role=\"progressbar\"] track",
    ).toBeNull();
    cleanup();
    const thai = await renderFrame("th");
    const thLabel = thai.container.querySelector<HTMLElement>("[data-level-week]");
    expect(thLabel, "Missing the [data-level-week] label of the HUD").not.toBeNull();
    expect(thLabel!.textContent?.trim(), "the Thai UI must show the Thai label").toBe("ระดับ 2 · สัปดาห์ 1");
  });

  it("C2 look.css gives the HUD label 14 CSS px or more", () => {
    const rules = parseCss(readLookCss());
    const size = lastDeclaration(
      rules,
      (rule) => selectorParts(rule.selector).some((part) => part.includes("[data-level-week]")),
      "font-size",
    );
    expect(size, "Missing a [data-level-week] font-size rule in look.css").toBeDefined();
    const pixels = size ? lengthPx(size.value) : null;
    expect(pixels, `the [data-level-week] font size must be 14 px or more, received ${size?.value ?? "none"}`).not.toBeNull();
    expect(pixels! >= 14, `the [data-level-week] font size must be 14 px or more, received ${pixels}`).toBe(true);
  });

  it("C3 the decodable sentence has single spaces, no space before punctuation, and no widened word box (en and th)", async () => {
    const failures: string[] = [];
    let sentences = 0;
    for (const locale of ["en", "th"] as const) {
      const { container } = await renderDecodable(locale);
      const paragraph = container.querySelector<HTMLElement>("[data-page-number] p");
      expect(paragraph, "the decodable must render its sentence").not.toBeNull();
      const text = (paragraph!.textContent ?? "").replace(/\s+$/, "");
      sentences += 1;
      const doubles = doubleSpaceRuns(text);
      const before = spaceBeforePunct(text);
      if (doubles !== 0) failures.push(`${locale}: double_space_runs=${doubles} in ${JSON.stringify(text)}`);
      if (before !== 0) failures.push(`${locale}: space_before_punct=${before} in ${JSON.stringify(text)}`);
      if (text !== "A nest.") failures.push(`${locale}: the decodable must read "A nest.", received ${JSON.stringify(text)}`);
      const words = [...paragraph!.querySelectorAll<HTMLElement>("button")];
      if (words.length < 2) failures.push(`${locale}: the decodable sentence must hold its word buttons`);
      for (const word of words) {
        for (const violation of widthFloorViolations(word)) {
          failures.push(`${locale}: the decodable word "${word.textContent}" holds a ${violation}`);
        }
      }
      for (const token of wideGapTokens(paragraph!.className)) {
        failures.push(`${locale}: the decodable sentence must not add a wide flex gap (${token})`);
      }
      cleanup();
    }
    expect(`sentences_checked=${sentences}`, "the decodable runs in en and th").toBe("sentences_checked=2");
    expect(failures, "the decodable sentence spacing").toEqual([]);
  });

  it("C3 the reader passage keeps single spaces, no space before punctuation, and no widened word box (en and th)", async () => {
    const failures: string[] = [];
    for (const locale of ["en", "th"] as const) {
      const { container } = await renderReader(locale);
      const sentence = container.querySelector<HTMLElement>("[data-sentence]");
      expect(sentence, "the reader must render its sentence").not.toBeNull();
      const text = (sentence!.textContent ?? "").replace(/\s+$/, "");
      if (text !== "Hello, I am Pat.") failures.push(`${locale}: the reader must read "Hello, I am Pat.", received ${JSON.stringify(text)}`);
      const doubles = doubleSpaceRuns(text);
      const before = spaceBeforePunct(text);
      if (doubles !== 0) failures.push(`${locale}: double_space_runs=${doubles} in ${JSON.stringify(text)}`);
      if (before !== 0) failures.push(`${locale}: space_before_punct=${before} in ${JSON.stringify(text)}`);
      const words = [...sentence!.querySelectorAll<HTMLElement>("[data-word]")];
      if (words.length < 4) failures.push(`${locale}: the reader sentence must hold its words`);
      for (const word of words) {
        for (const violation of widthFloorViolations(word)) {
          failures.push(`${locale}: the reader word "${word.textContent}" holds a ${violation}`);
        }
      }
      cleanup();
    }
    expect(failures, "the reader sentence spacing").toEqual([]);
  });

  it("the spacing checks reject the wide-gap copies (falsification)", () => {
    for (const copy of ["A   nest .", "A nest .", "Hi ,", "Go !", "What ?"]) {
      expect(doubleSpaceRuns(copy) + spaceBeforePunct(copy), `the copy ${JSON.stringify(copy)} must be rejected`).toBeGreaterThan(0);
    }
    expect(doubleSpaceRuns("A nest."), "a single space passes").toBe(0);
    expect(spaceBeforePunct("A nest."), "no space before the stop passes").toBe(0);
  });
});
