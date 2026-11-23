/**
 * ADVERSARIAL: three reversals of the AC-24 active-package rule pass the
 * eligibility check of www-tutor-reedy-claim.test.tsx. The pattern sets
 * below copy the shipped test exactly. Each probe sentence states the
 * reversed rule while carrying every marker word, and the shipped check
 * reports no break. Route-to-Green: widen INACTIVE_PATTERNS (or the
 * active-word check) so these probes break.
 */
import { describe, expect, it } from "vitest";

type Locale = "en" | "th" | "zh";

/** The words that carry each AC-24 eligibility limit, copied from the shipped test. */
const ELIGIBILITY: Record<
  Locale,
  { readonly activePackage: readonly string[]; readonly finishedLesson: readonly string[] }
> = {
  en: { activePackage: ["active", "package"], finishedLesson: ["lessons", "finished"] },
  th: { activePackage: ["แพ็กเกจ", "ใช้งานอยู่"], finishedLesson: ["บทเรียน", "เรียนจบแล้ว"] },
  zh: { activePackage: ["有效", "课程包"], finishedLesson: ["课程", "已完成"] },
};

/** Copied from the shipped test. */
const NEGATION_PATTERNS: Record<Locale, readonly RegExp[]> = {
  en: [/\bwithout\b/i, /\bunfinished\b/i, /\bnot\b/i, /\bnever\b/i, /\bno\b/i, /\beveryone\b/i, /\banyone\b/i],
  th: [/ไม่/, /ทุกคน/],
  zh: [/未/, /不/, /没有/, /所有/, /任何/],
};

/** Copied from the shipped test. */
const ACTIVE_WORD: Record<Locale, RegExp> = {
  en: /\bactive\b/i,
  th: /ใช้งานอยู่/,
  zh: /有效/,
};

/** Copied from the shipped test. */
const INACTIVE_PATTERNS: Record<Locale, readonly RegExp[]> = {
  en: [/\binactive\b/i],
  th: [/ไม่ใช้งาน/],
  zh: [/无效/, /非有效/],
};

/** The shipped eligibilityBreaks, copied line for line. */
function eligibilityBreaks(
  value: string,
  locale: Locale,
  facts: readonly ("activePackage" | "finishedLesson")[],
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

describe("AC-24 reversal probes that must break the eligibility check", () => {
  it("en: non-active package", () => {
    const probe =
      "Open to students with a non-active class package, on lessons they finished.";
    expect(
      eligibilityBreaks(probe, "en", ["activePackage", "finishedLesson"]),
      probe,
    ).not.toEqual([]);
  });

  it("en: in-active package", () => {
    const probe =
      "Open to students with an in-active class package, on lessons they finished.";
    expect(
      eligibilityBreaks(probe, "en", ["activePackage", "finishedLesson"]),
      probe,
    ).not.toEqual([]);
  });

  it("th: cancelled package", () => {
    const probe =
      "เปิดให้นักเรียนที่ยกเลิกแพ็กเกจคลาสที่ใช้งานอยู่ ในบทเรียนที่เรียนจบแล้ว";
    expect(
      eligibilityBreaks(probe, "th", ["activePackage", "finishedLesson"]),
      probe,
    ).not.toEqual([]);
  });
});
