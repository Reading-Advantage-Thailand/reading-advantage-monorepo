import { describe, expect, it } from "vitest";
import { scriptBody, stepTitleFromPlanLine, toGuideRows, type ManualLocale } from "../guides.js";

const notes = (n: number) => ({ teacherActions: [`a${n}`], teacherLanguage: [`"l${n}"`], studentActions: [`s${n}`], watchFor: [`w${n}`] });
const manual = (prefix: string): ManualLocale => ({
  teachingNotesContent: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i + 1, notes(i + 1)])),
  lessonPlanStructure: {
    period1Step1: `<strong>${prefix} 1: ก่อนอ่าน</strong> — นักเรียนดูตัวอย่างหัวข้อ`,
    period4Step13: `<strong>${prefix} 13: การสะท้อนบทเรียน</strong> — ความเข้าใจ`,
  },
});

describe("teacher guide mapping", () => {
  it("reads the step title out of a plan line", () => {
    expect(stepTitleFromPlanLine("<strong>ขั้นตอนที่ 1: ก่อนอ่าน</strong> — x")).toBe("ก่อนอ่าน");
    expect(stepTitleFromPlanLine("no bold")).toBeNull();
    expect(stepTitleFromPlanLine(undefined)).toBeNull();
  });

  it("cuts the chat preamble off a scripted step", () => {
    expect(scriptBody("Good. Starting with **Step 1** is right.\n\n---\n\n# Step 1: Introduction\n\nBody\n")).toBe("# Step 1: Introduction\n\nBody");
    expect(scriptBody("")).toBeNull();
    expect(scriptBody("plain text")).toBe("plain text");
  });

  it("builds 13 rows per locale with English titles from the step map and Thai titles from the plan", () => {
    const en = toGuideRows("en", manual("Step"), { 1: "x\n# Step 1\nScript" });
    expect(en).toHaveLength(13);
    expect(en[0]).toMatchObject({ step: 1, locale: "en", title: "Before You Read", period: 1, teacherActions: ["a1"], scriptMd: "# Step 1\nScript" });
    expect(en[12]).toMatchObject({ step: 13, period: 4, title: "Lesson Reflection", scriptMd: null });
    const th = toGuideRows("th", manual("ขั้นตอนที่"));
    expect(th[0].title).toBe("ก่อนอ่าน");
    expect(th[12].title).toBe("การสะท้อนบทเรียน");
    // A Thai step without a plan line keeps the English title.
    expect(th[1].title).toBe("Key Vocabulary");
  });

  it("refuses a manual with a missing step", () => {
    const broken = manual("Step");
    delete broken.teachingNotesContent[7];
    expect(() => toGuideRows("en", broken)).toThrow(/step 7/);
  });
});
