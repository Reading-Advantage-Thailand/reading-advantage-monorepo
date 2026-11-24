import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import en from "@/locales/en";
import th from "@/locales/th";
import zh from "@/locales/zh";

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
 * Reads one www source file as text.
 * @param name The path under the www app directory.
 * @returns The file text.
 */
function readSource(name: string): string {
  return readFileSync(resolve(process.cwd(), name), "utf8");
}

/** File line 51 (2026-11-16): the home roadmap strip names the 2027 school year. */
const ROADMAP_STRIP = [
  {
    key: "pages.home.v2.products.roadmapLabel",
    en: "The Classroom Ahead",
    th: "ห้องเรียนในอนาคต",
  },
  {
    key: "pages.home.v2.products.roadmapNote",
    en: "In the 2027 school year, Thai primary schools open Science, Math, and Zhongwen Advantage: workbooks and apps.",
    th: "ในปีการศึกษา 2570 โรงเรียนประถมศึกษาไทยจะเปิดใช้ Science Advantage, Math Advantage และ Zhongwen Advantage ทั้งหนังสือแบบฝึกหัดและแอป",
  },
  {
    key: "pages.home.v2.products.roadmapTag2027",
    en: "2027 school year",
    th: "ปีการศึกษา 2570",
  },
] as const;

/** File line 52 (2026-11-16): the Science, Math, and Zhongwen detail pages name the 2027 school year. */
const DETAIL_2027 = [
  {
    key: "pages.products.mathAdvantage.hero.subtitle",
    en: "Math for Thai Primary Schools · 2027 School Year",
    th: "คณิตศาสตร์สำหรับโรงเรียนประถมไทย · ปีการศึกษา 2570",
  },
  {
    key: "pages.products.mathAdvantage.hero.description",
    en: "In the 2027 school year, young mathematicians open printed workbooks and a Math Advantage app, both tagged to the Mastery Advantage knowledge graph. We are building the app now on the Primary Advantage base.",
    th: "ในปีการศึกษา 2570 นักคณิตศาสตร์ตัวน้อยจะได้เปิดหนังสือแบบฝึกหัดฉบับพิมพ์และใช้แอป Math Advantage ทั้งสองส่วนติดแท็กเชื่อมกับกราฟความรู้ Mastery Advantage ขณะนี้เรากำลังพัฒนาแอปโดยใช้พื้นฐานของ Primary Advantage",
  },
  {
    key: "pages.products.mathAdvantage.hero.comingSoon",
    en: "For the 2027 school year",
    th: "สำหรับปีการศึกษา 2570",
  },
  {
    key: "pages.products.mathAdvantage.cta.description",
    en: "Put Math Advantage on your plan for the 2027 school year. Tell us what your teachers and students need.",
    th: "เพิ่ม Math Advantage ในแผนปีการศึกษา 2570 แล้วบอกเราว่าครูและนักเรียนของคุณต้องการอะไร",
  },
  {
    key: "pages.products.scienceAdvantage.metadata.description",
    en: "Science Advantage brings printed workbooks and a dedicated app to Thai primary schools in the 2027 school year. Both are tagged to the Mastery Advantage knowledge graph.",
    th: "Science Advantage จะนำหนังสือแบบฝึกหัดฉบับพิมพ์และแอปเฉพาะวิชามาสู่โรงเรียนประถมไทยในปีการศึกษา 2570 ทั้งสองส่วนติดแท็กเชื่อมกับกราฟความรู้ Mastery Advantage",
  },
  {
    key: "pages.products.scienceAdvantage.hero.subtitle",
    en: "Science for Thai Primary Schools · 2027 School Year",
    th: "วิทยาศาสตร์สำหรับโรงเรียนประถมไทย · ปีการศึกษา 2570",
  },
  {
    key: "pages.products.scienceAdvantage.hero.description",
    en: "In the 2027 school year, young scientists open printed workbooks and a Science Advantage app, both tagged to the Mastery Advantage knowledge graph. We are building the app now on the Primary Advantage base.",
    th: "ในปีการศึกษา 2570 นักวิทยาศาสตร์ตัวน้อยจะได้เปิดหนังสือแบบฝึกหัดฉบับพิมพ์และใช้แอป Science Advantage ทั้งสองส่วนติดแท็กเชื่อมกับกราฟความรู้ Mastery Advantage ขณะนี้เรากำลังพัฒนาแอปโดยใช้พื้นฐานของ Primary Advantage",
  },
  {
    key: "pages.products.scienceAdvantage.hero.badge",
    en: "For the 2027 school year",
    th: "สำหรับปีการศึกษา 2570",
  },
  {
    key: "pages.products.scienceAdvantage.hero.comingSoon",
    en: "For the 2027 school year",
    th: "สำหรับปีการศึกษา 2570",
  },
  {
    key: "pages.products.scienceAdvantage.cta.description",
    en: "Put Science Advantage on your plan for the 2027 school year. Contact us to tell us what your teachers and students need.",
    th: "เพิ่ม Science Advantage ในแผนปีการศึกษา 2570 แล้วติดต่อมาบอกเราว่าครูและนักเรียนของคุณต้องการอะไร",
  },
  {
    key: "pages.products.scienceAdvantage.waitlist.description",
    en: "Science Advantage is planned for the 2027 school year. Leave your email for news as we build the app and workbooks.",
    th: "Science Advantage วางแผนไว้สำหรับปีการศึกษา 2570 ฝากอีเมลของคุณไว้เพื่อรับข่าวระหว่างที่เราพัฒนาแอปและหนังสือแบบฝึกหัด",
  },
  {
    key: "pages.products.scienceAdvantage.eyebrows.ngssAligned",
    en: "FOR THE 2027 SCHOOL YEAR",
    th: "สำหรับปีการศึกษา 2570",
  },
  {
    key: "pages.products.zhongwenAdvantage.hero.title",
    en: "Chinese Learning for the 2027 School Year",
    th: "เรียนภาษาจีนสำหรับปีการศึกษา 2570",
  },
  {
    key: "pages.products.zhongwenAdvantage.hero.subtitle",
    en: "Workbooks and an App for Thai Primary Schools",
    th: "หนังสือแบบฝึกหัดและแอปสำหรับโรงเรียนประถมไทย",
  },
  {
    key: "pages.products.zhongwenAdvantage.hero.description",
    en: "In the 2027 school year, Thai primary students open Zhongwen Advantage workbooks and a dedicated app, both tagged to the Mastery Advantage knowledge graph. We are building the app now on the Primary Advantage base.",
    th: "ในปีการศึกษา 2570 นักเรียนประถมไทยจะได้เปิดหนังสือแบบฝึกหัด Zhongwen Advantage และใช้แอปเฉพาะวิชา ทั้งสองส่วนติดแท็กเชื่อมกับกราฟความรู้ Mastery Advantage ขณะนี้เรากำลังพัฒนาแอปโดยใช้พื้นฐานของ Primary Advantage",
  },
  {
    key: "pages.products.zhongwenAdvantage.hero.badge",
    en: "For the 2027 school year",
    th: "สำหรับปีการศึกษา 2570",
  },
  {
    key: "pages.products.zhongwenAdvantage.waitlist.description",
    en: "Zhongwen Advantage is planned for the 2027 school year. Leave your email for news as we build the app and workbooks.",
    th: "Zhongwen Advantage วางแผนไว้สำหรับปีการศึกษา 2570 ฝากอีเมลของคุณไว้เพื่อรับข่าวระหว่างที่เราพัฒนาแอปและหนังสือแบบฝึกหัด",
  },
  {
    key: "pages.products.zhongwenAdvantage.cta.description",
    en: "Put Zhongwen Advantage on your plan for the 2027 school year. Tell us what your teachers and students need.",
    th: "เพิ่ม Zhongwen Advantage ในแผนปีการศึกษา 2570 แล้วบอกเราว่าครูและนักเรียนของคุณต้องการอะไร",
  },
] as const;

/** File line 55 (2026-11-12): the limit words go, except the home roadmap note and the home suite line. */
const LIMITS = [
  {
    key: "components.products.b2bSolutions.products.scienceAdvantage.gradeRange",
    en: "Science book line",
    th: "ชุดหนังสือวิทยาศาสตร์",
  },
  {
    key: "pages.masteryAdvantage.explorer.labels.planned",
    en: "Planned",
    th: "อยู่ในแผน",
  },
  {
    key: "pages.masteryAdvantage.powersEveryProduct.cards.reading.description",
    en: "Rolling out to all of our products.",
    th: "กำลังทยอยนำไปใช้กับผลิตภัณฑ์ทั้งหมดของเรา",
  },
] as const;

/** File line 56 (2026-11-12): the Managed Service condition goes. FP1 replaces the pricingTable, roadmap.description and trustSignals entries. */
const MANAGED_SERVICE = [
  {
    key: "pages.managedService.hero.badge",
    en: "IN PLANNING",
    th: "อยู่ระหว่างการวางแผน",
  },
  {
    key: "pages.managedService.roadmap.title",
    en: "In planning",
    th: "อยู่ระหว่างการวางแผน",
  },
  {
    key: "pages.managedService.roadmap.targetDate",
    en: "In planning",
    th: "อยู่ระหว่างการวางแผน",
  },
  {
    key: "pages.services.services.1.status",
    en: "In planning",
    th: "อยู่ระหว่างการวางแผน",
  },
  {
    key: "pages.services.services.1.description",
    en: "Planned service: we provide the technology and the teacher for complete English department outsourcing.",
    th: "บริการที่วางแผนไว้: เรามอบทั้งเทคโนโลยีและครูสำหรับการจัดการแผนกวิชาภาษาอังกฤษแบบครบวงจร",
  },
] as const;

describe("www batch 2026-11-19, home roadmap strip (file line 51)", () => {
  it.each(ROADMAP_STRIP)("holds the new en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });

  it("tags the Science, Math, and Zhongwen roadmap cards with the 2027 school year", () => {
    const page = readSource("src/app/[locale]/(marketing)/(home)/page.tsx");
    const tags = page.match(/tag: t\("v2\.products\.roadmapTag2027"\)/g) ?? [];
    expect(tags).toHaveLength(3);
  });

  it("keeps the STEM roadmap card on the planned tag", () => {
    expect(read("en", "pages.home.v2.products.roadmapTag")).toBe("Planned");
    expect(read("th", "pages.home.v2.products.roadmapTag")).toBe("อยู่ในแผน");
  });

  it("holds the approved zh roadmap note", () => {
    expect(read("zh", "pages.home.v2.products.roadmapNote")).toBe(
      "在2027学年，泰国小学开设 Science Advantage、Math Advantage 和 Zhongwen Advantage，配套练习册和应用。",
    );
    const home = readSource("src/locales/pages/home.ts");
    const zhBlock = home.slice(home.indexOf("export const zh"));
    expect(zhBlock).not.toContain("这些产品线在计划中，我们不给出日期。");
  });
});

describe("www batch 2026-11-19, detail pages name the 2027 school year (file line 52)", () => {
  it.each(DETAIL_2027)("holds the new en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });
});

describe("www batch 2026-11-19, limit words go (file line 55)", () => {
  it.each(LIMITS)("holds the new en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });

  it("removes the reading status label in en and th", () => {
    expect(read("en", "pages.masteryAdvantage.powersEveryProduct.cards.reading.status")).toBeUndefined();
    expect(read("th", "pages.masteryAdvantage.powersEveryProduct.cards.reading.status")).toBeUndefined();
  });

  it("renders the reading card with no status badge", () => {
    const page = readSource("src/app/[locale]/(marketing)/mastery-advantage/page.tsx");
    expect(page).toContain('"status" in run');
  });

  it("drops the planned-date default in the mastery graph", () => {
    const graph = readSource("src/components/marketing/mastery-advantage-graph.tsx");
    expect(graph).not.toContain('planned: "Planned, no date"');
  });
});

describe("www batch 2026-11-19, Managed Service condition goes (file line 56)", () => {
  it.each(MANAGED_SERVICE)("holds the new en and th line at $key", ({ key, en: enLine, th: thLine }) => {
    expect(read("en", key)).toBe(enLine);
    expect(read("th", key)).toBe(thLine);
  });
});

describe("www batch 2026-11-19, planned-product pages (file line 57)", () => {
  it("drops the efficacy-stats sentence from the math page", () => {
    const page = readSource("src/app/[locale]/(marketing)/products/math-advantage/page.tsx");
    expect(page).toContain("Math Advantage is on our product roadmap.");
    expect(page).not.toContain("Specific efficacy stats");
  });

  it("removes the launch-date FAQ item from the zhongwen page", () => {
    const page = readSource("src/app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx");
    expect(page).not.toContain("When will Zhongwen Advantage launch?");
  });
});
