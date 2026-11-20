import { describe, expect, it } from "vitest";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";

/*
 * Red r4 pins for the FP1 stacking rule (track www_features_pricing_20261120).
 * Source: spec v1.2 section 4 (commits d123d385, f2eee0cf, 7330789d, 640edec0;
 * fact gate PASS). Pricing page only; the features page must not change.
 * Every stacking case below must fail at 2ffa43f8b, where the old five-row
 * copy is still live. The test reads the existing locale message source only
 * and pins no layout.
 */

type Messages = Record<string, unknown>;

/** Reads a nested locale scope without naming Green-chosen section keys. */
function scopeOf(messages: unknown, path: string[]): unknown {
  let value: unknown = messages;
  for (const segment of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Messages)[segment];
  }
  return value;
}

/** Collects every string leaf under a locale value. */
function collectLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectLeaves);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Messages).flatMap(collectLeaves);
  }
  return [];
}

const enPricing = scopeOf(enMessages, ["pages", "pricing"]) as Messages;
const thPricing = scopeOf(thMessages, ["pages", "pricing"]) as Messages;
const zhPricing = scopeOf(zhMessages, ["pages", "pricing"]) as Messages;

const enLeaves = collectLeaves(enPricing);
const thLeaves = collectLeaves(thPricing);
const zhLeaves = collectLeaves(zhPricing);

/** New stacking strings, word for word from spec v1.2 section 4. */
const NEW_EN = [
  "Each grade picks one English program: Storytime Advantage, Primary Advantage, or Reading Advantage. Each English program is priced on its own. Schools add more subjects for the same students.",
  "Each total counts the same students in the same grades. A school picks one English program per grade, then adds subjects on the same curve.",
  "Primary Advantage plus Math Advantage for the same students: 1,800 baht",
  "A school that chooses Primary Advantage English and Math Advantage for the same students pays 1,800 baht per student per year for the app, teacher training and support.",
  "Schools start with one English program per grade. Science Advantage, Math Advantage and Zhongwen Advantage are planned for the 2027 school year.",
  "Each subject counts once toward the per-student yearly total. English counts once, through the one English program of that grade. Science Advantage, Math Advantage and Zhongwen Advantage are planned for the 2027 school year.",
];

/** New stacking strings in Thai (TH-FP-R2-01, 03, 04, 05, 06, 07). */
const NEW_TH = [
  "แต่ละชั้นเลือกโปรแกรมภาษาอังกฤษหนึ่งโปรแกรม: Storytime Advantage, Primary Advantage หรือ Reading Advantage แต่ละโปรแกรมคิดราคาแยกกัน และเพิ่มวิชาได้อีกสำหรับนักเรียนกลุ่มเดียวกัน",
  "ราคารวมแต่ละขั้นนับนักเรียนกลุ่มเดียวกันในชั้นเดียวกัน โรงเรียนเลือกโปรแกรมภาษาอังกฤษหนึ่งโปรแกรมต่อหนึ่งชั้น แล้วเพิ่มวิชาตามอัตราค่าบริการเดียวกัน",
  "Primary Advantage บวก Math Advantage สำหรับนักเรียนกลุ่มเดียวกัน: 1,800 บาท",
  "โรงเรียนที่เลือกภาษาอังกฤษผ่าน Primary Advantage และ Math Advantage สำหรับนักเรียนกลุ่มเดียวกัน จ่าย 1,800 บาทต่อนักเรียนหนึ่งคนต่อปี สำหรับแอป การอบรมครู และการสนับสนุน",
  "โรงเรียนเริ่มด้วยโปรแกรมภาษาอังกฤษหนึ่งโปรแกรมต่อหนึ่งชั้น ส่วน Science Advantage, Math Advantage และ Zhongwen Advantage วางแผนไว้สำหรับปีการศึกษา 2027",
  "วิชาแต่ละวิชาในหลักสูตรของโรงเรียนนับรวมหนึ่งครั้งในราคารายปีต่อนักเรียนหนึ่งคน วิชาภาษาอังกฤษนับหนึ่งครั้งผ่านโปรแกรมภาษาอังกฤษประจำชั้นนั้น ส่วน Science Advantage, Math Advantage และ Zhongwen Advantage วางแผนไว้สำหรับปีการศึกษา 2027",
];

/** Exact S2 row labels, rows 1 to 4 only (TH-FP-R2-02). */
const NEW_ROW_LABELS_EN = [
  "1 subject | 1,200 baht | 1,200 baht",
  "2 subjects | +600 baht | 1,800 baht",
  "3 subjects | +400 baht | 2,200 baht",
  "4 subjects | +250 baht | 2,450 baht",
];
const NEW_ROW_LABELS_TH = [
  "1 วิชา | 1,200 บาท | 1,200 บาท",
  "2 วิชา | +600 บาท | 1,800 บาท",
  "3 วิชา | +400 บาท | 2,200 บาท",
  "4 วิชา | +250 บาท | 2,450 บาท",
];

/** Replaced v1.1 stacking wording that must be gone from the page. */
const OLD_EN = [
  "Start with English through Primary Advantage. Add subjects as your school's program grows.",
  "Each further subject adds 250 baht per student per year.",
  "English plus Math: 1,800 baht",
  "A school that chooses English and Math pays 1,800 baht per student per year for the app, teacher training and support.",
  "Schools can start with English through Primary Advantage. Science Advantage, Math Advantage and Zhongwen Advantage are planned for the 2027 school year.",
  "Each subject in the school program counts toward the per-student yearly total. English is available through Primary Advantage.",
  "5 subjects | +250 baht | 2,700 baht",
];
const OLD_TH = [
  "เริ่มจากภาษาอังกฤษผ่าน Primary Advantage แล้วเพิ่มวิชาอื่นเมื่อหลักสูตรของโรงเรียนเติบโตขึ้น",
  "วิชาเพิ่มเติมแต่ละวิชาคิดเพิ่ม 250 บาทต่อนักเรียนหนึ่งคนต่อปี",
  "ภาษาอังกฤษและคณิตศาสตร์: 1,800 บาท",
  "โรงเรียนที่เลือกภาษาอังกฤษและคณิตศาสตร์ จ่าย 1,800 บาทต่อนักเรียนหนึ่งคนต่อปี",
  "โรงเรียนเริ่มสอนภาษาอังกฤษผ่าน Primary Advantage ได้",
  "โรงเรียนสามารถเรียนภาษาอังกฤษผ่าน Primary Advantage",
  "5 วิชา | +250 บาท | 2,700 บาท",
];

/** Returns the subject-table rows array from a pricing scope. */
function tableRows(pricing: Messages): Array<{ cells: string[]; label: string }> {
  const subjects = pricing.subjects as Messages;
  return subjects.rows as Array<{ cells: string[]; label: string }>;
}

describe("control: stacking scanners resolve the pricing source", () => {
  it("control: the pricing scope holds string leaves in every locale", () => {
    expect(enLeaves.length, "en pricing leaves: more than 0").toBeGreaterThan(0);
    expect(thLeaves.length, "th pricing leaves: more than 0").toBeGreaterThan(0);
    expect(zhLeaves.length, "zh pricing leaves: more than 0").toBeGreaterThan(0);
  });

  it("control: the subject table rows array is found", () => {
    expect(tableRows(enPricing).length, "en table rows: more than 0").toBeGreaterThan(0);
    expect(tableRows(thPricing).length, "th table rows: more than 0").toBeGreaterThan(0);
  });

  it("control: the 3,000 baht Tutor floor stays on the page", () => {
    expect(enLeaves.includes("3,000 baht"), "en floor: present").toBe(true);
    expect(thLeaves.includes("3,000 บาท"), "th floor: present").toBe(true);
  });
});

describe("FP1 en: stacking rule word for word (spec v1.2 section 4)", () => {
  it("S1 body 1 names one English program per grade", () => {
    expect(enLeaves.some((leaf) => leaf.includes(NEW_EN[0])), "en S1 body 1: present").toBe(true);
  });

  it("S2 table holds rows 1 to 4 only with the exact labels", () => {
    const rows = tableRows(enPricing);
    expect(rows.length, "en table rows: 4").toBe(4);
    expect(
      rows.map((row) => row.label),
      "en row labels: rows 1 to 4",
    ).toEqual(NEW_ROW_LABELS_EN);
  });

  it("S2 note counts the same students in the same grades", () => {
    expect(enLeaves.some((leaf) => leaf.includes(NEW_EN[1])), "en S2 note: present").toBe(true);
  });

  it("S3 heading pairs Primary and Math for the same students", () => {
    expect(enLeaves.some((leaf) => leaf.includes(NEW_EN[2])), "en S3 heading: present").toBe(true);
  });

  it("S3 body 1 prices Primary plus Math at 1,800 baht", () => {
    expect(enLeaves.some((leaf) => leaf.includes(NEW_EN[3])), "en S3 body 1: present").toBe(true);
  });

  it("S6 body starts with one English program per grade", () => {
    expect(enLeaves.some((leaf) => leaf.includes(NEW_EN[4])), "en S6 body: present").toBe(true);
  });

  it("S9 answer 1 counts each subject once", () => {
    expect(enLeaves.some((leaf) => leaf.includes(NEW_EN[5])), "en S9 answer 1: present").toBe(true);
  });
});

describe("FP1 th: stacking rule word for word (TH-FP-R2-01 to 07)", () => {
  it("S1 body 1 names one English program per grade", () => {
    expect(thLeaves.some((leaf) => leaf.includes(NEW_TH[0])), "th S1 body 1: present").toBe(true);
  });

  it("S2 table holds rows 1 to 4 only with the exact labels", () => {
    const rows = tableRows(thPricing);
    expect(rows.length, "th table rows: 4").toBe(4);
    expect(
      rows.map((row) => row.label),
      "th row labels: rows 1 to 4",
    ).toEqual(NEW_ROW_LABELS_TH);
  });

  it("S2 note counts the same students in the same grades", () => {
    expect(thLeaves.some((leaf) => leaf.includes(NEW_TH[1])), "th S2 note: present").toBe(true);
  });

  it("S3 heading pairs Primary and Math for the same students", () => {
    expect(thLeaves.some((leaf) => leaf.includes(NEW_TH[2])), "th S3 heading: present").toBe(true);
  });

  it("S3 body 1 prices Primary plus Math at 1,800 baht", () => {
    expect(thLeaves.some((leaf) => leaf.includes(NEW_TH[3])), "th S3 body 1: present").toBe(true);
  });

  it("S6 body starts with one English program per grade", () => {
    expect(thLeaves.some((leaf) => leaf.includes(NEW_TH[4])), "th S6 body: present").toBe(true);
  });

  it("S9 answer 1 counts each subject once", () => {
    expect(thLeaves.some((leaf) => leaf.includes(NEW_TH[5])), "th S9 answer 1: present").toBe(true);
  });
});

describe("FP1 zh: new numbers with English copy (track zh rule)", () => {
  it("zh carries the new English stacking strings", () => {
    const missing = NEW_EN.filter((text) => !zhLeaves.some((leaf) => leaf.includes(text)));
    expect(missing, "zh missing new strings: none").toEqual([]);
  });

  it("zh table holds rows 1 to 4 only", () => {
    const rows = tableRows(zhPricing);
    expect(rows.length, "zh table rows: 4").toBe(4);
    expect(
      rows.map((row) => row.label),
      "zh row labels: rows 1 to 4",
    ).toEqual(NEW_ROW_LABELS_EN);
  });
});

describe("FP1: replaced stacking wording is gone", () => {
  it("no replaced English stacking line remains", () => {
    const kept = OLD_EN.filter((text) => enLeaves.some((leaf) => leaf.includes(text)));
    expect(kept, "kept old en lines: none").toEqual([]);
  });

  it("no replaced Thai stacking line remains", () => {
    const kept = OLD_TH.filter((text) => thLeaves.some((leaf) => leaf.includes(text)));
    expect(kept, "kept old th lines: none").toEqual([]);
  });

  it("no 5-subject row and no 2,700 anywhere in any locale", () => {
    for (const [name, leaves] of [["en", enLeaves], ["th", thLeaves], ["zh", zhLeaves]] as const) {
      const hit = leaves.filter((text) => text.includes("2,700") || text.includes("5 subject") || text.includes("5 วิชา"));
      expect(hit, `${name} 5-subject or 2,700 hits: none`).toEqual([]);
    }
  });
});
