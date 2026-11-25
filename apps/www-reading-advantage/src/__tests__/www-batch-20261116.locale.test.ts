import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import en from "@/locales/en";
import th from "@/locales/th";
import zh from "@/locales/zh";
import { navigation as staticNavigation } from "@/config/navigation";
import { buildMarketingMetadata } from "@/lib/seo";

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

/** Row B of the change list v1.39, superseded in part by the INTERIM copy of the row of 2026-11-16: the Storytime Advantage launch on 30 November 2026. The LAUNCH copy of the batch of 2026-11-30 supersedes the interim lines below, except hero.description, which has no LAUNCH line. */
const ROW_B = [
  {
    key: "pages.products.storytimeAdvantage.metadata.description",
    en: "Storytime Advantage is an English app for Anuban 2 to P2, available now with one sound, one song, and two books each week.",
    th: "Storytime Advantage เป็นแอปภาษาอังกฤษสำหรับเด็กอนุบาล 2 ถึง ป.2 เปิดให้ใช้งานแล้ว พร้อมหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่มในแต่ละสัปดาห์",
    old: {
      en: "The first unit is being prepared, with a printed student book and QR-linked digital parts.",
      th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก",
    },
  },
  {
    key: "pages.products.storytimeAdvantage.hero.description",
    en: "A child taps a word and hears it. The class joins the song. Storytime Advantage brings one sound, one song, and two books to each week, on a phone at home and a screen in the classroom.",
    th: "เด็กคนหนึ่งแตะคำแล้วได้ยินเสียงอ่าน ทั้งชั้นร้องเพลงไปด้วยกัน Storytime Advantage นำหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่มมาสู่ทุกสัปดาห์ บนโทรศัพท์ที่บ้านและจอในห้องเรียน",
    old: { en: "The first unit is being prepared.", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก" },
  },
  {
    key: "pages.products.storytimeAdvantage.hero.comingSoon",
    en: "Available now",
    th: "เปิดให้ใช้งานแล้ว",
    old: { en: "In Preparation", th: "กำลังจัดเตรียม" },
  },
  {
    key: "pages.products.storytimeAdvantage.cta.description",
    en: "The app is available now. Ask us on LINE OA for the steps to join Storytime Advantage with your family or class.",
    th: "แอปเปิดให้ใช้งานแล้ว สอบถามขั้นตอนการเข้าร่วม Storytime Advantage สำหรับครอบครัวหรือชั้นเรียนของคุณได้ทาง LINE OA",
    old: {
      en: "The first unit is being prepared. Contact us to discuss Storytime Advantage.",
      th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก",
    },
  },
  {
    key: "components.common.navigation.itemsDescription.storytimeAdvantage",
    en: "English for Anuban 2 to P2; the first unit is available now",
    th: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 หน่วยการเรียนรู้แรกพร้อมใช้งานแล้ว",
    old: { en: "the first unit is being prepared", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก" },
  },
  {
    key: "components.products.b2bSolutions.products.storytimeAdvantage.badge",
    en: "Available now",
    th: "พร้อมใช้งานแล้ว",
    old: { en: "First unit being prepared", th: "กำลังจัดเตรียมหน่วยแรก" },
  },
  {
    key: "pages.home.v2.products.storytimePreparingLabel",
    en: "Available now",
    th: "พร้อมใช้งานแล้ว",
    old: { en: "First unit being prepared", th: "กำลังจัดเตรียมหน่วยแรก" },
  },
  {
    key: "pages.home.suite.description",
    en: "Primary Advantage, Reading Advantage, and CodeCamp Advantage are live. Mastery Advantage runs in CodeCamp Advantage and is entering Primary Advantage through tagged content. In the 2027 school year, Thai primary schools open Science Advantage, Math Advantage, and Zhongwen Advantage: workbooks and apps. STEM Advantage is planned. The first Storytime Advantage unit is available now.",
    th: "Primary Advantage, Reading Advantage และ CodeCamp Advantage เปิดใช้งานแล้ว Mastery Advantage ทำงานอยู่ใน CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage ผ่านเนื้อหาที่ติดแท็ก Science, Math, Zhongwen และ STEM Advantage อยู่ในแผนงาน หน่วยการเรียนรู้แรกของ Storytime Advantage พร้อมใช้งานแล้ว",
    old: { en: "The first Storytime Advantage unit is being prepared.", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรกของ Storytime Advantage" },
  },
  {
    key: "pages.products.overview.gradeBands.storytime.description",
    en: "Storytime Advantage is an English app for Anuban 2 to P2, ages 4 to 8. Each week brings one sound, one song, and two books to a phone at home or a classroom screen. The app is available now.",
    th: "Storytime Advantage เป็นแอปภาษาอังกฤษสำหรับเด็กอนุบาล 2 ถึง ป.2 อายุ 4 ถึง 8 ปี แต่ละสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม บนโทรศัพท์ที่บ้านหรือจอในห้องเรียน แอปเปิดให้ใช้งานแล้ว",
    old: { en: "The first unit is being prepared.", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก" },
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

  it("holds no roadmap-without-date line in any locale of the home suite line", () => {
    for (const locale of ["en", "th", "zh"] as const) {
      expect(read(locale, "pages.home.suite.description")).not.toContain("on our roadmap");
      expect(read(locale, "pages.home.suite.description")).not.toContain("暂无日期");
    }
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
    ]) {
      expect(read("zh", key)).toBe(read("en", key));
    }
  });
});

/**
 * PM decision 2026-11-16: the home roadmap note keeps the plan sentence and drops the
 * no-dates sentence. SUPERSEDED by the launch batch (list line 51, place 2):
 * the launch copy below pins the LAUNCH roadmap note.
 */
const ROADMAP_NOTE = {
  key: "pages.home.v2.products.roadmapNote",
  en: "In the 2027 school year, Thai primary schools open Science, Math, and Zhongwen Advantage: workbooks and apps.",
  th: "ในปีการศึกษา 2570 โรงเรียนประถมศึกษาไทยจะเปิดใช้ Science Advantage, Math Advantage และ Zhongwen Advantage ทั้งหนังสือแบบฝึกหัดและแอป",
  removed: { en: "We give no dates.", th: "เรายังไม่กำหนดวันที่" },
} as const;

describe("www batch 2026-11-16, home roadmap note (PM decision)", () => {
  it("holds the kept first sentence word for word in en and th", () => {
    expect(read("en", ROADMAP_NOTE.key)).toBe(ROADMAP_NOTE.en);
    expect(read("th", ROADMAP_NOTE.key)).toBe(ROADMAP_NOTE.th);
  });

  it("holds no deleted no-dates sentence in en and th", () => {
    expect(read("en", ROADMAP_NOTE.key)).not.toContain(ROADMAP_NOTE.removed.en);
    expect(read("th", ROADMAP_NOTE.key)).not.toContain(ROADMAP_NOTE.removed.th);
  });
});

/**
 * File line 52 (2026-11-16): the Science, Math, and Zhongwen detail pages name the
 * 2027 school year. The 2026-11-16 PM decision text below is superseded.
 */
const DETAIL_NO_DATE = [
  {
    key: "pages.products.mathAdvantage.hero.description",
    en: "In the 2027 school year, young mathematicians open printed workbooks and a Math Advantage app, both tagged to the Mastery Advantage knowledge graph. We are building the app now on the Primary Advantage base.",
    th: "ในปีการศึกษา 2570 นักคณิตศาสตร์ตัวน้อยจะได้เปิดหนังสือแบบฝึกหัดฉบับพิมพ์และใช้แอป Math Advantage ทั้งสองส่วนติดแท็กเชื่อมกับกราฟความรู้ Mastery Advantage ขณะนี้เรากำลังพัฒนาแอปโดยใช้พื้นฐานของ Primary Advantage",
    removed: { en: "It has no release date.", th: "ยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "pages.products.mathAdvantage.cta.description",
    en: "Put Math Advantage on your plan for the 2027 school year. Tell us what your teachers and students need.",
    th: "เพิ่ม Math Advantage ในแผนปีการศึกษา 2570 แล้วบอกเราว่าครูและนักเรียนของคุณต้องการอะไร",
    removed: { en: "It has no release date.", th: "ยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "pages.products.scienceAdvantage.cta.description",
    en: "Put Science Advantage on your plan for the 2027 school year. Contact us to tell us what your teachers and students need.",
    th: "เพิ่ม Science Advantage ในแผนปีการศึกษา 2570 แล้วติดต่อมาบอกเราว่าครูและนักเรียนของคุณต้องการอะไร",
    removed: { en: "It has no release date.", th: "และยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "pages.products.scienceAdvantage.waitlist.description",
    en: "Science Advantage is planned for the 2027 school year. Leave your email for news as we build the app and workbooks.",
    th: "Science Advantage วางแผนไว้สำหรับปีการศึกษา 2570 ฝากอีเมลของคุณไว้เพื่อรับข่าวระหว่างที่เราพัฒนาแอปและหนังสือแบบฝึกหัด",
    removed: { en: "Science Advantage has no release date.", th: "Science Advantage ยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "pages.products.zhongwenAdvantage.hero.description",
    en: "In the 2027 school year, Thai primary students open Zhongwen Advantage workbooks and a dedicated app, both tagged to the Mastery Advantage knowledge graph. We are building the app now on the Primary Advantage base.",
    th: "ในปีการศึกษา 2570 นักเรียนประถมไทยจะได้เปิดหนังสือแบบฝึกหัด Zhongwen Advantage และใช้แอปเฉพาะวิชา ทั้งสองส่วนติดแท็กเชื่อมกับกราฟความรู้ Mastery Advantage ขณะนี้เรากำลังพัฒนาแอปโดยใช้พื้นฐานของ Primary Advantage",
    removed: { en: "It has no release date.", th: "และยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "pages.products.zhongwenAdvantage.waitlist.description",
    en: "Zhongwen Advantage is planned for the 2027 school year. Leave your email for news as we build the app and workbooks.",
    th: "Zhongwen Advantage วางแผนไว้สำหรับปีการศึกษา 2570 ฝากอีเมลของคุณไว้เพื่อรับข่าวระหว่างที่เราพัฒนาแอปและหนังสือแบบฝึกหัด",
    removed: { en: "Zhongwen Advantage has no release date.", th: "Zhongwen Advantage ยังไม่มีกำหนดวันเปิดตัว" },
  },
] as const;

describe("www batch 2026-11-16, product detail pages (PM decision)", () => {
  it.each(DETAIL_NO_DATE)("holds the kept en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });

  it.each(DETAIL_NO_DATE)("holds no no-release-date sentence at $key", ({ key, removed }) => {
    expect(read("en", key)).not.toContain(removed.en);
    expect(read("th", key)).not.toContain(removed.th);
  });

  it("leaves the zh lines of the three detail pages as they are", () => {
    expect(read("zh", "pages.products.mathAdvantage.hero.description")).toContain("暂无发布日期");
    expect(read("zh", "pages.products.mathAdvantage.cta.description")).toContain("暂无发布日期");
    expect(read("zh", "pages.products.scienceAdvantage.cta.description")).toContain("暂无发布日期");
    expect(read("zh", "pages.products.scienceAdvantage.waitlist.description")).toContain("暂无发布日期");
    expect(read("zh", "pages.products.zhongwenAdvantage.hero.description")).toContain("暂无发布日期");
    expect(read("zh", "pages.products.zhongwenAdvantage.waitlist.description")).toContain("暂无发布日期");
  });

  it("keeps the sentence out of the meta, og, and twitter descriptions", () => {
    const pages = [
      { path: "/products/math-advantage", key: "pages.products.mathAdvantage.hero.description" },
      { path: "/products/science-advantage", key: "pages.products.scienceAdvantage.hero.description" },
      { path: "/products/zhongwen-advantage", key: "pages.products.zhongwenAdvantage.hero.description" },
    ];
    const removed = { en: "It has no release date.", th: "ยังไม่มีกำหนดวันเปิดตัว" };
    for (const page of pages) {
      for (const locale of ["en", "th"] as const) {
        const description = read(locale, page.key) ?? "";
        const metadata = buildMarketingMetadata({ description, locale, path: page.path, title: "Title" });
        expect(metadata.description).toBe(description);
        expect(metadata.description).not.toContain(removed[locale]);
        expect(metadata.openGraph?.description).not.toContain(removed[locale]);
        expect(metadata.twitter?.description).not.toContain(removed[locale]);
      }
    }
  });
});

describe("www batch 2026-11-16, the science mockup SVGs", () => {
  it.each(["ra-marketing-science-advantage.svg", "ra-marketing-science-advantage-th.svg"])(
    "holds no GSE label in %s",
    (name) => {
      const svg = readFileSync(resolve(process.cwd(), "public/marketing", name), "utf8");
      expect(svg).not.toContain("GSE");
    },
  );
});

/** The week 1 book line, as the INTERIM copy of the row of 2026-11-16 gives it. It supersedes the stapler row of 2026-11-05 (TH-184). */
const WEEK1_BOOK_LINE = {
  key: "pages.products.storytimeAdvantage.keyFeatures.features.0.points.0",
  en: "The read-along book reads to your child page by page.",
  th: "หนังสืออ่านตามอ่านให้ลูกฟังทีละหน้า",
  old: {
    en: "One A4 Storytime Advantage, Level 2, Unit 1, Student Book for weeks 1 to 8. Small reader books sit inside it. Children tear them out and fold them. The teacher staples them.",
    th: "หนังสือนักเรียน Storytime Advantage, Level 2, Unit 1, Student Book ขนาด A4 หนึ่งเล่ม สำหรับสัปดาห์ที่ 1 ถึง 8 มีหนังสือฝึกอ่านเล่มเล็กอยู่ด้านใน เด็กฉีกออกและพับ ครูเป็นคนเย็บหนังสือฝึกอ่านเล่มเล็ก",
  },
} as const;

describe("www week 1 book line (row of 2026-11-16, supersedes TH-184)", () => {
  it("holds the new en and th line and no old line", () => {
    expect(read("en", WEEK1_BOOK_LINE.key)).toBe(WEEK1_BOOK_LINE.en);
    expect(read("th", WEEK1_BOOK_LINE.key)).toBe(WEEK1_BOOK_LINE.th);
    expect(read("en", WEEK1_BOOK_LINE.key)).not.toContain(WEEK1_BOOK_LINE.old.en);
    expect(read("th", WEEK1_BOOK_LINE.key)).not.toContain(WEEK1_BOOK_LINE.old.th);
  });

  it("shows the English line on the zh page through the spread", () => {
    expect(read("zh", WEEK1_BOOK_LINE.key)).toBe(WEEK1_BOOK_LINE.en);
  });
});
