/**
 * AC-24 (Phase 3, task 3.6c): no locale string says that Reedy is not in Primary
 * Advantage. The PM page check of 2026-11-18 (finding PM-1) found the claim false,
 * because Reedy Preview is live in Primary Advantage since the 2026-10-20 cutover.
 * The cases walk every string value of both imported locale modules and render the
 * Reedy block with the real dictionaries. No case reads production source as text
 * and no case computes a hash.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getScopedI18n } from "@/locales/server";
import * as pageCopy from "@/locales/pages/products/tutor-advantage";
import * as componentCopy from "@/locales/components/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";
import { expectKeysInEveryLocale } from "@/__tests__/fixtures/locale-key-check";

/** The required locale keys of the FAQ items. The list is written here, not read from a locale file. */
const FAQ_ITEM_KEYS = [
  "pages.products.tutorAdvantage.faq.items.0.question",
  "pages.products.tutorAdvantage.faq.items.0.answer",
  "pages.products.tutorAdvantage.faq.items.1.question",
  "pages.products.tutorAdvantage.faq.items.1.answer",
  "pages.products.tutorAdvantage.faq.items.2.question",
  "pages.products.tutorAdvantage.faq.items.2.answer",
  "pages.products.tutorAdvantage.faq.items.3.question",
  "pages.products.tutorAdvantage.faq.items.3.answer",
  "pages.products.tutorAdvantage.faq.items.4.question",
  "pages.products.tutorAdvantage.faq.items.4.answer",
  "pages.products.tutorAdvantage.faq.items.5.question",
  "pages.products.tutorAdvantage.faq.items.5.answer",
];

/** The required locale keys of the Reedy block points. The list is written here, not read from a locale file. */
const REEDY_POINT_KEYS = [
  "pages.products.tutorAdvantage.reedyBlock.points.0",
  "pages.products.tutorAdvantage.reedyBlock.points.1",
  "pages.products.tutorAdvantage.reedyBlock.points.2",
];

type Dict = Record<string, unknown>;

const LOCALES = ["en", "th", "zh"] as const;
type Locale = (typeof LOCALES)[number];

/** The two AC-24 eligibility limits that the Reedy copy must keep. */
type EligibilityFact = "activePackage" | "finishedLesson";

/**
 * The words that carry each AC-24 eligibility limit in each locale.
 * The check reads the facts, not the whole sentence.
 */
const ELIGIBILITY: Record<
  Locale,
  { readonly activePackage: readonly string[]; readonly finishedLesson: readonly string[] }
> = {
  en: {
    activePackage: ["active", "package"],
    finishedLesson: ["lessons", "finished"],
  },
  th: {
    activePackage: ["แพ็กเกจ", "ใช้งานอยู่"],
    finishedLesson: ["บทเรียน", "เรียนจบแล้ว"],
  },
  zh: {
    activePackage: ["有效", "课程包"],
    finishedLesson: ["课程", "已完成"],
  },
};

/**
 * Words that reverse an eligibility clause. A sentence that carries one of
 * these does not state the AC-24 fact, even when it repeats the marker words.
 */
const NEGATION_PATTERNS: Record<Locale, readonly RegExp[]> = {
  en: [/\bwithout\b/i, /\bunfinished\b/i, /\bnot\b/i, /\bnever\b/i, /\bno\b/i, /\beveryone\b/i, /\banyone\b/i],
  th: [/ไม่/, /ทุกคน/],
  zh: [/未/, /不/, /没有/, /所有/, /任何/],
};

/**
 * The word that carries the active-package limit in each locale.
 * The check needs the word itself, not a part of another word.
 */
const ACTIVE_WORD: Record<Locale, RegExp> = {
  en: /\bactive\b/i,
  th: /ใช้งานอยู่/,
  zh: /有效/,
};

/**
 * The words that reverse the active-package limit in each locale.
 * A text with one of them does not state the limit.
 */
const INACTIVE_PATTERNS: Record<Locale, readonly RegExp[]> = {
  en: [/\binactive\b/i],
  th: [/ไม่ใช้งาน/],
  zh: [/无效/, /非有效/],
};

const PAGES: Record<Locale, Dict> = {
  en: pageCopy.en as unknown as Dict,
  th: pageCopy.th as unknown as Dict,
  zh: pageCopy.zh as unknown as Dict,
};

const COMPONENTS: Record<Locale, Dict> = {
  en: componentCopy.en as unknown as Dict,
  th: componentCopy.th as unknown as Dict,
  zh: componentCopy.zh as unknown as Dict,
};

/** Every forbidden claim of D-21, one pattern per shape of the false claim. */
const FORBIDDEN = [
  /Tutor Advantage only/i,
  /not in Primary Advantage/i,
  /Tutor Advantage เท่านั้น/,
  /ไม่มีใน Primary Advantage/,
  /仅在\s*Tutor Advantage/,
  /Primary Advantage 和 Reading Advantage 中没有/,
  /not available in Primary Advantage/i,
  /Reedy is not available/i,
] as const;

/**
 * Collects every string value of a dictionary, with its dotted path.
 * @param value The node to walk.
 * @param path The dotted path of the node.
 * @param out The list of string leaves.
 * @returns The list of string leaves with their paths.
 */
function leaves(value: unknown, path = "", out: Array<{ path: string; text: string }> = []) {
  if (typeof value === "string") {
    out.push({ path: path || "(root)", text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => leaves(item, path ? `${path}.${index}` : String(index), out));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Dict)) {
      leaves(child, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

/**
 * Returns the forbidden matches of one dictionary, one line per match.
 * @param dict The dictionary to scan.
 * @returns The matching path and text, or an empty list.
 */
function forbiddenHits(dict: unknown): string[] {
  const hits: string[] = [];
  for (const leaf of leaves(dict)) {
    for (const pattern of FORBIDDEN) {
      if (pattern.test(leaf.text)) hits.push(`${leaf.path}: ${leaf.text}`);
    }
  }
  return hits;
}

/**
 * Reads one non-empty string from a dictionary and fails on a missing path.
 * @param dict The dictionary to read.
 * @param path The dotted key path.
 * @returns The string value at the path.
 */
function text(dict: Dict, path: string): string {
  let cur: unknown = dict;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") throw new Error(`missing ${path}`);
    cur = (cur as Dict)[part];
  }
  if (typeof cur !== "string") throw new Error(`not text: ${path}`);
  return cur;
}

/**
 * Lists the AC-24 eligibility rules that one text breaks.
 * @param value The text to check.
 * @param locale The locale of the text.
 * @param facts The eligibility limits to check.
 * @returns One line per broken rule.
 */
function eligibilityBreaks(
  value: string,
  locale: Locale,
  facts: readonly EligibilityFact[],
): string[] {
  const breaks: string[] = [];
  for (const pattern of NEGATION_PATTERNS[locale]) {
    if (pattern.test(value)) {
      breaks.push(`${locale}: the eligibility clause must not carry ${pattern}`);
    }
  }
  for (const pattern of INACTIVE_PATTERNS[locale]) {
    if (pattern.test(value)) {
      breaks.push(
        `${locale}: the eligibility clause must not name an inactive package (${pattern})`,
      );
    }
  }
  for (const fact of facts) {
    for (const marker of ELIGIBILITY[locale][fact]) {
      if (!value.includes(marker)) {
        breaks.push(`${locale}: ${fact} must carry "${marker}"`);
      }
    }
  }
  if (facts.includes("activePackage") && !ACTIVE_WORD[locale].test(value)) {
    breaks.push(`${locale}: activePackage must carry the active word`);
  }
  return breaks;
}

/**
 * Checks that a text carries each AC-24 eligibility limit of one locale.
 * @param value The text to check.
 * @param locale The locale of the text.
 * @param facts The eligibility limits to check.
 */
function expectEligibilityFacts(
  value: string,
  locale: Locale,
  facts: readonly EligibilityFact[],
): void {
  expect(
    eligibilityBreaks(value, locale, facts),
    `${locale}: the eligibility clause must hold`,
  ).toEqual([]);
}

/**
 * Finds the FAQ item whose question names Reedy.
 * @param dict The page dictionary of one locale.
 * @returns The FAQ item, or undefined when no question names Reedy.
 */
function reedyFaqAnswer(dict: Dict): string | undefined {
  const items = (dict.faq as Dict).items as Array<Dict>;
  const item = items.find((entry) => String(entry.question).includes("Reedy"));
  return item ? String(item.answer) : undefined;
}

/**
 * Renders the Tutor Advantage page with the real messages of one locale.
 * @param locale The locale to render.
 * @returns A promise that resolves after the render.
 */
async function renderWithRealCopy(locale: Locale): Promise<void> {
  const dict = PAGES[locale];
  vi.mocked(getScopedI18n).mockImplementation(() => {
    const translator = ((key: string) => {
      let cur: unknown = dict;
      for (const part of key.split(".")) {
        if (cur == null || typeof cur !== "object") return key;
        cur = (cur as Dict)[part];
      }
      return typeof cur === "string" ? cur : key;
    }) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale }) });
  render(jsx);
}

afterEach(() => {
  cleanup();
  vi.mocked(getScopedI18n).mockImplementation((scope) => {
    const translator = ((key: string) =>
      key.endsWith(".image")
        ? "/images/placeholder.png"
        : `${String(scope)}.${key}`) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
});

describe("AC-24: the scan detects every forbidden claim", () => {
  it("flags one probe per forbidden pattern", () => {
    const probes = [
      "Live in Tutor Advantage only.",
      "It is not in Primary Advantage or Reading Advantage.",
      "ใช้ได้ใน Tutor Advantage เท่านั้น",
      "ไม่มีใน Primary Advantage หรือ Reading Advantage",
      "仅在 Tutor Advantage 中提供。",
      "Primary Advantage 和 Reading Advantage 中没有。",
      "Reedy is not available in Primary Advantage or Reading Advantage.",
    ];
    const unmatched = FORBIDDEN.filter(
      (pattern) => !probes.some((probe) => pattern.test(probe)),
    );
    expect(unmatched).toEqual([]);
  });
});

describe("AC-24: the eligibility scan detects an inactive package", () => {
  it("rejects the inactive-package sentence in English", () => {
    const counterexample =
      "Open to students with an inactive class package, on lessons they finished.";

    expect(
      eligibilityBreaks(counterexample, "en", [
        "activePackage",
        "finishedLesson",
      ]),
    ).not.toEqual([]);
  });

  it("names the inactive rule for the probe of every locale", () => {
    const probes: Record<Locale, string> = {
      en: "Open to students with an inactive class package, on lessons they finished.",
      th: "เปิดให้นักเรียนที่มีแพ็กเกจคลาสที่ไม่ใช้งานอยู่ ในบทเรียนที่เรียนจบแล้ว",
      zh: "面向持有无效课程包的学生，用于已完成的课程。",
    };
    for (const locale of LOCALES) {
      const breaks = eligibilityBreaks(probes[locale], locale, [
        "activePackage",
        "finishedLesson",
      ]);
      expect(breaks, locale).not.toEqual([]);
      expect(
        breaks.some((line) => line.includes("inactive package")),
        locale,
      ).toBe(true);
    }
  });
});

describe("AC-24: no locale string says Reedy is not in Primary Advantage", () => {
  for (const locale of LOCALES) {
    it(`${locale}: the page dictionary holds no forbidden claim`, () => {
      expect(forbiddenHits(PAGES[locale])).toEqual([]);
    });
    it(`${locale}: the component dictionary holds no forbidden claim`, () => {
      expect(forbiddenHits(COMPONENTS[locale])).toEqual([]);
    });
  }
});

describe("AC-24: the new Reedy descriptions", () => {
  it("holds the Reedy description keys in every shipped locale", () => {
    expectKeysInEveryLocale([
      "pages.products.tutorAdvantage.platformFeatures.features.2.description",
      "components.products.tutorAdvantage.features.2.description",
    ]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: the page description keeps the active-package and finished-lesson limits`, () => {
      const description = text(
        PAGES[locale],
        "platformFeatures.features.2.description",
      );
      expectEligibilityFacts(description, locale, ["activePackage", "finishedLesson"]);
    });

    it(`${locale}: the component description keeps the finished-lesson limit`, () => {
      const description = text(
        COMPONENTS[locale],
        "features.2.description",
      );
      expectEligibilityFacts(description, locale, ["finishedLesson"]);
    });
  }
});

describe("AC-24: the FAQ answer drops the not-available clause", () => {
  it("holds the FAQ item keys in every shipped locale", () => {
    expectKeysInEveryLocale(FAQ_ITEM_KEYS);
  });

  for (const locale of LOCALES) {
    it(`${locale}: the FAQ answer keeps the active-package and finished-lesson limits`, () => {
      const answer = reedyFaqAnswer(PAGES[locale]);
      expect(answer, `the Reedy FAQ answer in ${locale}`).toBeDefined();
      expectEligibilityFacts(answer as string, locale, [
        "activePackage",
        "finishedLesson",
      ]);
    });
  }
});

describe("AC-24: the Reedy block keeps three bullets", () => {
  it("holds the Reedy bullet keys in every shipped locale", () => {
    expectKeysInEveryLocale(REEDY_POINT_KEYS);
  });

  for (const locale of LOCALES) {
    it(`${locale}: renders exactly the three remaining bullets`, async () => {
      await renderWithRealCopy(locale);
      const heading = screen.getByRole("heading", { name: text(PAGES[locale], "reedyBlock.heading") });
      const section = heading.closest("section");
      if (!(section instanceof HTMLElement)) throw new Error(`no section for ${locale}`);
      const list = section.querySelector("ul");
      if (!(list instanceof HTMLElement)) throw new Error(`no list for ${locale}`);
      const bullets = Array.from(list.querySelectorAll("li")).map((item) => item.textContent);
      expect(bullets, `bullets in ${locale}: 3`).toHaveLength(3);
    });

    it(`${locale}: the first rendered bullet keeps the active-package and finished-lesson limits`, async () => {
      await renderWithRealCopy(locale);
      const heading = screen.getByRole("heading", { name: text(PAGES[locale], "reedyBlock.heading") });
      const section = heading.closest("section");
      if (!(section instanceof HTMLElement)) throw new Error(`no section for ${locale}`);
      const list = section.querySelector("ul");
      if (!(list instanceof HTMLElement)) throw new Error(`no list for ${locale}`);
      const first = list.querySelector("li");
      expect(first, `the first bullet in ${locale}`).not.toBeNull();
      expectEligibilityFacts(first?.textContent ?? "", locale, [
        "activePackage",
        "finishedLesson",
      ]);
    });
  }
});
