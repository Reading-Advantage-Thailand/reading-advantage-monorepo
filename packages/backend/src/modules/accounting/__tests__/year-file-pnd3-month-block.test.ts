/**
 * Red tests for the PND.3 tick search limit (plan task 10.16, PM 2026-11-14).
 * The third dry run parsed PND.3 0 of 20. In all 8 labelled files the reader of
 * task 10.15 finds the label, the year, the entry after the first tick, and the
 * month name. It fails at the tick count: it scans every line after the year
 * line to the end of the text. Each file holds exactly 1 tick line inside the
 * month block and 3 or more tick lines after the block (2 of them with
 * brackets). The reader needs exactly 1 tick line, so it returns
 * `period-unreadable`.
 *
 * Contract pinned for the Green task 10.17:
 * 1. The month block runs from the line after the label to the line that holds
 *    the month entry `(12) {month}`, plus at most 2 more lines. Without a `(12)`
 *    entry, the block ends at the last line that holds a `({n}) {month}` entry,
 *    plus at most 2 more lines.
 * 2. Only tick lines inside the block count. Exactly 1 tick line in the block
 *    gives the month of the entry that follows the tick on that line (rule of
 *    task 10.14). Zero or 2 or more tick lines in the block give
 *    `period-unreadable`.
 * 3. Tick lines after the block never change the result. This holds for a line
 *    with brackets and a tick, and for a later line with `({n}) {month}` text.
 *    This file pins a tick line 3 lines after the `(12)` line as outside the
 *    block. The size of the 0 to 2 extra lines is the choice of the Green.
 * 4. The instruction line stays not-a-tick, and the year rule stays.
 * 5. Every row of task 10.14 keeps passing (`year-file-period-wording.test.ts`).
 *
 * Rows that pass at the base are characterization rows. Their names end with
 * `(characterization)`. They keep the Green from a regression. Every other row
 * fails at the base.
 *
 * Fake data only. The fixtures hold the line `no real sample`, fake months, and
 * fake years. No real amount, tax id, name, address, company, file name, folder
 * id, or Drive id enters this file.
 *
 * Anti-pattern coverage:
 * - A3: every count is a labeled integer (`pnd3_block_fixtures=N`,
 *   `ticks_after_block=N`).
 * - A4: every `period-unreadable` row has a positive twin that parses the same
 *   shape, so a reader that returns unmatched for everything cannot pass.
 * - A7: no exclusion filter holds an English word.
 * - A9: no row names a track path or a run path.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseWhtFilingPnd3 } from "../document-parsing.js";
import { parseYearFile, type YearFileParseResult } from "../year-file-parsers.js";

const FIXTURE_DIR = fileURLToPath(
  new URL("./__fixtures__/year-files", import.meta.url),
);

/** The tick character of the PND.3 month list, U+00FC. */
const TICK = "ü";

/** The PND.3 instruction line: it holds a quoted tick and the year. */
const INSTRUCTION = `(ให้ทำเครื่องหมาย " ${TICK}" ลงใน " " หน้าชื่อเดือน) พ.ศ. 2568`;

/** The first six month lines of a PND.3 list, no tick. */
const FIRST_HALF: readonly string[] = [
  "(1) มกราคม",
  "(2) กุมภาพันธ์",
  "(3) มีนาคม",
  "(4) เมษายน",
  "(5) พฤษภาคม",
  "(6) มิถุนายน",
];

/** The last six month lines of a PND.3 list, no tick. */
const SECOND_HALF: readonly string[] = [
  "(7) กรกฎาคม",
  "(8) สิงหาคม",
  "(9) กันยายน",
  "(10) ตุลาคม",
  "(11) พฤศจิกายน",
  "(12) ธันวาคม",
];

/** Three lines after the block: no tick and no month entry. */
const FILLER: readonly string[] = [
  "จำนวนผู้มีรายได้ (ราย): 9",
  "ยื่นวันที่ 7 เมษายน พ.ศ. 2568",
  "ชื่อผู้จ่าย: Test Counterparty",
];

/** Three tick lines for the area after the block: two with brackets, no month. */
const LATE_TICKS: readonly string[] = [
  `${TICK} ยื่นแบบปกติ`,
  `${TICK} (1) ยื่นแบบปกติ`,
  `${TICK} (2) ยื่นเพิ่มเติม`,
];

/**
 * Reads one fixture text.
 * @param name The fixture file name.
 * @returns The fixture text.
 */
function fixtureText(name: string): string {
  return readFileSync(`${FIXTURE_DIR}/${name}`, "utf8");
}

/**
 * Builds a PND.3 text with the real label.
 * @param monthLines The month block lines.
 * @param afterLines The lines after the month block.
 * @returns The text, with the fake marker as its first line.
 */
function pnd3Text(
  monthLines: readonly string[],
  afterLines: readonly string[],
): string {
  return [
    "no real sample",
    "แบบ ภ.ง.ด.3 รายการภาษีที่หัก ณ ที่จ่าย",
    "เดือนที่จ่ายเงินได้พึงประเมิน",
    INSTRUCTION,
    ...monthLines,
    ...afterLines,
  ].join("\n");
}

/**
 * Replaces one line of a list.
 * @param lines The lines.
 * @param index The zero-based index to replace.
 * @param replacement The new line text.
 * @returns The new lines.
 */
function withLine(
  lines: readonly string[],
  index: number,
  replacement: string,
): string[] {
  return lines.map((line, at) => (at === index ? replacement : line));
}

/**
 * Asserts a parsed PND.3 month.
 * @param result The parse result.
 * @param year The CE year.
 * @param month The month number.
 * @param lastDay The last day of the month.
 */
function expectMonth(
  result: YearFileParseResult,
  year: number,
  month: number,
  lastDay: number,
): void {
  const mm = String(month).padStart(2, "0");
  const summary = `status=${result.status} reason=${String(result.unmatchedReason)}`;
  expect(result.status, `expected a parsed month, got ${summary}`).toBe("parsed");
  expect(result.unmatchedReason).toBeNull();
  expect(result.typeKey).toBe("wht-filing-pnd3");
  expect(result.periodKind).toBe("month");
  expect(result.periodStart).toBe(`${year}-${mm}-01`);
  expect(result.periodEnd).toBe(`${year}-${mm}-${String(lastDay).padStart(2, "0")}`);
  expect(result.taxYear).toBe(year);
  expect(result.sourceMonth).toBe(`${year}-${mm}`);
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

describe("PND.3 tick search limited to the month block (task 10.16)", () => {
  it("reads the tick of the block when ticks follow the block, tick at the line start", () => {
    expectMonth(
      parseWhtFilingPnd3({ text: fixtureText("pnd3-block-tick-first.txt") }),
      2025,
      3,
      31,
    );
  });

  it("reads the tick of the block when ticks follow the block, tick after a month name", () => {
    expectMonth(
      parseWhtFilingPnd3({ text: fixtureText("pnd3-block-tick-after.txt") }),
      2025,
      4,
      30,
    );
  });

  it.each([
    ["pnd3-block-tick-first.txt", 3, 31],
    ["pnd3-block-tick-after.txt", 4, 30],
  ])("parseYearFile reads %s", (fixture, month, lastDay) => {
    expectMonth(parseYearFile({ text: fixtureText(fixture) }), 2025, month, lastDay);
  });

  it("gives period-unreadable for 2 ticks in the block and ticks after it (characterization)", () => {
    expectUnreadable(
      parseWhtFilingPnd3({ text: fixtureText("pnd3-block-two-ticks.txt") }),
    );
  });

  it("gives period-unreadable for 0 ticks in the block and 1 tick line after it", () => {
    expectUnreadable(
      parseWhtFilingPnd3({ text: fixtureText("pnd3-block-zero-ticks.txt") }),
    );
  });

  it("counts a tick on the (12) line as inside the block", () => {
    const monthLines = withLine(SECOND_HALF, 5, `${TICK} (12) ธันวาคม`);
    const text = pnd3Text([...FIRST_HALF, ...monthLines], [...FILLER, ...LATE_TICKS]);
    expectMonth(parseWhtFilingPnd3({ text }), 2025, 12, 31);
  });

  it("ends the block at the last month entry when there is no (12) entry", () => {
    const monthLines = withLine(FIRST_HALF, 2, `${TICK} (3) มีนาคม`);
    const text = pnd3Text(monthLines, [...FILLER, ...LATE_TICKS]);
    expectMonth(parseWhtFilingPnd3({ text }), 2025, 3, 31);
  });

  it("ignores a later tick line that holds month-like text", () => {
    const monthLines = [
      ...withLine(FIRST_HALF, 2, `${TICK} (3) มีนาคม`),
      ...SECOND_HALF,
    ];
    const text = pnd3Text(monthLines, [
      ...FILLER,
      `${TICK} (5) พฤษภาคม`,
      ...LATE_TICKS,
    ]);
    expectMonth(parseWhtFilingPnd3({ text }), 2025, 3, 31);
  });

  it("treats a tick line 3 lines after the (12) line as outside the block", () => {
    const monthLines = [
      ...withLine(FIRST_HALF, 2, `${TICK} (3) มีนาคม`),
      ...SECOND_HALF,
    ];
    const text = pnd3Text(monthLines, [
      FILLER[0] ?? "",
      FILLER[1] ?? "",
      `${TICK} (5) พฤษภาคม`,
    ]);
    expectMonth(parseWhtFilingPnd3({ text }), 2025, 3, 31);
  });

  it("gives period-unreadable for 0 ticks in the block and a month tick 3 lines after the (12) line", () => {
    const text = pnd3Text(
      [...FIRST_HALF, ...SECOND_HALF],
      [FILLER[0] ?? "", FILLER[1] ?? "", `${TICK} (5) พฤษภาคม`],
    );
    expectUnreadable(parseWhtFilingPnd3({ text }));
  });

  it("keeps the instruction line as not-a-tick when no other tick exists (characterization)", () => {
    const text = pnd3Text([...FIRST_HALF, ...SECOND_HALF], FILLER);
    expectUnreadable(parseWhtFilingPnd3({ text }));
  });

  it("has the fixture shape of the contract (characterization)", () => {
    const names = [
      "pnd3-block-tick-first.txt",
      "pnd3-block-tick-after.txt",
      "pnd3-block-two-ticks.txt",
    ];
    console.log(`pnd3_block_fixtures=${names.length + 1}`);
    for (const name of names) {
      const lines = fixtureText(name).split("\n");
      expect(lines[0], `${name} must hold the fake marker`).toBe("no real sample");
      const endIndex = lines.findIndex((line) => line.includes("(12)"));
      expect(endIndex, `${name} must hold a (12) entry`).toBeGreaterThan(0);
      const after = lines.slice(endIndex + 1);
      const ticksAfterBlock = after.filter((line) => line.includes(TICK)).length;
      const bracketTicks = after.filter(
        (line) => line.includes(TICK) && line.includes("("),
      ).length;
      console.log(`ticks_after_block=${ticksAfterBlock} bracket_ticks=${bracketTicks}`);
      expect(ticksAfterBlock).toBe(3);
      expect(bracketTicks).toBe(2);
    }
  });
});
