import { describe, expect, it } from "vitest";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import {
  expectKeysInEveryLocale,
  keysUnderScope,
} from "@/__tests__/fixtures/locale-key-check";
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
    expectKeysInEveryLocale(keysUnderScope("pages.feature"));
  });
});

describe("new pricing copy in the locale files (FR-8, FR-12)", () => {
  it("holds the pricing and meta keys in every shipped locale", () => {
    expectKeysInEveryLocale(keysUnderScope("pages.pricing"));
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
    expectKeysInEveryLocale(keysUnderScope("components.common.header.main"));
  });
});
