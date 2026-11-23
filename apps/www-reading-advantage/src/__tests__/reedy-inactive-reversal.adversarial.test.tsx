/**
 * ADVERSARIAL: three reversals of the AC-24 active-package rule must break
 * the eligibility check of www-tutor-reedy-claim.test.tsx. The check lives in
 * src/__tests__/fixtures/reedy-eligibility.ts. Both files import that fixture,
 * so one set of patterns serves both. Each probe sentence states the reversed
 * rule while carrying every marker word. The check must report a break for
 * every probe.
 */
import { describe, expect, it } from "vitest";
import { eligibilityBreaks } from "@/__tests__/fixtures/reedy-eligibility";

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
