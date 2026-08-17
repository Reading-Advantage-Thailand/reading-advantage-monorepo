import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComparisonTable } from "@/components/features/comparison-table";
import { PricingTable } from "@/components/pricing/pricing-table";
import { en as enComparison } from "@/locales/components/comparison-table";
import { en as enPricing } from "@/locales/components/pricing-table";
import { en as enManagedService } from "@/locales/pages/managed-service";
import { en as enServices } from "@/locales/pages/services";
import { th as thComparison } from "@/locales/components/comparison-table";
import { th as thPricing } from "@/locales/components/pricing-table";
import { th as thManagedService } from "@/locales/pages/managed-service";
import { th as thServices } from "@/locales/pages/services";
import { zh as zhComparison } from "@/locales/components/comparison-table";
import { zh as zhPricing } from "@/locales/components/pricing-table";
import { zh as zhManagedService } from "@/locales/pages/managed-service";
import { zh as zhServices } from "@/locales/pages/services";

const clientWiring = vi.hoisted(() => ({ messages: null as unknown }));

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn(
    () => (key: string) => readPath(clientWiring.messages, key),
  ),
}));

const EN_CURRENT_PRICING = "Contact us for current pricing";
const CURRENT_PUBLIC_MONTH = (() => {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
})();
const CURRENCY_NUMBER_RE =
  /(?:(?:THB|USD|EUR|GBP|CNY)\s?[\d,.]+|[\d,.]+\s?(?:THB|USD|EUR|GBP|CNY)|(?:US\$|[$€£¥฿])\s?[\d,.]+)/i;

const guaranteePatterns = [
  {
    name: "zero-risk",
    pattern: /\bzero(?:\s+implementation)?\s+risk\b|\brisk[- ]free\b/i,
  },
  {
    name: "absolute-success",
    pattern:
      /\bguarantee(?:d|s)?\b|\b(?:ensure|ensures|ensured|ensuring)\s+(?:student success|your school|school gets the most)/i,
  },
  {
    name: "thai-guarantee",
    pattern:
      /ความเสี่ยง(?:ต่อการนำไปใช้งาน)?เป็นศูนย์|รับประกัน|เพื่อให้มั่นใจว่า/i,
  },
  {
    name: "chinese-guarantee",
    pattern: /零(?:实施)?风险|确保/i,
  },
] as const;

type LocaleSurface = {
  locale: "en" | "th" | "zh";
  expectedPricing: string;
  evaluationPattern: RegExp;
  pricing: unknown;
  comparison: unknown;
  managedService: unknown;
  services: unknown;
};

const publicLocales: LocaleSurface[] = [
  {
    locale: "en",
    expectedPricing: EN_CURRENT_PRICING,
    evaluationPattern:
      /low-risk|structured onboarding|currently in development|accepting inquiries|progress tracking|quality assurance/i,
    pricing: enPricing,
    comparison: enComparison,
    managedService: enManagedService,
    services: enServices,
  },
  {
    locale: "th",
    expectedPricing: "ติดต่อเราเพื่อสอบถามราคาปัจจุบัน",
    evaluationPattern:
      /ความเสี่ยงต่ำ|การเริ่มต้นที่มีโครงสร้าง|อยู่ในระหว่างพัฒนา|รับคำขอ|ติดตามความก้าวหน้า|รับรองคุณภาพ/i,
    pricing: thPricing,
    comparison: thComparison,
    managedService: thManagedService,
    services: thServices,
  },
  {
    locale: "zh",
    expectedPricing: "联系我们获取当前价格",
    evaluationPattern: /低风险|结构化|开发阶段|接受.*询问|进度跟踪|质量保证/i,
    pricing: zhPricing,
    comparison: zhComparison,
    managedService: zhManagedService,
    services: zhServices,
  },
];

/** Reads a dotted message path from a locale object. */
function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

/** Collects every string leaf from a locale object. */
function collectStringLeaves(
  value: unknown,
  path = "",
): Array<{ path: string; value: string }> {
  if (typeof value === "string") return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectStringLeaves(item, `${path}.${index}`),
    );
  }
  if (!value || typeof value !== "object") return [];

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => collectStringLeaves(child, `${path}.${key}`),
  );
}

/** Returns whether a locale object contains the exact supplied copy. */
function hasString(value: unknown, expected: string): boolean {
  return collectStringLeaves(value).some((entry) => entry.value === expected);
}

/** Finds missing or English-fallback pricing copy in one locale. */
function findLocaleDrift(locale: LocaleSurface): string[] {
  const violations: string[] = [];
  if (!hasString(locale.pricing, locale.expectedPricing)) {
    violations.push(`${locale.locale}:pricing`);
  }
  if (!hasString(locale.comparison, locale.expectedPricing)) {
    violations.push(`${locale.locale}:comparison`);
  }
  if (locale.locale !== "en" && hasString(locale.pricing, EN_CURRENT_PRICING)) {
    violations.push(`${locale.locale}:pricing-English-fallback`);
  }
  if (
    locale.locale !== "en" &&
    hasString(locale.comparison, EN_CURRENT_PRICING)
  ) {
    violations.push(`${locale.locale}:comparison-English-fallback`);
  }
  return violations;
}

/** Finds guarantee or absolute-success copy in legal service surfaces. */
function findGuaranteeViolations(locale: LocaleSurface): string[] {
  return collectStringLeaves(
    { managedService: locale.managedService, services: locale.services },
    locale.locale,
  ).flatMap(({ path, value }) =>
    guaranteePatterns
      .filter(({ pattern }) => pattern.test(value))
      .map(({ name }) => `${path}: ${name}: ${value}`),
  );
}

/** Returns the month and year from the supported public timestamp formats. */
function parsePublicMonth(
  text: string,
): { year: number; month: number } | null {
  const yearMatch = text.match(/20\d{2}/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);
  const chineseMonth = text.match(/20\d{2}年\s*(\d{1,2})月/);
  if (chineseMonth) return { year, month: Number(chineseMonth[1]) };

  const monthNames: Array<[RegExp, number]> = [
    [/January|มกราคม/i, 1],
    [/February|กุมภาพันธ์/i, 2],
    [/March|มีนาคม/i, 3],
    [/April|เมษายน/i, 4],
    [/May|พฤษภาคม/i, 5],
    [/June|มิถุนายน/i, 6],
    [/July|กรกฎาคม/i, 7],
    [/August|สิงหาคม/i, 8],
    [/September|กันยายน/i, 9],
    [/October|ตุลาคม/i, 10],
    [/November|พฤศจิกายน/i, 11],
    [/December|ธันวาคม/i, 12],
  ];
  const match = monthNames.find(([pattern]) => pattern.test(text));
  return match ? { year, month: match[1] } : null;
}

/** Returns whether a public timestamp predates the current review month. */
function isStaleTimestamp(text: string): boolean {
  const parsed = parsePublicMonth(text);
  if (!parsed) return true;
  return (
    parsed.year < CURRENT_PUBLIC_MONTH.year ||
    (parsed.year === CURRENT_PUBLIC_MONTH.year &&
      parsed.month < CURRENT_PUBLIC_MONTH.month)
  );
}

/** Finds unsupported values in competitor columns of a rendered comparison row. */
function findUnsupportedCompetitorCells(container: HTMLElement): string[] {
  return [...container.querySelectorAll("tbody tr")].flatMap(
    (row, rowIndex) => {
      const cells = [...row.querySelectorAll("td")];
      return cells.slice(2).flatMap((cell, cellIndex) => {
        const text = cell.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const hasTitle = cell.hasAttribute("title");
        return text || hasTitle
          ? [`row-${rowIndex + 1}-competitor-${cellIndex + 1}`]
          : [];
      });
    },
  );
}

afterEach(() => {
  cleanup();
  clientWiring.messages = null;
});

describe("Wave 5 Phase 5 pricing and legal claims", () => {
  it.each(publicLocales)(
    "$locale pricing renders localized current-pricing copy without numeric amounts",
    ({ pricing, expectedPricing }) => {
      clientWiring.messages = pricing;
      const rendered = render(<PricingTable />);
      const text = rendered.container.textContent ?? "";

      expect(rendered.container).toHaveTextContent(expectedPricing);
      expect(text).not.toMatch(CURRENCY_NUMBER_RE);
    },
  );

  it.each(publicLocales)(
    "$locale comparison omits unsupported competitor claims and pricing values",
    ({ comparison, expectedPricing }) => {
      clientWiring.messages = comparison;
      const rendered = render(<ComparisonTable />);
      const priceLabel = String(readPath(comparison, "features.price"));
      const priceRow = [
        ...rendered.container.querySelectorAll("tbody tr"),
      ].find(
        (row) => row.querySelector("td")?.textContent?.trim() === priceLabel,
      );

      expect(priceRow).toBeDefined();
      if (!priceRow) return;
      const cells = [...priceRow.querySelectorAll("td")];

      expect(cells[1]).toHaveTextContent(expectedPricing);
      expect(findUnsupportedCompetitorCells(rendered.container)).toEqual([]);
      expect(rendered.container.textContent ?? "").not.toMatch(
        CURRENCY_NUMBER_RE,
      );
    },
  );

  it("rejects stale or missing timestamps on pricing and comparison tables", () => {
    const violations = publicLocales.flatMap(
      ({ locale, pricing, comparison }) =>
        [
          ["pricing", String(readPath(pricing, "table.lastUpdated"))],
          ["comparison", String(readPath(comparison, "lastUpdated"))],
        ].flatMap(([surface, timestamp]) =>
          isStaleTimestamp(timestamp)
            ? [`${locale}:${surface}:${timestamp}`]
            : [],
        ),
    );

    expect(violations).toEqual([]);
  });

  it("detects an October 2024 timestamp as a stale counterexample", () => {
    expect(isStaleTimestamp("Last updated: October 2024")).toBe(true);
    const currentMonthName = new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone: "UTC",
    }).format(
      new Date(
        Date.UTC(CURRENT_PUBLIC_MONTH.year, CURRENT_PUBLIC_MONTH.month - 1, 1),
      ),
    );
    expect(
      isStaleTimestamp(
        `Last updated: ${currentMonthName} ${CURRENT_PUBLIC_MONTH.year}`,
      ),
    ).toBe(false);
  });

  it("detects currency-code pricing counterexamples", () => {
    for (const amount of ["THB 120", "USD36", "36 EUR", "GBP 60", "CNY120"]) {
      expect(amount).toMatch(CURRENCY_NUMBER_RE);
    }
  });

  it("preserves localized current-pricing copy in en, th, and zh without drift", () => {
    expect(publicLocales.flatMap(findLocaleDrift)).toEqual([]);
  });

  it("detects English fallback copy in a non-English locale counterexample", () => {
    const counterexample: LocaleSurface = {
      ...publicLocales[1],
      pricing: { currentPricing: EN_CURRENT_PRICING },
      comparison: { currentPricing: EN_CURRENT_PRICING },
    };

    expect(findLocaleDrift(counterexample)).toEqual([
      "th:pricing",
      "th:comparison",
      "th:pricing-English-fallback",
      "th:comparison-English-fallback",
    ]);
  });

  it("replaces absolute or guaranteed legal copy with factual evaluation language", () => {
    const violations = publicLocales.flatMap((locale) => {
      const strings = collectStringLeaves({
        managedService: locale.managedService,
        services: locale.services,
      });
      const copy = strings.map(({ value }) => value).join("\n");
      const evaluationViolation = locale.evaluationPattern.test(copy)
        ? []
        : [`${locale.locale}:missing-evaluation-language`];
      return [...findGuaranteeViolations(locale), ...evaluationViolation];
    });

    expect(violations).toEqual([]);
  });

  it("detects zero-risk and success-guarantee counterexamples", () => {
    const counterexample: LocaleSurface = {
      ...publicLocales[0],
      managedService: {
        overview: { badge: "ZERO RISK" },
        benefits: { description: "This ensures student success." },
      },
      services: { features: ["Zero implementation risk"] },
    };

    expect(findGuaranteeViolations(counterexample)).toHaveLength(3);
  });
});
