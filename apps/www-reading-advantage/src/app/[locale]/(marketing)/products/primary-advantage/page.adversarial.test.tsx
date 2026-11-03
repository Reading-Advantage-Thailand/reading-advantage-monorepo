import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import PrimaryAdvantage, {
  generateMetadata,
} from "@/app/[locale]/(marketing)/products/primary-advantage/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import {
  APPROVED_DATE_SENTENCE,
  DEMO,
  IMAGES,
  PAGE_CONTAINER_IDS,
} from "@/__tests__/fixtures/primary-page-expected";

/*
 * Adversarial guards for the Primary Advantage page (track www_primary_page_revamp_20261030).
 * The content tests of the Red phase check each brief string and a list of forbidden terms.
 * These guards attack the gaps of those scanners. They use stricter scanners and closed-world checks.
 * Each scanner has a `control:` test. The control injects a defect and expects a finding.
 * A scanner without a passing control proves nothing (anti-pattern A4).
 */

const hoisted = vi.hoisted(() => {
  const state: { messages: unknown; read: Set<string> } = {
    messages: {},
    read: new Set<string>(),
  };

  function lookup(path: string): unknown {
    let value: unknown = state.messages;
    for (const segment of path.split(".")) {
      if (
        value === null ||
        typeof value !== "object" ||
        !(segment in (value as object))
      ) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[segment];
    }
    return value;
  }

  function makeTranslator(scope: string) {
    const prefix = `${scope}.`;
    return (key: string): string => {
      state.read.add(`${prefix}${key}`);
      const value = lookup(`${prefix}${key}`);
      return typeof value === "string" ? value : `[[missing:${prefix}${key}]]`;
    };
  }

  return { state, makeTranslator };
});

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve(hoisted.makeTranslator(""))),
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve(hoisted.makeTranslator(scope)),
  ),
  getStaticParams: vi.fn(() => []),
}));

type Locale = "en" | "th" | "zh";
const LOCALES: readonly Locale[] = ["en", "th", "zh"];
const MESSAGES: Record<Locale, unknown> = {
  en: enMessages,
  th: thMessages,
  zh: zhMessages,
};
const SCOPE = "pages.products.primaryAdvantage";
const IMAGE_DIR = "/images/primary-advantage/";
const IMAGE_FOLDER = resolve(process.cwd(), "public/images/primary-advantage");

/** The only image files the page may load outside the demo container. */
const ALLOWED_IMAGE_PATHS = IMAGES.map((image) => `${IMAGE_DIR}${image.name}.webp`);
/** The poster of the games demo (spec section 7a). It may load inside pa-demo only. */
const DEMO_POSTER = "/experience/stories/mias-balloon-animals/img-1.webp";

/** Tags that load a file or a frame. Only img may load an image. */
const LOADING_TAGS = "picture, source, video, audio, object, embed, iframe, image, canvas, link";

/** Attributes that hold a URL, a size, or a class. The text scanner skips them. */
const NON_TEXT_ATTRIBUTES = new Set([
  "class",
  "style",
  "src",
  "srcset",
  "href",
  "sizes",
  "width",
  "height",
  "loading",
  "decoding",
  "data-testid",
  "data-nimg",
]);

/** Attributes of an svg element that hold geometry. Other svg attributes stay in the text scan. */
const SVG_GEOMETRY = new Set([
  "xmlns",
  "viewBox",
  "d",
  "points",
  "transform",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
]);

/**
 * Reads the Primary Advantage scope of a message object.
 * @param messages The message object of a locale.
 * @returns The scope that the page reads.
 */
function scopeOf(messages: unknown): Record<string, unknown> {
  let value: unknown = messages;
  for (const segment of SCOPE.split(".")) {
    value = (value as Record<string, unknown>)[segment];
  }
  return value as Record<string, unknown>;
}

/**
 * Lists every string leaf of a nested object with its dotted path.
 * @param value The nested object.
 * @param prefix The dotted path so far.
 * @returns A pair of path and text for each string leaf.
 */
function leaves(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

/** English months, full and short. "May" is checked apart, because "may" is also a verb. */
const EN_MONTHS =
  "January|February|March|April|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const TH_MONTHS =
  "มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม";
const TH_MONTHS_SHORT = "ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.";

/**
 * Terms that the page must not show. The list is wider than the Red scanner.
 * It adds Buddhist years, Thai digits, short and upper-case months, more currency forms,
 * unit prices, percent signs, more free and discount words, and AI vendor names.
 * It does NOT flag the bare words "trial", "pricing", "ทดลอง", or "ดูราคา".
 * The exact approved date sentences and the exact approved demo hints are exempt.
 * The bare word "best" in any other sentence stays flagged.
 */
const STRICT_TERMS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "year", re: /(?<!\d)(?:19|20|21)\d{2}(?!\d)/ },
  { name: "Buddhist year", re: /(?<!\d)25\d{2}(?!\d)/ },
  { name: "Thai digit", re: /[๐-๙]/ },
  { name: "English month", re: new RegExp(`\\b(?:${EN_MONTHS})\\b`, "i") },
  { name: "May as a month", re: /\bMay\b|\bMAY\b/ },
  { name: "Thai month", re: new RegExp(TH_MONTHS) },
  { name: "Thai short month", re: new RegExp(TH_MONTHS_SHORT) },
  { name: "Buddhist era mark", re: /พ\.ศ\./ },
  { name: "currency sign", re: /[$€£¥₹₩฿]/ },
  { name: "currency word", re: /\b(?:usd|eur|gbp|cny|rmb|thb|baht|yuan|euros?|dollars?)\b/i },
  { name: "บาท", re: /บาท/ },
  { name: "unit price", re: /\bper\s+(?:student|learner|pupil|month|year|term|semester|seat|book|class)\b|\/\s*(?:month|year|term|student)\b|ต่อ\s*(?:คน|เดือน|ปี|เทอม|ภาคเรียน|เล่ม|ห้อง)/i },
  { name: "percent", re: /%|\bpercent\b|เปอร์เซ็นต์|เปอร์เซนต์/i },
  { name: "free term", re: /\bfree\b|\bgratis\b|\bcomplimentary\b|\bno (?:cost|charge|fee)\b|\bwithout (?:cost|charge)\b|ฟรี|ไม่มีค่าใช้จ่าย|ไม่เสียค่า|ทดลองใช้|免费|免費/i },
  { name: "discount term", re: /\b(?:discount|promo|promotion|coupon|voucher)s?\b|ส่วนลด|ลดราคา|โปรโมชั่น|โปรโมชัน|优惠|折扣/i },
  { name: "AI vendor", re: /\b(?:chatgpt|openai|gpt|gemini|claude|anthropic|llama|deepseek|qwen|mistral|copilot)\b/i },
  { name: "guarantee or superlative", re: /\bguarantee[sd]?\b|\bbest\b|#\s?1\b|\bnumber one\b/i },
];

/**
 * Finds the strict terms in a text. The two approved date sentences and the two approved demo hints are removed first.
 * @param text The text to scan.
 * @returns The names of the terms that the text holds.
 */
function findStrict(text: string): string[] {
  const scanned = text
    .split(APPROVED_DATE_SENTENCE.en)
    .join(" ")
    .split(APPROVED_DATE_SENTENCE.th)
    .join(" ")
    .split(DEMO.strings.hint.en)
    .join(" ")
    .split(DEMO.strings.hint.th)
    .join(" ");
  return STRICT_TERMS.filter(({ re }) => re.test(scanned)).map(({ name }) => name);
}

/**
 * Code point ranges that a reader cannot see but that change an exact match or a line break.
 * The set has control characters (not tab, line feed, or carriage return), NBSP, soft hyphen,
 * zero-width and joiner characters, bidi marks, wide and thin spaces, and the byte order mark.
 */
const INVISIBLE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x7f],
  [0xa0, 0xa0],
  [0xad, 0xad],
  [0x34f, 0x34f],
  [0x61c, 0x61c],
  [0x115f, 0x1160],
  [0x17b4, 0x17b5],
  [0x180e, 0x180e],
  [0x2000, 0x200f],
  [0x2028, 0x202f],
  [0x205f, 0x206f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
];

/**
 * Finds the first invisible character of a text.
 * @param text The text to scan.
 * @returns The code point of the first invisible character, or null.
 */
function findInvisible(text: string): number | null {
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (INVISIBLE_RANGES.some(([low, high]) => codePoint >= low && codePoint <= high)) {
      return codePoint;
    }
  }
  return null;
}

/**
 * Finds an invisible character, a tab, a line break, a double space, or an edge space.
 * @param text The text to scan.
 * @returns A description of the first problem, or an empty array.
 */
function findSpacingProblems(text: string): string[] {
  const problems: string[] = [];
  const invisible = findInvisible(text);
  if (invisible !== null) {
    problems.push(`invisible U+${invisible.toString(16).padStart(4, "0")}`);
  }
  if (/[\t\n\r]/.test(text)) problems.push("tab or line break");
  if (/ {2,}/.test(text)) problems.push("double space");
  if (text !== text.trim()) problems.push("edge space");
  return problems;
}

/**
 * Decodes percent escapes without a throw on a bad escape.
 * @param text The text to decode.
 * @returns The text with each valid escape decoded.
 */
function decodeLoose(text: string): string {
  return text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}

/** Old files of the page (decision F4 of the test strategy). */
const OLD_FILES = [
  "hero-primary-advantage.jpg",
  "primary-advantage-hero.jpg",
  "primary-advantage-classroom-teacher-and-students.png",
  "primary-advantage-student-workbook-mockup.png",
  "primary-advantage logo.png",
  "ra-marketing-primary-advantage",
  "choose-your-article.png",
  "language-selector-en-th-zh-vn.png",
  "read-article-and-chat-with-ai.png",
  "order-sentence-activity.png",
  "order-words-activity.png",
  "SRS-flashcard-activity.png",
];

/**
 * Collects the text of the page and the value of every attribute that can hold readable text.
 * @param root The element to read.
 * @returns A label and a value for each string.
 */
function readableStrings(root: HTMLElement): Array<[string, string]> {
  const strings: Array<[string, string]> = [["text", root.textContent ?? ""]];
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    const inSvg = element.closest("svg") !== null;
    for (const attribute of Array.from(element.attributes)) {
      if (NON_TEXT_ATTRIBUTES.has(attribute.name)) continue;
      // Icon geometry (xmlns, viewBox, path data) holds digits but no readable text.
      if (inSvg && SVG_GEOMETRY.has(attribute.name)) continue;
      strings.push([`${element.tagName.toLowerCase()}[${attribute.name}]`, attribute.value]);
    }
  }
  return strings;
}

/**
 * Finds every file reference of the page that is not one of the 16 allowed images.
 * It reads src, srcset, href, poster, data, style, and class of every element.
 * @param root The element to scan.
 * @returns One line for each reference outside the allowed set and each loading tag.
 */
function fileReferenceProblems(root: HTMLElement): string[] {
  const problems: string[] = [];
  const loading = root.querySelectorAll(LOADING_TAGS);
  if (loading.length > 0) {
    problems.push(`loading tags: ${Array.from(loading).map((el) => el.tagName.toLowerCase()).join(",")}`);
  }
  const fileRe = /\/[\w\-./%[\]() ]*?\.(?:png|jpe?g|webp|gif|svg|avif|ico|bmp|mp4|webm)\b/gi;
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    for (const attribute of Array.from(element.attributes)) {
      const decoded = decodeLoose(attribute.value);
      for (const match of decoded.matchAll(fileRe)) {
        const path = match[0].trim();
        const inDemo = element.closest('[data-testid="pa-demo"]') !== null;
        if (!ALLOWED_IMAGE_PATHS.includes(path) && !(inDemo && path === DEMO_POSTER)) {
          problems.push(`${element.tagName.toLowerCase()}[${attribute.name}] -> ${path}`);
        }
      }
      if (/ra-marketing-primary-advantage/.test(decoded)) {
        problems.push(`${element.tagName.toLowerCase()}[${attribute.name}] -> old SVG`);
      }
    }
  }
  return problems;
}

/**
 * Finds CSS text that a scanner of the DOM text cannot see: content in a class or in a style.
 * @param root The element to scan.
 * @returns One line for each class or style that can inject text.
 */
function cssTextProblems(root: HTMLElement): string[] {
  const problems: string[] = [];
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    const cls = element.getAttribute("class") ?? "";
    const style = element.getAttribute("style") ?? "";
    if (/content-\[|\[content:/.test(cls) || /\bcontent\s*:\s*['"]/.test(style)) {
      problems.push(`${element.tagName.toLowerCase()}: ${cls || style}`);
    }
  }
  return problems;
}

function container(testId: string): HTMLElement {
  const element = document.querySelector(`[data-testid="${testId}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing ${testId}`);
  return element;
}

/**
 * Finds text in a container that no message string of the locale explains.
 * The check reads the locale messages, so it also holds for the demo container of spec section 7a.
 * @param testId The container id.
 * @param messages The message object of the locale.
 * @returns A line with the extra text, or an empty array.
 */
function extraTextProblems(testId: string, messages: unknown): string[] {
  const known = leaves(scopeOf(messages))
    .map(([, value]) => value)
    .sort((a, b) => b.length - a.length);
  let left = container(testId).textContent ?? "";
  for (const text of known) left = left.split(text).join("");
  return left.trim() === "" ? [] : [`${testId}: extra text "${left.trim().slice(0, 80)}"`];
}

/**
 * Finds direct children of main that are not the ten containers, in order.
 * @returns A line with the ids found, or an empty array.
 */
function mainChildrenProblems(): string[] {
  const main = document.querySelector("main");
  if (!main) return ["no main element"];
  const found = Array.from(main.children).map((child) => child.getAttribute("data-testid") ?? "");
  const expected = [...PAGE_CONTAINER_IDS];
  return JSON.stringify(found) === JSON.stringify(expected)
    ? []
    : [`main children: ${found.join(" ")}`];
}

async function renderLocale(locale: Locale, messages: unknown = MESSAGES[locale]): Promise<void> {
  hoisted.state.messages = messages;
  hoisted.state.read = new Set<string>();
  render(await PrimaryAdvantage({ params: Promise.resolve({ locale }) }));
}

afterEach(() => {
  cleanup();
});

describe("control: the strict scanners find an injected defect", () => {
  it("control: the strict term scanner flags each injected term", async () => {
    const injected: Array<[string, string]> = [
      ["Free trial for all", "free term"],
      ["Starting 2026", "year"],
      ["ปีการศึกษา 2570", "Buddhist year"],
      ["เริ่ม ๒๐๒๗", "Thai digit"],
      ["Classes start in SEPTEMBER", "English month"],
      ["Classes start in Sept.", "English month"],
      ["Enrol before May", "May as a month"],
      ["เริ่มเดือน ก.ย. นี้", "Thai short month"],
      ["Only €5", "currency sign"],
      ["Price 5000 thb", "currency word"],
      ["500 per student", "unit price"],
      ["ต่อเดือน", "unit price"],
      ["Scores rise by 40%", "percent"],
      ["No cost for the first term", "free term"],
      ["ไม่มีค่าใช้จ่าย", "free term"],
      ["A promo for schools", "discount term"],
      ["Powered by ChatGPT", "AI vendor"],
      ["The best program", "guarantee or superlative"],
    ];
    expect(injected.length, "injected terms: 18").toBe(18);
    const misses = injected.filter(([text, name]) => !findStrict(text).includes(name));
    expect(misses).toEqual([]);
  });

  it("control: the strict term scanner passes the approved text", () => {
    const allowed = [
      APPROVED_DATE_SENTENCE.en,
      APPROVED_DATE_SENTENCE.th,
      "ทดลอง",
      "Preview",
      "See pricing",
      "ดูราคา",
      "Reedy with a trial label",
      "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 are in preparation.",
      DEMO.strings.hint.en,
      DEMO.strings.hint.th,
    ];
    const flagged = allowed.filter((text) => findStrict(text).length > 0);
    expect(flagged).toEqual([]);
  });

  it("control: the approved demo hint is exempt, but the word best stays flagged elsewhere", () => {
    expect(findStrict(DEMO.strings.hint.en)).toEqual([]);
    expect(findStrict("It works best for schools.")).toEqual(["guarantee or superlative"]);
    expect(findStrict("Works best on a computer.")).toEqual(["guarantee or superlative"]);
    expect(findStrict(`${DEMO.strings.hint.en} The best program.`)).toEqual([
      "guarantee or superlative",
    ]);
    expect(findStrict(`${DEMO.strings.hint.en} Free.`)).toEqual(["free term"]);
  });

  it("control: the approved sentence does not hide a second defect next to it", () => {
    expect(findStrict(`Free. ${APPROVED_DATE_SENTENCE.en}`)).toEqual(["free term"]);
    expect(findStrict(`${APPROVED_DATE_SENTENCE.th} ราคา ฿500`)).toEqual(["currency sign"]);
  });

  it("control: the spacing scanner flags NBSP, ZWSP, tab, double space, and edge space", () => {
    const cases = ["grades\u00a03", "ถึง\u200b", "a\tb", "a  b", " a", "a ", "a\u00adb", "a\ufeffb"];
    expect(cases.filter((text) => findSpacingProblems(text).length === 0)).toEqual([]);
    expect(findSpacingProblems("Primary Advantage: English reading")).toEqual([]);
  });

  it("control: an NBSP in a brief string fails the exact counter and the spacing scanner", async () => {
    const messages = structuredClone(enMessages) as unknown as Record<string, unknown>;
    const scope = scopeOf(messages) as { hero: { headline: string } };
    const original = scope.hero.headline;
    scope.hero.headline = original.replace("grades 3", "grades\u00a03");
    expect(scope.hero.headline).not.toBe(original);
    await renderLocale("en", messages);
    const hero = container("pa-hero");
    const exact = within(hero).queryAllByText(original, { exact: true, normalizer: (v) => v });
    const lenient = within(hero).queryAllByText(original, { exact: true });
    expect(exact.length, "identity normalizer sees the NBSP").toBe(0);
    expect(lenient.length, "default normalizer hides the NBSP").toBe(1);
    expect(readableStrings(document.body).flatMap(([, v]) => findSpacingProblems(v))).toEqual([
      "invisible U+00a0",
    ]);
  });

  it("control: the closed-world guards flag an extra element", async () => {
    await renderLocale("en");
    expect(mainChildrenProblems()).toEqual([]);
    expect(extraTextProblems("pa-section-3", MESSAGES.en)).toEqual([]);

    const extraInMain = document.createElement("p");
    extraInMain.textContent = "Trusted by 500 schools.";
    document.querySelector("main")?.appendChild(extraInMain);
    expect(mainChildrenProblems().length, "extra child of main").toBe(1);
    extraInMain.remove();

    const extraInSection = document.createElement("p");
    extraInSection.textContent = "Trusted by 500 schools.";
    container("pa-section-3").appendChild(extraInSection);
    expect(extraTextProblems("pa-section-3", MESSAGES.en).length, "extra text in section 3").toBe(1);
  });

  it("control: the file reference guard flags an old, an unlisted, and a loading-tag reference", async () => {
    await renderLocale("en");
    expect(fileReferenceProblems(document.body)).toEqual([]);
    const hero = container("pa-hero");

    hero.setAttribute("style", "background-image: url(/images/hero-primary-advantage.jpg)");
    expect(fileReferenceProblems(document.body).length, "old file in style").toBe(1);

    hero.setAttribute("style", "background-image: url(/images/teacher-at-board.png)");
    expect(fileReferenceProblems(document.body).length, "unlisted file in style").toBe(1);

    hero.removeAttribute("style");
    hero.setAttribute("class", "bg-[url('/images/primary-advantage-hero.jpg')]");
    expect(fileReferenceProblems(document.body).length, "old file in class").toBe(1);

    hero.removeAttribute("class");
    hero.setAttribute("aria-label", "/images/reading-advantage/choose-your-article.png");
    expect(fileReferenceProblems(document.body).length, "old file in aria-label").toBe(1);

    hero.removeAttribute("aria-label");
    const picture = document.createElement("picture");
    picture.innerHTML = '<source srcset="/images/primary-advantage/cefr-book-series.webp">';
    hero.appendChild(picture);
    expect(fileReferenceProblems(document.body).length, "picture and source tags").toBe(1);
  });

  it("control: the demo poster is allowed inside pa-demo only", async () => {
    await renderLocale("en");
    const hero = container("pa-hero");
    const poster = document.createElement("img");
    poster.setAttribute("src", DEMO_POSTER);
    poster.setAttribute("alt", "poster");
    hero.appendChild(poster);
    expect(fileReferenceProblems(document.body).length, "poster in the hero").toBe(1);
    poster.remove();

    const demo = document.createElement("div");
    demo.setAttribute("data-testid", "pa-demo");
    demo.appendChild(poster);
    document.body.appendChild(demo);
    expect(fileReferenceProblems(document.body), "poster inside pa-demo").toEqual([]);
    const iframe = document.createElement("iframe");
    demo.appendChild(iframe);
    expect(fileReferenceProblems(document.body).length, "iframe before the tap").toBe(1);
    demo.remove();
  });

  it("control: the text attribute guard sees aria-description, placeholder, and data attributes", async () => {
    await renderLocale("en");
    const hero = container("pa-hero");
    const attributes = ["aria-description", "placeholder", "data-note", "aria-roledescription"];
    for (const name of attributes) {
      hero.setAttribute(name, "Free trial for schools");
      const found = readableStrings(document.body).flatMap(([, value]) => findStrict(value));
      expect(found, `attribute ${name}`).toEqual(["free term"]);
      hero.removeAttribute(name);
    }
  });

  it("control: the CSS text guard flags content in a class and in a style", async () => {
    await renderLocale("en");
    expect(cssTextProblems(document.body)).toEqual([]);
    const hero = container("pa-hero");
    hero.setAttribute("class", "before:content-['Free_trial']");
    expect(cssTextProblems(document.body).length, "content in class").toBe(1);
    hero.setAttribute("class", "x");
    hero.setAttribute("style", "content: 'Free trial'");
    expect(cssTextProblems(document.body).length, "content in style").toBe(1);
  });
});

describe.each(LOCALES)("adversarial guards on the page in %s", (locale) => {
  it("holds only the brief strings in each container (closed world)", async () => {
    await renderLocale(locale);
    expect(PAGE_CONTAINER_IDS.length, "containers: 11").toBe(11);
    expect(
      PAGE_CONTAINER_IDS.flatMap((testId) => extraTextProblems(testId, MESSAGES[locale])),
    ).toEqual([]);
    expect(mainChildrenProblems()).toEqual([]);
  });

  it("holds only the demo strings of the fixture in pa-demo (closed world)", async () => {
    await renderLocale(locale);
    const copy = locale === "th" ? "th" : "en";
    let left = container(DEMO.testId).textContent ?? "";
    for (const entry of Object.values(DEMO.strings)) left = left.split(entry[copy]).join("");
    expect(left.trim(), "text of pa-demo that is not a demo string").toBe("");
    expect(container(DEMO.testId).querySelector("iframe"), "iframe before the tap").toBeNull();
  });

  it("loads no file except the 16 images, and no tag except img loads one", async () => {
    await renderLocale(locale);
    expect(ALLOWED_IMAGE_PATHS.length, "images: 16").toBe(16);
    expect(fileReferenceProblems(document.body)).toEqual([]);
    expect(cssTextProblems(document.body)).toEqual([]);
  });

  it("passes the strict term scan in text and in every text attribute", async () => {
    await renderLocale(locale);
    const strings = readableStrings(document.body);
    expect(strings.length, "strings: more than 17 (text plus 16 alt)").toBeGreaterThan(17);
    const found = strings
      .map(([label, value]) => ({ label, terms: findStrict(value) }))
      .filter(({ terms }) => terms.length > 0);
    expect(found).toEqual([]);
  });

  it("has no invisible character, tab, double space, or edge space in text or attributes", async () => {
    await renderLocale(locale);
    const found = readableStrings(document.body)
      .map(([label, value]) => ({ label, problems: findSpacingProblems(value) }))
      // The text of the page joins the nodes without a space. Edge spaces matter for attributes only.
      .filter(({ label, problems }) =>
        label === "text" ? problems.some((p) => p.startsWith("invisible")) : problems.length > 0,
      );
    expect(found).toEqual([]);
  });

  it("returns clean metadata, including the Open Graph and Twitter copies", async () => {
    hoisted.state.messages = MESSAGES[locale];
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    const strings = [
      metadata.title,
      metadata.description,
      metadata.openGraph?.title,
      metadata.openGraph?.description,
      metadata.twitter?.title,
      metadata.twitter?.description,
    ].map((value) => (typeof value === "string" ? value : ""));
    expect(strings.filter((value) => value === ""), "six metadata strings").toEqual([]);
    expect(strings.flatMap((value) => [...findStrict(value), ...findSpacingProblems(value)])).toEqual([]);
    const images = JSON.stringify([metadata.openGraph?.images, metadata.twitter?.images]);
    expect(OLD_FILES.filter((file) => images.includes(file))).toEqual([]);
  });
});

describe.each(LOCALES)("locale message scope in %s", (locale) => {
  it("holds only the strings that the page and the metadata read (no dead copy)", async () => {
    await renderLocale(locale);
    hoisted.state.messages = MESSAGES[locale];
    await generateMetadata({ params: Promise.resolve({ locale }) });
    const read = Array.from(hoisted.state.read)
      .map((key) => key.slice(SCOPE.length + 1))
      .sort();
    const held = leaves(scopeOf(MESSAGES[locale]))
      .map(([path]) => path)
      .sort();
    expect(read.length, "keys read: 43 or more").toBeGreaterThanOrEqual(43);
    expect(held).toEqual(read);
  });

  it("holds only string values, clean of strict terms and of spacing problems", () => {
    const entries = leaves(scopeOf(MESSAGES[locale]));
    expect(entries.length, "string leaves: 43 or more").toBeGreaterThanOrEqual(43);
    const found = entries
      .map(([path, value]) => ({
        path,
        problems: [...findStrict(value), ...findSpacingProblems(value)],
      }))
      .filter(({ problems }) => problems.length > 0);
    expect(found).toEqual([]);
  });

  it("has the same keys as the English scope", () => {
    const keys = (messages: unknown) =>
      leaves(scopeOf(messages))
        .map(([path]) => path)
        .sort();
    expect(keys(MESSAGES[locale])).toEqual(keys(MESSAGES.en));
  });
});

describe("page image files", () => {
  it("carry no EXIF, XMP, or color profile chunk (only VP8L and VP8X)", () => {
    const files = readdirSync(IMAGE_FOLDER).filter((name) => name.endsWith(".webp"));
    expect(files.length, "files: 16").toBe(16);
    const problems: string[] = [];
    for (const name of files) {
      const bytes = readFileSync(join(IMAGE_FOLDER, name));
      const chunks: string[] = [];
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        chunks.push(bytes.toString("ascii", offset, offset + 4));
        const size = bytes.readUInt32LE(offset + 4);
        offset += 8 + size + (size % 2);
      }
      const extra = chunks.filter((chunk) => chunk !== "VP8L" && chunk !== "VP8X");
      if (extra.length > 0) problems.push(`${name}: ${extra.join(",")}`);
    }
    expect(problems).toEqual([]);
  });

  it("control: the chunk reader would see an EXIF chunk", () => {
    const header = Buffer.from("RIFF\0\0\0\0WEBP", "ascii");
    const exif = Buffer.alloc(8 + 4);
    exif.write("EXIF", 0, "ascii");
    exif.writeUInt32LE(4, 4);
    const bytes = Buffer.concat([header, exif]);
    const chunks: string[] = [];
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      chunks.push(bytes.toString("ascii", offset, offset + 4));
      offset += 8 + bytes.readUInt32LE(offset + 4);
    }
    expect(chunks).toEqual(["EXIF"]);
  });
});
