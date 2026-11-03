import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import PrimaryAdvantage, {
  generateMetadata,
} from "@/app/[locale]/(marketing)/products/primary-advantage/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import {
  APPROVED_DATE_SENTENCE,
  CONTAINERS,
  GAME_NAMES,
  IMAGES,
  IMAGE_SECTION_COUNTS,
  META,
  type ExpectedContainer,
  type PageLocale,
} from "@/test/fixtures/primary-page-expected";

/*
 * Content tests for the Primary Advantage page (track www_primary_page_revamp_20261030).
 * They render the real page with the REAL message objects for en, th, and zh.
 * The zh page shows the English copy, so zh reads the English column of the fixture.
 */

const hoisted = vi.hoisted(() => {
  const state: { messages: unknown } = { messages: {} };

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
    const prefix = scope ? `${scope}.` : "";
    const translate = (key: string): string => {
      const value = lookup(`${prefix}${key}`);
      return typeof value === "string" ? value : `[[missing:${prefix}${key}]]`;
    };
    translate.raw = (key: string): unknown => lookup(`${prefix}${key}`);
    return translate;
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

/** The zh page shows the English copy of the new strings. */
function copyLocale(locale: Locale): PageLocale {
  return locale === "th" ? "th" : "en";
}

const ALLOWED_HREFS = ["/pricing", "/contact", "/products/tutor-advantage"];
const IMAGE_DIR = "/images/primary-advantage/";

/** Paths and names of the old page (decision F4 of the test strategy). */
const OLD_REFERENCES = [
  "/images/hero-primary-advantage.jpg",
  "/images/primary-advantage-hero.jpg",
  "/images/primary-advantage-classroom-teacher-and-students.png",
  "/images/primary-advantage-student-workbook-mockup.png",
  "/primary-advantage logo.png",
  "ra-marketing-primary-advantage",
  "/images/reading-advantage/choose-your-article.png",
  "/images/reading-advantage/language-selector-en-th-zh-vn.png",
  "/images/reading-advantage/read-article-and-chat-with-ai.png",
  "/images/reading-advantage/order-sentence-activity.png",
  "/images/reading-advantage/order-words-activity.png",
  "/images/reading-advantage/SRS-flashcard-activity.png",
] as const;

/** Keys of the old page that decision F5 removes from the three locale files. */
const OLD_KEYS = [
  "keyFeatures",
  "platformFeatures",
  "aiTechnology",
  "resultsSection",
  "adaptiveEngine",
  "experience",
  "cefrLevels",
  "eyebrows",
  "support",
  "cefrSection",
] as const;

/** Names the brief keeps off the page. */
const FORBIDDEN_NAMES = [
  "Castle Defense",
  "Paladin",
  "Archer's Revenge",
  "Magic Defense",
  "Mastery Advantage",
  "Class Quest",
] as const;

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** Terms the page must not show. Only the exact approved date sentence is exempt. */
const FORBIDDEN_TERMS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "year", re: /20\d\d/ },
  { name: "English month", re: new RegExp(`\\b(?:${MONTHS_EN.join("|")})\\b`) },
  { name: "Thai month", re: new RegExp(MONTHS_TH.join("|")) },
  { name: "baht sign", re: /฿/ },
  { name: "THB", re: /THB/ },
  { name: "baht", re: /baht/i },
  { name: "บาท", re: /บาท/ },
  { name: "dollar sign", re: /\$/ },
  { name: "USD", re: /USD/ },
  { name: "free", re: /\bfree\b/i },
  { name: "discount", re: /discount/i },
  { name: "ส่วนลด", re: /ส่วนลด/ },
  { name: "ฟรี", re: /ฟรี/ },
  { name: "ทดลองใช้", re: /ทดลองใช้/ },
];

/**
 * Finds the forbidden terms in a text, after the two approved date sentences are removed.
 * @param text The text to scan.
 * @returns The names of the forbidden terms that the text holds.
 */
function findForbiddenTerms(text: string): string[] {
  const scanned = text
    .split(APPROVED_DATE_SENTENCE.en)
    .join("")
    .split(APPROVED_DATE_SENTENCE.th)
    .join("");
  return FORBIDDEN_TERMS.filter(({ re }) => re.test(scanned)).map(
    ({ name }) => name,
  );
}

/**
 * Decodes percent escapes without throwing on a malformed escape.
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

/**
 * Finds the references of the old page in a piece of HTML, raw or percent-encoded.
 * @param html The HTML to scan.
 * @returns The old references that the HTML holds.
 */
function findOldReferences(html: string): string[] {
  const decoded = decodeLoose(html);
  return OLD_REFERENCES.filter(
    (reference) => html.includes(reference) || decoded.includes(reference),
  );
}

/**
 * Reads the file path of an image from its src, decoding a /_next/image URL.
 * @param src The src attribute of the image.
 * @returns The public file path of the image.
 */
function imagePath(src: string): string {
  if (src.startsWith("/_next/image")) {
    return new URL(src, "http://localhost").searchParams.get("url") ?? "";
  }
  return src;
}

/**
 * Counts the elements of a root whose own text equals a string. No whitespace is normalized.
 * @param root The root element.
 * @param text The exact text.
 * @returns The number of elements with that own text.
 */
function countExactText(root: HTMLElement, text: string): number {
  return within(root).queryAllByText(text, {
    exact: true,
    normalizer: (value) => value,
  }).length;
}

function getContainer(testId: string): HTMLElement {
  const element = document.querySelector(`[data-testid="${testId}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing container data-testid="${testId}"`);
  }
  return element;
}

/** Fails with a clear message when one of the ten containers is missing. */
function expectContainers(): void {
  const missing = CONTAINERS.filter(
    ({ testId }) =>
      document.querySelectorAll(`[data-testid="${testId}"]`).length !== 1,
  ).map(({ testId }) => testId);
  expect(missing, "containers missing or repeated (containers: 10)").toEqual(
    [],
  );
}

/** Text, alt text, aria-label, and title attributes of the rendered page. */
function pageStrings(): string[] {
  const strings = [document.body.textContent ?? ""];
  for (const attribute of ["alt", "aria-label", "title"]) {
    document.querySelectorAll(`[${attribute}]`).forEach((element) => {
      strings.push(element.getAttribute(attribute) ?? "");
    });
  }
  return strings;
}

function sectionOf(container: ExpectedContainer): number | null {
  const match = /^pa-section-(\d)$/.exec(container.testId);
  return match ? Number(match[1]) : null;
}

async function renderLocale(locale: Locale): Promise<void> {
  hoisted.state.messages = MESSAGES[locale];
  const element = await PrimaryAdvantage({
    params: Promise.resolve({ locale }),
  });
  render(element);
}

afterEach(() => {
  cleanup();
});

describe("control: scanners and fixture", () => {
  it("control: the fixture holds 10 containers, 16 images, and the section counts", () => {
    expect(CONTAINERS, "containers: 10").toHaveLength(10);
    expect(IMAGES, "images: 16").toHaveLength(16);
    const counts = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (section) => IMAGES.filter((image) => image.section === section).length,
    );
    expect(counts).toEqual([...IMAGE_SECTION_COUNTS]);
    const links = CONTAINERS.flatMap((container) => container.links);
    expect(links, "links: 8").toHaveLength(8);
  });

  it("control: the forbidden-term scanner flags each injected term", () => {
    const injected = [
      "Free trial",
      "Starting 2026",
      "5,000 บาท",
      "ทดลองใช้ฟรี",
      "USD 5",
      "A 10% discount",
      "ราคา ฿500",
      "Start in March",
    ];
    for (const text of injected) {
      expect(findForbiddenTerms(text), `injected: ${text}`).not.toEqual([]);
    }
  });

  it("control: the scanner passes the approved date sentence and the Thai badge", () => {
    const section3 = CONTAINERS.find(({ testId }) => testId === "pa-section-3");
    const bodies = (section3?.texts ?? []).filter(
      ({ kind }) => kind === "body",
    );
    expect(bodies, "section 3 bodies: 1").toHaveLength(1);
    expect(findForbiddenTerms(bodies[0].en)).toEqual([]);
    expect(findForbiddenTerms(bodies[0].th)).toEqual([]);
    expect(findForbiddenTerms(APPROVED_DATE_SENTENCE.en)).toEqual([]);
    expect(findForbiddenTerms(APPROVED_DATE_SENTENCE.th)).toEqual([]);
    expect(findForbiddenTerms("ทดลอง")).toEqual([]);
    expect(
      findForbiddenTerms("Reedy with a trial label"),
      "the English trial label of the alt text is allowed",
    ).toEqual([]);
  });

  it("control: the scanner flags a second date next to the approved sentence", () => {
    expect(
      findForbiddenTerms(`${APPROVED_DATE_SENTENCE.en} Starting 2026.`),
    ).toEqual(["year"]);
  });

  it("control: the fixture strings pass the forbidden-term scanner", () => {
    const strings = [
      ...CONTAINERS.flatMap((container) =>
        container.texts.flatMap(({ en, th }) => [en, th]),
      ),
      ...CONTAINERS.flatMap((container) =>
        container.links.flatMap(({ en, th }) => [en, th]),
      ),
      ...IMAGES.flatMap(({ altEn, altTh }) => [altEn, altTh]),
      META.title.en,
      META.title.th,
      META.description.en,
      META.description.th,
    ];
    expect(strings.length, "fixture strings: more than 60").toBeGreaterThan(60);
    const flagged = strings.filter((text) => findForbiddenTerms(text).length);
    expect(flagged).toEqual([]);
  });

  it("control: the image path decoder reads /_next/image URLs and plain paths", () => {
    expect(
      imagePath(
        "/_next/image?url=%2Fimages%2Fprimary-advantage%2Fcontact-channels.webp&w=1200&q=75",
      ),
    ).toBe("/images/primary-advantage/contact-channels.webp");
    expect(imagePath("/images/primary-advantage/cefr-book-series.webp")).toBe(
      "/images/primary-advantage/cefr-book-series.webp",
    );
  });

  it("control: the old-reference scanner flags raw and encoded references", () => {
    expect(
      findOldReferences(
        '<img src="/_next/image?url=%2Fimages%2Freading-advantage%2Fchoose-your-article.png&w=640">',
      ),
    ).toEqual(["/images/reading-advantage/choose-your-article.png"]);
    expect(
      findOldReferences('<img src="/primary-advantage%20logo.png">'),
    ).toEqual(["/primary-advantage logo.png"]);
    expect(
      findOldReferences(
        '<div style="background-image:url(/images/hero-primary-advantage.jpg)">',
      ),
    ).toEqual(["/images/hero-primary-advantage.jpg"]);
    expect(
      findOldReferences('<img src="/images/ra-marketing-primary-advantage-en.svg">'),
    ).toEqual(["ra-marketing-primary-advantage"]);
    expect(
      findOldReferences(
        '<img src="/_next/image?url=%2Fimages%2Fprimary-advantage%2Fcefr-book-series.webp&w=640">',
      ),
    ).toEqual([]);
  });

  it("control: the exact-text counter does not normalize a non-breaking space", () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>one book</p><p>one book</p>";
    document.body.appendChild(root);
    try {
      expect(countExactText(root, "one book")).toBe(1);
      expect(countExactText(root, "one book")).toBe(1);
      expect(countExactText(root, "one  book")).toBe(0);
    } finally {
      root.remove();
    }
  });
});

describe("locale files", () => {
  it.each(LOCALES)("%s drops the old keys of the page (decision F5)", (locale) => {
    const scope = (
      MESSAGES[locale] as {
        pages: { products: { primaryAdvantage: Record<string, unknown> } };
      }
    ).pages.products.primaryAdvantage;
    const present = OLD_KEYS.filter((key) => key in scope);
    const buttons = (scope.cta as { buttons?: Record<string, unknown> } | undefined)
      ?.buttons;
    const oldButtons = ["freeTrial", "signUp"].filter(
      (key) => buttons !== undefined && key in buttons,
    );
    expect({ present, oldButtons }).toEqual({ present: [], oldButtons: [] });
  });

  it.each(LOCALES)("%s has the meta title and description", (locale) => {
    const scope = (
      MESSAGES[locale] as {
        pages: { products: { primaryAdvantage: { meta?: Record<string, unknown> } } };
      }
    ).pages.products.primaryAdvantage;
    const copy = copyLocale(locale);
    expect({
      title: scope.meta?.title,
      description: scope.meta?.description,
    }).toEqual({
      title: META.title[copy],
      description: META.description[copy],
    });
  });
});

describe("generateMetadata", () => {
  it.each(LOCALES)("%s returns the title and description of the brief", async (locale) => {
    hoisted.state.messages = MESSAGES[locale];
    const copy = copyLocale(locale);
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect({ title: metadata.title, description: metadata.description }).toEqual({
      title: META.title[copy],
      description: META.description[copy],
    });
  });
});

describe.each(LOCALES)("PrimaryAdvantage content in %s", (locale) => {
  const copy = copyLocale(locale);

  beforeEach(async () => {
    await renderLocale(locale);
  });

  it("renders all 10 containers and no missing message key", () => {
    expectContainers();
    const missing = Array.from(
      document.body.innerHTML.matchAll(/\[\[missing:([^\]]+)\]\]/g),
    ).map((match) => match[1]);
    expect(missing, "message keys the page reads but the locale lacks").toEqual(
      [],
    );
  });

  it.each(CONTAINERS.map((container) => [container.testId, container] as const))(
    "%s shows each brief string word for word, once",
    (_testId, container) => {
      const root = getContainer(container.testId);
      expect(container.texts.length, "texts of the container").toBeGreaterThan(0);
      const problems = container.texts
        .map(({ kind, ...strings }) => ({
          kind,
          text: strings[copy],
          count: countExactText(root, strings[copy]),
        }))
        .filter(({ count }) => count !== 1)
        .map(({ kind, text, count }) => `${kind} (${count} matches): ${text}`);
      expect(problems).toEqual([]);
    },
  );

  it.each(CONTAINERS.map((container) => [container.testId, container] as const))(
    "%s has exactly its links, with the brief label",
    (_testId, container) => {
      const root = getContainer(container.testId);
      const found = Array.from(root.querySelectorAll("a"))
        .map((anchor) => `${anchor.getAttribute("href")} | ${anchor.textContent?.trim()}`)
        .sort();
      const expected = container.links
        .map((link) => `${link.href} | ${link[copy]}`)
        .sort();
      expect(found).toEqual(expected);
    },
  );

  it("has no link outside the containers and no other href (links: 8)", () => {
    expectContainers();
    const anchors = Array.from(document.querySelectorAll("a"));
    const hrefs = anchors.map((anchor) => anchor.getAttribute("href") ?? "");
    expect(hrefs.length, "links: 8").toBe(8);
    expect(hrefs.filter((href) => !ALLOWED_HREFS.includes(href))).toEqual([]);
    expect(hrefs.filter((href) => /^(mailto:|https?:)/.test(href))).toEqual([]);
  });

  it.each(CONTAINERS.map((container) => [container.testId, container] as const))(
    "%s shows its images with the alt text of the list",
    (_testId, container) => {
      const root = getContainer(container.testId);
      const section = sectionOf(container);
      const expected = IMAGES.filter((image) => image.section === section).map(
        (image) => ({
          path: `${IMAGE_DIR}${image.name}.webp`,
          alt: copy === "th" ? image.altTh : image.altEn,
        }),
      );
      const found = Array.from(root.querySelectorAll("img")).map((image) => ({
        path: imagePath(image.getAttribute("src") ?? ""),
        alt: image.getAttribute("alt") ?? "",
      }));
      expect(found).toEqual(expected);
    },
  );

  it("shows 16 images in total, all from the primary-advantage folder (images: 16)", () => {
    expectContainers();
    const paths = Array.from(document.querySelectorAll("img")).map((image) =>
      imagePath(image.getAttribute("src") ?? ""),
    );
    expect(paths.length, "images: 16").toBe(16);
    expect(paths.filter((path) => !path.startsWith(IMAGE_DIR))).toEqual([]);
  });

  it("references no image and no name of the old page", () => {
    expectContainers();
    expect(findOldReferences(document.body.innerHTML)).toEqual([]);
  });

  it("shows no price, no date except the approved line, and no free term", () => {
    expectContainers();
    expect(findForbiddenTerms(pageStrings().join("\n"))).toEqual([]);
  });

  it("names no Forge-rebuild game and no other product of the brief rules", () => {
    expectContainers();
    const text = pageStrings().join("\n");
    expect(FORBIDDEN_NAMES.filter((name) => text.includes(name))).toEqual([]);
  });

  it("keeps the four game names in English in section 5", () => {
    expectContainers();
    const section = getContainer("pa-section-5");
    const text = section.textContent ?? "";
    expect(GAME_NAMES.filter((name) => !text.includes(name))).toEqual([]);
  });

  it("shows no script other than its own copy language", () => {
    expectContainers();
    const text = pageStrings().join("\n");
    const found: string[] = [];
    if (/\p{Script=Han}/u.test(text)) found.push("Han");
    if (locale !== "th" && /\p{Script=Thai}/u.test(text)) found.push("Thai");
    expect(found).toEqual([]);
  });
});
