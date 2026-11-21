import { describe, expect, it } from "vitest";
import { en as enManagedService } from "@/locales/pages/managed-service";
import { en as enServices } from "@/locales/pages/services";
import { th as thManagedService } from "@/locales/pages/managed-service";
import { th as thServices } from "@/locales/pages/services";
import { zh as zhManagedService } from "@/locales/pages/managed-service";
import { zh as zhServices } from "@/locales/pages/services";

/*
 * FP1 removes the pricing and comparison table cases from this file. The
 * guarantee and zero-risk cases below still pin the legal copy on
 * managedService and services. Helpers used only by the removed cases went
 * with them.
 */

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
  evaluationPattern: RegExp;
  managedService: unknown;
  services: unknown;
};

const publicLocales: LocaleSurface[] = [
  {
    locale: "en",
    evaluationPattern:
      /low-risk|structured onboarding|currently in development|accepting inquiries|progress tracking|quality assurance/i,
    managedService: enManagedService,
    services: enServices,
  },
  {
    locale: "th",
    evaluationPattern:
      /ความเสี่ยงต่ำ|การเริ่มต้นที่มีโครงสร้าง|อยู่ในระหว่างพัฒนา|รับคำขอ|ติดตามความก้าวหน้า|รับรองคุณภาพ/i,
    managedService: thManagedService,
    services: thServices,
  },
  {
    locale: "zh",
    evaluationPattern: /低风险|结构化|开发阶段|接受.*询问|进度跟踪|质量保证/i,
    managedService: zhManagedService,
    services: zhServices,
  },
];

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

describe("Wave 5 Phase 5 legal claims", () => {
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
