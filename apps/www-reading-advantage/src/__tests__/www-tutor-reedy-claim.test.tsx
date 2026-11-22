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
import {
  expectKeysInEveryLocale,
  keysUnderScope,
} from "@/__tests__/fixtures/locale-key-check";

type Dict = Record<string, unknown>;

const LOCALES = ["en", "th", "zh"] as const;
type Locale = (typeof LOCALES)[number];

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
});

describe("AC-24: the FAQ answer drops the not-available clause", () => {
  it("holds the FAQ item keys in every shipped locale", () => {
    expectKeysInEveryLocale(keysUnderScope("pages.products.tutorAdvantage.faq.items"));
  });
});

describe("AC-24: the Reedy block keeps three bullets", () => {
  it("holds the Reedy bullet keys in every shipped locale", () => {
    expectKeysInEveryLocale(keysUnderScope("pages.products.tutorAdvantage.reedyBlock.points"));
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
  }
});
