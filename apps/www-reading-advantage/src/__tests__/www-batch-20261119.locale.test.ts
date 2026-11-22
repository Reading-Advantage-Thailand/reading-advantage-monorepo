import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/[locale]/(marketing)/(home)/page";
import MathPage from "@/app/[locale]/(marketing)/products/math-advantage/page";
import ZhongwenPage from "@/app/[locale]/(marketing)/products/zhongwen-advantage/page";
import MasteryPage from "@/app/[locale]/(marketing)/mastery-advantage/page";
import en from "@/locales/en";
import th from "@/locales/th";
import zh from "@/locales/zh";
import { expectKeysInEveryLocale } from "@/__tests__/fixtures/locale-key-check";

type Dict = Record<string, unknown>;

const MESSAGES: Record<"en" | "th" | "zh", Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

/** Resolves a scoped key from the English dictionary and interpolates values. */
function scopedValue(
  scope: string,
  key: string,
  values?: Record<string, string | number>,
): string {
  let value: unknown = en as Dict;
  for (const segment of `${scope}.${key}`.split(".")) {
    if (value === null || typeof value !== "object" || !(segment in value)) {
      return `${scope}.${key}`;
    }
    value = (value as Dict)[segment];
  }
  if (typeof value !== "string") return `${scope}.${key}`;
  return Object.entries(values ?? {}).reduce(
    (text, [name, replacement]) =>
      text.replaceAll(`{${name}}`, String(replacement)),
    value,
  );
}

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve((key: string) => scopedValue("", key))),
  getScopedI18n: vi.fn(
    async (scope: string) =>
      (key: string, values?: Record<string, string | number>) =>
        scopedValue(scope, key, values),
  ),
  getStaticParams: vi.fn(() => []),
}));

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

/** Collects every string leaf of a dictionary. */
function leaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(leaves);
  if (value !== null && typeof value !== "object") return [];
  return Object.values(value as Dict).flatMap(leaves);
}

/** Installs browser globals that the marketing components need on render. */
beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    })),
  );
});

afterEach(() => {
  cleanup();
});

/**
 * Renders a real page with the English dictionary and returns its text.
 * @param page A function that returns a rendered page element.
 * @returns The rendered text content.
 */
async function renderedText(
  page: () => unknown,
): Promise<string> {
  const element = (await page()) as React.ReactElement;
  const container = render(element).container;
  return container.textContent ?? "";
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
    en: "Storytime Advantage opens as an app on 30 November 2026. In the 2027 school year, Thai primary schools open Science, Math, and Zhongwen Advantage: workbooks and apps.",
    th: "Storytime Advantage เปิดให้ใช้งานเป็นแอปวันที่ 30 พฤศจิกายน 2569 ในปีการศึกษา 2570 โรงเรียนประถมศึกษาไทยจะเปิดใช้ Science Advantage, Math Advantage และ Zhongwen Advantage ทั้งหนังสือแบบฝึกหัดและแอป",
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
  it("holds the roadmap strip keys in every shipped locale", () => {
    expectKeysInEveryLocale(ROADMAP_STRIP.map(({ key }) => key));
  });

  it("keeps the promised 2027 school year on the roadmap tag and note", () => {
    expect(read("en", "pages.home.v2.products.roadmapTag2027")).toContain("2027");
    expect(read("th", "pages.home.v2.products.roadmapTag2027")).toContain("2570");
    expect(read("en", "pages.home.v2.products.roadmapNote")).toContain("30 November 2026");
    expect(read("th", "pages.home.v2.products.roadmapNote")).toContain("30 พฤศจิกายน 2569");
  });

  it("tags the Science, Math, and Zhongwen roadmap cards with the 2027 school year", async () => {
    const text = await renderedText(() =>
      HomePage({ params: Promise.resolve({ locale: "en" }) }),
    );
    const tags = text.match(/2027 school year/g) ?? [];
    expect(tags.length, "three roadmap cards carry the 2027 tag").toBeGreaterThanOrEqual(3);
  });

  it("keeps the STEM roadmap card on the planned tag", () => {
    expect(read("en", "pages.home.v2.products.roadmapTag")).toBe("Planned");
    expect(read("th", "pages.home.v2.products.roadmapTag")).toBe("อยู่ในแผน");
  });

  it("holds the approved zh roadmap note", () => {
    expect(read("zh", "pages.home.v2.products.roadmapNote")).toContain("2027");
    const retired = "这些产品线在计划中，我们不给出日期。";
    expect(leaves(zh).some((leaf) => leaf.includes(retired))).toBe(false);
  });
});

describe("www batch 2026-11-19, detail pages name the 2027 school year (file line 52)", () => {
  it("holds the detail page keys in every shipped locale", () => {
    expectKeysInEveryLocale(DETAIL_2027.map(({ key }) => key));
  });

  it("keeps the promised 2027 school year on the dated detail lines", () => {
    const datedKeys = DETAIL_2027.filter(({ key }) => key !== "pages.products.zhongwenAdvantage.hero.subtitle");
    for (const { key } of datedKeys) {
      expect(read("en", key)).toContain("2027");
      expect(read("th", key)).toContain("2570");
    }
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

  it("renders the reading card with no status badge", async () => {
    const text = await renderedText(() => MasteryPage());
    expect(text).not.toContain("On sale now");
  });

  it("drops the planned-date default in the mastery graph", async () => {
    const text = await renderedText(() => MasteryPage());
    expect(text).not.toContain("Planned, no date");
  });
});

describe("www batch 2026-11-19, Managed Service condition goes (file line 56)", () => {
  it("holds the managed service keys in every shipped locale", () => {
    expectKeysInEveryLocale(MANAGED_SERVICE.map(({ key }) => key));
  });

  it("keeps the planning claim limit on the managed service labels", () => {
    for (const { key } of MANAGED_SERVICE.filter((_, index) => index < 4)) {
      expect(read("en", key)).toMatch(/planning/i);
      expect(read("th", key)).toContain("วางแผน");
    }
  });
});

describe("www batch 2026-11-19, planned-product pages (file line 57)", () => {
  it("drops the efficacy-stats sentence from the math page", async () => {
    const text = await renderedText(() =>
      MathPage({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(text).toContain("Math Advantage is on our product roadmap.");
    expect(text).not.toContain("Specific efficacy stats");
  });

  it("removes the launch-date FAQ item from the zhongwen page", async () => {
    const text = await renderedText(() =>
      ZhongwenPage({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(text).not.toContain("When will Zhongwen Advantage launch?");
  });
});
