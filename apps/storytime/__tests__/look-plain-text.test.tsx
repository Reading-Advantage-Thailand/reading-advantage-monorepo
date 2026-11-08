// @vitest-environment jsdom
/**
 * Task 2.2: the plain-text rule of the look (AC-2.3, text part; strategy P2.2 T1 to T5).
 *
 * The read-along sentence, the decodable sentence and its chips, and the lyric list stay plain:
 * no decoration class of the look (`sq-`), no picture in the lyric list (M-3), no layout width on
 * a word (AC-1.9), and no upper-case rule. jsdom loads no CSS, so T1 to T3 are artifact tests on
 * the real render. They never prove a computed style; row 6 of the browser gate does.
 *
 * At the base the look does not exist. T1 to T3 pass because no `sq-` class exists yet
 * (named characterization). T4 and T5 fail on `Missing apps/storytime/app/look.css`. The
 * self-test cases run the checks on broken copies; they test the checks, not the file.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import { parseCss, selectorParts } from "./helpers/css-rules";

// The media of a week comes from the signed map of the page. The mock keeps a URL for every file.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) => `https://media.example/${file}`,
}));

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;

const readerLabels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
  playing: "Playing",
};
const songLabels = { play: "Play", pause: "Pause" };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The properties that a word rule must not declare (T4). A layout width re-breaks AC-1.9. */
const BANNED_WORD_PROPERTIES = [
  "min-width",
  "width",
  "max-width",
  "padding-inline",
  "padding-inline-start",
  "padding-inline-end",
  "padding-left",
  "padding-right",
  "justify-content",
  "word-spacing",
  "letter-spacing",
  "text-shadow",
  "text-transform",
  "filter",
  "transform",
  "animation",
];
/** The properties that draw a decoration. Only the clip marker may declare them (N2, Q28). */
const DECORATION_PROPERTIES = [
  "text-decoration",
  "text-decoration-line",
  "text-decoration-style",
  "text-decoration-color",
  "text-underline-offset",
  "border-bottom",
  "border-bottom-width",
  "border-bottom-style",
  "border-bottom-color",
];

/**
 * Reads the `look.css` text with a named assertion when the file is absent.
 * @returns The style sheet text.
 */
function readLookCss(): string {
  expect(existsSync(lookCssPath), "Missing apps/storytime/app/look.css").toBe(true);
  return readFileSync(lookCssPath, "utf8");
}

/**
 * T4: finds the declarations that a rule on a word or a sentence must not hold.
 * @param css The style sheet text.
 * @returns The failure messages and the number of rules that name a word or a sentence.
 */
function checkWordRules(css: string): { failures: string[]; wordRules: number } {
  const failures: string[] = [];
  let wordRules = 0;
  for (const rule of parseCss(css)) {
    if (rule.keyframes) continue;
    if (!rule.selector.includes("[data-word]") && !rule.selector.includes("[data-sentence]")) continue;
    wordRules += 1;
    const marker = selectorParts(rule.selector).every((part) => part.includes("[data-word][tabindex]"));
    for (const declaration of rule.declarations) {
      const { property, value } = declaration;
      const none = /^(none|0|0px|initial|unset)$/i.test(value);
      if (property === "text-transform") {
        if (value !== "none") failures.push(`${rule.selector} { ${property}: ${value} }`);
      } else if (BANNED_WORD_PROPERTIES.includes(property) && !none) {
        failures.push(`${rule.selector} { ${property}: ${value} }`);
      } else if (property === "text-align" && /justify/i.test(value)) {
        failures.push(`${rule.selector} { ${property}: ${value} }`);
      } else if (DECORATION_PROPERTIES.includes(property) && !marker && !none) {
        failures.push(`${rule.selector} { ${property}: ${value} } (only the clip marker may decorate)`);
      }
    }
  }
  return { failures, wordRules };
}

/**
 * T5: finds the rules that set an upper-case text transform.
 * @param css The style sheet text.
 * @returns The failure messages.
 */
function checkNoUppercase(css: string): string[] {
  const failures: string[] = [];
  for (const rule of parseCss(css)) {
    for (const declaration of rule.declarations) {
      if (declaration.property === "text-transform" && /uppercase/i.test(declaration.value)) {
        failures.push(`${rule.selector} { text-transform: ${declaration.value} }`);
      }
    }
  }
  return failures;
}

/**
 * T1: lists the plain-text elements that carry a decoration class of the look.
 * @param root The rendered container.
 * @param selector The selector of the plain-text elements.
 * @returns The violations and the number of elements checked.
 */
function decorationViolations(root: HTMLElement, selector: string): { violations: string[]; checked: number } {
  const violations: string[] = [];
  const elements = [...root.querySelectorAll<HTMLElement>(selector)];
  for (const element of elements) {
    for (const token of element.classList) {
      if (token.startsWith("sq-")) violations.push(`${element.tagName.toLowerCase()}.${token}`);
    }
    for (let up = element.parentElement; up && up !== root; up = up.parentElement) {
      for (const token of up.classList) {
        if (token.startsWith("sq-text-")) violations.push(`ancestor ${up.tagName.toLowerCase()}.${token}`);
      }
    }
  }
  return { violations, checked: elements.length };
}

/**
 * T2: lists what a lyric list must not hold: a picture, an inline background, or an svg.
 * @param list The lyric list element.
 * @returns The violations.
 */
function lyricListViolations(list: HTMLElement): string[] {
  const violations: string[] = [];
  for (const element of list.querySelectorAll("img, picture, svg")) {
    violations.push(element.tagName.toLowerCase());
  }
  for (const element of list.querySelectorAll<HTMLElement>("[style]")) {
    if (/background/i.test(element.getAttribute("style") ?? "")) violations.push("inline background");
  }
  return violations;
}

/**
 * Builds a detached container from markup.
 * @param html The markup.
 * @returns The container.
 */
function fragment(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

/** Sets the phone media query result. */
function setPhone(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

/** Renders the real reader on page 1 of the shipped week. */
async function renderReader() {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  const { StorytimeReader } = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeReader: ComponentType<Record<string, unknown>>;
  };
  const book = shipped.books.find((entry) => entry.kind === "readalong")!;
  return render(<StorytimeReader book={book} locale="en" labels={readerLabels} mediaUrls={{}} />);
}

/** Renders the real decodable page of the shipped week. */
async function renderDecodable() {
  const modulePath = "../app/[locale]/st/[level]/[week]/decodable";
  const { StorytimeDecodable } = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeDecodable: ComponentType<Record<string, unknown>>;
  };
  return render(<StorytimeDecodable week={shipped} locale="en" />);
}

/** Renders the real song of the shipped week. */
async function renderSong() {
  const modulePath = "../app/[locale]/st/[level]/[week]/song";
  const { StorytimeSong } = (await import(/* @vite-ignore */ modulePath)) as {
    StorytimeSong: ComponentType<Record<string, unknown>>;
  };
  setPhone(false);
  return render(<StorytimeSong song={structuredClone(shipped.song!)} mediaUrls={{}} labels={songLabels} />);
}

/** A style sheet that obeys the plain-text rules, with the clip marker. */
const GOOD_CSS = `
/* [data-word] { min-width: 48px } in a comment is not a rule */
[data-word] { min-height: 48px; text-transform: none; }
[data-word][tabindex] { text-decoration: underline dotted; }
.sq-card { text-shadow: 0 1px 0 #fff; }
`;

describe("the plain-text rule of the look (AC-2.3)", () => {
  it("T1 the reader sentence and words carry no decoration class of the look", async () => {
    const { container } = await renderReader();
    const { violations, checked } = decorationViolations(container, "[data-sentence], [data-sentence] *, [data-word]");
    expect(`elements_checked=${checked}`, "the reader screen must hold plain-text elements").toMatch(
      /^elements_checked=[1-9][0-9]*$/,
    );
    expect(violations, "no sq- class on the read-along text").toEqual([]);
  });

  it("T1 the decodable sentence and chips carry no decoration class of the look", async () => {
    const { container } = await renderDecodable();
    const { violations, checked } = decorationViolations(
      container,
      "[data-page-number] p, [data-page-number] p *, section[aria-label='Tricky words'] button",
    );
    expect(`elements_checked=${checked}`, "the decodable screen must hold plain-text elements").toMatch(
      /^elements_checked=[1-9][0-9]*$/,
    );
    expect(violations, "no sq- class on the decodable sentence or chips").toEqual([]);
  });

  it("T1 the lyric text spans carry no decoration class of the look", async () => {
    const { container } = await renderSong();
    const { violations, checked } = decorationViolations(container, "ol li span");
    expect(`elements_checked=${checked}`, "the song screen must hold lyric spans").toMatch(
      /^elements_checked=[1-9][0-9]*$/,
    );
    expect(violations, "no sq- class on the lyric text").toEqual([]);
  });

  it("T2 the lyric list holds no picture, no inline background, and no svg (M-3)", async () => {
    const { container } = await renderSong();
    const list = container.querySelector<HTMLElement>("ol");
    expect(list, "the song must render its lyric list").not.toBeNull();
    expect(lyricListViolations(list!)).toEqual([]);
  });

  it("T3 the lyric list keeps its 15 lines and their text", async () => {
    const { container } = await renderSong();
    const items = [...container.querySelectorAll<HTMLElement>("ol > li")];
    expect(`lines_n=${items.length}`).toBe(`lines_n=${shipped.song!.lines.length}`);
    expect(`lines_n=${items.length}`).toBe("lines_n=15");
    shipped.song!.lines.forEach((line, index) => {
      expect(items[index]!.textContent ?? "", `line ${index} must keep its text`).toContain(line.text);
    });
  });

  it("T4 no look.css rule on a word or a sentence adds width, spacing, shadow, filter, or motion", () => {
    const { failures, wordRules } = checkWordRules(readLookCss());
    expect(failures, "banned declarations on [data-word] or [data-sentence]").toEqual([]);
    expect(`word_rules=${wordRules}`, "the look must style words only through checked rules").toMatch(
      /^word_rules=[0-9]+$/,
    );
  });

  it("T5 look.css sets text-transform uppercase nowhere", () => {
    expect(checkNoUppercase(readLookCss())).toEqual([]);
  });

  it("the checks fail the broken copies (falsification)", () => {
    expect(checkWordRules(GOOD_CSS).failures, "the good copy has no failure").toEqual([]);
    expect(checkWordRules(GOOD_CSS).wordRules, "the good copy has two word rules").toBe(2);
    const study = GOOD_CSS.replace("min-height: 48px;", "min-height: 48px; min-width: 48px;");
    expect(checkWordRules(study).failures, "the study min-width fails T4").not.toEqual([]);
    const shadow = GOOD_CSS.replace("text-transform: none;", "text-shadow: 0 0 4px #fff;");
    expect(checkWordRules(shadow).failures, "a word shadow fails T4").not.toEqual([]);
    const underlineAll = GOOD_CSS.replace(
      "[data-word] { min-height: 48px; text-transform: none; }",
      "[data-word] { min-height: 48px; text-decoration: underline; }",
    );
    expect(checkWordRules(underlineAll).failures, "a decoration outside the marker fails T4").not.toEqual([]);
    const upper = GOOD_CSS.replace("text-transform: none;", "text-transform: uppercase;");
    expect(checkWordRules(upper).failures, "an upper-case word rule fails T4").not.toEqual([]);
    expect(checkNoUppercase(upper), "an upper-case rule fails T5").not.toEqual([]);
    expect(checkNoUppercase(GOOD_CSS), "the good copy has no upper-case rule").toEqual([]);

    const glow = fragment('<p data-sentence="0"><span class="sq-glow" data-word="0">Hi</span></p>');
    expect(decorationViolations(glow, "[data-sentence] *, [data-word]").violations, "sq-glow fails T1").not.toEqual([]);
    const ancestor = fragment(
      '<section><div class="sq-text-fancy"><p data-sentence="0"><span data-word="0">Hi</span></p></div></section>',
    );
    expect(
      decorationViolations(ancestor, "[data-word]").violations,
      "an sq-text ancestor fails T1",
    ).not.toEqual([]);
    const plain = fragment('<p data-sentence="0"><span data-word="0">Hi</span></p>');
    expect(decorationViolations(plain, "[data-word]").violations, "a plain word passes T1").toEqual([]);

    const withImage = fragment('<ol><li><span>Line</span><img src="x.jpg" alt=""></li></ol>');
    expect(lyricListViolations(withImage.querySelector("ol")!), "an img in the list fails T2").toEqual(["img"]);
    const withBackground = fragment('<ol><li style="background-image:url(x.jpg)">Line</li></ol>');
    expect(lyricListViolations(withBackground.querySelector("ol")!), "a background fails T2").not.toEqual([]);
  });
});
