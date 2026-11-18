/**
 * Red tests for the real period wording of the year-file parsers (plan task
 * 10.14, PM 2026-11-14, spec section 9b). The first dry run read 91 real
 * files and `parseYearFile` parsed none, because the parsers key on the labels
 * `ประจำเดือน` and `รอบระยะเวลาบัญชี`, and the real files do not hold them.
 *
 * Contract pinned for the Green task 10.15:
 * 1. PND.1: after the column header `เดือน/ปีภาษี`, the first line of the shape
 *    `{m}/{yyyy}` (m from 1 to 12, a four-digit Buddhist year) is the period. A
 *    date line `{d}/{m}/{yyyy}` between the header and that line is not the
 *    period. No header, or no such line within a few lines after the header,
 *    gives `period-unreadable`. This file pins: offset 3 parses, offset 8 does
 *    not. The window size between 3 and 7 lines is the choice of the Green.
 * 2. PND.53: under the header `วัน เดือน ปี ที่จ่าย`, the date rows
 *    `{d}/{m}/{yyyy}` that share one month and one year give the period. Two or
 *    more months, or no date row, give `period-unreadable`.
 * 3. PND.3: after the label `เดือนที่จ่ายเงินได้พึงประเมิน`, the year comes from
 *    `พ.ศ. {yyyy}` on the following line. The month is the entry
 *    `({n}) {month}` that FOLLOWS the single tick `ü` (U+00FC) on the same
 *    line. The instruction line is not a tick. Zero ticks, two or more ticks,
 *    or a tick with no entry after it on the line give `period-unreadable`.
 * 4. The filing-date line `ยื่นวันที่ {d} เดือน {month} พ.ศ. {yyyy}` never
 *    gives the period.
 * 5. The old label patterns stay accepted.
 * 6. The parsers reuse the one month-name table of `document-parsing.ts`.
 *
 * Rows that pass at the base are characterization rows. Their names end with
 * `(characterization)`. They keep the Green from a regression.
 *
 * Fake data only. The fixtures hold the line `no real sample`, fake months, and
 * fake years. No real amount, tax id, name, address, company, file name, folder
 * id, or Drive id enters this file.
 *
 * Anti-pattern coverage:
 * - A3: every count is a labeled integer (`period_wording_rows=N`,
 *   `month_name_tables=1`).
 * - A4: every `period-unreadable` row has a twin row that parses the same
 *   shape with the wording present, so a parser that returns unmatched for
 *   everything cannot pass the file.
 * - A7: no exclusion filter holds an English word.
 * - A9: no row names a track path or a run path.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseWhtFilingPnd3 } from "../document-parsing.js";
import {
  parseWhtFilingPnd1,
  parseWhtFilingPnd53,
  parseYearFile,
  type YearFileParseResult,
} from "../year-file-parsers.js";

const FIXTURE_DIR = fileURLToPath(
  new URL("./__fixtures__/year-files", import.meta.url),
);
const MODULE_DIR = fileURLToPath(new URL("..", import.meta.url));

/** The tick character of the PND.3 month list, U+00FC. */
const TICK = "ü";

/** The PND.3 instruction line: it holds a quoted tick and the year. */
const PND3_INSTRUCTION = (year: string): string =>
  `(ให้ทำเครื่องหมาย " ${TICK}" ลงใน " " หน้าชื่อเดือน) พ.ศ. ${year}`;

/**
 * Reads one fixture text.
 * @param name The fixture file name.
 * @returns The fixture text.
 */
function fixtureText(name: string): string {
  return readFileSync(`${FIXTURE_DIR}/${name}`, "utf8");
}

/**
 * Builds a text from lines.
 * @param lines The lines; the first is always the fake marker.
 * @returns The text.
 */
function textOf(...lines: readonly string[]): string {
  return ["no real sample", ...lines].join("\n");
}

/**
 * Asserts a parsed month result.
 * @param result The parse result.
 * @param expected Type key, CE year, month, and the last day of the month.
 */
function expectMonth(
  result: YearFileParseResult,
  expected: {
    readonly typeKey: string;
    readonly year: number;
    readonly month: number;
    readonly lastDay: number;
  },
): void {
  const mm = String(expected.month).padStart(2, "0");
  const summary = `status=${result.status} reason=${String(result.unmatchedReason)}`;
  expect(result.status, `expected a parsed month, got ${summary}`).toBe("parsed");
  expect(result.unmatchedReason).toBeNull();
  expect(result.typeKey).toBe(expected.typeKey);
  expect(result.periodKind).toBe("month");
  expect(result.periodStart).toBe(`${expected.year}-${mm}-01`);
  expect(result.periodEnd).toBe(
    `${expected.year}-${mm}-${String(expected.lastDay).padStart(2, "0")}`,
  );
  expect(result.taxYear).toBe(expected.year);
  expect(result.sourceMonth).toBe(`${expected.year}-${mm}`);
}

/**
 * Asserts an unreadable period.
 * @param result The parse result.
 */
function expectUnreadable(result: YearFileParseResult): void {
  expect(result.status).toBe("unmatched");
  expect(result.unmatchedReason).toBe("period-unreadable");
  expect(result.periodStart).toBeNull();
  expect(result.periodEnd).toBeNull();
}

/** The twelve month lines of a PND.3 list, one entry on each line, no tick. */
const PLAIN_MONTH_LINES: readonly string[] = [
  "(1) มกราคม",
  "(2) กุมภาพันธ์",
  "(3) มีนาคม",
  "(4) เมษายน",
  "(5) พฤษภาคม",
  "(6) มิถุนายน",
  "(7) กรกฎาคม",
  "(8) สิงหาคม",
  "(9) กันยายน",
  "(10) ตุลาคม",
  "(11) พฤศจิกายน",
  "(12) ธันวาคม",
];

/**
 * Builds a PND.3 text with the real label and a month list.
 * @param options The instruction year, the month lines, and the filing line.
 * @returns The text.
 */
function pnd3Text(options: {
  readonly instruction?: string;
  readonly monthLines: readonly string[];
  readonly filingLine?: string;
}): string {
  return textOf(
    "แบบ ภ.ง.ด.3 รายการภาษีที่หัก ณ ที่จ่าย",
    "เดือนที่จ่ายเงินได้พึงประเมิน",
    options.instruction ?? PND3_INSTRUCTION("2568"),
    ...options.monthLines,
    "จำนวนผู้มีรายได้ (ราย): 9",
    options.filingLine ?? "ยื่นวันที่ 7 เมษายน พ.ศ. 2568",
  );
}

/**
 * Replaces one plain month line by a ticked month line.
 * @param lines The plain month lines.
 * @param index The zero-based line index to replace.
 * @param replacement The new line text.
 * @returns The new month lines.
 */
function withLine(
  lines: readonly string[],
  index: number,
  replacement: string,
): string[] {
  return lines.map((line, at) => (at === index ? replacement : line));
}

describe("PND.1 real period wording (task 10.14, rule 1)", () => {
  it("reads the period from the first m/yyyy line after the header, not from the date line", () => {
    const result = parseWhtFilingPnd1({ text: fixtureText("pnd1-real-period.txt") });
    expectMonth(result, {
      typeKey: "wht-filing-pnd1",
      year: 2025,
      month: 2,
      lastDay: 28,
    });
  });

  it("reads Thai digits on the m/yyyy line", () => {
    const result = parseWhtFilingPnd1({
      text: textOf(
        "แบบ ภ.ง.ด.1 รายการภาษีที่หัก ณ ที่จ่าย",
        "เดือน/ปีภาษี",
        "๕/๓/๒๕๖๘",
        "๒/๒๕๖๘",
      ),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd1",
      year: 2025,
      month: 2,
      lastDay: 28,
    });
  });

  it("reads an m/yyyy line that follows the header directly", () => {
    const result = parseWhtFilingPnd1({
      text: textOf("แบบ ภ.ง.ด.1", "เดือน/ปีภาษี", "1/2568"),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd1",
      year: 2025,
      month: 1,
      lastDay: 31,
    });
  });

  it("reads an m/yyyy line three lines after the header (window floor)", () => {
    const result = parseWhtFilingPnd1({
      text: textOf(
        "แบบ ภ.ง.ด.1",
        "เดือน/ปีภาษี",
        "5/3/2568",
        "ลำดับ",
        "12/2568",
      ),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd1",
      year: 2025,
      month: 12,
      lastDay: 31,
    });
  });

  it("gives period-unreadable when only a date line follows the header (characterization)", () => {
    const result = parseWhtFilingPnd1({
      text: textOf("แบบ ภ.ง.ด.1", "เดือน/ปีภาษี", "5/3/2568", "ลำดับ"),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable when no header exists, also with a stray m/yyyy line (characterization)", () => {
    const result = parseWhtFilingPnd1({
      text: textOf("แบบ ภ.ง.ด.1", "ลำดับ", "2/2568"),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable when the m/yyyy line is eight lines after the header (characterization)", () => {
    const filler = ["a", "b", "c", "d", "e", "f", "g"];
    const result = parseWhtFilingPnd1({
      text: textOf("แบบ ภ.ง.ด.1", "เดือน/ปีภาษี", ...filler, "2/2568"),
    });
    expectUnreadable(result);
  });

  it.each([
    ["month 13", "13/2568"],
    ["month 0", "0/2568"],
    ["two-digit year", "3/68"],
    ["year below the accepted range", "3/2400"],
  ])("gives period-unreadable for %s after the header (characterization)", (_name, line) => {
    const result = parseWhtFilingPnd1({
      text: textOf("แบบ ภ.ง.ด.1", "เดือน/ปีภาษี", line),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable for a file that holds only the filing-date line (characterization)", () => {
    const result = parseWhtFilingPnd1({
      text: fixtureText("pnd1-real-filing-date-only.txt"),
    });
    expectUnreadable(result);
  });

  it("keeps the old label pattern accepted (characterization)", () => {
    const result = parseWhtFilingPnd1({ text: fixtureText("pnd1-monthly.txt") });
    expectMonth(result, {
      typeKey: "wht-filing-pnd1",
      year: 2024,
      month: 1,
      lastDay: 31,
    });
  });
});

describe("PND.53 real period wording (task 10.14, rule 2)", () => {
  it("reads one period from the payment dates under the header", () => {
    const result = parseWhtFilingPnd53({
      text: fixtureText("pnd53-real-period.txt"),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd53",
      year: 2025,
      month: 2,
      lastDay: 28,
    });
  });

  it("reads one payment date row", () => {
    const result = parseWhtFilingPnd53({
      text: textOf("แบบ ภ.ง.ด.53", "วัน เดือน ปี ที่จ่าย", "29/2/2567"),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd53",
      year: 2024,
      month: 2,
      lastDay: 29,
    });
  });

  it("ignores a date row that sits before the header", () => {
    const result = parseWhtFilingPnd53({
      text: textOf(
        "แบบ ภ.ง.ด.53",
        "1/1/2568",
        "วัน เดือน ปี ที่จ่าย",
        "12/2/2568",
        "20/2/2568",
      ),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd53",
      year: 2025,
      month: 2,
      lastDay: 28,
    });
  });

  it("gives period-unreadable for two months (characterization)", () => {
    const result = parseWhtFilingPnd53({
      text: textOf(
        "แบบ ภ.ง.ด.53",
        "วัน เดือน ปี ที่จ่าย",
        "28/2/2568",
        "2/3/2568",
      ),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable for one month in two years (characterization)", () => {
    const result = parseWhtFilingPnd53({
      text: textOf(
        "แบบ ภ.ง.ด.53",
        "วัน เดือน ปี ที่จ่าย",
        "12/2/2567",
        "12/2/2568",
      ),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable when the header has no date row (characterization)", () => {
    const result = parseWhtFilingPnd53({
      text: textOf("แบบ ภ.ง.ด.53", "วัน เดือน ปี ที่จ่าย", "ลำดับ"),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable for a file that holds only the filing-date line (characterization)", () => {
    const result = parseWhtFilingPnd53({
      text: textOf("แบบ ภ.ง.ด.53", "ยื่นวันที่ 7 มีนาคม พ.ศ. 2568"),
    });
    expectUnreadable(result);
  });

  it("keeps the old label pattern accepted (characterization)", () => {
    const result = parseWhtFilingPnd53({
      text: fixtureText("pnd53-monthly.txt"),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd53",
      year: 2025,
      month: 2,
      lastDay: 28,
    });
  });
});

describe("PND.3 real period wording (task 10.14, rule 3)", () => {
  it("reads the month that follows a tick at the start of the line", () => {
    const result = parseWhtFilingPnd3({
      text: fixtureText("pnd3-real-tick-first.txt"),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd3",
      year: 2025,
      month: 3,
      lastDay: 31,
    });
  });

  it("reads the month that follows a tick after an earlier month name", () => {
    const result = parseWhtFilingPnd3({
      text: fixtureText("pnd3-real-tick-after.txt"),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd3",
      year: 2025,
      month: 4,
      lastDay: 30,
    });
  });

  it("reads the entry after the tick, not the first entry of a two-entry line", () => {
    const result = parseWhtFilingPnd3({
      text: pnd3Text({
        monthLines: withLine(PLAIN_MONTH_LINES, 2, `${TICK} (3) มีนาคม (4) เมษายน`),
      }),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd3",
      year: 2025,
      month: 3,
      lastDay: 31,
    });
  });

  it("follows the tick, not the filing month minus one (rule 4)", () => {
    const result = parseWhtFilingPnd3({
      text: pnd3Text({
        monthLines: withLine(PLAIN_MONTH_LINES, 5, `${TICK} (6) มิถุนายน`),
        filingLine: "ยื่นวันที่ 7 กันยายน พ.ศ. 2568",
      }),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd3",
      year: 2025,
      month: 6,
      lastDay: 30,
    });
  });

  it("takes the year from the line after the label", () => {
    const result = parseWhtFilingPnd3({
      text: pnd3Text({
        instruction: PND3_INSTRUCTION("2567"),
        monthLines: withLine(PLAIN_MONTH_LINES, 1, `${TICK} (2) กุมภาพันธ์`),
        filingLine: "ยื่นวันที่ 7 มีนาคม พ.ศ. 2568",
      }),
    });
    expectMonth(result, {
      typeKey: "wht-filing-pnd3",
      year: 2024,
      month: 2,
      lastDay: 29,
    });
  });

  it("gives period-unreadable for zero ticks, with the tick only in the instruction line (characterization)", () => {
    const result = parseWhtFilingPnd3({
      text: pnd3Text({ monthLines: PLAIN_MONTH_LINES }),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable for two ticks (characterization)", () => {
    const lines = withLine(
      withLine(PLAIN_MONTH_LINES, 1, `${TICK} (2) กุมภาพันธ์`),
      2,
      `${TICK} (3) มีนาคม`,
    );
    expectUnreadable(parseWhtFilingPnd3({ text: pnd3Text({ monthLines: lines }) }));
  });

  it("gives period-unreadable for a tick with no entry after it on the line (characterization)", () => {
    const lines = withLine(PLAIN_MONTH_LINES, 4, `(5) พฤษภาคม ${TICK}`);
    expectUnreadable(parseWhtFilingPnd3({ text: pnd3Text({ monthLines: lines }) }));
  });

  it("gives period-unreadable when the line after the label holds no year, also if the filing line holds one (characterization)", () => {
    const result = parseWhtFilingPnd3({
      text: pnd3Text({
        instruction: `(ให้ทำเครื่องหมาย " ${TICK}" ลงใน " " หน้าชื่อเดือน)`,
        monthLines: withLine(PLAIN_MONTH_LINES, 2, `${TICK} (3) มีนาคม`),
      }),
    });
    expectUnreadable(result);
  });

  it("gives period-unreadable for a file that holds only the filing-date line (characterization)", () => {
    const result = parseWhtFilingPnd3({
      text: textOf("แบบ ภ.ง.ด.3", "ยื่นวันที่ 7 เมษายน พ.ศ. 2568"),
    });
    expectUnreadable(result);
  });

  it("keeps the old label pattern accepted (characterization)", () => {
    const result = parseWhtFilingPnd3({ text: fixtureText("pnd3-monthly.txt") });
    expectMonth(result, {
      typeKey: "wht-filing-pnd3",
      year: 2025,
      month: 3,
      lastDay: 31,
    });
  });
});

describe("parseYearFile over the real-shape fixtures (task 10.14)", () => {
  it.each([
    ["pnd1-real-period.txt", "wht-filing-pnd1", 2025, 2, 28],
    ["pnd53-real-period.txt", "wht-filing-pnd53", 2025, 2, 28],
    ["pnd3-real-tick-first.txt", "wht-filing-pnd3", 2025, 3, 31],
    ["pnd3-real-tick-after.txt", "wht-filing-pnd3", 2025, 4, 30],
  ])("parses %s", (fixture, typeKey, year, month, lastDay) => {
    expectMonth(parseYearFile({ text: fixtureText(fixture) }), {
      typeKey,
      year,
      month,
      lastDay,
    });
  });

  it("gives period-unreadable and not type-unmatched for a typed file with no period wording (characterization)", () => {
    const result = parseYearFile({
      text: fixtureText("pnd1-real-filing-date-only.txt"),
    });
    expectUnreadable(result);
  });
});

describe("one month-name table (task 10.14, rule 6)", () => {
  it("holds the month-name table once in the module sources (month_name_tables=1)", () => {
    const sources = readdirSync(MODULE_DIR).filter((name) => name.endsWith(".ts"));
    expect(sources.length, "the module folder must hold sources").toBeGreaterThan(0);
    const monthNameTables = sources.reduce((total, name) => {
      const text = readFileSync(`${MODULE_DIR}/${name}`, "utf8");
      return total + (text.match(/"กุมภาพันธ์"/gu)?.length ?? 0);
    }, 0);
    console.log(`month_name_tables=${monthNameTables}`);
    expect(monthNameTables).toBe(1);
  });
});
