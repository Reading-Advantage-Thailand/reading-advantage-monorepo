import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PricingPage from "@/app/[locale]/(marketing)/pricing/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import {
  PRICE_COLUMNS_EN,
  PRICE_COLUMNS_TH,
  PRICE_ROWS_EN,
  PRICE_ROWS_TH,
} from "@/__tests__/fixtures/features-pricing-expected";
import { expectKeysInEveryLocale } from "@/__tests__/fixtures/locale-key-check";

/*
 * Red test for the new /pricing page (track www_features_pricing_20261120).
 * It renders the real route component with the real locale objects and asserts
 * the hooks of spec section 7. At Red every hook assertion fails because the
 * old page is still mounted; the control cases pass.
 */

const hoisted = vi.hoisted(() => {
  const state: { messages: unknown } = { messages: {} };

  function readPath(root: unknown, path: string): unknown {
    let value: unknown = root;
    for (const segment of path.split(".")) {
      if (value === null || typeof value !== "object") return undefined;
      if (!(segment in (value as Record<string, unknown>))) return undefined;
      value = (value as Record<string, unknown>)[segment];
    }
    return value;
  }

  function makeTranslator(scope: string) {
    const prefix = scope ? `${scope}.` : "";
    const translate = (key: string): string => {
      const value = readPath(state.messages, `${prefix}${key}`);
      return typeof value === "string" ? value : `[[missing:${prefix}${key}]]`;
    };
    translate.raw = (key: string): unknown =>
      readPath(state.messages, `${prefix}${key}`);
    return translate;
  }

  return { state, makeTranslator, readPath };
});

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve(hoisted.makeTranslator(""))),
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve(hoisted.makeTranslator(scope)),
  ),
  getStaticParams: vi.fn(() => []),
}));

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn(
    (scope: string) => (key: string) => {
      const value = hoisted.readPath(
        hoisted.state.messages,
        scope ? `${scope}.${key}` : key,
      );
      return typeof value === "string" ? value : `[[missing:${scope}.${key}]]`;
    },
  ),
}));

/** The required locale keys of the pricing page. The list is written here, not read from a locale file. */
const PRICING_KEYS = [
  "pages.pricing.metadata.title",
  "pages.pricing.metadata.description",
  "pages.pricing.hero.eyebrow",
  "pages.pricing.hero.heading",
  "pages.pricing.hero.body1",
  "pages.pricing.hero.body2",
  "pages.pricing.subjects.heading",
  "pages.pricing.subjects.body",
  "pages.pricing.subjects.columnsLabel",
  "pages.pricing.subjects.columns.0",
  "pages.pricing.subjects.columns.1",
  "pages.pricing.subjects.columns.2",
  "pages.pricing.subjects.rows.0.cells.0",
  "pages.pricing.subjects.rows.0.cells.1",
  "pages.pricing.subjects.rows.0.cells.2",
  "pages.pricing.subjects.rows.0.label",
  "pages.pricing.subjects.rows.1.cells.0",
  "pages.pricing.subjects.rows.1.cells.1",
  "pages.pricing.subjects.rows.1.cells.2",
  "pages.pricing.subjects.rows.1.label",
  "pages.pricing.subjects.rows.2.cells.0",
  "pages.pricing.subjects.rows.2.cells.1",
  "pages.pricing.subjects.rows.2.cells.2",
  "pages.pricing.subjects.rows.2.label",
  "pages.pricing.subjects.rows.3.cells.0",
  "pages.pricing.subjects.rows.3.cells.1",
  "pages.pricing.subjects.rows.3.cells.2",
  "pages.pricing.subjects.rows.3.label",
  "pages.pricing.subjects.note",
  "pages.pricing.example.heading",
  "pages.pricing.example.body1",
  "pages.pricing.example.body2",
  "pages.pricing.included.heading",
  "pages.pricing.included.bullets.0",
  "pages.pricing.included.bullets.1",
  "pages.pricing.included.bullets.2",
  "pages.pricing.books.heading",
  "pages.pricing.books.body",
  "pages.pricing.whichSubjects.heading",
  "pages.pricing.whichSubjects.body",
  "pages.pricing.family.heading",
  "pages.pricing.family.body",
  "pages.pricing.family.button",
  "pages.pricing.managed.body",
  "pages.pricing.faq.heading",
  "pages.pricing.faq.items.0.q",
  "pages.pricing.faq.items.0.a",
  "pages.pricing.faq.items.1.q",
  "pages.pricing.faq.items.1.a",
  "pages.pricing.faq.items.2.q",
  "pages.pricing.faq.items.2.a",
  "pages.pricing.nextStep.heading",
  "pages.pricing.nextStep.body",
  "pages.pricing.nextStep.button",
  "pages.pricing.priceFloor",
];

type Locale = "en" | "th" | "zh";
const LOCALES: readonly Locale[] = ["en", "th", "zh"];
const MESSAGES: Record<Locale, unknown> = {
  en: enMessages,
  th: thMessages,
  zh: zhMessages,
};

/** The zh page shows the English copy of the new strings (D4). */
function copyOf(locale: Locale): "en" | "th" {
  return locale === "th" ? "th" : "en";
}

/** Section-level hooks in the spec order (S1 to S10). */
const SECTION_ORDER = [
  "pricing-hero",
  "pricing-subjects",
  "pricing-example",
  "pricing-included",
  "pricing-books",
  "pricing-which-subjects",
  "pricing-family",
  "pricing-managed",
  "pricing-faq",
  "pricing-next-step",
] as const;

/** Tier names and stamps of the old matrix that go (spec section 6). */
const OLD_PRICING_TEXT = [
  "App-Only",
  "Blended Learning",
  "Managed Service",
  "1,000 baht",
  "1,500 baht",
  "Contact us for current pricing",
  "Clear Pricing",
  "Simple Setup",
  "Dedicated Support",
] as const;

function sectionHookOrder(): string[] {
  return Array.from(
    document.querySelectorAll("main section[data-testid]"),
  ).map((element) => element.getAttribute("data-testid") ?? "");
}

async function renderLocale(locale: Locale): Promise<void> {
  hoisted.state.messages = MESSAGES[locale];
  const element = await PricingPage();
  render(element);
}

afterEach(() => {
  cleanup();
});

describe("control: fixture and hooks", () => {
  it("control: the fixture lists 10 sections and 4 price rows", () => {
    expect(SECTION_ORDER.length, "sections: 10").toBe(10);
    expect(PRICE_ROWS_EN.length, "price rows: 4").toBe(4);
    expect(PRICE_COLUMNS_EN.length, "price columns: 3").toBe(3);
  });

  it("control: the price rows carry the FR-9 curve", () => {
    expect(PRICE_ROWS_EN[0]).toEqual(["1 subject", "1,200 baht", "1,200 baht"]);
    expect(PRICE_ROWS_EN[3]).toEqual(["4 subjects", "+250 baht", "2,450 baht"]);
  });
});

describe("generateMetadata", () => {
  it("holds the pricing metadata keys in every shipped locale", () => {
    expectKeysInEveryLocale([
      "pages.pricing.metadata.title",
      "pages.pricing.metadata.description",
    ]);
  });
});

describe.each(LOCALES)("PricingPage content in %s", (locale) => {
  const copy = copyOf(locale);

  beforeEach(async () => {
    await renderLocale(locale);
  });

  it("renders the ten sections in the spec order (FR-8)", () => {
    expect(sectionHookOrder(), "sections: 10 in order").toEqual([...SECTION_ORDER]);
  });

  it("renders the price table with a caption, three columns and four rows (FR-9, D10)", () => {
    const table = document.querySelector('[data-testid="subject-price-table"]');
    expect(table?.tagName, "price table is a table").toBe("TABLE");
    const caption = table?.querySelector("caption");
    expect(caption?.textContent?.trim().length ?? 0, "caption: non-empty").toBeGreaterThan(
      0,
    );
    const headCells = Array.from(table?.querySelectorAll("thead th") ?? []).map(
      (cell) => cell.textContent?.trim(),
    );
    const wantedColumns = copy === "th" ? PRICE_COLUMNS_TH : PRICE_COLUMNS_EN;
    expect(headCells).toEqual(wantedColumns);
    const rows = table?.querySelectorAll("tbody tr") ?? [];
    expect(rows.length, "price rows: 4").toBe(4);
    const wantedRows = copy === "th" ? PRICE_ROWS_TH : PRICE_ROWS_EN;
    const found = Array.from(rows).map((row) =>
      Array.from(row.querySelectorAll("th, td")).map(
        (cell) => cell.textContent?.trim(),
      ),
    );
    expect(found).toEqual(wantedRows);
    expect(
      table?.querySelectorAll('th[scope="col"]').length ?? 0,
      "column headers: 3",
    ).toBe(3);
    expect(
      table?.querySelectorAll('tbody th[scope="row"]').length ?? 0,
      "row headers: 4",
    ).toBe(4);
  });

  it("uses a custom hero as the first section of main (D11)", () => {
    const hero = document.querySelector("main > section:first-child");
    expect(hero?.getAttribute("data-testid"), "hero hook").toBe("pricing-hero");
    const headings = hero?.querySelectorAll("h1") ?? [];
    expect(headings.length, "hero h1: 1").toBe(1);
    expect(headings[0]?.className).toMatch(/text-slate-900/);
    const firstParagraph = hero?.querySelector("p");
    expect(firstParagraph?.className).toMatch(/text-slate-(700|800|900)/);
  });

  it("shows three FAQ items (FR-9 S9)", () => {
    const faq = document.querySelector('[data-testid="pricing-faq"]');
    expect(faq?.querySelectorAll("details").length, "FAQ items: 3").toBe(3);
  });

  it("points Tutor buttons to /products/tutor-advantage and every other button to /contact (FR-11, D6)", () => {
    const hrefs = Array.from(document.querySelectorAll("a")).map((anchor) =>
      anchor.getAttribute("href"),
    );
    expect(hrefs.length, "links: more than 0").toBeGreaterThan(0);
    expect(
      hrefs.filter(
        (href) => href !== "/contact" && href !== "/products/tutor-advantage",
      ),
      "links outside the two targets",
    ).toEqual([]);
    expect(hrefs).toContain("/products/tutor-advantage");
  });

  it("has exactly one h1 and no image without a non-empty alt (FR-17)", () => {
    expect(document.querySelectorAll("h1").length, "h1: 1").toBe(1);
    const missing = Array.from(document.querySelectorAll("img")).filter(
      (image) => (image.getAttribute("alt") ?? "").trim() === "",
    );
    expect(missing.length, "images without alt: 0").toBe(0);
  });

  it("shows the approved 1,800 amount in the example heading (FR-10)", () => {
    const section = document.querySelector('[data-testid="pricing-example"]');
    const heading = section?.querySelector("h2");
    const amount =
      copy === "th"
        ? /(^|[^\d,])1,800 บาท/
        : /(^|[^\d,])1,800 baht/;
    expect(heading?.textContent ?? "", `the example heading in ${locale}`).toMatch(
      amount,
    );
  });

  it("holds every pricing key and none of the old matrix copy (FR-8, FR-13)", () => {
    expectKeysInEveryLocale(PRICING_KEYS);
    const body = document.body.textContent ?? "";
    expect(
      OLD_PRICING_TEXT.filter((text) => body.includes(text)),
      "old pricing copy",
    ).toEqual([]);
  });

  it("shows no other baht amount than the FR-9 and FR-10 figures", () => {
    const body = document.body.textContent ?? "";
    for (const amount of ["1,000", "1,500"]) {
      expect(body.includes(amount), `old amount ${amount}`).toBe(false);
    }
    expect(body.includes("3,000"), "3,000 baht floor").toBe(true);
  });
});
