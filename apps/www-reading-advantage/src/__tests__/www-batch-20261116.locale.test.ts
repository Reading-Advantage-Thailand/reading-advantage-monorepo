import { describe, expect, it } from "vitest";
import en from "@/locales/en";
import th from "@/locales/th";
import zh from "@/locales/zh";
import { navigation as staticNavigation } from "@/config/navigation";

type Dict = Record<string, unknown>;

const MESSAGES: Record<"en" | "th" | "zh", Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

/**
 * Reads one locale string by its dotted path.
 * @param locale The locale of the dictionary.
 * @param path The dotted path of the string.
 * @returns The string, or undefined when the path is not a string.
 */
function read(locale: "en" | "th" | "zh", path: string): string | undefined {
  let value: unknown = MESSAGES[locale];
  for (const part of path.split(".")) {
    if (value === null || typeof value !== "object" || !(part in value)) return undefined;
    value = (value as Dict)[part];
  }
  return typeof value === "string" ? value : undefined;
}

/** Row A of the change list v1.39: the 2027 school year on the three product cards and the two limit features. */
const ROW_A = [
  {
    key: "components.products.b2bSolutions.products.scienceAdvantage.badge",
    en: "For the 2027 school year",
    th: "สำหรับปีการศึกษา 2570",
    zh: "在我们的路线图上",
    old: { en: "On our roadmap", th: "อยู่ในแผนงาน" },
  },
  {
    key: "components.products.b2bSolutions.products.mathAdvantage.badge",
    en: "For the 2027 school year",
    th: "สำหรับปีการศึกษา 2570",
    zh: "在我们的路线图上",
    old: { en: "On our roadmap", th: "อยู่ในแผนงาน" },
  },
  {
    key: "components.products.b2bSolutions.products.zhongwenAdvantage.badge",
    en: "For the 2027 school year",
    th: "สำหรับปีการศึกษา 2570",
    zh: "在我们的路线图上",
    old: { en: "On our roadmap", th: "อยู่ในแผนงาน" },
  },
  {
    key: "components.products.b2bSolutions.products.scienceAdvantage.features.3",
    en: "Planned for Thai primary schools in the 2027 school year",
    th: "มีแผนเปิดให้โรงเรียนประถมไทยใช้ในปีการศึกษา 2570",
    zh: "尚未确定发布日期",
    old: { en: "No release date has been set", th: "ยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "components.products.b2bSolutions.products.zhongwenAdvantage.features.3",
    en: "Planned for Thai primary schools in the 2027 school year",
    th: "มีแผนเปิดให้โรงเรียนประถมไทยใช้ในปีการศึกษา 2570",
    zh: "尚未确定发布日期",
    old: { en: "No release date has been set", th: "ยังไม่มีกำหนดวันเปิดตัว" },
  },
] as const;

/** Row B of the change list v1.39: the Storytime Advantage launch on 30 November 2026, places 1 to 10. */
const ROW_B = [
  {
    key: "pages.products.storytimeAdvantage.metadata.description",
    en: "Storytime Advantage is an English program for Anuban 2 to P2: one sound, one song, and two books each week. The first unit launches on 30 November 2026, with the Storytime Advantage, Level 2, Unit 1 student book and QR-linked digital parts.",
    th: "Storytime Advantage คือหลักสูตรภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 พร้อมหนังสือนักเรียน Storytime Advantage, Level 2, Unit 1 และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด",
    old: {
      en: "The first unit is being prepared, with a printed student book and QR-linked digital parts.",
      th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก",
    },
  },
  {
    key: "pages.products.storytimeAdvantage.hero.description",
    en: "Storytime Advantage is an English program for kindergarten and early primary. Each week has one sound, one song, and two books, and every lesson is printed in full for the class teacher. The first unit launches on 30 November 2026.",
    th: "Storytime Advantage เป็นหลักสูตรภาษาอังกฤษสำหรับชั้นอนุบาลและประถมต้น ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม ทุกคาบมีแผนการสอนครบ หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 พร้อมหนังสือนักเรียนฉบับพิมพ์และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด",
    old: { en: "The first unit is being prepared.", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก" },
  },
  {
    key: "pages.products.storytimeAdvantage.hero.comingSoon",
    en: "Launches 30 November 2026",
    th: "เปิดตัววันที่ 30 พฤศจิกายน 2569",
    old: { en: "In Preparation", th: "กำลังจัดเตรียม" },
  },
  {
    key: "pages.products.storytimeAdvantage.cta.description",
    en: "The first unit launches on 30 November 2026. Contact us to discuss Storytime Advantage.",
    th: "หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569 ติดต่อเราเพื่อพูดคุยเกี่ยวกับ Storytime Advantage",
    old: {
      en: "The first unit is being prepared. Contact us to discuss Storytime Advantage.",
      th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก",
    },
  },
  {
    key: "components.common.navigation.itemsDescription.storytimeAdvantage",
    en: "English for Anuban 2 to P2; the first unit launches on 30 November 2026",
    th: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569",
    old: { en: "the first unit is being prepared", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก" },
  },
  {
    key: "components.products.b2bSolutions.products.storytimeAdvantage.badge",
    en: "Launches 30 November 2026",
    th: "เปิดตัววันที่ 30 พฤศจิกายน 2569",
    old: { en: "First unit being prepared", th: "กำลังจัดเตรียมหน่วยแรก" },
  },
  {
    key: "pages.home.v2.products.storytimePreparingLabel",
    en: "Launches 30 November 2026",
    th: "เปิดตัววันที่ 30 พฤศจิกายน 2569",
    old: { en: "First unit being prepared", th: "กำลังจัดเตรียมหน่วยแรก" },
  },
  {
    key: "pages.home.suite.description",
    en: "Primary Advantage, Reading Advantage, and CodeCamp Advantage are live. Mastery Advantage runs in CodeCamp Advantage and is entering Primary Advantage through tagged content. Science, Math, Zhongwen, and STEM Advantage are on our roadmap. The first Storytime Advantage unit launches on 30 November 2026.",
    th: "Primary Advantage, Reading Advantage และ CodeCamp Advantage เปิดใช้งานแล้ว Mastery Advantage ทำงานอยู่ใน CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage ผ่านเนื้อหาที่ติดแท็ก Science, Math, Zhongwen และ STEM Advantage อยู่ในแผนงาน หน่วยการเรียนรู้แรกของ Storytime Advantage เปิดตัววันที่ 30 พฤศจิกายน 2569",
    old: { en: "The first Storytime Advantage unit is being prepared.", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรกของ Storytime Advantage" },
  },
  {
    key: "pages.products.overview.gradeBands.storytime.description",
    en: "Storytime Advantage is an English program for kindergarten and early primary. Each week has one sound, one song, and two books, and every lesson is printed in full for the class teacher. The first unit launches on 30 November 2026.",
    th: "Storytime Advantage เป็นหลักสูตรภาษาอังกฤษสำหรับชั้นอนุบาลและประถมต้น ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม ทุกคาบมีแผนการสอนครบ หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569",
    old: { en: "The first unit is being prepared.", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก" },
  },
  {
    key: "pages.products.storytimeAdvantage.hero.launchNote",
    en: "Storytime Advantage launches on 30 November 2026.",
    th: "Storytime Advantage เปิดตัววันที่ 30 พฤศจิกายน 2569",
    old: { en: "Storytime Advantage goes live in November.", th: "Storytime Advantage เปิดให้ใช้งานในเดือนพฤศจิกายน" },
  },
] as const;

describe("www batch 2026-11-16, row A", () => {
  it.each(ROW_A)("holds the new en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });

  it.each(ROW_A)("holds no old line at $key", ({ key, old }) => {
    expect(read("en", key)).not.toBe(old.en);
    expect(read("th", key)).not.toBe(old.th);
  });

  it("keeps every zh line of row A as it is", () => {
    for (const { key, zh: zhLine } of ROW_A) expect(read("zh", key)).toBe(zhLine);
  });

  it("keeps the STEM Advantage card on our roadmap", () => {
    expect(read("en", "components.products.b2bSolutions.products.stemAdvantage.badge")).toBe("On our roadmap");
    expect(read("th", "components.products.b2bSolutions.products.stemAdvantage.badge")).toBe("อยู่ในแผนงาน");
  });
});

describe("www batch 2026-11-16, row B", () => {
  it.each(ROW_B)("holds the new en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });

  it.each(ROW_B)("holds no old line at $key", ({ key, old }) => {
    expect(read("en", key)).not.toContain(old.en);
    expect(read("th", key)).not.toContain(old.th);
  });

  it("deletes the no-dates limit from the home suite line", () => {
    expect(read("en", "pages.home.suite.description")).not.toContain("with no dates");
    expect(read("th", "pages.home.suite.description")).not.toContain("ยังไม่มีกำหนดวันเปิดตัว");
  });

  it("puts the launch day on the static English header navigation", () => {
    const storytime = staticNavigation[0]?.items?.find((item) => item.href === "/products/storytime-advantage");
    expect(storytime?.description).toBe(read("en", "components.common.navigation.itemsDescription.storytimeAdvantage"));
  });

  it("shows the English row B lines on the zh Storytime page through the spread", () => {
    for (const key of [
      "pages.products.storytimeAdvantage.metadata.description",
      "pages.products.storytimeAdvantage.hero.description",
      "pages.products.storytimeAdvantage.hero.comingSoon",
      "pages.products.storytimeAdvantage.cta.description",
      "pages.products.storytimeAdvantage.hero.launchNote",
    ]) {
      expect(read("zh", key)).toBe(read("en", key));
    }
  });
});

/** The stapler row of 2026-11-05 (TH-184): the teacher holds the stapler. */
const STAPLER = {
  key: "pages.products.storytimeAdvantage.keyFeatures.features.0.points.0",
  en: "One A4 Storytime Advantage, Level 2, Unit 1, Student Book for weeks 1 to 8. Small reader books sit inside it. Children tear them out and fold them. The teacher staples them.",
  th: "หนังสือนักเรียน Storytime Advantage, Level 2, Unit 1, Student Book ขนาด A4 หนึ่งเล่ม สำหรับสัปดาห์ที่ 1 ถึง 8 มีหนังสือฝึกอ่านเล่มเล็กอยู่ด้านใน เด็กฉีกออกและพับ ครูเป็นคนเย็บหนังสือฝึกอ่านเล่มเล็ก",
  old: {
    en: "Children tear them out, fold them, and staple them. No scissors are needed.",
    th: "เด็กฉีกออก พับ และเย็บเล่มย่อยแต่ละเล่มได้โดยไม่ต้องใช้กรรไกร",
  },
} as const;

describe("www stapler row of 2026-11-05 (TH-184)", () => {
  it("holds the new en and th line and no old line", () => {
    expect(read("en", STAPLER.key)).toBe(STAPLER.en);
    expect(read("th", STAPLER.key)).toBe(STAPLER.th);
    expect(read("en", STAPLER.key)).not.toContain(STAPLER.old.en);
    expect(read("th", STAPLER.key)).not.toContain(STAPLER.old.th);
  });

  it("shows the English line on the zh page through the spread", () => {
    expect(read("zh", STAPLER.key)).toBe(STAPLER.en);
  });
});
