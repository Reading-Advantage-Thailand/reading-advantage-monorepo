import { describe, expect, it } from "vitest";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { expectKeysInEveryLocale } from "@/__tests__/fixtures/locale-key-check";
/** The required locale keys of the feature page. The list is written here, not read from a locale file. */
const FEATURE_KEYS = [
  "pages.feature.metadata.title",
  "pages.feature.metadata.description",
  "pages.feature.hero.eyebrow",
  "pages.feature.hero.heading",
  "pages.feature.hero.body1",
  "pages.feature.hero.body2",
  "pages.feature.hero.button",
  "pages.feature.programs.heading",
  "pages.feature.programs.body",
  "pages.feature.programs.cards.storytime.name",
  "pages.feature.programs.cards.storytime.forText",
  "pages.feature.programs.cards.storytime.status",
  "pages.feature.programs.cards.storytime.body",
  "pages.feature.programs.cards.storytime.bullets.0",
  "pages.feature.programs.cards.storytime.bullets.1",
  "pages.feature.programs.cards.storytime.bullets.2",
  "pages.feature.programs.cards.primary.name",
  "pages.feature.programs.cards.primary.forText",
  "pages.feature.programs.cards.primary.status",
  "pages.feature.programs.cards.primary.body",
  "pages.feature.programs.cards.primary.bullets.0",
  "pages.feature.programs.cards.primary.bullets.1",
  "pages.feature.programs.cards.primary.bullets.2",
  "pages.feature.programs.cards.reading.name",
  "pages.feature.programs.cards.reading.forText",
  "pages.feature.programs.cards.reading.status",
  "pages.feature.programs.cards.codecamp.name",
  "pages.feature.programs.cards.codecamp.forText",
  "pages.feature.programs.cards.codecamp.status",
  "pages.feature.programs.cards.codecamp.body",
  "pages.feature.programs.cards.schoolSubjects.name",
  "pages.feature.programs.cards.schoolSubjects.forText",
  "pages.feature.programs.cards.schoolSubjects.status",
  "pages.feature.programs.cards.schoolSubjects.body",
  "pages.feature.engine.heading",
  "pages.feature.engine.body",
  "pages.feature.blended.heading",
  "pages.feature.blended.body1",
  "pages.feature.blended.body2",
  "pages.feature.tutor.heading",
  "pages.feature.tutor.body1",
  "pages.feature.tutor.body2",
  "pages.feature.tutor.body3",
  "pages.feature.tutor.button",
  "pages.feature.nextSubjects.heading",
  "pages.feature.nextSubjects.body",
  "pages.feature.appFamily.heading",
  "pages.feature.appFamily.body",
  "pages.feature.faq.heading",
  "pages.feature.faq.items.0.q",
  "pages.feature.faq.items.0.a",
  "pages.feature.faq.items.1.q",
  "pages.feature.faq.items.1.a",
  "pages.feature.faq.items.2.q",
  "pages.feature.faq.items.2.a",
  "pages.feature.nextStep.heading",
  "pages.feature.nextStep.body",
  "pages.feature.nextStep.button",
];

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

/** The required locale keys of the header main items. The list is written here, not read from a locale file. */
const HEADER_MAIN_KEYS = [
  "components.common.header.main.0.title",
  "components.common.header.main.0.href",
  "components.common.header.main.1.title",
  "components.common.header.main.1.href",
  "components.common.header.main.2.title",
  "components.common.header.main.2.href",
  "components.common.header.main.3.title",
  "components.common.header.main.3.href",
  "components.common.header.main.4.title",
  "components.common.header.main.4.href",
  "components.common.header.main.5.title",
  "components.common.header.main.5.href",
  "components.common.header.main.6.title",
  "components.common.header.main.6.href",
];

import {
  FEATURES_ENTRIES,
  PRICE_COLUMNS_EN,
  PRICE_COLUMNS_TH,
  PRICE_ROWS_EN,
  PRICE_ROWS_TH,
  PRICING_ENTRIES,
  REMOVED_STRINGS,
  ZH_MANAGED_SERVICE_DESCRIPTION,
} from "@/__tests__/fixtures/features-pricing-expected";

/*
 * Red test for the www features and pricing rewrite (track www_features_pricing_20261120).
 * It pins the new copy before Green writes it, so every copy assertion fails at Red
 * while the scope-guard cases already pass. Section keys are never read: the test
 * only scans leaf string values of `pages.feature` and `pages.pricing`.
 */

type Messages = Record<string, unknown>;

/** Collects every string leaf under a locale value. */
function collectLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectLeaves);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Messages).flatMap(collectLeaves);
  }
  return [];
}

/** Reads a nested locale scope without naming any Green-chosen section key. */
function scopeOf(messages: unknown, path: string[]): unknown {
  let value: unknown = messages;
  for (const segment of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Messages)[segment];
  }
  return value;
}

/** Finds the fixture strings that no leaf value holds. */
function missingStrings(leaves: string[], wanted: string[]): string[] {
  return wanted.filter((text) => !leaves.includes(text));
}

const thFeatureLeaves = collectLeaves(scopeOf(thMessages, ["pages", "feature"]));
const enPricingLeaves = collectLeaves(scopeOf(enMessages, ["pages", "pricing"]));
const thPricingLeaves = collectLeaves(scopeOf(thMessages, ["pages", "pricing"]));
const thManagedLeaves = collectLeaves(
  scopeOf(thMessages, ["pages", "managedService", "roadmap", "description"]),
);

const zhFeatureScope = scopeOf(zhMessages, ["pages", "feature"]);
const enFeatureScope = scopeOf(enMessages, ["pages", "feature"]);
const zhPricingScope = scopeOf(zhMessages, ["pages", "pricing"]);
const enPricingScope = scopeOf(enMessages, ["pages", "pricing"]);

function allLeaves(messages: unknown): string[] {
  return collectLeaves(messages);
}

describe("control: fixture and scanner", () => {
  it("control: the fixture holds 51 features entries and 37 pricing entries", () => {
    expect(FEATURES_ENTRIES.length, "features entries: 51").toBe(51);
    expect(PRICING_ENTRIES.length, "pricing entries: 37").toBe(37);
    expect(PRICE_ROWS_EN.length, "price rows: 4").toBe(4);
    expect(PRICE_COLUMNS_EN.length, "price columns: 3").toBe(3);
  });

  it("control: the removed-string scanner flags an injected sample", () => {
    const sample = "Compare Raz-Kids and Lexia, Copy reviewed 2026, 1,000 baht, App-Only";
    const hits = REMOVED_STRINGS.filter((term) => sample.includes(term));
    expect(hits.length, "injected sample hits: more than 0").toBeGreaterThan(0);
    expect(hits).toContain("Raz-Kids");
  });
});

describe("new features copy in the locale files (FR-1, FR-6)", () => {
  it("holds the features and meta keys in every shipped locale", () => {
    expectKeysInEveryLocale(FEATURE_KEYS);
  });
});

describe("new pricing copy in the locale files (FR-8, FR-12)", () => {
  it("holds the pricing and meta keys in every shipped locale", () => {
    expectKeysInEveryLocale(PRICING_KEYS);
  });

  it("holds the managed-service roadmap description key in every locale", () => {
    expectKeysInEveryLocale([
      "pages.managedService.roadmap.description",
    ]);
  });
});

describe("Thai values follow the check page (D5, FR-1, FR-8)", () => {
  it("ends no Thai leaf of feature, pricing or roadmap.description with a period", () => {
    const dotted = [...thFeatureLeaves, ...thPricingLeaves, ...thManagedLeaves].filter(
      (text) => text.endsWith("."),
    );
    expect(dotted, "Thai leaves ending with a period").toEqual([]);
  });
});

describe("price figures on the pricing page (FR-9, FR-10)", () => {
  it("shows the four price-table rows in en and th", () => {
    const enCells = PRICE_ROWS_EN.flat();
    const thCells = PRICE_ROWS_TH.flat();
    expect(missingStrings(enPricingLeaves, enCells), "missing EN row cells").toEqual(
      [],
    );
    expect(missingStrings(thPricingLeaves, thCells), "missing TH row cells").toEqual(
      [],
    );
  });

  it("shows the table columns, the 3,000 baht floor and the 22–23 hour line", () => {
    expect(
      missingStrings(enPricingLeaves, [...PRICE_COLUMNS_EN, "3,000 baht"]),
      "missing EN figures",
    ).toEqual([]);
    expect(
      missingStrings(thPricingLeaves, [...PRICE_COLUMNS_TH, "3,000 บาท"]),
      "missing TH figures",
    ).toEqual([]);
    expect(
      enPricingLeaves.filter((text) => text.includes("22–23")).length,
      "EN 22–23 lines: at least 1",
    ).toBeGreaterThan(0);
    expect(
      thPricingLeaves.filter((text) => text.includes("22–23")).length,
      "TH 22–23 lines: at least 1",
    ).toBeGreaterThan(0);
  });
});

describe("zh pages show the English copy and the new numbers (FR-14)", () => {
  it("equals the English objects for feature and pricing", () => {
    expect(zhFeatureScope).toEqual(enFeatureScope);
    expect(zhPricingScope).toEqual(enPricingScope);
  });

  it("holds none of the removed strings in zh feature or pricing", () => {
    const zhLeaves = [
      ...collectLeaves(zhFeatureScope),
      ...collectLeaves(zhPricingScope),
    ];
    const hits = REMOVED_STRINGS.filter((term) =>
      zhLeaves.some((leaf) => leaf.includes(term)),
    );
    expect(hits, "removed strings in zh").toEqual([]);
  });
});

describe("no removed claim stays in src/locales/ (FR-16)", () => {
  it.each([
    ["en", allLeaves(enMessages)],
    ["th", allLeaves(thMessages)],
    ["zh", allLeaves(zhMessages)],
  ] as const)("%s holds no removed string", (_locale, leaves) => {
    const hits = REMOVED_STRINGS.filter((term) =>
      leaves.some((leaf) => leaf.includes(term)),
    );
    expect(hits, "removed strings found").toEqual([]);
  });
});

describe("removed namespaces are gone (D3)", () => {
  it.each(["en", "th", "zh"] as const)("has no comparisonTable or pricingTable in %s", (locale) => {
    const messages =
      locale === "en" ? enMessages : locale === "th" ? thMessages : zhMessages;
    const components = scopeOf(messages, ["components"]) as Messages;
    expect(Object.keys(components ?? {}).filter((key) => key === "comparisonTable")).toEqual(
      [],
    );
    expect(Object.keys(components ?? {}).filter((key) => key === "pricingTable")).toEqual(
      [],
    );
  });
});

describe("scope guards: values that stay unchanged (AC-8)", () => {
  it("keeps the zh managed-service roadmap.description word for word", () => {
    const zhManaged = scopeOf(zhMessages, [
      "pages",
      "managedService",
      "roadmap",
      "description",
    ]);
    expect(zhManaged).toBe(ZH_MANAGED_SERVICE_DESCRIPTION);
  });

  it("holds the header label keys in every shipped locale", () => {
    expectKeysInEveryLocale(HEADER_MAIN_KEYS);
  });
});
