/**
 * Red contract for the calculator locale keys and copy (AC-5, AC-7, AC-8),
 * and for the screens gallery keys (AC-10, spec 6.3, D-10, D-15a).
 * Pins spec sections 5.4 and 6.3 word for word.
 * The `calculator` block was intentionally absent at the Red stage of task 1.3;
 * the `screens` block is intentionally absent at the Red stage of task 2.2.
 */
import { describe, expect, it } from "vitest";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";

type Dict = Record<string, unknown>;
type Locale = "en" | "th" | "zh";

const DICTS: Record<Locale, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

const LOCALES: readonly Locale[] = ["en", "th", "zh"];

/** The exact key order of the calculator block, from spec section 5.4. */
const KEY_ORDER = [
  "eyebrow",
  "heading",
  "description",
  "volumeNote",
  "rateNote",
  "payoutNote",
  "inputs",
  "results",
  "explain",
  "chart",
  "presets",
  "disclaimer",
] as const;

/** One row per string leaf of spec 5.4: exact en copy, exact th copy. */
const PINS: readonly { path: readonly string[]; en: string; th: string }[] = [
  {
    path: ["eyebrow"],
    en: "THE COMMISSION CALCULATOR",
    th: "เครื่องคำนวณค่าคอมมิชชัน",
  },
  {
    path: ["heading"],
    en: "See how one month's commission works",
    th: "ดูว่าค่าคอมมิชชันของหนึ่งเดือนคิดอย่างไร",
  },
  {
    path: ["description"],
    en: "The calculator uses the same formula as our settlement system. Choose the price and the students, and see the month. Every figure is an example, not a promise of income.",
    th: "เครื่องคำนวณนี้ใช้สูตรเดียวกับระบบสรุปยอดของเรา เลือกราคาและจำนวนนักเรียน แล้วดูยอดของเดือนนั้น ตัวเลขทุกตัวเป็นตัวอย่าง ไม่ใช่คำสัญญาเรื่องรายได้",
  },
  {
    path: ["volumeNote"],
    en: "Volume is the class package price times the students who paid in the month.",
    th: "ยอดรวม คือราคาแพ็กเกจคลาสคูณกับจำนวนนักเรียนที่จ่ายเงินในเดือนนั้น",
  },
  {
    path: ["rateNote"],
    en: "The rate starts near 40% on a small volume. It passes 50% at 20,000 baht and approaches 71% at very high volume.",
    th: "อัตราเริ่มต้นใกล้ 40% เมื่อยอดรวมยังน้อย ผ่าน 50% ที่ 20,000 บาท และเข้าใกล้ 71% เมื่อยอดรวมสูงมาก",
  },
  {
    path: ["payoutNote"],
    en: "Your payout is the rate times the network volume, minus the payouts of your direct downline tutors. 3% withholding tax comes off a positive payout.",
    th: "เงินที่คุณได้รับ คืออัตราคูณกับยอดรวมของเครือข่าย หักด้วยเงินที่ติวเตอร์ดาวน์ไลน์ชั้นแรกได้รับ แล้วหักภาษีหัก ณ ที่จ่าย 3% จากยอดที่เป็นบวก",
  },
  {
    path: ["inputs", "price"],
    en: "Class package price (baht)",
    th: "ราคาแพ็กเกจคลาส (บาท)",
  },
  {
    path: ["inputs", "priceNote"],
    en: "Default: 3,000 baht. The price adapts to the market.",
    th: "ค่าเริ่มต้น 3,000 บาท ราคาปรับตามตลาด",
  },
  {
    path: ["inputs", "ownStudents"],
    en: "Students in your own classes this month",
    th: "จำนวนนักเรียนในคลาสของคุณเดือนนี้",
  },
  {
    path: ["inputs", "directTutors"],
    en: "Direct tutors in your network",
    th: "ติวเตอร์ชั้นแรกในเครือข่ายของคุณ",
  },
  {
    path: ["inputs", "studentsPerDirect"],
    en: "Students for each direct tutor",
    th: "จำนวนนักเรียนของติวเตอร์ชั้นแรกแต่ละคน",
  },
  {
    path: ["results", "ownGV"],
    en: "Your own volume",
    th: "ยอดรวมของคุณเอง",
  },
  {
    path: ["results", "networkGV"],
    en: "Network volume",
    th: "ยอดรวมของเครือข่าย",
  },
  {
    path: ["results", "rate"],
    en: "Commission rate",
    th: "อัตราค่าคอมมิชชัน",
  },
  {
    path: ["results", "gross"],
    en: "Gross commission",
    th: "ค่าคอมมิชชันก่อนหัก",
  },
  {
    path: ["results", "downline"],
    en: "Downline deduction",
    th: "ส่วนที่หักให้ดาวน์ไลน์",
  },
  {
    path: ["results", "tax"],
    en: "Withholding tax (3%)",
    th: "ภาษีหัก ณ ที่จ่าย (3%)",
  },
  {
    path: ["results", "net"],
    en: "Net payout",
    th: "เงินที่ได้รับสุทธิ",
  },
  {
    path: ["explain", "ownOnly"],
    en: "No downline this month, so the whole gross amount is the payout.",
    th: "เดือนนี้ไม่มีดาวน์ไลน์ เงินก่อนหักทั้งหมดจึงเป็นเงินที่คุณได้รับ",
  },
  {
    path: ["explain", "withDownline"],
    en: "Your rate applies to the whole network volume. The payouts of the tutors directly below you come off, and so does 3% withholding tax.",
    th: "อัตราของคุณคิดกับยอดรวมทั้งเครือข่าย จากนั้นหักเงินที่ติวเตอร์ที่อยู่ใต้คุณโดยตรงได้รับ และหักภาษีหัก ณ ที่จ่าย 3%",
  },
  {
    path: ["explain", "zero"],
    en: "Add students to see a month.",
    th: "ใส่จำนวนนักเรียนเพื่อดูยอดของเดือน",
  },
  {
    path: ["chart", "leg"],
    en: "Leg",
    th: "สายงาน",
  },
  {
    path: ["chart", "you"],
    en: "Your payout",
    th: "เงินที่คุณได้รับ",
  },
  {
    path: ["chart", "volume"],
    en: "Volume",
    th: "ยอดรวม",
  },
  {
    path: ["presets", "0", "name"],
    en: "A new tutor",
    th: "ติวเตอร์ใหม่",
  },
  {
    path: ["presets", "0", "setup"],
    en: "Four students, no network.",
    th: "นักเรียนสี่คน ไม่มีเครือข่าย",
  },
  {
    path: ["presets", "0", "result"],
    en: "12,000 baht of volume at a rate of 46%. The gross is 5,520 baht, and with no downline it is all payout. After 3% withholding tax: 5,354 baht.",
    th: "ยอดรวม 12,000 บาท ที่อัตรา 46% ค่าคอมมิชชันก่อนหัก 5,520 บาท ไม่มีดาวน์ไลน์ จึงได้รับทั้งหมด หลังหักภาษีหัก ณ ที่จ่าย 3% เหลือ 5,354 บาท",
  },
  {
    path: ["presets", "1", "name"],
    en: "A tutor with two direct tutors",
    th: "ติวเตอร์ที่มีติวเตอร์ชั้นแรกสองคน",
  },
  {
    path: ["presets", "1", "setup"],
    en: "Two own students, and two direct tutors with three students each.",
    th: "นักเรียนของตัวเองสองคน และติวเตอร์ชั้นแรกสองคนที่มีนักเรียนคนละสามคน",
  },
  {
    path: ["presets", "1", "result"],
    en: "24,000 baht of network volume at a rate of 52.7%. The gross is 12,656 baht, and the two direct tutors earn 8,010 baht of it. The payout is 4,646 baht before tax, and 4,506 baht after 3% withholding tax.",
    th: "ยอดรวมของเครือข่าย 24,000 บาท ที่อัตรา 52.7% ค่าคอมมิชชันก่อนหัก 12,656 บาท โดยติวเตอร์ชั้นแรกสองคนได้รับ 8,010 บาท เหลือจ่ายก่อนภาษี 4,646 บาท และหลังหักภาษีหัก ณ ที่จ่าย 3% เหลือ 4,506 บาท",
  },
  {
    path: ["presets", "2", "name"],
    en: "A small team, three legs",
    th: "ทีมเล็ก สามสายงาน",
  },
  {
    path: ["presets", "2", "setup"],
    en: "Two own students, and three direct tutors with three students each.",
    th: "นักเรียนของตัวเองสองคน และติวเตอร์ชั้นแรกสามคนที่มีนักเรียนคนละสามคน",
  },
  {
    path: ["presets", "2", "result"],
    en: "33,000 baht of network volume at a rate of 56.7%. The gross is 18,709 baht, and the three direct tutors earn 12,015 baht of it. The payout is 6,694 baht before tax, and 6,494 baht after 3% withholding tax.",
    th: "ยอดรวมของเครือข่าย 33,000 บาท ที่อัตรา 56.7% ค่าคอมมิชชันก่อนหัก 18,709 บาท โดยติวเตอร์ชั้นแรกสามคนได้รับ 12,015 บาท เหลือจ่ายก่อนภาษี 6,694 บาท และหลังหักภาษีหัก ณ ที่จ่าย 3% เหลือ 6,494 บาท",
  },
  {
    path: ["disclaimer"],
    en: "Every figure in these examples is an illustration. Commission depends on the classes that run and are paid for.",
    th: "ตัวเลขทุกตัวในตัวอย่างนี้เป็นการอธิบายให้เห็นภาพ ค่าคอมมิชชันขึ้นอยู่กับคลาสที่เปิดสอนและมีการจ่ายเงินจริง",
  },
];

/** The forbidden June claims of D-16, matched case-insensitively. */
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

/** The superseded two-level figures of D-2 and D-3. */
const ABSENT_FIGURES = ["5,884", "5,707", "22,714", "9,889"] as const;

/** Returns the calculator block, or an empty object when the key is missing. */
function block(locale: Locale): Dict {
  const value = DICTS[locale].calculator;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Dict)
    : {};
}

/** Reads one path from a node. Returns undefined for a missing path. */
function read(node: unknown, path: readonly string[]): unknown {
  let value: unknown = node;
  for (const part of path) {
    if (value === null || typeof value !== "object" || !(part in value)) return undefined;
    value = (value as Dict)[part];
  }
  return value;
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

/** Adds one string leaf at a path in a shallow copy; used for positive controls. */
function withLeaf(obj: Dict, path: readonly string[], value: string): Dict {
  const root: Dict = { ...obj };
  let cursor = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const existing = cursor[path[i]];
    const child: Dict = existing !== null && typeof existing === "object" ? { ...(existing as Dict) } : {};
    cursor[path[i]] = child;
    cursor = child;
  }
  cursor[path[path.length - 1]] = value;
  return root;
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

describe("1. the calculator block exists", () => {
  it("exists in en, th, and zh", () => {
    expect(DICTS.en.calculator).toBeDefined();
    expect(DICTS.th.calculator).toBeDefined();
    expect(DICTS.zh.calculator).toBeDefined();
  });
});

describe("2. en and th copy pinned word for word (AC-5)", () => {
  it("holds all 34 string leaves in en", () => {
    const leaves = stringLeaves(block("en"));
    expect(Object.keys(leaves).length).toBe(PINS.length);
    // Self-check: a wrong pin path fails here with its key, not as a copy mismatch below.
    for (const pin of PINS) {
      expect(typeof read(block("en"), pin.path), `pin path ${leafKey(pin.path)}`).toBe("string");
    }
    for (const pin of PINS) {
      expect(leaves[leafKey(pin.path)]).toBe(pin.en);
    }
  });

  it("holds all 34 string leaves in th", () => {
    const leaves = stringLeaves(block("th"));
    expect(Object.keys(leaves).length).toBe(PINS.length);
    for (const pin of PINS) {
      expect(leaves[leafKey(pin.path)]).toBe(pin.th);
    }
  });
});

describe("3. key order and structure (AC-5)", () => {
  it("keeps the spec 5.4 key order in en, th, and zh", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(block(locale))).toEqual([...KEY_ORDER]);
    }
  });

  it("uses the same string key paths in en, th, and zh", () => {
    const enPaths = Object.keys(stringLeaves(block("en"))).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(stringLeaves(block(locale))).sort()).toEqual(enPaths);
    }
  });

  it("has no second-level keys (D-4)", () => {
    for (const locale of LOCALES) {
      expect(read(block(locale), ["inputs", "secondLevel"])).toBeUndefined();
      expect(read(block(locale), ["inputs", "studentsSecondLevel"])).toBeUndefined();
      expect(read(block(locale), ["explain", "twoLevels"])).toBeUndefined();
    }
  });

  it("detects each dropped key when it is injected (positive control)", () => {
    for (const path of [
      ["inputs", "secondLevel"],
      ["inputs", "studentsSecondLevel"],
      ["explain", "twoLevels"],
    ]) {
      const probe = withLeaf(block("en"), path, "probe");
      expect(read(probe, path)).toBe("probe");
    }
  });
});

describe("4. zh holds the English lines (D-10)", () => {
  it("equals en at every pinned key path", () => {
    for (const pin of PINS) {
      expect(read(block("zh"), pin.path)).toBe(pin.en);
    }
  });

  it("equals the whole en leaf map", () => {
    expect(stringLeaves(block("zh"))).toEqual(stringLeaves(block("en")));
  });
});

describe("5. preset 3 draft of D-2a", () => {
  it("pins the en draft name, setup, and result", () => {
    expect(read(block("en"), ["presets", "2", "name"])).toBe("A small team, three legs");
    expect(read(block("en"), ["presets", "2", "setup"])).toBe(
      "Two own students, and three direct tutors with three students each.",
    );
    expect(read(block("en"), ["presets", "2", "result"])).toBe(
      "33,000 baht of network volume at a rate of 56.7%. The gross is 18,709 baht, and the three direct tutors earn 12,015 baht of it. The payout is 6,694 baht before tax, and 6,494 baht after 3% withholding tax.",
    );
  });

  it("pins the th draft name, setup, and result", () => {
    expect(read(block("th"), ["presets", "2", "name"])).toBe("ทีมเล็ก สามสายงาน");
    expect(read(block("th"), ["presets", "2", "setup"])).toBe(
      "นักเรียนของตัวเองสองคน และติวเตอร์ชั้นแรกสามคนที่มีนักเรียนคนละสามคน",
    );
    expect(read(block("th"), ["presets", "2", "result"])).toBe(
      "ยอดรวมของเครือข่าย 33,000 บาท ที่อัตรา 56.7% ค่าคอมมิชชันก่อนหัก 18,709 บาท โดยติวเตอร์ชั้นแรกสามคนได้รับ 12,015 บาท เหลือจ่ายก่อนภาษี 6,694 บาท และหลังหักภาษีหัก ณ ที่จ่าย 3% เหลือ 6,494 บาท",
    );
  });

  it("pins the three chart draft labels in en and th", () => {
    for (const [key, enValue, thValue] of [
      ["leg", "Leg", "สายงาน"],
      ["you", "Your payout", "เงินที่คุณได้รับ"],
      ["volume", "Volume", "ยอดรวม"],
    ] as const) {
      expect(read(block("en"), ["chart", key])).toBe(enValue);
      expect(read(block("th"), ["chart", key])).toBe(thValue);
    }
  });
});

describe("6. superseded figures are absent (AC-7)", () => {
  it("finds no 5,884, 5,707, 22,714, or 9,889 in any calculator block", () => {
    for (const locale of LOCALES) {
      expect(findTokens(stringLeaves(block(locale)), [...ABSENT_FIGURES])).toEqual([]);
    }
  });

  it("detects each superseded figure when it is injected (positive control)", () => {
    for (const figure of ABSENT_FIGURES) {
      const probe = { ...stringLeaves(block("en")), __probe: figure };
      expect(findTokens(probe, [figure]).some((hit) => hit.path === "__probe")).toBe(true);
    }
  });
});

describe("7. price default of 3,000 (AC-8)", () => {
  it("keeps 3,000 in the en price note", () => {
    const value = read(block("en"), ["inputs", "priceNote"]);
    expect(value).toBe("Default: 3,000 baht. The price adapts to the market.");
    expect(typeof value === "string" && value.includes("3,000")).toBe(true);
  });

  it("keeps 3,000 in the th price note", () => {
    const value = read(block("th"), ["inputs", "priceNote"]);
    expect(value).toBe("ค่าเริ่มต้น 3,000 บาท ราคาปรับตามตลาด");
    expect(typeof value === "string" && value.includes("3,000")).toBe(true);
  });
});

describe("8. June claims are absent (D-16, AC-8)", () => {
  it("finds no forbidden claim in any calculator block", () => {
    for (const locale of LOCALES) {
      expect(findTokens(stringLeaves(block(locale)), [...FORBIDDEN_CLAIMS])).toEqual([]);
    }
  });

  it("fails on each forbidden claim when it is injected (positive control)", () => {
    for (const claim of FORBIDDEN_CLAIMS) {
      const probe = { ...stringLeaves(block("en")), __probe: claim };
      expect(findTokens(probe, [claim]).some((hit) => hit.path === "__probe")).toBe(true);
    }
  });
});

/** Returns the screens block, or an empty object when the key is missing. */
function screensBlock(locale: Locale): Dict {
  const value = DICTS[locale].screens;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Dict)
    : {};
}

/**
 * One row per string leaf of the screens block (spec 6.3): exact en copy, exact th copy.
 * Nine leaves: the three section strings plus caption and alt for each of the three slots.
 */
const SCREEN_PINS: readonly { path: readonly string[]; en: string; th: string }[] = [
  {
    path: ["eyebrow"],
    en: "INSIDE THE APPS",
    th: "ภายในแอป",
  },
  {
    path: ["heading"],
    en: "The student app and the tutor app",
    th: "แอปของนักเรียน และแอปของติวเตอร์",
  },
  {
    path: ["description"],
    en: "A student joins the class in LINE. The tutor runs the class in the tutor app. Both follow the same printed workbook.",
    th: "นักเรียนเข้าคลาสผ่าน LINE ติวเตอร์สอนผ่านแอปของติวเตอร์ ทั้งสองใช้เวิร์กบุ๊กที่พิมพ์เป็นเล่มชุดเดียวกัน",
  },
  {
    path: ["items", "0", "caption"],
    en: "The student's home: the next class, the lesson, and Reedy practice.",
    th: "หน้าแรกของนักเรียน: คลาสถัดไป บทเรียน และการฝึกพูดกับ Reedy",
  },
  {
    path: ["items", "0", "alt"],
    en: "Tutor Advantage student app home screen",
    th: "หน้าแรกของแอปนักเรียน Tutor Advantage",
  },
  {
    path: ["items", "1", "caption"],
    en: "One lesson, 18 phases. The app follows the printed workbook step by step.",
    th: "หนึ่งบทเรียน 18 ช่วง แอปพาไปทีละขั้นตามเวิร์กบุ๊กที่พิมพ์เป็นเล่ม",
  },
  {
    path: ["items", "1", "alt"],
    en: "Tutor app showing the 18 phases of one lesson",
    th: "แอปติวเตอร์แสดง 18 ช่วงของบทเรียนหนึ่งบท",
  },
  {
    path: ["items", "2", "caption"],
    en: "The tutor's class list: who is in today's class and which lesson they are on.",
    th: "รายชื่อคลาสของติวเตอร์: วันนี้มีใครบ้าง และแต่ละคนอยู่บทไหน",
  },
  {
    path: ["items", "2", "alt"],
    en: "Tutor app class list with the students of one class",
    th: "รายชื่อนักเรียนในคลาสหนึ่งของแอปติวเตอร์",
  },
];

describe("9. the screens block exists (AC-10)", () => {
  it("exists in en, th, and zh", () => {
    expect(DICTS.en.screens).toBeDefined();
    expect(DICTS.th.screens).toBeDefined();
    expect(DICTS.zh.screens).toBeDefined();
  });

  it("sits after tutorRole and before calculator in every dictionary", () => {
    for (const locale of LOCALES) {
      const keys = Object.keys(DICTS[locale]);
      const screens = keys.indexOf("screens");
      expect(screens, `${locale} screens index`).toBeGreaterThan(-1);
      expect(screens, `${locale} after tutorRole`).toBeGreaterThan(keys.indexOf("tutorRole"));
      expect(screens, `${locale} before calculator`).toBeLessThan(keys.indexOf("calculator"));
    }
  });
});

describe("10. screens copy pinned word for word (AC-10, spec 6.3)", () => {
  it("holds all nine string leaves in en", () => {
    const leaves = stringLeaves(screensBlock("en"));
    expect(Object.keys(leaves).length).toBe(SCREEN_PINS.length);
    // Self-check: a wrong pin path fails here with its key, not as a copy mismatch below.
    for (const pin of SCREEN_PINS) {
      expect(typeof read(screensBlock("en"), pin.path), `pin path ${leafKey(pin.path)}`).toBe(
        "string",
      );
    }
    for (const pin of SCREEN_PINS) {
      expect(leaves[leafKey(pin.path)]).toBe(pin.en);
    }
  });

  it("holds all nine string leaves in th", () => {
    const leaves = stringLeaves(screensBlock("th"));
    expect(Object.keys(leaves).length).toBe(SCREEN_PINS.length);
    for (const pin of SCREEN_PINS) {
      expect(leaves[leafKey(pin.path)]).toBe(pin.th);
    }
  });

  it("uses the same string key paths in en, th, and zh", () => {
    const enPaths = Object.keys(stringLeaves(screensBlock("en"))).sort();
    expect(enPaths.length).toBe(SCREEN_PINS.length);
    for (const locale of LOCALES) {
      expect(Object.keys(stringLeaves(screensBlock(locale))).sort()).toEqual(enPaths);
    }
  });

  it("keeps the zh values equal to the en values (D-10)", () => {
    expect(stringLeaves(screensBlock("zh"))).toEqual(stringLeaves(screensBlock("en")));
    for (const pin of SCREEN_PINS) {
      expect(read(screensBlock("zh"), pin.path)).toBe(pin.en);
    }
  });

  it("carries no draft marker in any value (D-15a)", () => {
    for (const locale of LOCALES) {
      expect(findTokens(stringLeaves(screensBlock(locale)), ["draft"])).toEqual([]);
    }
  });

  it("detects a draft marker when it is injected (positive control)", () => {
    const probe = { ...stringLeaves(screensBlock("en")), __probe: "draft" };
    expect(findTokens(probe, ["draft"]).some((hit) => hit.path === "__probe")).toBe(true);
  });
});
