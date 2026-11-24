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

/**
 * The Storytime launch-day copy of 30 November 2026.
 * Places 1, 4, 33, 34 of list line 50 (row 2026-11-16, LAUNCH) and
 * places 5, 6, 7, 8 of list line 60 (row 2026-10-27, release-state copy).
 * Row 50 wins where it gives a LAUNCH line; print lines are not taken.
 * Place 2 of list line 51 (row 2026-11-16 home roadmap, roadmapNote LAUNCH)
 * is pinned at the bottom; zh keeps its Chinese line.
 */
const LAUNCH = [
  {
    key: "pages.products.storytimeAdvantage.metadata.description",
    en: "Storytime Advantage is an English app for Anuban 2 to P2, available now with one sound, one song, and two books each week.",
    th: "Storytime Advantage เป็นแอปภาษาอังกฤษสำหรับเด็กอนุบาล 2 ถึง ป.2 เปิดให้ใช้งานแล้ว พร้อมหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่มในแต่ละสัปดาห์",
    old: { en: "It launches on 30 November 2026", th: "เปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
  {
    key: "pages.products.storytimeAdvantage.hero.comingSoon",
    en: "Available now",
    th: "เปิดให้ใช้งานแล้ว",
    old: { en: "Launches 30 November 2026", th: "เปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
  {
    key: "pages.products.storytimeAdvantage.cta.description",
    en: "The app is available now. Ask us on LINE OA for the steps to join Storytime Advantage with your family or class.",
    th: "แอปเปิดให้ใช้งานแล้ว สอบถามขั้นตอนการเข้าร่วม Storytime Advantage สำหรับครอบครัวหรือชั้นเรียนของคุณได้ทาง LINE OA",
    old: { en: "The app launches on 30 November 2026", th: "แอปเปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
  {
    key: "pages.products.overview.gradeBands.storytime.description",
    en: "Storytime Advantage is an English app for Anuban 2 to P2, ages 4 to 8. Each week brings one sound, one song, and two books to a phone at home or a classroom screen. The app is available now.",
    th: "Storytime Advantage เป็นแอปภาษาอังกฤษสำหรับเด็กอนุบาล 2 ถึง ป.2 อายุ 4 ถึง 8 ปี แต่ละสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม บนโทรศัพท์ที่บ้านหรือจอในห้องเรียน แอปเปิดให้ใช้งานแล้ว",
    old: { en: "The app launches on 30 November 2026", th: "แอปเปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
  {
    key: "components.common.navigation.itemsDescription.storytimeAdvantage",
    en: "English for Anuban 2 to P2; the first unit is available now",
    th: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 หน่วยการเรียนรู้แรกพร้อมใช้งานแล้ว",
    old: { en: "the first unit launches on 30 November 2026", th: "หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
  {
    key: "components.products.b2bSolutions.products.storytimeAdvantage.badge",
    en: "Available Now",
    th: "พร้อมใช้งานแล้ว",
    old: { en: "Launches 30 November 2026", th: "เปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
  {
    key: "pages.home.v2.products.storytimePreparingLabel",
    en: "Available Now",
    th: "พร้อมใช้งานแล้ว",
    old: { en: "Launches 30 November 2026", th: "เปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
  {
    key: "pages.home.suite.description",
    en: "Primary Advantage, Reading Advantage, and CodeCamp Advantage are live. Mastery Advantage runs in CodeCamp Advantage and is entering Primary Advantage through tagged content. Science, Math, Zhongwen, and STEM Advantage are on our roadmap. The first Storytime Advantage unit is available now.",
    th: "Primary Advantage, Reading Advantage และ CodeCamp Advantage เปิดใช้งานแล้ว Mastery Advantage ทำงานอยู่ใน CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage ผ่านเนื้อหาที่ติดแท็ก Science, Math, Zhongwen และ STEM Advantage อยู่ในแผนงาน หน่วยการเรียนรู้แรกของ Storytime Advantage พร้อมใช้งานแล้ว",
    old: { en: "The first Storytime Advantage unit launches on 30 November 2026", th: "หน่วยการเรียนรู้แรกของ Storytime Advantage เปิดตัววันที่ 30 พฤศจิกายน 2569" },
  },
] as const;

describe("www batch 2026-11-30, storytime launch day", () => {
  it.each(LAUNCH)("holds the launch en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });

  it.each(LAUNCH)("holds no launch-date interim line at $key", ({ key, old }) => {
    expect(read("en", key)).not.toContain(old.en);
    expect(read("th", key)).not.toContain(old.th);
  });

  it("shows the English launch lines on the zh storytime page through the spread", () => {
    for (const key of [
      "pages.products.storytimeAdvantage.metadata.description",
      "pages.products.storytimeAdvantage.hero.comingSoon",
      "pages.products.storytimeAdvantage.cta.description",
    ]) {
      expect(read("zh", key)).toBe(read("en", key));
    }
  });

  it("holds the English launch line in the zh navigation, badge, and preparing label", () => {
    expect(read("zh", "components.common.navigation.itemsDescription.storytimeAdvantage")).toBe(
      "English for Anuban 2 to P2; the first unit is available now",
    );
    expect(read("zh", "components.products.b2bSolutions.products.storytimeAdvantage.badge")).toBe("Available Now");
    expect(read("zh", "pages.home.v2.products.storytimePreparingLabel")).toBe("Available Now");
  });

  it("keeps the zh overview and suite lines as the deletion-only copy", () => {
    expect(read("zh", "pages.products.overview.gradeBands.storytime.description")).toBe(
      "Storytime Advantage 是面向 Anuban 2 至 P2 的英语课程。每周有一个发音、一首歌和两本书。",
    );
    expect(read("zh", "pages.home.suite.description")).toBe(
      "Primary Advantage、Reading Advantage 和 CodeCamp Advantage 已上线。Mastery Advantage 在 CodeCamp Advantage 中运行，并通过带标签的内容进入 Primary Advantage。Science、Math、Zhongwen 和 STEM Advantage 在路线图中，暂无日期。",
    );
  });

  it("puts the launch line on the static English header navigation", () => {
    const storytime = staticNavigation[0]?.items?.find((item) => item.href === "/products/storytime-advantage");
    expect(storytime?.description).toBe(read("en", "components.common.navigation.itemsDescription.storytimeAdvantage"));
  });

  it("holds the launch roadmap note in en and th, zh keeps its Chinese line", () => {
    expect(read("en", "pages.home.v2.products.roadmapNote")).toBe(
      "In the 2027 school year, Thai primary schools open Science, Math, and Zhongwen Advantage: workbooks and apps.",
    );
    expect(read("th", "pages.home.v2.products.roadmapNote")).toBe(
      "ในปีการศึกษา 2570 โรงเรียนประถมศึกษาไทยจะเปิดใช้ Science Advantage, Math Advantage และ Zhongwen Advantage ทั้งหนังสือแบบฝึกหัดและแอป",
    );
    expect(read("en", "pages.home.v2.products.roadmapNote")).not.toContain("These product lines are planned.");
    expect(read("th", "pages.home.v2.products.roadmapNote")).not.toContain("สายผลิตภัณฑ์เหล่านี้อยู่ในแผน");
    expect(read("zh", "pages.home.v2.products.roadmapNote")).toBe(
      "在2027学年，泰国小学开设 Science Advantage、Math Advantage 和 Zhongwen Advantage，配套练习册和应用。",
    );
  });
});
