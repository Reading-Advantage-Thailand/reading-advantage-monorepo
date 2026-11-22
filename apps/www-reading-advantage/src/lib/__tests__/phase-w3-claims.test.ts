/**
 * Wave 3 Phase 1 — truthful product claims for www-reading-advantage.
 *
 * Each group checks a claim rule against the real shipped locale message data
 * and the pure claim helper. The shipped dictionaries are the public surface a
 * visitor sees; no TypeScript or TSX source text is read. A negative assertion
 * and a positive control pair each rule so a deletion-only fix fails.
 */
import { describe, expect, it } from "vitest";
import * as home from "@/locales/pages/home";
import * as mastery from "@/locales/pages/mastery-advantage";
import * as caseStudies from "@/locales/pages/case-studies";
import * as managedService from "@/locales/pages/managed-service";
import * as math from "@/locales/pages/products/math-advantage";
import * as primary from "@/locales/pages/products/primary-advantage";
import * as reading from "@/locales/pages/products/reading-advantage";
import * as science from "@/locales/pages/products/science-advantage";
import * as codecamp from "@/locales/pages/products/codecamp-advantage";
import * as stem from "@/locales/pages/products/stem-advantage";
import * as storytime from "@/locales/pages/products/storytime-advantage";
import * as tutor from "@/locales/pages/products/tutor-advantage";
import * as zhongwen from "@/locales/pages/products/zhongwen-advantage";
import { createProductClaimHelper } from "@/testing/product-claim-helper";

type Dict = Record<string, unknown>;

/** Collects every string leaf of a nested dictionary. */
function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value !== null && typeof value !== "object") return [];
  return Object.values(value as Dict).flatMap(stringLeaves);
}

/** Collects string leaves from every locale export of a dictionary module. */
function allLocales(module: Dict): string[] {
  return Object.values(module).flatMap((locale) => stringLeaves(locale));
}

/** Collects the string leaves of one locale of a dictionary module. */
function oneLocale(module: Dict, locale = "en"): string[] {
  return stringLeaves(module[locale]);
}

const PRODUCT_MODULES: Dict[] = [
  math,
  primary,
  reading,
  science,
  codecamp,
  stem,
  storytime,
  tutor,
  zhongwen,
];
const ALL_PRODUCT_LEAVES = PRODUCT_MODULES.flatMap(allLocales);
const HOME_LEAVES = allLocales(home as unknown as Dict);
const MASTERY_LEAVES = allLocales(mastery as unknown as Dict);
const CASE_LEAVES = allLocales(caseStudies as unknown as Dict);
const MANAGED_LEAVES = allLocales(managedService as unknown as Dict);

/** Joins leaves with separators so per-line regular expressions stay scoped. */
function lines(values: string[]): string {
  return values.join("\n");
}

/** Counts matches of a pattern across a list of shipped strings. */
function countMatches(values: string[], pattern: RegExp): number {
  return lines(values).split("\n").filter((line) => pattern.test(line)).length;
}

// 1A — Product count
describe("1A — Product count", () => {
  it("has no 'nine products' / 'all 9 products' / 'one engine, nine' claim", () => {
    const banned = /nine products|all 9 products|one engine, nine/gi;
    expect(countMatches([...HOME_LEAVES, ...MASTERY_LEAVES], banned)).toBe(0);
  });

  it("positive control: a truthful count string is present", () => {
    const truthful =
      /four products|4 products|one engine, four|live in CodeCamp Advantage/gi;
    expect(truthful.test(lines([...HOME_LEAVES, ...MASTERY_LEAVES]))).toBe(true);
  });
});

// 1B — Stale launch dates
describe("1B — Stale launch dates", () => {
  it("has no stale launch dates on product locale pages", () => {
    const helper = createProductClaimHelper({ now: new Date("2026-07-04") });
    const stale = /coming|launching|new for|เปิดตัว|推出|coming soon|launch|roadmap|planned/gi;
    const explicit = /(coming|launching|new for)\s+.*\b2025\b|starting\s+may\s+2026|coming\s+in\s+2026/gi;
    const violations = ALL_PRODUCT_LEAVES.filter(
      (text) =>
        explicit.test(text) ||
        (helper.classify({ text, page: "products" }).includes("stale-launch-date") &&
          stale.test(text)),
    );
    expect(violations, `Stale launch copy:\n${violations.join("\n")}`).toEqual([]);
  });

  it("has no stale launch dates in product metadata copy", () => {
    const stale = /(coming|launching|new for)\s+.*\b202[56]\b|starting\s+may\s+2026|coming\s+in\s+2026/gi;
    const metadataLeaves = PRODUCT_MODULES.flatMap((module) => {
      const en = (module as Dict).en as Dict;
      return stringLeaves(en.hero).concat(stringLeaves(en.cta));
    });
    const violations = metadataLeaves.filter((text) => stale.test(text));
    expect(
      violations,
      `Stale launch copy in metadata fields:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("positive control: product locale data still ships copy", () => {
    expect(ALL_PRODUCT_LEAVES.length).toBeGreaterThan(0);
  });
});

// 1C — Nonexistent-app pages
describe("1C — Nonexistent-app pages", () => {
  it("nonexistent-app pages are roadmap-labeled without a concrete launch date", () => {
    const stale = /(coming|launching|new for)\s+.*\b202[56]\b|starting\s+may\s+2026|coming\s+in\s+2026/gi;
    const roadmap = /\b(roadmap|planned|on our roadmap|coming soon)\b/gi;
    for (const module of [math, stem, zhongwen]) {
      const leaves = allLocales(module as unknown as Dict);
      expect(roadmap.test(lines(leaves)), "roadmap label present").toBe(true);
      expect(stale.test(lines(leaves)), "no concrete stale date").toBe(false);
      roadmap.lastIndex = 0;
      stale.lastIndex = 0;
    }
  });

  it("positive control: default keeps the pages (not delete)", () => {
    for (const module of [math, stem, zhongwen]) {
      expect(Object.keys(module).length).toBeGreaterThan(0);
    }
  });
});

// 1D — AI model claims
describe("1D — AI model claims", () => {
  it("has no 'GPT-5' / 'GPT-4' / 'Google Gemini & GPT-5' specific-model claims", () => {
    const banned = /GPT-5|GPT-4|Google Gemini & GPT-5/gi;
    expect(
      countMatches([...ALL_PRODUCT_LEAVES, ...HOME_LEAVES], banned),
    ).toBe(0);
  });

  it("positive control: provider-neutral AI copy is present", () => {
    const neutral =
      /AI-powered writing feedback|AI-assisted learning|AI-powered feedback|model adapter/gi;
    expect(
      neutral.test(lines([...oneLocale(primary as unknown as Dict), ...HOME_LEAVES])),
    ).toBe(true);
  });
});

// 1E — Placeholder case studies
describe("1E — Placeholder case studies", () => {
  it("case-studies locale has no placeholder-as-real tokens", () => {
    const banned =
      /School A \(Coming Soon\)|School B \(Coming Soon\)|Real Results from Real Schools/gi;
    expect(countMatches(CASE_LEAVES, banned)).toBe(0);
  });

  it("helper audit reports zero placeholder case studies", () => {
    const helper = createProductClaimHelper();
    const claims = oneLocale(caseStudies as unknown as Dict).map((text) => ({
      text,
      page: "case-studies",
    }));
    expect(helper.audit(claims).placeholderCaseStudyCount).toBe(0);
  });

  it("positive control: case-studies page keeps illustrative framing", () => {
    const illustrative = /illustrative examples|illustrative scenarios|examples from schools/gi;
    expect(illustrative.test(lines(CASE_LEAVES))).toBe(true);
  });
});

// 1F — Duplicated efficacy stats
describe("1F — Duplicated efficacy stats", () => {
  it("primary advantage does not copy reading advantage's specific efficacy claim", () => {
    const primaryStats = oneLocale(primary as unknown as Dict).join(" || ");
    const copied = /\+9\.5\s*pts?|reading score gain.*aka|aka.*2019/i.test(primaryStats);
    expect(copied).toBe(false);
  });

  it("positive control: at least one product page still presents results stats", () => {
    const readingData = (reading as unknown as Dict).en as Dict;
    const results = readingData.resultsSection as Dict;
    expect(Array.isArray(results.stats) && results.stats.length > 0).toBe(true);
  });
});

// 1G — Unverifiable stats and absolute claims
describe("1G — Unverifiable stats and absolute claims", () => {
  it("has no uncited/unverifiable efficacy stats or absolute claims in shipped copy", () => {
    const wholeSourceBans = [
      /2,172\+/g,
      /ZERO RISK/gi,
      /Aka +2019/gi,
    ];
    for (const pattern of wholeSourceBans) {
      expect(
        countMatches([...ALL_PRODUCT_LEAVES, ...HOME_LEAVES, ...MASTERY_LEAVES, ...MANAGED_LEAVES], pattern),
        `${pattern} must be absent`,
      ).toBe(0);
    }
  });

  it("positive control: managed-service copy keeps a non-absolute risk qualifier", () => {
    expect(/ZERO RISK/g.test(lines(MANAGED_LEAVES))).toBe(false);
    expect(/low.risk|risk|onboarding/gi.test(lines(MANAGED_LEAVES))).toBe(true);
  });
});

// 1H — Partner/school consent
describe("1H — Partner/school consent", () => {
  it("every published case study has consent and anonymization proof", () => {
    const helper = createProductClaimHelper();
    const claims = oneLocale(caseStudies as unknown as Dict).map((text) => ({
      text,
      page: "case-studies",
    }));
    expect(helper.audit(claims).missingConsentCount).toBe(0);
  });

  it("positive control: case-studies page still harvests at least one claim", () => {
    const helper = createProductClaimHelper();
    const claims = oneLocale(caseStudies as unknown as Dict).map((text) => ({
      text,
      page: "case-studies",
    }));
    expect(helper.audit(claims).claimCount).toBeGreaterThanOrEqual(1);
  });
});
