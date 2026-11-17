/**
 * AC-24 (Phase 3, task 3.6c): no locale string says that Reedy is not in Primary
 * Advantage. The PM page check of 2026-11-18 (finding PM-1) found the claim false,
 * because Reedy Preview is live in Primary Advantage since the 2026-10-20 cutover.
 * The cases walk every string value of both imported locale modules and render the
 * Reedy block with the real dictionaries. No case reads production source as text
 * and no case computes a hash.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getScopedI18n } from "@/locales/server";
import * as pageCopy from "@/locales/pages/products/tutor-advantage";
import * as componentCopy from "@/locales/components/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

type Dict = Record<string, unknown>;

const LOCALES = ["en", "th", "zh"] as const;
type Locale = (typeof LOCALES)[number];

const PAGES: Record<Locale, Dict> = {
  en: pageCopy.en as unknown as Dict,
  th: pageCopy.th as unknown as Dict,
  zh: pageCopy.zh as unknown as Dict,
};

const COMPONENTS: Record<Locale, Dict> = {
  en: componentCopy.en as unknown as Dict,
  th: componentCopy.th as unknown as Dict,
  zh: componentCopy.zh as unknown as Dict,
};

/** Every forbidden claim of D-21, one pattern per shape of the false claim. */
const FORBIDDEN = [
  /Tutor Advantage only/i,
  /not in Primary Advantage/i,
  /Tutor Advantage เท่านั้น/,
  /ไม่มีใน Primary Advantage/,
  /仅在\s*Tutor Advantage/,
  /Primary Advantage 和 Reading Advantage 中没有/,
] as const;

/**
 * Collects every string value of a dictionary, with its dotted path.
 * @param value The node to walk.
 * @param path The dotted path of the node.
 * @param out The list of string leaves.
 * @returns The list of string leaves with their paths.
 */
function leaves(value: unknown, path = "", out: Array<{ path: string; text: string }> = []) {
  if (typeof value === "string") {
    out.push({ path: path || "(root)", text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => leaves(item, path ? `${path}.${index}` : String(index), out));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Dict)) {
      leaves(child, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

/**
 * Returns the forbidden matches of one dictionary, one line per match.
 * @param dict The dictionary to scan.
 * @returns The matching path and text, or an empty list.
 */
function forbiddenHits(dict: unknown): string[] {
  const hits: string[] = [];
  for (const leaf of leaves(dict)) {
    for (const pattern of FORBIDDEN) {
      if (pattern.test(leaf.text)) hits.push(`${leaf.path}: ${leaf.text}`);
    }
  }
  return hits;
}

/**
 * Reads one non-empty string from a dictionary and fails on a missing path.
 * @param dict The dictionary to read.
 * @param path The dotted key path.
 * @returns The string value at the path.
 */
function text(dict: Dict, path: string): string {
  let cur: unknown = dict;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") throw new Error(`missing ${path}`);
    cur = (cur as Dict)[part];
  }
  if (typeof cur !== "string") throw new Error(`not text: ${path}`);
  return cur;
}

/** The new page Reedy description of D-21. */
const PAGE_REEDY: Record<Locale, string> = {
  en: "Reedy voice practice is open to students with an active class package, on lessons they finished.",
  th: "การฝึกพูดกับ Reedy สำหรับนักเรียนที่มีแพ็กเกจคลาสที่ใช้งานอยู่ และในบทเรียนที่เรียนจบแล้ว",
  zh: "Reedy 口语练习面向持有有效课程包的学生，用于已完成的课程。",
};

/** The new component Reedy description of D-21. */
const COMPONENT_REEDY: Record<Locale, string> = {
  en: "Your students practice speaking with Reedy on the lessons they finished.",
  th: "นักเรียนของคุณฝึกพูดกับ Reedy ในบทเรียนที่เรียนจบแล้ว",
  zh: "您的学生在已完成的课程上与 Reedy 练习口语。",
};

/** The three Reedy block bullets that stay in each locale (D-21). */
const REEDY_POINTS: Record<Locale, readonly string[]> = {
  en: [
    "Open to students with an active class package, on the lessons they finished.",
    "After each practice, students see one thing they did well, one thing to try next time, and a sentence to say again.",
    "Before they start, students can check their microphone and get tips.",
  ],
  th: [
    "เปิดให้นักเรียนที่มีแพ็กเกจคลาสที่ใช้งานอยู่ ในบทเรียนที่เรียนจบแล้ว",
    "หลังฝึกแต่ละครั้ง นักเรียนเห็นสิ่งที่ทำได้ดีหนึ่งอย่าง สิ่งที่ควรลองครั้งหน้าหนึ่งอย่าง และประโยคหนึ่งประโยคให้พูดซ้ำ",
    "ก่อนเริ่ม นักเรียนตรวจไมโครโฟนและดูเคล็ดลับได้",
  ],
  zh: [
    "面向持有有效课程包的学生，用于已完成的课程。",
    "每次练习后，学生会看到一件做得好的事、一件下次可以尝试的事，以及一个可以再说一遍的句子。",
    "开始前，学生可以检查麦克风并查看提示。",
  ],
};

/**
 * Renders the Tutor Advantage page with the real messages of one locale.
 * @param locale The locale to render.
 * @returns A promise that resolves after the render.
 */
async function renderWithRealCopy(locale: Locale): Promise<void> {
  const dict = PAGES[locale];
  vi.mocked(getScopedI18n).mockImplementation(() => {
    const translator = ((key: string) => {
      let cur: unknown = dict;
      for (const part of key.split(".")) {
        if (cur == null || typeof cur !== "object") return key;
        cur = (cur as Dict)[part];
      }
      return typeof cur === "string" ? cur : key;
    }) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale }) });
  render(jsx);
}

afterEach(() => {
  cleanup();
  vi.mocked(getScopedI18n).mockImplementation((scope) => {
    const translator = ((key: string) =>
      key.endsWith(".image")
        ? "/images/placeholder.png"
        : `${String(scope)}.${key}`) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
});

describe("AC-24: the scan detects every forbidden claim", () => {
  it("flags one probe per forbidden pattern", () => {
    const probes = [
      "Live in Tutor Advantage only.",
      "It is not in Primary Advantage or Reading Advantage.",
      "ใช้ได้ใน Tutor Advantage เท่านั้น",
      "ไม่มีใน Primary Advantage หรือ Reading Advantage",
      "仅在 Tutor Advantage 中提供。",
      "Primary Advantage 和 Reading Advantage 中没有。",
    ];
    const hits = probes.filter((probe) => FORBIDDEN.some((pattern) => pattern.test(probe)));
    expect(hits).toHaveLength(FORBIDDEN.length);
  });
});

describe("AC-24: no locale string says Reedy is not in Primary Advantage", () => {
  for (const locale of LOCALES) {
    it(`${locale}: the page dictionary holds no forbidden claim`, () => {
      expect(forbiddenHits(PAGES[locale])).toEqual([]);
    });
    it(`${locale}: the component dictionary holds no forbidden claim`, () => {
      expect(forbiddenHits(COMPONENTS[locale])).toEqual([]);
    });
  }
});

describe("AC-24: the new Reedy descriptions", () => {
  for (const locale of LOCALES) {
    it(`${locale}: the page Reedy description drops the Tutor-Advantage-only clause`, () => {
      const feature = (PAGES[locale].platformFeatures as Dict).features as Array<Dict>;
      expect(feature[2]?.description).toBe(PAGE_REEDY[locale]);
    });
    it(`${locale}: the component Reedy description drops the Tutor-Advantage-only sentence`, () => {
      const feature = (COMPONENTS[locale].features as Array<Dict>)[2];
      expect(feature?.description).toBe(COMPONENT_REEDY[locale]);
    });
  }
});

describe("AC-24: the Reedy block keeps three bullets", () => {
  for (const locale of LOCALES) {
    it(`${locale}: renders exactly the three remaining bullets`, async () => {
      await renderWithRealCopy(locale);
      const heading = screen.getByRole("heading", { name: text(PAGES[locale], "reedyBlock.heading") });
      const section = heading.closest("section");
      if (!(section instanceof HTMLElement)) throw new Error(`no section for ${locale}`);
      const list = section.querySelector("ul");
      if (!(list instanceof HTMLElement)) throw new Error(`no list for ${locale}`);
      const bullets = Array.from(list.querySelectorAll("li")).map((item) => item.textContent);
      expect(bullets).toEqual([...REEDY_POINTS[locale]]);
    });
  }
});
