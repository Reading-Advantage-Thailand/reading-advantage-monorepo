/**
 * The AC-24 eligibility rule for the Reedy copy. This fixture holds the
 * marker words, the reversal patterns, and the break finder. The main test
 * and the adversarial probe file import it, so one change reaches both files.
 */

/** The locale of one shipped Reedy copy. */
export type ReedyLocale = "en" | "th" | "zh";

/** The two AC-24 eligibility limits that the Reedy copy must keep. */
export type EligibilityFact = "activePackage" | "finishedLesson";

/**
 * The words that carry each AC-24 eligibility limit in each locale.
 * The check reads the facts, not the whole sentence.
 */
export const ELIGIBILITY: Record<
  ReedyLocale,
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
export const NEGATION_PATTERNS: Record<ReedyLocale, readonly RegExp[]> = {
  en: [/\bwithout\b/i, /\bunfinished\b/i, /\bnot\b/i, /\bnever\b/i, /\bno\b/i, /\beveryone\b/i, /\banyone\b/i],
  th: [/ไม่/, /ทุกคน/],
  zh: [/未/, /不/, /没有/, /所有/, /任何/],
};

/**
 * The word that carries the active-package limit in each locale.
 * The check needs the word itself, not a part of another word.
 */
export const ACTIVE_WORD: Record<ReedyLocale, RegExp> = {
  en: /\bactive\b/i,
  th: /ใช้งานอยู่/,
  zh: /有效/,
};

/**
 * The words that reverse the active-package limit in each locale.
 * A text with one of them does not state the limit.
 * The English set names the plain form, the hyphenated form, the prefixed
 * forms, and the words that end an active package. The Thai set names the
 * cancelled package next to the package phrase, in both word orders, and the
 * expired package. The Chinese set names the invalid and the expired
 * package.
 */
export const INACTIVE_PATTERNS: Record<ReedyLocale, readonly RegExp[]> = {
  en: [
    /\binactive\b/i,
    /\bnon-?active\b/i,
    /\bin-active\b/i,
    /\bformerly\b/i,
    /\bpreviously\b/i,
    /\bno longer\b/i,
    /\blapsed\b/i,
    /\bexpired\b/i,
  ],
  th: [
    /ไม่ใช้งาน/,
    /ไม่ได้ใช้งาน/,
    /ยกเลิก[^.]{0,20}แพ็กเกจ/,
    /แพ็กเกจ[^.]{0,20}ยกเลิก/,
    /หมดอายุ/,
  ],
  zh: [/无效/, /非有效/, /已过期/, /过期/],
};

/**
 * The approved eligibility sentences of each locale. The list is written here,
 * not read from a locale file. A sentence that is not on the list does not
 * state the AC-24 rule, whatever words it carries.
 */
export const APPROVED_ELIGIBILITY_SENTENCES: Record<
  ReedyLocale,
  readonly string[]
> = {
  en: [
    "Reedy voice practice is open to students with an active class package, on lessons they finished.",
    "Students with an active Tutor Advantage class package, on the lessons they finished.",
    "Open to students with an active class package, on the lessons they finished.",
    "Your students practice speaking with Reedy on the lessons they finished.",
  ],
  th: [
    "การฝึกพูดกับ Reedy เปิดให้นักเรียนที่มีแพ็กเกจคลาสที่ยังใช้งานอยู่ใช้ได้ ในบทเรียนที่เรียนจบแล้ว",
    "นักเรียนที่มีแพ็กเกจคลาส Tutor Advantage ที่ใช้งานอยู่ ในบทเรียนที่เรียนจบแล้ว",
    "เปิดให้นักเรียนที่มีแพ็กเกจคลาสที่ใช้งานอยู่ ในบทเรียนที่เรียนจบแล้ว",
    "นักเรียนของคุณฝึกพูดกับ Reedy ในบทเรียนที่เรียนจบแล้ว",
  ],
  zh: [
    "Reedy 口语练习面向持有有效课程包的学生，用于已完成的课程。",
    "持有有效 Tutor Advantage 课程包的学生，用于已完成的课程。",
    "面向持有有效课程包的学生，用于已完成的课程。",
    "您的学生在已完成的课程上与 Reedy 练习口语。",
  ],
};

/**
 * Lists the AC-24 eligibility rules that one text breaks.
 * The negation, reversal, and marker rules come first. The approved sentence
 * rule applies only when those rules pass, so a reversal names its own rule.
 * @param value The text to check.
 * @param locale The locale of the text.
 * @param facts The eligibility limits to check.
 * @returns One line per broken rule.
 */
export function eligibilityBreaks(
  value: string,
  locale: ReedyLocale,
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
  if (breaks.length === 0 && !APPROVED_ELIGIBILITY_SENTENCES[locale].includes(value)) {
    breaks.push(
      `${locale}: the sentence must be one of the approved eligibility sentences`,
    );
  }
  return breaks;
}
