/**
 * Red contract for the PR v0.4 calculator and screens copy (D-17, AC-5, AC-7,
 * AC-17). PR handoff v0.4 section 6 is the only string source for these two
 * blocks. English and zh come from section 6; Thai comes from the Thai of PR
 * sections 2 and 3 in the same key order. A string outside section 6 does not
 * ship. The two live lines come from PR section 5.
 */
import { describe, expect, it } from "vitest";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";
import {
  expectKeysInEveryLocale,
  keysUnderScope,
} from "@/__tests__/fixtures/locale-key-check";

type Dict = Record<string, unknown>;
type Locale = "en" | "th" | "zh";

const DICTS: Record<Locale, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

const LOCALES: readonly Locale[] = ["en", "th", "zh"];

/** PR section 6, calculator block, English. */
const CALC_EN = {
  eyebrow: "THE COMMISSION CALCULATOR",
  heading: "See how one month's commission works",
  description:
    "The calculator uses the same formula as our settlement system. Choose the price, your students, and your legs, and see the month. Every figure is an example, not a promise of income.",
  volumeNote: "Volume is the class package price times the students who paid in the month.",
  rateNote:
    "The rate starts near 40% on a small volume. It passes 50% at 20,000 baht and approaches 71% at very high volume.",
  payoutNote:
    "Your payout is the rate times the network volume, minus the commission of each leg. 3% withholding tax comes off a positive payout.",
  inputs: {
    price: "Class package price (baht)",
    priceNote: "Default: 3,000 baht. The price adapts to the market.",
    ownStudents: "Personal students this month",
    legCount: "Legs with students",
    legStudents: "Students in this leg",
    addLeg: "Add a leg",
    removeLeg: "Remove a leg",
  },
  results: {
    ownGV: "Your own volume",
    networkGV: "Network volume",
    rate: "Commission rate",
    gross: "Gross commission",
    legCommissions: "Leg commissions",
    tax: "Withholding tax (3%)",
    net: "Net payout",
  },
  graph: {
    title: "How this month's payout is built",
    caption:
      "Each leg has its own bar: the volume it brings and the commission it earns on its own. Your payout before tax is your rate on the whole volume, minus the commissions of the legs.",
    ownBar: "Your own students",
    legBar: "Leg {n}",
    grossBar: "Gross at your rate",
    legCommissionBar: "Commission of all legs",
    netBar: "Your payout after 3% tax",
    axisBaht: "Baht",
    rateTitle: "Your rate for the network volume",
    rateAxis: "Rate",
    ratePoint: "This month",
  },
  explain: {
    ownOnly: "No legs this month, so the whole gross amount is the payout.",
    withLegs:
      "Your rate applies to the whole network volume. The commission of each leg comes off, and 3% withholding tax comes off the rest.",
    zero: "Add students to see a month.",
    needsOwnStudents:
      "Your own class unlocks your network commission. Add at least one personal student this month, and your legs count toward your payout.",
  },
  presets: [
    {
      name: "A new tutor",
      setup: "Four personal students, no legs.",
      result:
        "12,000 baht of volume at a rate of 46%. The gross is 5,520 baht, and with no legs it is all payout. After 3% withholding tax: 5,354 baht.",
    },
    {
      name: "A tutor with two legs",
      setup: "Two personal students, and two legs with three students each.",
      result:
        "24,000 baht of network volume at a rate of 52.7%. The gross is 12,656 baht, and the two legs earn 8,010 baht of it. The payout is 4,646 baht before tax, and 4,506 baht after 3% withholding tax.",
    },
    {
      name: "A small team with three legs",
      setup: "Two personal students, and three legs with four students each.",
      result:
        "42,000 baht of network volume at a rate of 59.1%. The gross is 24,833 baht, and the three legs earn 16,560 baht of it. The payout is 8,273 baht before tax, and 8,025 baht after 3% withholding tax.",
    },
  ],
  disclaimer:
    "Every figure in these examples is an illustration. Commission depends on the classes that run and are paid for.",
} as const;

/** PR section 6, calculator block, Thai from the Thai of PR sections 2 and 3. */
const CALC_TH = {
  eyebrow: "เครื่องคำนวณค่าคอมมิชชัน",
  heading: "ดูว่าค่าคอมมิชชันของหนึ่งเดือนคิดอย่างไร",
  description:
    "เครื่องคำนวณนี้ใช้สูตรเดียวกับระบบสรุปยอดของเรา เลือกราคา จำนวนนักเรียนของคุณเอง และจำนวนสาย แล้วดูยอดของเดือนนั้น ตัวเลขทุกตัวเป็นตัวอย่าง ไม่ใช่คำสัญญาเรื่องรายได้",
  volumeNote: "ยอดรวม คือราคาแพ็กเกจคลาสคูณกับจำนวนนักเรียนที่จ่ายเงินในเดือนนั้น",
  rateNote:
    "อัตราเริ่มต้นใกล้ 40% เมื่อยอดรวมยังน้อย ผ่าน 50% ที่ 20,000 บาท และเข้าใกล้ 71% เมื่อยอดรวมสูงมาก",
  payoutNote:
    "เงินที่คุณได้รับ คืออัตราคูณกับยอดรวมของเครือข่าย หักด้วยค่าคอมมิชชันของแต่ละสาย แล้วหักภาษีหัก ณ ที่จ่าย 3% จากยอดที่เป็นบวก",
  inputs: {
    price: "ราคาแพ็กเกจคลาส (บาท)",
    priceNote: "ค่าเริ่มต้น 3,000 บาท ราคาปรับตามตลาด",
    ownStudents: "นักเรียนในคลาสของคุณเองเดือนนี้",
    legCount: "จำนวนสายที่มีนักเรียน",
    legStudents: "นักเรียนในสายนี้",
    addLeg: "เพิ่มสาย",
    removeLeg: "ลบสาย",
  },
  results: {
    ownGV: "ยอดรวมของคุณเอง",
    networkGV: "ยอดรวมของเครือข่าย",
    rate: "อัตราค่าคอมมิชชัน",
    gross: "ค่าคอมมิชชันก่อนหัก",
    legCommissions: "ค่าคอมมิชชันของสาย",
    tax: "ภาษีหัก ณ ที่จ่าย (3%)",
    net: "เงินที่ได้รับสุทธิ",
  },
  graph: {
    title: "ยอดจ่ายเดือนนี้ประกอบขึ้นอย่างไร",
    caption:
      "แต่ละสายมีแท่งของตัวเอง: ยอดที่สายนั้นพามา และค่าคอมมิชชันที่สายนั้นได้เอง ยอดจ่ายของคุณก่อนหักภาษี คืออัตราของคุณคูณกับยอดรวมทั้งเครือข่าย ลบด้วยค่าคอมมิชชันของทุกสาย",
    ownBar: "นักเรียนในคลาสของคุณเอง",
    legBar: "สาย {n}",
    grossBar: "ยอดก่อนหักตามอัตราของคุณ",
    legCommissionBar: "ค่าคอมมิชชันของทุกสาย",
    netBar: "ยอดจ่ายของคุณหลังหักภาษี 3%",
    axisBaht: "บาท",
    rateTitle: "อัตราของคุณตามยอดรวมของเครือข่าย",
    rateAxis: "อัตรา",
    ratePoint: "เดือนนี้",
  },
  explain: {
    ownOnly: "เดือนนี้ไม่มีสาย เงินก่อนหักทั้งหมดจึงเป็นเงินที่คุณได้รับ",
    withLegs:
      "อัตราของคุณใช้กับยอดรวมทั้งเครือข่าย จากนั้นหักค่าคอมมิชชันของแต่ละสายออก และหักภาษีหัก ณ ที่จ่าย 3% จากยอดที่เหลือ",
    zero: "ใส่จำนวนนักเรียนเพื่อดูยอดของเดือน",
    needsOwnStudents:
      "คลาสของคุณเองปลดล็อกค่าคอมมิชชันจากเครือข่าย เพิ่มนักเรียนในคลาสของคุณเองอย่างน้อย 1 คนในเดือนนี้ สายของคุณก็นับเข้ายอดจ่ายของคุณ",
  },
  presets: [
    {
      name: "ติวเตอร์ใหม่",
      setup: "นักเรียนในคลาสของคุณเอง 4 คน ไม่มีสาย",
      result:
        "ยอด 12,000 บาท ที่อัตรา 46% ยอดก่อนหักคือ 5,520 บาท และเพราะไม่มีสาย ทั้งหมดจึงเป็นยอดจ่าย หลังหักภาษีหัก ณ ที่จ่าย 3%: 5,354 บาท",
    },
    {
      name: "ติวเตอร์ที่มีสองสาย",
      setup: "นักเรียนในคลาสของคุณเอง 2 คน และ 2 สาย สายละ 3 คน",
      result:
        "ยอดรวมของเครือข่าย 24,000 บาท ที่อัตรา 52.7% ยอดก่อนหักคือ 12,656 บาท และสองสายได้ค่าคอมมิชชัน 8,010 บาทจากยอดนี้ ยอดจ่ายคือ 4,646 บาทก่อนหักภาษี และ 4,506 บาทหลังหักภาษีหัก ณ ที่จ่าย 3%",
    },
    {
      name: "ทีมเล็กที่มีสามสาย",
      setup: "นักเรียนในคลาสของคุณเอง 2 คน และ 3 สาย สายละ 4 คน",
      result:
        "ยอดรวมของเครือข่าย 42,000 บาท ที่อัตรา 59.1% ยอดก่อนหักคือ 24,833 บาท และสามสายได้ค่าคอมมิชชัน 16,560 บาทจากยอดนี้ ยอดจ่ายคือ 8,273 บาทก่อนหักภาษี และ 8,025 บาทหลังหักภาษีหัก ณ ที่จ่าย 3%",
    },
  ],
  disclaimer:
    "ตัวเลขทุกตัวในตัวอย่างนี้เป็นการอธิบายให้เห็นภาพ ค่าคอมมิชชันขึ้นอยู่กับคลาสที่เปิดสอนและมีการจ่ายเงินจริง",
} as const;

/**
 * CALC_EN with the zh draft explain line of spec 5.1 (D-11). Every other zh
 * value equals en (D-10). The zh line stays a draft until the contracted
 * Chinese speaker checks it.
 */
const CALC_ZH = {
  ...CALC_EN,
  explain: {
    ...CALC_EN.explain,
    needsOwnStudents:
      "您自己的班级是解锁网络佣金的关键。本月只要有至少一名您自己的学员，您各团队的业绩就会计入您的结算。",
  },
} as const;

/** PR section 6, screens block, English. */
const SCREENS_EN = {
  eyebrow: "INSIDE THE APPS",
  heading: "Inside the student app",
  description:
    "One lesson in the LINE student app, step by step. The app follows the printed workbook.",
  items: [
    {
      caption:
        "A writing task from the printed workbook: the student picks a sentence frame and writes the answer.",
      alt: "Student app guided writing screen with sentence frames",
    },
    {
      caption: "The student types the answer in the app, on the same lesson as the printed page.",
      alt: "Student app short-answer screen with the question and a typed answer",
    },
    {
      caption: "After the answer, the app shows the AI check and the points.",
      alt: "Student app screen with the AI check and the points for one answer",
    },
    {
      caption:
        "At the end of the lesson, the student rates the effort and writes a note for the tutor.",
      alt: "Student app end-of-lesson screen with the student's rating and a note for the tutor",
    },
    {
      caption: "The learning record: the lessons, the points, and today's class.",
      alt: "Student app learning record with the lesson count, the points, and today's class",
    },
  ],
} as const;

/** The two live lines of PR section 5. */
const LIVE_LINE_PINS: readonly { path: readonly string[]; en: string; th: string }[] = [
  {
    path: ["tutorRole", "points", "3"],
    en: "The calculator on this page shows examples. Ask us about your own case.",
    th: "เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ทักมาคุยกับเราเรื่องกรณีของคุณเองได้",
  },
  {
    path: ["faq", "items", "5", "answer"],
    en: "Tutors earn commission under a unilevel commission model, and the system settles it monthly. The rate rises with the network volume of the month. The calculator on this page shows examples; the real figure comes from the classes that run and are paid for.",
    th: "ติวเตอร์ได้รับค่าคอมมิชชันตามโมเดลคอมมิชชันแบบยูนิเลเวล และระบบสรุปยอดให้ทุกเดือน อัตราจะสูงขึ้นตามยอดรวมของเครือข่ายในเดือนนั้น เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ตัวเลขจริงมาจากคลาสที่เปิดสอนและมีการจ่ายเงินจริง",
  },
];

/** The two old live lines that PR section 5 removes. */
const ABSENT_LIVE_LINES = [
  "We do not publish income figures. Ask us for the details.",
  "Tutors earn commission under a unilevel commission model, and the system settles it monthly. We do not publish income figures. Use the contact page to ask about the details.",
] as const;

/** Forbidden June claims of D-16, matched case-insensitively. */
const FORBIDDEN_CLAIMS = [
  "annual",
  "per year",
  "hour",
  "hourly",
  "VAT",
  "Tawi",
  "no earning cap",
  "salary",
  "teacher",
] as const;

/** Superseded two-level figures of D-2 and D-3. */
const ABSENT_FIGURES = ["5,884", "5,707", "22,714", "9,889"] as const;

/** Key paths that section 6 does not carry (D-17). */
const ABSENT_PATH_TOKENS = [
  "downline",
  "directTutors",
  "studentsPerDirect",
  "chart",
  "secondLevel",
  "studentsSecondLevel",
  "twoLevels",
  "preTax",
  "preTaxes",
] as const;

/** Returns a block, or an empty object when the key is missing. */
function block(locale: Locale, name: "calculator" | "screens"): Dict {
  const value = DICTS[locale][name];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Dict)
    : {};
}

/** Reads one dotted or bracketed path as a string, or undefined when absent. */
function at(node: unknown, path: readonly string[]): string | undefined {
  let cur: unknown = node;
  for (const part of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Dict)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Renders a traversal path as the bracket-indexed leaf key that stringLeaves emits. */
function leafKey(path: readonly string[]): string {
  return path
    .map((part, index) => (/^\d+$/.test(part) ? `[${part}]` : index === 0 ? part : `.${part}`))
    .join("");
}

/** Flattens every string leaf under a node into bracket-indexed leaf keys. */
function stringLeaves(node: unknown, prefix: readonly string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof node === "string") {
    out[leafKey(prefix)] = node;
  } else if (Array.isArray(node)) {
    node.forEach((item, index) => {
      Object.assign(out, stringLeaves(item, [...prefix, String(index)]));
    });
  } else if (node !== null && typeof node === "object") {
    for (const [key, item] of Object.entries(node as Dict)) {
      Object.assign(out, stringLeaves(item, [...prefix, key]));
    }
  }
  return out;
}

/** Returns one record per path and token that occur together. */
function findTokens(
  leaves: Record<string, string>,
  tokens: readonly string[],
): { path: string; token: string }[] {
  const found: { path: string; token: string }[] = [];
  for (const [path, value] of Object.entries(leaves)) {
    const lower = value.toLowerCase();
    for (const token of tokens) {
      if (lower.includes(token.toLowerCase())) found.push({ path, token });
    }
  }
  return found;
}

/** Returns one record per leaf key path and token that occur together. */
function findTokenPaths(
  leaves: Record<string, string>,
  tokens: readonly string[],
): { path: string; token: string }[] {
  const found: { path: string; token: string }[] = [];
  for (const path of Object.keys(leaves)) {
    for (const token of tokens) {
      if (path.toLowerCase().includes(token.toLowerCase())) found.push({ path, token });
    }
  }
  return found;
}

describe("1. both PR section 6 blocks exist in every locale", () => {
  it("exposes calculator and screens in en, th, and zh", () => {
    for (const locale of LOCALES) {
      expect(DICTS[locale].calculator, `${locale} calculator`).toBeDefined();
      expect(DICTS[locale].screens, `${locale} screens`).toBeDefined();
    }
  });
});

describe("2. the calculator block equals PR section 6 exactly", () => {
  it("en deep-equals the section 6 block", () => {
    expect(block("en", "calculator")).toEqual(CALC_EN);
  });

  it("th deep-equals the Thai of PR sections 2 and 3 in the same order", () => {
    expect(block("th", "calculator")).toEqual(CALC_TH);
  });

  it("zh deep-equals en, with the zh draft explain line (D-10, D-11)", () => {
    expect(block("zh", "calculator")).toEqual(CALC_ZH);
  });

  it("keeps the section 6 key order in every locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(block(locale, "calculator")), locale).toEqual(Object.keys(CALC_EN));
    }
  });

  it("keeps the section 6 leaf paths in every locale", () => {
    const expected = Object.keys(stringLeaves(CALC_EN)).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(stringLeaves(block(locale, "calculator"))).sort(), locale).toEqual(
        expected,
      );
    }
  });
});

describe("3. the screens block keys exist in every shipped locale", () => {
  it("holds the screens keys in every shipped locale", () => {
    expectKeysInEveryLocale(keysUnderScope("pages.products.tutorAdvantage.screens"));
  });

  it("keeps the five slot order and the section 6 key order in every locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(block(locale, "screens")), locale).toEqual(Object.keys(SCREENS_EN));
      expect((block(locale, "screens").items as unknown[]).length, locale).toBe(5);
    }
  });
});

describe("4. no removed key survives (D-17)", () => {
  it("carries no downline, direct-tutor, second-level, chart, or pre-tax key", () => {
    for (const locale of LOCALES) {
      for (const name of ["calculator", "screens"] as const) {
        const leaves = stringLeaves(block(locale, name));
        expect(findTokenPaths(leaves, [...ABSENT_PATH_TOKENS]), `${locale} ${name} keys`).toEqual([]);
      }
    }
  });

  it("detects each removed key when it is injected (positive control)", () => {
    for (const token of ABSENT_PATH_TOKENS) {
      const probe = { ...stringLeaves(CALC_EN), [`__probe_${token}`]: "probe" };
      expect(findTokenPaths(probe, [token]).some((hit) => hit.path.includes("__probe"))).toBe(true);
    }
  });
});

describe("5. superseded figures and June claims are absent", () => {
  it("finds no superseded two-level figure in any block", () => {
    for (const locale of LOCALES) {
      for (const name of ["calculator", "screens"] as const) {
        expect(findTokens(stringLeaves(block(locale, name)), [...ABSENT_FIGURES])).toEqual([]);
      }
    }
  });

  it("finds no forbidden claim in any block", () => {
    for (const locale of LOCALES) {
      for (const name of ["calculator", "screens"] as const) {
        expect(findTokens(stringLeaves(block(locale, name)), [...FORBIDDEN_CLAIMS])).toEqual([]);
      }
    }
  });

  it("fires on each forbidden claim and figure when injected (positive controls)", () => {
    for (const token of [...FORBIDDEN_CLAIMS, ...ABSENT_FIGURES]) {
      const probe = { ...stringLeaves(CALC_EN), __probe: token };
      expect(findTokens(probe, [token]).some((hit) => hit.path === "__probe")).toBe(true);
    }
  });
});

describe("6. the price default of 3,000 (AC-8)", () => {
  it("keeps 3,000 in the en and th price notes", () => {
    for (const locale of ["en", "th"] as const) {
      const value = at(block(locale, "calculator"), ["inputs", "priceNote"]);
      expect(typeof value === "string" && value.includes("3,000")).toBe(true);
    }
  });
});

describe("7. the two live lines (AC-6, PR section 5)", () => {
  it("holds the new live-line keys in every shipped locale", () => {
    expectKeysInEveryLocale([
      "pages.products.tutorAdvantage.tutorRole.points.3",
      "pages.products.tutorAdvantage.faq.items.5.answer",
    ]);
  });

  it("keeps the zh values equal to en (D-10)", () => {
    for (const pin of LIVE_LINE_PINS) {
      expect(at(DICTS.zh, pin.path)).toBe(pin.en);
    }
  });

  it("finds neither old en line in any dictionary", () => {
    for (const locale of LOCALES) {
      expect(findTokens(stringLeaves(DICTS[locale]), [...ABSENT_LIVE_LINES])).toEqual([]);
    }
  });

  it("detects each old line when injected (positive control)", () => {
    for (const line of ABSENT_LIVE_LINES) {
      const probe = { ...stringLeaves(DICTS.en), __probe: line };
      expect(findTokens(probe, [line]).some((hit) => hit.path === "__probe")).toBe(true);
    }
  });
});
