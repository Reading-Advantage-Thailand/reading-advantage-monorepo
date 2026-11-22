/**
 * Wave 3 Phase 1 — truthful product claims for www-reading-advantage.
 *
 * Each group checks a claim rule against the real shipped locale message data
 * and the pure claim helper. The shipped dictionaries are the public surface a
 * visitor sees; no TypeScript or TSX source text is read. A negative assertion
 * and a positive control pair each rule so a deletion-only fix fails.
 */
import type { ReactElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import MathPage from "@/app/[locale]/(marketing)/products/math-advantage/page";
import PrimaryPage from "@/app/[locale]/(marketing)/products/primary-advantage/page";
import { generateMetadata as readingMetadata } from "@/app/[locale]/(marketing)/products/reading-advantage/page";
import { generateMetadata as primaryMetadata } from "@/app/[locale]/(marketing)/products/primary-advantage/page";
import { generateMetadata as scienceMetadata } from "@/app/[locale]/(marketing)/products/science-advantage/page";
import { generateMetadata as codecampMetadata } from "@/app/[locale]/(marketing)/products/codecamp-advantage/page";
import { generateMetadata as mathMetadata } from "@/app/[locale]/(marketing)/products/math-advantage/page";
import { generateMetadata as stemMetadata } from "@/app/[locale]/(marketing)/products/stem-advantage/page";
import { generateMetadata as storytimeMetadata } from "@/app/[locale]/(marketing)/products/storytime-advantage/page";
import { generateMetadata as tutorMetadata } from "@/app/[locale]/(marketing)/products/tutor-advantage/page";
import { generateMetadata as zhongwenMetadata } from "@/app/[locale]/(marketing)/products/zhongwen-advantage/page";
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

vi.mock("@/locales/server", async () => {
  const { default: en } = await vi.importActual<typeof import("@/locales/en")>(
    "@/locales/en",
  );
  const readPath = (root: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((value, part) => {
      if (value === null || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[part];
    }, root);
  return {
    getScopedI18n: vi.fn(async (scope: string) => {
      const translate = (key: string) => {
        const value = readPath(en, scope ? `${scope}.${key}` : key);
        return typeof value === "string" ? value : `${scope}.${key}`;
      };
      return translate;
    }),
  };
});

beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => cleanup());

/** Collects the visible text nodes of a rendered element. */
function renderedText(container: HTMLElement): string {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  let node = walker.nextNode();
  while (node) {
    parts.push(node.textContent ?? "");
    node = walker.nextNode();
  }
  return parts.join(" ");
}

type Dict = Record<string, unknown>;

/** The product route metadata generators, one per shipped product page. */
const PRODUCT_METADATA = {
  reading: readingMetadata,
  primary: primaryMetadata,
  science: scienceMetadata,
  codecamp: codecampMetadata,
  math: mathMetadata,
  stem: stemMetadata,
  storytime: storytimeMetadata,
  tutor: tutorMetadata,
  zhongwen: zhongwenMetadata,
};

/** Collects the human-readable string values of a generated metadata object. */
function metadataStrings(metadata: Record<string, unknown>): string[] {
  const values: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      values.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value !== null && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };
  visit(metadata);
  return values;
}

/** Reads the shipped copy of one generated product route metadata result. */
async function routeMetadataStrings(
  generate: (args: {
    params: Promise<{ locale: string }>;
  }) => Promise<unknown>,
): Promise<string[]> {
  const metadata = await generate({
    params: Promise.resolve({ locale: "en" }),
  });
  return metadataStrings(metadata as Record<string, unknown>);
}

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

  it("has no stale launch dates in generated product route metadata", async () => {
    const stale = /(coming|launching|new for)\s+.*\b202[56]\b|starting\s+may\s+2026|coming\s+in\s+2026/gi;
    const violations: string[] = [];
    for (const [route, generate] of Object.entries(PRODUCT_METADATA)) {
      for (const value of await routeMetadataStrings(generate)) {
        if (stale.test(value)) violations.push(`${route}: ${value}`);
      }
    }
    expect(
      violations,
      `Stale launch copy in route metadata:\n${violations.join("\n")}`,
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

  it("has no scoped unverifiable stats on the Math and Primary routes", async () => {
    const scopedBans = [
      { label: "95%", pattern: /95%/ },
      { label: "3×", pattern: /3×/ },
      { label: "24/7", pattern: /24\/7/ },
    ] as const;
    const surfaces = [
      {
        route: "math",
        values: [
          ...oneLocale(math as unknown as Dict),
          ...(await routeMetadataStrings(mathMetadata)),
        ],
      },
      {
        route: "primary",
        values: [
          ...oneLocale(primary as unknown as Dict),
          ...(await routeMetadataStrings(primaryMetadata)),
        ],
      },
    ];
    const violations = surfaces.flatMap(({ route, values }) =>
      scopedBans
        .filter(({ pattern }) => values.some((value) => pattern.test(value)))
        .map(({ label }) => `${route}: ${label}`),
    );
    expect(
      violations,
      `Scoped unverifiable claims on Math or Primary:\n${violations.join("\n")}`,
    ).toEqual([]);

    const renderedSurfaces = [
      {
        route: "math",
        element: (await MathPage({
          params: Promise.resolve({ locale: "en" }),
        })) as ReactElement,
      },
      {
        route: "primary",
        element: (await PrimaryPage({
          params: Promise.resolve({ locale: "en" }),
        })) as ReactElement,
      },
    ];
    for (const { route, element } of renderedSurfaces) {
      const view = render(element);
      const text = renderedText(view.container);
      expect(text.trim().length, `${route} renders visible copy`).toBeGreaterThan(0);
      const renderedViolations = scopedBans
        .filter(({ pattern }) => pattern.test(text))
        .map(({ label }) => `${route}: rendered ${label}`);
      cleanup();
      expect(
        renderedViolations,
        `Scoped unverifiable claims on the rendered Math or Primary page:\n${renderedViolations.join("\n")}`,
      ).toEqual([]);
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
