import { inflateRawSync, inflateSync } from "node:zlib";

import { z } from "zod";

import {
  accountingExtractionSchema,
  type AccountingYearFileFacts,
  type AccountingYearFileFilingKind,
  type AccountingYearFileTypeKey,
} from "./intake-contracts.js";

/**
 * Input of one year-file parse: the text layer of the PDF. The file name and
 * the folder name are accepted and ignored. The type and the period come from
 * the text only (spec section 9b).
 */
export type YearFileParseInput = {
  readonly text: string;
  readonly fileName?: string;
  readonly folderName?: string;
};

/** Reason a year-file text gives no parse result. */
export type YearFileUnmatchedReason = "period-unreadable" | "type-unmatched";

/** Result of one year-file parse: a parsed filing or an unmatched text. */
export type YearFileParseResult = {
  readonly status: "parsed" | "unmatched";
  readonly unmatchedReason: YearFileUnmatchedReason | null;
  readonly typeKey: AccountingYearFileTypeKey | null;
  readonly filingKind: AccountingYearFileFilingKind | null;
  readonly periodKind: "month" | "year" | null;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly taxYear: number | null;
  readonly sourceMonth: string | null;
  readonly extraction: "local-text" | null;
  readonly facts: AccountingYearFileFacts | null;
};

/** Parser of one year-file type. */
export type YearFileParser = (input: YearFileParseInput) => YearFileParseResult;

/** Date range read from a document, in CE ISO form. */
export type DateRange = { readonly start: string; readonly end: string };

/** The Buddhist Era to CE offset of spec section 9b. */
const BUDDHIST_ERA_OFFSET = 543;

/** Lowest and highest Buddhist Era year the parsers accept. */
const MIN_BUDDHIST_YEAR = 2500;
const MAX_BUDDHIST_YEAR = 2700;

/** Thai month names, full and short, mapped to the month number. */
const THAI_MONTHS: ReadonlyArray<readonly [string, number]> = [
  ["มกราคม", 1],
  ["กุมภาพันธ์", 2],
  ["มีนาคม", 3],
  ["เมษายน", 4],
  ["พฤษภาคม", 5],
  ["มิถุนายน", 6],
  ["กรกฎาคม", 7],
  ["สิงหาคม", 8],
  ["กันยายน", 9],
  ["ตุลาคม", 10],
  ["พฤศจิกายน", 11],
  ["ธันวาคม", 12],
  ["ม.ค.", 1],
  ["ก.พ.", 2],
  ["มี.ค.", 3],
  ["เม.ย.", 4],
  ["พ.ค.", 5],
  ["มิ.ย.", 6],
  ["ก.ค.", 7],
  ["ส.ค.", 8],
  ["ก.ย.", 9],
  ["ต.ค.", 10],
  ["พ.ย.", 11],
  ["ธ.ค.", 12],
];

/** Regex source that matches one Thai month name. */
const MONTH_NAME_SOURCE = THAI_MONTHS.map(([name]) =>
  name.replace(/\./gu, "\\."),
).join("|");

/** Regex source of one dated day: day, month name, Buddhist Era year. */
const DATED_DAY_SOURCE = `(\\d{1,2})[ \\t]*(${MONTH_NAME_SOURCE})[ \\t]*(\\d{4})`;

/**
 * Converts Thai digits to ASCII digits.
 * @param text Text that may hold Thai digits.
 * @returns The text with every Thai digit as an ASCII digit.
 */
export function normalizeDigits(text: string): string {
  return text.replace(/[๐-๙]/gu, (digit) =>
    String((digit.codePointAt(0) ?? 0x0e50) - 0x0e50),
  );
}

/**
 * Converts a Buddhist Era year to a CE year.
 * @param buddhistYear Four-digit Buddhist Era year.
 * @returns The CE year, or null when the year is outside the accepted range.
 */
function toCommonEra(buddhistYear: number): number | null {
  if (buddhistYear < MIN_BUDDHIST_YEAR || buddhistYear > MAX_BUDDHIST_YEAR) {
    return null;
  }
  return buddhistYear - BUDDHIST_ERA_OFFSET;
}

/**
 * Returns the month number of a Thai month name.
 * @param name Thai month name, full or short.
 * @returns The month number from 1 to 12, or null when the name is unknown.
 */
function monthNumber(name: string): number | null {
  const match = THAI_MONTHS.find(([candidate]) => candidate === name);
  return match === undefined ? null : match[1];
}

/**
 * Returns the number of days in a calendar month.
 * @param year CE year.
 * @param month Month number from 1 to 12.
 * @returns The day count of the month.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Formats a calendar date as an ISO date.
 * @param year CE year.
 * @param month Month number from 1 to 12.
 * @param day Day of the month.
 * @returns The date as `YYYY-MM-DD`.
 */
function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Reads one dated day (day, month name, Buddhist Era year) as a CE ISO date.
 * @param day Day text.
 * @param monthName Thai month name.
 * @param year Buddhist Era year text.
 * @returns The ISO date, or null when any part is not a real date.
 */
function readDatedDay(
  day: string,
  monthName: string,
  year: string,
): string | null {
  const month = monthNumber(monthName);
  const commonYear = toCommonEra(Number(year));
  const dayNumber = Number(day);
  if (month === null || commonYear === null) return null;
  if (dayNumber < 1 || dayNumber > daysInMonth(commonYear, month)) return null;
  return isoDate(commonYear, month, dayNumber);
}

/**
 * Reads a date range written as two dated days joined by the word "ถึง".
 * @param text Normalized document text.
 * @param labelSource Regex source of the label that precedes the range.
 * @returns The CE date range, or null when no valid range follows the label.
 */
export function readDateRange(text: string, labelSource: string): DateRange | null {
  const pattern = new RegExp(
    `${labelSource}[ \\t]*${DATED_DAY_SOURCE}[ \\t]*ถึง[ \\t]*${DATED_DAY_SOURCE}`,
    "u",
  );
  const match = pattern.exec(text);
  if (match === null) return null;
  const start = readDatedDay(match[1] ?? "", match[2] ?? "", match[3] ?? "");
  const end = readDatedDay(match[4] ?? "", match[5] ?? "", match[6] ?? "");
  if (start === null || end === null || start > end) return null;
  return { start, end };
}

/**
 * Reads one dated day that follows a label.
 * @param text Normalized document text.
 * @param labelSource Regex source of the label that precedes the date.
 * @returns The CE ISO date, or null when no valid date follows the label.
 */
export function readLabeledDate(text: string, labelSource: string): string | null {
  const pattern = new RegExp(`${labelSource}[ \\t]*${DATED_DAY_SOURCE}`, "u");
  const match = pattern.exec(text);
  if (match === null) return null;
  return readDatedDay(match[1] ?? "", match[2] ?? "", match[3] ?? "");
}

/**
 * Reads the month of a monthly filing from the "ประจำเดือน" line.
 * @param text Normalized document text.
 * @returns The CE year and month, or null when no valid month line exists.
 */
function readFilingMonth(
  text: string,
): { readonly year: number; readonly month: number } | null {
  const pattern = new RegExp(
    `ประจำเดือน(?:ที่)?[ \\t]*(\\d{1,2})?[ \\t]*(${MONTH_NAME_SOURCE})[ \\t]*(\\d{4})`,
    "u",
  );
  const match = pattern.exec(text);
  if (match === null) return null;
  const month = monthNumber(match[2] ?? "");
  const year = toCommonEra(Number(match[3]));
  if (month === null || year === null) return null;
  if (match[1] !== undefined && Number(match[1]) !== month) return null;
  return { year, month };
}

/** The header line of the real PND.1 period column. */
const PND1_PERIOD_HEADER = "เดือน/ปีภาษี";

/** Lines after the header of PND.1 that the period line may sit in. */
const PND1_PERIOD_WINDOW = 7;

/** Whole-line shape of the real PND.1 period line: month, slash, Buddhist year. */
const PND1_PERIOD_LINE = /^(\d{1,2})\/(\d{4})$/;

/** The header line of the real PND.53 payment table. */
const PND53_PAYMENTS_HEADER = "วัน เดือน ปี ที่จ่าย";

/** Whole-line shape of one real PND.53 payment date row: day, month, Buddhist year. */
const PND53_DATE_ROW = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** The label line of the real PND.3 month list. */
const PND3_PERIOD_LABEL = "เดือนที่จ่ายเงินได้พึงประเมิน";

/** The tick character of the real PND.3 month list. */
const PND3_TICK = "ü";

/** The marker of the real PND.3 instruction line; its quoted tick is not a tick. */
const PND3_INSTRUCTION_MARKER = "ให้ทำเครื่องหมาย";

/** The Buddhist year line of the real PND.3 month list, right after the label. */
const PND3_YEAR_LINE = /พ\.ศ\.[ \t]*(\d{4})/u;

/** One month entry of the real PND.3 month list. */
const PND3_MONTH_ENTRY = new RegExp(
  `\\(\\d{1,2}\\)[ \\t]*(${MONTH_NAME_SOURCE})`,
  "u",
);

/** One CE month period: the year and the month number. */
type MonthPeriod = { readonly year: number; readonly month: number };

/**
 * Reads the period of the real PND.1 wording: the first whole `{m}/{yyyy}`
 * line after the `เดือน/ปีภาษี` header line. A date line `{d}/{m}/{yyyy}` is
 * not the period. The filing-date line never matches the whole-line shape.
 * @param text Normalized document text.
 * @returns The CE year and month, or null when the header is absent or the
 *   period line sits outside the window after the header.
 */
function readPnd1RealMonth(text: string): MonthPeriod | null {
  const lines = text.split("\n");
  const headerIndex = lines.findIndex((line) => line.includes(PND1_PERIOD_HEADER));
  if (headerIndex === -1) return null;
  for (let offset = 1; offset <= PND1_PERIOD_WINDOW; offset += 1) {
    const match = PND1_PERIOD_LINE.exec((lines[headerIndex + offset] ?? "").trim());
    if (match === null) continue;
    const month = Number(match[1]);
    const year = toCommonEra(Number(match[2]));
    if (month < 1 || month > 12 || year === null) continue;
    return { year, month };
  }
  return null;
}

/**
 * Reads the period of the real PND.53 wording: the payment date rows
 * `{d}/{m}/{yyyy}` under the `วัน เดือน ปี ที่จ่าย` header line. Date rows
 * before the header are ignored. All rows must share one month and one year.
 * @param text Normalized document text.
 * @returns The CE year and month, or null when the header is absent, no date
 *   row follows it, or the rows hold two months or two years.
 */
function readPnd53RealMonth(text: string): MonthPeriod | null {
  const lines = text.split("\n");
  const headerIndex = lines.findIndex((line) => line.includes(PND53_PAYMENTS_HEADER));
  if (headerIndex === -1) return null;
  let period: MonthPeriod | null = null;
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const match = PND53_DATE_ROW.exec((lines[index] ?? "").trim());
    if (match === null) continue;
    const month = Number(match[2]);
    const year = toCommonEra(Number(match[3]));
    if (month < 1 || month > 12 || year === null) continue;
    if (period === null) {
      period = { year, month };
    } else if (period.year !== year || period.month !== month) {
      return null;
    }
  }
  return period;
}

/** Extra lines after the block end line that stay inside the month block. */
const PND3_BLOCK_EXTRA_LINES = 2;

/**
 * Finds the end line of the PND.3 month block: the line that holds the
 * `(12) {month}` entry, or, without one, the last line that holds a
 * `({n}) {month}` entry.
 * @param lines The document lines.
 * @param start The zero-based index of the first block line.
 * @returns The zero-based index of the block end line, or null when no month
 *   entry follows the start.
 */
function pnd3MonthBlockEnd(
  lines: readonly string[],
  start: number,
): number | null {
  let lastEntry: number | null = null;
  for (let index = start; index < lines.length; index += 1) {
    const match = PND3_MONTH_ENTRY.exec(lines[index] ?? "");
    if (match === null) continue;
    lastEntry = index;
    if (match[0].startsWith("(12)")) return index;
  }
  return lastEntry;
}

/**
 * Reads the period of the real PND.3 wording: the year from `พ.ศ. {yyyy}` on
 * the line after the `เดือนที่จ่ายเงินได้พึงประเมิน` label line, and the month
 * from the `({n}) {month}` entry that follows the single tick on its line.
 * The tick search stays inside the month block: the lines from the line after
 * the year line to the `(12) {month}` entry line, or, without one, to the last
 * `({n}) {month}` entry line, plus 2 more lines. Tick lines after the block
 * never count. The instruction line holds a quoted tick and is not a tick.
 * @param text Normalized document text.
 * @returns The CE year and month, or null when the label is absent, the line
 *   after the label holds no year, the block holds no month entry, the ticks
 *   in the block are not exactly one, or the tick line holds no entry after
 *   the tick.
 */
function readPnd3RealMonth(text: string): MonthPeriod | null {
  const lines = text.split("\n");
  const labelIndex = lines.findIndex((line) => line.includes(PND3_PERIOD_LABEL));
  if (labelIndex === -1) return null;
  const yearMatch = PND3_YEAR_LINE.exec(lines[labelIndex + 1] ?? "");
  const year = yearMatch === null ? null : toCommonEra(Number(yearMatch[1]));
  if (year === null) return null;
  const firstBlockLine = labelIndex + 2;
  const blockEnd = pnd3MonthBlockEnd(lines, firstBlockLine);
  if (blockEnd === null) return null;
  const tickedLines = lines
    .slice(firstBlockLine, blockEnd + 1 + PND3_BLOCK_EXTRA_LINES)
    .filter(
      (line) => line.includes(PND3_TICK) && !line.includes(PND3_INSTRUCTION_MARKER),
    );
  if (tickedLines.length !== 1) return null;
  const tickLine = tickedLines[0] ?? "";
  const afterTick = tickLine.slice(tickLine.indexOf(PND3_TICK) + PND3_TICK.length);
  const entry = PND3_MONTH_ENTRY.exec(afterTick);
  const month = entry === null ? null : monthNumber(entry[1] ?? "");
  if (month === null) return null;
  return { year, month };
}

/**
 * The real-wording period readers of the monthly filings, by type key. The old
 * label read stays first; a real wording is the fallback of its type.
 */
const REAL_WORDING_MONTH_READERS: Partial<
  Record<AccountingYearFileTypeKey, (text: string) => MonthPeriod | null>
> = {
  "wht-filing-pnd1": readPnd1RealMonth,
  "wht-filing-pnd53": readPnd53RealMonth,
  "wht-filing-pnd3": readPnd3RealMonth,
};

/**
 * Reads the year of an annual filing from a year label.
 * @param text Normalized document text.
 * @param labelSource Regex source of the label that precedes the year.
 * @returns The CE year, or null when no valid year follows the label.
 */
export function readLabeledYear(text: string, labelSource: string): number | null {
  const match = new RegExp(`${labelSource}[ \\t]*(\\d{4})`, "u").exec(text);
  if (match === null) return null;
  return toCommonEra(Number(match[1]));
}

/**
 * Converts a decimal money text to an integer in satang.
 * @param raw Money text such as `1,234.56`, `-100.00`, or `(100.00)`.
 * @returns The amount in satang, or null when the text holds more than two decimals.
 */
function toSatang(raw: string): number | null {
  const negative = raw.startsWith("-") || raw.startsWith("(");
  const digits = raw.replace(/[^\d.]/gu, "");
  const [whole = "0", fraction = ""] = digits.split(".");
  if (/[^0]/u.test(fraction.slice(2))) return null;
  const satang = Number(whole) * 100 + Number(fraction.slice(0, 2).padEnd(2, "0"));
  return negative ? -satang : satang;
}

/**
 * Reads one labeled amount in satang.
 * @param text Normalized document text.
 * @param labelSource Regex source of the amount label.
 * @returns The amount in satang, or null when the text gives none.
 */
export function readAmount(text: string, labelSource: string): number | null {
  const pattern = new RegExp(
    `(?:${labelSource})[ \\t]*(?:\\([^)\\n]*\\))?[ \\t]*[:：][ \\t]*(-?\\(?\\d[\\d,]*(?:\\.\\d+)?\\)?)`,
    "u",
  );
  const match = pattern.exec(text);
  return match === null ? null : toSatang(match[1] ?? "");
}

/**
 * Reads one labeled integer count.
 * @param text Normalized document text.
 * @param labelSource Regex source of the count label.
 * @returns The count, or null when the text gives none.
 */
export function readCount(text: string, labelSource: string): number | null {
  const pattern = new RegExp(
    `(?:${labelSource})[ \\t]*(?:\\([^)\\n]*\\))?[ \\t]*[:：][ \\t]*(\\d[\\d,]*)`,
    "u",
  );
  const match = pattern.exec(text);
  return match === null ? null : Number(match[1]?.replace(/,/gu, ""));
}

/** Regex sources of the labels the parsers key on. */
export const LABELS = {
  payeeCount: "จำนวนผู้มีรายได้",
  totalPaid: "เงินที่จ่ายทั้งสิ้น",
  totalTaxWithheld: "ภาษีที่หักได้",
  surcharge: "เงินเพิ่ม",
  totalRemitted: "เงินภาษีที่นำส่ง",
  netProfitOrLoss: "กำไร[ \\t]*(?:\\(ขาดทุน\\)[ \\t]*)?สุทธิ",
  taxPayable: "ภาษีที่ต้องชำระ",
  taxPaid: "ภาษีที่ชำระแล้ว",
  totalAssets: "ทรัพย์สินรวม|สินทรัพย์รวม",
  totalLiabilities: "หนี้สินรวม",
  totalEquity: "ส่วนของผู้ถือหุ้น|ส่วนของเจ้าของ",
  totalRevenue: "รายได้รวม",
  lineCount: "จำนวนรายการ",
  totalDebit: "ยอดเดบิตรวม",
  totalCredit: "ยอดเครดิตรวม",
} as const;

/** Regex source of the label before a statement date. */
export const STATEMENT_DATE_LABEL = "ณ(?:[ \\t]*วันที่)?";

/** Regex source of the label before an accounting period range. */
export const ACCOUNTING_PERIOD_LABEL = "รอบระยะเวลาบัญชี";

/** Regex source of the label before a general-ledger period range. */
export const LEDGER_PERIOD_LABEL = "รอบระยะเวลา";

/**
 * Builds the unmatched result for a text.
 * @param reason Why the text gave no parse.
 * @returns The unmatched result with no type, period, or facts.
 */
export function unmatched(reason: YearFileUnmatchedReason): YearFileParseResult {
  return {
    status: "unmatched",
    unmatchedReason: reason,
    typeKey: null,
    filingKind: null,
    periodKind: null,
    periodStart: null,
    periodEnd: null,
    taxYear: null,
    sourceMonth: null,
    extraction: null,
    facts: null,
  };
}

/**
 * Builds the parsed result for a date range.
 * @param input The type, kind, range, period kind, and facts of the filing.
 * @returns The parsed result; taxYear and sourceMonth come from the period end.
 */
export function parsed(input: {
  readonly typeKey: AccountingYearFileTypeKey;
  readonly filingKind: AccountingYearFileFilingKind;
  readonly periodKind: "month" | "year";
  readonly range: DateRange;
  readonly facts: AccountingYearFileFacts;
}): YearFileParseResult {
  return {
    status: "parsed",
    unmatchedReason: null,
    typeKey: input.typeKey,
    filingKind: input.filingKind,
    periodKind: input.periodKind,
    periodStart: input.range.start,
    periodEnd: input.range.end,
    taxYear: Number(input.range.end.slice(0, 4)),
    sourceMonth: input.range.end.slice(0, 7),
    extraction: "local-text",
    facts: input.facts,
  };
}

/**
 * Returns the filing kind of a withholding filing from its title text.
 * @param text Normalized document text.
 * @returns `attachment` for an attachment, `receipt` for a payment receipt, else `form`.
 */
export function readWhtFilingKind(text: string): AccountingYearFileFilingKind {
  if (/เอกสารแนบ|ใบแนบ/u.test(text)) return "attachment";
  if (/ใบนำส่งเงิน|ใบเสร็จรับเงิน/u.test(text)) return "receipt";
  return "form";
}

/**
 * Returns the month range of a monthly filing: the old `ประจำเดือน` label
 * first, then the real wording of the type.
 * @param text Normalized document text.
 * @param typeKey The monthly withholding type key.
 * @returns The first-to-last-day range, or null when the month is unreadable.
 */
function readMonthRange(
  text: string,
  typeKey: AccountingYearFileTypeKey,
): DateRange | null {
  const filingMonth =
    readFilingMonth(text) ?? REAL_WORDING_MONTH_READERS[typeKey]?.(text) ?? null;
  if (filingMonth === null) return null;
  const { year, month } = filingMonth;
  return {
    start: isoDate(year, month, 1),
    end: isoDate(year, month, daysInMonth(year, month)),
  };
}

/**
 * Returns the calendar-year range of a CE year.
 * @param year CE year.
 * @returns The range from 1 January to 31 December.
 */
export function yearRange(year: number): DateRange {
  return { start: isoDate(year, 1, 1), end: isoDate(year, 12, 31) };
}

/**
 * Reads the five monthly withholding facts of PND.1, PND.3, and PND.53.
 * @param text Normalized document text.
 * @returns The facts with null for each value the text does not give.
 */
function readMonthlyWhtFacts(text: string): AccountingYearFileFacts {
  return {
    payeeCount: readCount(text, LABELS.payeeCount),
    totalPaid: readAmount(text, LABELS.totalPaid),
    totalTaxWithheld: readAmount(text, LABELS.totalTaxWithheld),
    surcharge: readAmount(text, LABELS.surcharge),
    totalRemitted: readAmount(text, LABELS.totalRemitted),
  };
}

/**
 * Parses a monthly withholding filing of one type key.
 * @param text Normalized document text.
 * @param typeKey The monthly withholding type key.
 * @returns The parsed filing, or unmatched with `period-unreadable`.
 */
export function parseMonthlyWhtFiling(
  text: string,
  typeKey: AccountingYearFileTypeKey,
): YearFileParseResult {
  const range = readMonthRange(text, typeKey);
  if (range === null) return unmatched("period-unreadable");
  return parsed({
    typeKey,
    filingKind: readWhtFilingKind(text),
    periodKind: "month",
    range,
    facts: readMonthlyWhtFacts(text),
  });
}

/**
 * Parses a PND.3 monthly withholding filing on other income, with its
 * attachment and its payment receipt. The filing kind comes from the text.
 * @param input The text layer of the file.
 * @returns The parsed filing, or unmatched with `period-unreadable`.
 */
export function parseWhtFilingPnd3(input: YearFileParseInput): YearFileParseResult {
  return parseMonthlyWhtFiling(normalizeDigits(input.text), "wht-filing-pnd3");
}

/*
 * Phase 6: the document parsers of spec section 8, the local text-PDF reader,
 * and the `.xlsx` workbook reader (plan task 6.2). The year-file helpers above
 * keep their behavior; this block adds the thirteen parser rows of the
 * structure report of 2026-11-11 and the eleven draft schemas.
 */

/**
 * Named error of a parser whose rules are not filled in yet (plan task 6.1).
 * A parser throws it instead of returning a silent row (open item Q4).
 */
export class ParsingRulesPending extends Error {
  /**
   * Builds the error for one parser name.
   * @param parserName The parser export that has no rules yet.
   */
  constructor(parserName: string) {
    super(`${parserName} has no parsing rules yet`);
    this.name = "ParsingRulesPending";
  }
}

/** Result of a readable document: the draft that passed its schema. */
export type ParsedDocument<TDraft> = {
  readonly status: "parsed";
  readonly draft: TDraft;
  /** One draft for each document of a multi-document file; absent otherwise. */
  readonly drafts?: readonly TDraft[];
};

/** Result of a document that goes on the review list, with no draft (PM-9). */
export type ReviewDocument = {
  readonly status: "review";
  /** Failure reason that starts with `review:`. */
  readonly reason: string;
};

/** Result of a document that has no text layer and needs the model read path. */
export type NeedsModelDocument = { readonly status: "needs-model" };

/** Result of an encrypted document the app holds no password for (PM-13). */
export type NeedsPasswordDocument = { readonly status: "needs-password" };

/** Result of one document parse of spec section 8. */
export type DocumentParseResult<TDraft> =
  | ParsedDocument<TDraft>
  | ReviewDocument
  | NeedsModelDocument
  | NeedsPasswordDocument;

/** Cell value of one workbook cell; null when the cell holds no stored value. */
export type WorkbookCellValue = string | number | null;

/** One worksheet of a workbook: its name and its stored cell values. */
export type WorkbookWorksheet = {
  readonly name: string;
  readonly cells: Readonly<Record<string, WorkbookCellValue>>;
};

/** A workbook read from an `.xlsx` file: every worksheet, in workbook order. */
export type Workbook = { readonly worksheets: readonly WorkbookWorksheet[] };

/** The voucher worksheets of one workbook and the worksheets it skipped. */
export type VoucherWorkbookWorksheets = {
  readonly vouchers: readonly WorkbookWorksheet[];
  readonly skipped: readonly string[];
};

/** Result of the local text-PDF reader; `text` is null when no text layer exists. */
export type TextPdfReadResult = {
  readonly pageCount: number;
  readonly text: string | null;
};

/** The form title that marks a voucher worksheet (spec section 8 note 2). */
const VOUCHER_FORM_TITLE = "ใบสำคัญจ่าย/PAYMENT  VOUCHER";

/** Review reason of a worksheet that does not hold the voucher form title. */
const REVIEW_GUIDE_WORKSHEET = "no-voucher-title";

/** Review reason of a required cell with no stored result (PM-9). */
const REVIEW_MISSING_STORED_RESULT = "missing-stored-result";

/** Review reason of a voucher number or date in another month than its file. */
const REVIEW_MONTH_MISMATCH = "month-mismatch";

/** Review reason of a document the local parsers cannot read. */
const REVIEW_UNREADABLE = "unreadable";

/**
 * Builds a review-list result. The reason always starts with `review:` so the
 * intake writes status `failed` with a review reason (PM-9).
 * @param reason The reason text without the prefix.
 * @returns The review result with no draft.
 */
function reviewDocument(reason: string): ReviewDocument {
  return { status: "review", reason: `review:${reason}` };
}

/**
 * Validates one draft and builds the parsed result.
 * @param schema The draft schema of the parser row.
 * @param draft The draft the parser read.
 * @param drafts Every draft of a multi-document file.
 * @returns The parsed result, or the review result when the draft fails.
 */
function parsedIfValid<TDraft>(
  schema: z.ZodTypeAny,
  draft: TDraft,
  drafts?: readonly TDraft[],
): DocumentParseResult<TDraft> {
  const candidates = drafts === undefined ? [draft] : drafts;
  if (!candidates.every((candidate) => schema.safeParse(candidate).success)) {
    return reviewDocument("invalid-draft");
  }
  if (drafts === undefined) return { status: "parsed", draft };
  return { status: "parsed", draft, drafts };
}

/** A non-empty text field of a draft. */
const draftTextField = z.string().min(1).max(2048);

/** A text field that a document may not hold. */
const optionalDraftTextField = draftTextField.nullable();

/** Money as digit text in exact minor units (spec section 2.1). */
const draftMoneySchema = z.string().regex(/^-?\d+$/u);

/** Money that a document may not hold. */
const optionalDraftMoneySchema = draftMoneySchema.nullable();

/** A CE ISO date. */
const draftDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

/** A date that a document may not hold. */
const optionalDraftDateSchema = draftDateSchema.nullable();

/** An ISO 4217 currency code read from the document. */
const optionalDraftCurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/u)
  .nullable();

/** Count of items read from a document. */
const optionalDraftCountSchema = z.number().int().nonnegative().nullable();

/** English month names and their numbers, for the `Mon d, yyyy` form. */
const ENGLISH_MONTHS: ReadonlyArray<readonly [string, number]> = [
  ["jan", 1],
  ["feb", 2],
  ["mar", 3],
  ["apr", 4],
  ["may", 5],
  ["jun", 6],
  ["jul", 7],
  ["aug", 8],
  ["sep", 9],
  ["oct", 10],
  ["nov", 11],
  ["dec", 12],
];

/**
 * Builds a CE ISO date from its parts and checks the calendar.
 * @param year CE year.
 * @param month Month number from 1 to 12.
 * @param day Day of the month.
 * @returns The ISO date, or null when any part is not a real date.
 */
function checkedIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return isoDate(year, month, day);
}

/**
 * Returns the month number of an English month name.
 * @param name English month name, three letters or its full form.
 * @returns The month number from 1 to 12, or null when the name is unknown.
 */
function englishMonthNumber(name: string): number | null {
  const key = name.trim().slice(0, 3).toLowerCase();
  const match = ENGLISH_MONTHS.find(([candidate]) => candidate === key);
  return match === undefined ? null : match[1];
}

/**
 * Reads an English date written as `Mon d, yyyy` or `d Mon yyyy` (CE).
 * @param raw Date text.
 * @returns The ISO date, or null when no real date exists in the text.
 */
function readEnglishDate(raw: string | null): string | null {
  if (raw === null) return null;
  const monthFirst = /([A-Za-z]{3,9})[ \t]+(\d{1,2}),?[ \t]+(\d{4})/u.exec(raw);
  if (monthFirst !== null) {
    const month = englishMonthNumber(monthFirst[1] ?? "");
    if (month !== null) {
      return checkedIsoDate(Number(monthFirst[3]), month, Number(monthFirst[2]));
    }
  }
  const dayFirst = /(\d{1,2})[ \t]+([A-Za-z]{3,9})[ \t]+(\d{4})/u.exec(raw);
  if (dayFirst !== null) {
    const month = englishMonthNumber(dayFirst[2] ?? "");
    if (month !== null) {
      return checkedIsoDate(Number(dayFirst[3]), month, Number(dayFirst[1]));
    }
  }
  return null;
}

/**
 * Reads a CE ISO date that is already in the text.
 * @param raw Date text.
 * @returns The ISO date, or null when no real date exists in the text.
 */
function readIsoDate(raw: string | null): string | null {
  if (raw === null) return null;
  const match = /\b(\d{4})-(\d{2})-(\d{2})\b/u.exec(raw);
  if (match === null) return null;
  return checkedIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/**
 * Reads a Buddhist Era numeric date written as `d/m/yyyy`.
 * @param raw Date text.
 * @returns The CE ISO date, or null when no real date exists in the text.
 */
function readBuddhistNumericDate(raw: string | null): string | null {
  if (raw === null) return null;
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{4})/u.exec(raw);
  if (match === null) return null;
  const year = toCommonEra(Number(match[3]));
  if (year === null) return null;
  return checkedIsoDate(year, Number(match[2]), Number(match[1]));
}

/**
 * Reads a Thai short-month date such as `15 ต.ค. 2569` (Buddhist Era).
 * @param raw Date text.
 * @returns The CE ISO date, or null when no real date exists in the text.
 */
function readThaiShortDate(raw: string | null): string | null {
  if (raw === null) return null;
  const match = new RegExp(DATED_DAY_SOURCE, "u").exec(raw);
  if (match === null) return null;
  return readDatedDay(match[1] ?? "", match[2] ?? "", match[3] ?? "");
}

/**
 * Reads a foreign vendor date written as `yyyy.mm.dd`.
 * @param raw Date text.
 * @returns The ISO date, or null when no real date exists in the text.
 */
function readForeignDate(raw: string | null): string | null {
  if (raw === null) return null;
  const match = /(\d{4})\.(\d{2})\.(\d{2})/u.exec(raw);
  if (match === null) return null;
  return checkedIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/**
 * Converts a money value to digit text in exact minor units, or null.
 * @param value A number cell, or money text such as `THB 1,000.00` or `RMB10000`.
 * @returns The minor units as digit text, or null when the value is not money.
 */
function toMinorUnits(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const minor = Math.round(value * 100);
    if (Math.abs(value * 100 - minor) > 0.000001) return null;
    return String(minor);
  }
  const source = value.trim();
  if (source === "") return null;
  const negative = /^-|^\(|-\s*(?:THB|RMB|฿|USD|\$)/iu.test(source);
  const digits = source.replace(/[^\d.]/gu, "");
  if (digits === "" || digits.split(".").length > 2) return null;
  const [whole = "0", fraction = ""] = digits.split(".");
  if (whole === "") return null;
  if (/[^0]/u.test(fraction.slice(2))) return null;
  const minor = `${whole}${fraction.slice(0, 2).padEnd(2, "0")}`;
  return negative ? `-${minor}` : minor;
}

/**
 * Reads the text after a colon label on one line.
 * @param text Normalized document text.
 * @param labelSource Regex source of the label.
 * @returns The trimmed value, or null when the label is absent or empty.
 */
function readLabeledText(text: string, labelSource: string): string | null {
  const pattern = new RegExp(
    `(?:${labelSource})[ \\t]*[:：][ \\t]*([^\\n]+)`,
    "iu",
  );
  const match = pattern.exec(text);
  if (match === null) return null;
  const value = (match[1] ?? "").trim();
  return value === "" ? null : value;
}

/**
 * Reads the first money value that follows a label and its optional currency.
 * @param text Normalized document text.
 * @param labelSource Regex source of the money label.
 * @returns The minor units as digit text, or null when no amount follows.
 */
function readLabeledMoney(text: string, labelSource: string): string | null {
  const pattern = new RegExp(
    `(?:${labelSource})[ \\t]*(?:\\([^)\\n]*\\))?[ \\t]*[:：]?[ \\t]*(?:[A-Z]{3}[ \\t]*|[฿$][ \\t]*)?(-?\\(?[\\d,]+(?:\\.\\d+)?\\)?)`,
    "iu",
  );
  const match = pattern.exec(text);
  if (match === null) return null;
  return toMinorUnits(match[1] ?? "");
}

/**
 * Collapses runs of whitespace to one space and trims the text.
 * @param value Source text.
 * @returns The normalized text.
 */
function normalizeSpace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

/**
 * Reads the currency code that a money text carries.
 * @param text Document text or one line of it.
 * @returns The code, or null when the text names no currency.
 */
function readCurrency(text: string): string | null {
  const labeled = /currency[ \t]*[:：]?[ \t]*([A-Z]{3})\b/iu.exec(text);
  if (labeled !== null) return (labeled[1] ?? "").toUpperCase();
  const prefix = /\b([A-Z]{3})[ \t]*[\d,]+\.\d{2}\b/u.exec(text);
  if (prefix !== null) return prefix[1] ?? null;
  if (/฿/u.test(text)) return "THB";
  if (/\bRMB\b/iu.test(text)) return "RMB";
  return null;
}

/**
 * Returns the voucher-month number of one voucher number, for both accepted
 * forms of PM-10: `PV69/M-NNN` and `PV69MM-NNN`.
 * @param voucherNo The voucher number text.
 * @returns The month number from 1 to 12, or null when the form is unknown.
 */
function voucherNumberMonth(voucherNo: string): number | null {
  const slash = /^PV69\/(\d{1,2})-\d{3}$/u.exec(voucherNo);
  if (slash !== null) {
    const month = Number(slash[1]);
    return month >= 1 && month <= 12 ? month : null;
  }
  const compact = /^PV69(\d{2})-\d{3}$/u.exec(voucherNo);
  if (compact !== null) {
    const month = Number(compact[1]);
    return month >= 1 && month <= 12 ? month : null;
  }
  return null;
}

/** One payment voucher line of the workbook or the payslip print. */
const paymentVoucherLineSchema = z.object({
  docDate: optionalDraftDateSchema,
  docNo: optionalDraftTextField,
  description: optionalDraftTextField,
  amount: optionalDraftMoneySchema,
});

/** Draft of one payment voucher (spec section 8, notes 2 and 3). */
export const paymentVoucherDraftSchema = z.object({
  companyName: optionalDraftTextField,
  formTitle: optionalDraftTextField,
  voucherNo: draftTextField,
  date: optionalDraftDateSchema,
  payee: draftTextField,
  paymentRef: optionalDraftTextField,
  netAmount: optionalDraftMoneySchema,
  currency: optionalDraftCurrencySchema,
  lines: z.array(paymentVoucherLineSchema),
  note: optionalDraftTextField,
  subtotal: optionalDraftMoneySchema,
  deductionLabel: optionalDraftTextField,
  deductionRate: z.number().min(0).max(1).nullable(),
  deductionAmount: optionalDraftMoneySchema,
  netTotal: optionalDraftMoneySchema,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one payment voucher. */
export type PaymentVoucherDraft = z.infer<typeof paymentVoucherDraftSchema>;

/** One line of a cloud tax invoice. */
const cloudInvoiceLineSchema = z.object({
  description: optionalDraftTextField,
  subscription: optionalDraftTextField,
  interval: optionalDraftTextField,
  quantity: optionalDraftTextField,
  amount: optionalDraftMoneySchema,
});

/** Draft of a Google Cloud or Workspace tax invoice (spec section 8). */
export const cloudInvoiceDraftSchema = z.object({
  invoiceNumber: draftTextField,
  gstRegNo: optionalDraftTextField,
  billTo: optionalDraftTextField,
  service: optionalDraftTextField,
  invoiceDate: optionalDraftDateSchema,
  billingId: optionalDraftTextField,
  periodStart: optionalDraftDateSchema,
  periodEnd: optionalDraftDateSchema,
  currency: optionalDraftCurrencySchema,
  subtotal: optionalDraftMoneySchema,
  gstRate: optionalDraftTextField,
  gst: optionalDraftMoneySchema,
  total: optionalDraftMoneySchema,
  domain: optionalDraftTextField,
  accountId: optionalDraftTextField,
  lines: z.array(cloudInvoiceLineSchema),
  extraction: accountingExtractionSchema,
});

/** Validated draft of one cloud tax invoice. */
export type CloudInvoiceDraft = z.infer<typeof cloudInvoiceDraftSchema>;

/** Draft of a Google Cloud or Workspace payment receipt (spec section 8). */
export const cloudPaymentReceiptDraftSchema = z.object({
  documentTitle: optionalDraftTextField,
  paymentDate: optionalDraftDateSchema,
  amount: optionalDraftMoneySchema,
  paymentNumber: optionalDraftTextField,
  paymentId: optionalDraftTextField,
  paidBy: optionalDraftTextField,
  paidTo: optionalDraftTextField,
  service: optionalDraftTextField,
  taxIdentificationNo: optionalDraftTextField,
  billingId: optionalDraftTextField,
  paymentMethod: optionalDraftTextField,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one cloud payment receipt. */
export type CloudPaymentReceiptDraft = z.infer<
  typeof cloudPaymentReceiptDraftSchema
>;

/** One row of the statement payments table. */
const cloudStatementPaymentSchema = z.object({
  date: optionalDraftDateSchema,
  description: optionalDraftTextField,
  amount: optionalDraftMoneySchema,
});

/** Draft of one Google Cloud statement (spec section 8). */
export const cloudStatementDraftSchema = z.object({
  documentTitle: optionalDraftTextField,
  to: optionalDraftTextField,
  service: optionalDraftTextField,
  cloudAccountId: optionalDraftTextField,
  paymentsAccountId: optionalDraftTextField,
  paymentsProfileId: optionalDraftTextField,
  statementIssueDate: optionalDraftDateSchema,
  periodStart: optionalDraftDateSchema,
  periodEnd: optionalDraftDateSchema,
  startingBalance: optionalDraftMoneySchema,
  totalNewActivity: optionalDraftMoneySchema,
  totalPaymentsReceived: optionalDraftMoneySchema,
  endingBalance: optionalDraftMoneySchema,
  payments: z.array(cloudStatementPaymentSchema),
  extraction: accountingExtractionSchema,
});

/** Validated draft of one cloud statement. */
export type CloudStatementDraft = z.infer<typeof cloudStatementDraftSchema>;

/** One payee row of a PND.3 filing sheet. */
const whtFilingPnd3RowSchema = z.object({
  seq: optionalDraftCountSchema,
  payeeTaxId: optionalDraftTextField,
  payeeName: optionalDraftTextField,
  payeeAddress: optionalDraftTextField,
  paymentDate: optionalDraftDateSchema,
  incomeType: optionalDraftTextField,
  taxRatePercent: z.number().nullable(),
  amountPaid: optionalDraftMoneySchema,
  taxWithheld: optionalDraftMoneySchema,
  condition: z.number().int().nullable(),
});

/** Draft of one PND.3 withholding filing sheet (spec section 8). */
export const whtFilingPnd3DraftSchema = z.object({
  referenceNumber: optionalDraftTextField,
  withholderTaxId: optionalDraftTextField,
  withholderBranch: optionalDraftTextField,
  sheetNo: optionalDraftTextField,
  sheetsTotal: optionalDraftTextField,
  rows: z.array(whtFilingPnd3RowSchema),
  totalAmountPaid: optionalDraftMoneySchema,
  totalTaxWithheld: optionalDraftMoneySchema,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one PND.3 filing sheet. */
export type WhtFilingPnd3Draft = z.infer<typeof whtFilingPnd3DraftSchema>;

/** Draft of an encrypted bank statement; the report knows no field (PM-13). */
export const bankStatementDraftSchema = z.object({
  extraction: accountingExtractionSchema,
});

/** Validated draft of one bank statement. */
export type BankStatementDraft = z.infer<typeof bankStatementDraftSchema>;

/** Draft of a foreign vendor invoice in another currency (spec section 8). */
export const foreignVendorInvoiceDraftSchema = z.object({
  invoiceDate: optionalDraftDateSchema,
  vendor: optionalDraftTextField,
  billTo: optionalDraftTextField,
  description: optionalDraftTextField,
  quantity: optionalDraftTextField,
  unitPrice: optionalDraftTextField,
  amount: optionalDraftMoneySchema,
  currency: optionalDraftCurrencySchema,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one foreign vendor invoice. */
export type ForeignVendorInvoiceDraft = z.infer<
  typeof foreignVendorInvoiceDraftSchema
>;

/** One line of a school invoice or receipt. */
const schoolInvoiceLineSchema = z.object({
  seq: optionalDraftCountSchema,
  description: optionalDraftTextField,
  unitPrice: optionalDraftTextField,
  quantity: optionalDraftTextField,
  total: optionalDraftTextField,
});

/** One discount of a school invoice. */
const schoolInvoiceDiscountSchema = z.object({
  label: optionalDraftTextField,
  amount: optionalDraftMoneySchema,
});

/** Payment block of a school invoice. */
const schoolInvoicePaymentSchema = z.object({
  bank: optionalDraftTextField,
  branch: optionalDraftTextField,
  accountName: optionalDraftTextField,
  accountNo: optionalDraftTextField,
});

/** Draft of one school invoice, from the sheet or from the PDF. */
export const schoolInvoiceDraftSchema = z.object({
  documentTitle: optionalDraftTextField,
  invoiceNo: optionalDraftTextField,
  receiptNo: optionalDraftTextField,
  date: optionalDraftDateSchema,
  quotationRef: optionalDraftTextField,
  due: optionalDraftDateSchema,
  issuerCompanyNames: optionalDraftTextField,
  issuerTaxId: optionalDraftTextField,
  issuerBranch: optionalDraftTextField,
  issuerContact: optionalDraftTextField,
  customerName: optionalDraftTextField,
  customerAddress: optionalDraftTextField,
  customerTaxId: optionalDraftTextField,
  students: optionalDraftCountSchema,
  lines: z.array(schoolInvoiceLineSchema),
  subtotal: optionalDraftMoneySchema,
  discounts: z.array(schoolInvoiceDiscountSchema),
  netTotal: optionalDraftMoneySchema,
  netTotalInWords: optionalDraftTextField,
  payment: schoolInvoicePaymentSchema.nullable(),
  delivery: optionalDraftTextField,
  vatNote: optionalDraftTextField,
  terms: optionalDraftTextField,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one school invoice or receipt. */
export type SchoolInvoiceDraft = z.infer<typeof schoolInvoiceDraftSchema>;

/** Draft of a receipt, one of the three types with no real sample (PM-12). */
export const receiptDraftSchema = z.object({
  vendor: optionalDraftTextField,
  date: optionalDraftDateSchema,
  amount: optionalDraftMoneySchema,
  currency: optionalDraftCurrencySchema,
  paymentMethod: optionalDraftTextField,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one receipt. */
export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;

/** Draft of an OpenAI invoice, one of the three types with no real sample. */
export const openAiInvoiceDraftSchema = z.object({
  invoiceNumber: draftTextField,
  invoiceDate: optionalDraftDateSchema,
  periodStart: optionalDraftDateSchema,
  periodEnd: optionalDraftDateSchema,
  currency: optionalDraftCurrencySchema,
  subtotal: optionalDraftMoneySchema,
  tax: optionalDraftMoneySchema,
  total: optionalDraftMoneySchema,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one OpenAI invoice. */
export type OpenAiInvoiceDraft = z.infer<typeof openAiInvoiceDraftSchema>;

/** Draft of a withholding certificate, one of the three types with no sample. */
export const withholdingCertificateDraftSchema = z.object({
  withholderTaxId: optionalDraftTextField,
  payeeName: optionalDraftTextField,
  payeeTaxId: optionalDraftTextField,
  paymentDate: optionalDraftDateSchema,
  incomeType: optionalDraftTextField,
  amountPaid: optionalDraftMoneySchema,
  taxWithheld: optionalDraftMoneySchema,
  extraction: accountingExtractionSchema,
});

/** Validated draft of one withholding certificate. */
export type WithholdingCertificateDraft = z.infer<
  typeof withholdingCertificateDraftSchema
>;

/** One entry of the central directory of a ZIP archive. */
type ZipEntry = {
  readonly name: string;
  readonly method: number;
  readonly compressedSize: number;
  readonly localOffset: number;
};

/** Signature of the end-of-central-directory record. */
const ZIP_EOCD_SIGNATURE = 0x06054b50;

/** Signature of one central-directory file header. */
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;

/** Signature of one local file header. */
const ZIP_LOCAL_SIGNATURE = 0x04034b50;

/**
 * Reads the central directory of a ZIP archive.
 * @param buffer The archive bytes.
 * @returns The entries, or an empty list when the archive is not a ZIP.
 */
function readZipEntries(buffer: Buffer): readonly ZipEntry[] {
  let eocd = -1;
  const lowest = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= lowest; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd === -1) return [];
  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > buffer.length) break;
    if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_SIGNATURE) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.push({ name, method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * Reads one ZIP entry as UTF-8 text.
 * @param buffer The archive bytes.
 * @param entry The central-directory entry.
 * @returns The entry text, or null when the entry cannot be read.
 */
function readZipEntry(buffer: Buffer, entry: ZipEntry): string | null {
  if (entry.localOffset + 30 > buffer.length) return null;
  if (buffer.readUInt32LE(entry.localOffset) !== ZIP_LOCAL_SIGNATURE) return null;
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const data = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data.toString("utf8");
  if (entry.method !== 8) return null;
  try {
    return inflateRawSync(data).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Decodes the XML entities that an `.xlsx` part may carry.
 * @param text Raw XML text.
 * @returns The decoded text.
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&#x([0-9a-fA-F]+);/gu, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/gu, (_match, decimal: string) =>
      String.fromCodePoint(Number(decimal)),
    )
    .replace(/&amp;/gu, "&");
}

/**
 * Reads the shared strings of an `.xlsx` workbook.
 * @param xml The `xl/sharedStrings.xml` text, or null when the part is absent.
 * @returns The shared strings in index order.
 */
function readSharedStrings(xml: string | null): readonly string[] {
  if (xml === null) return [];
  const strings: string[] = [];
  const itemPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/gu;
  let item: RegExpExecArray | null = itemPattern.exec(xml);
  while (item !== null) {
    const inner = item[1] ?? "";
    const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gu;
    const parts: string[] = [];
    let text = textPattern.exec(inner);
    while (text !== null) {
      parts.push(decodeXmlEntities(text[1] ?? ""));
      text = textPattern.exec(inner);
    }
    strings.push(parts.join(""));
    item = itemPattern.exec(xml);
  }
  return strings;
}

/** One sheet entry of `xl/workbook.xml`: its name and its relationship id. */
type WorkbookSheetEntry = { readonly name: string; readonly relId: string };

/**
 * Reads the sheet entries of `xl/workbook.xml` in workbook order.
 * @param xml The workbook part text.
 * @returns The sheet names and relationship ids.
 */
function readWorkbookSheets(xml: string): readonly WorkbookSheetEntry[] {
  const sheets: WorkbookSheetEntry[] = [];
  const pattern = /<sheet\b[^>]*>/gu;
  let match = pattern.exec(xml);
  while (match !== null) {
    const tag = match[0];
    const name = /\bname="([^"]*)"/u.exec(tag)?.[1];
    const relId = /\br:id="([^"]*)"/u.exec(tag)?.[1];
    if (name !== undefined && relId !== undefined) {
      sheets.push({ name: decodeXmlEntities(name), relId });
    }
    match = pattern.exec(xml);
  }
  return sheets;
}

/**
 * Reads the worksheet targets of `xl/_rels/workbook.xml.rels`.
 * @param xml The relationships part text.
 * @returns A map from relationship id to part target.
 */
function readWorkbookRelationships(xml: string): ReadonlyMap<string, string> {
  const relationships = new Map<string, string>();
  const pattern = /<Relationship\b[^>]*>/gu;
  let match = pattern.exec(xml);
  while (match !== null) {
    const tag = match[0];
    const id = /\bId="([^"]*)"/u.exec(tag)?.[1];
    const target = /\bTarget="([^"]*)"/u.exec(tag)?.[1];
    if (id !== undefined && target !== undefined) {
      relationships.set(id, decodeXmlEntities(target));
    }
    match = pattern.exec(xml);
  }
  return relationships;
}

/**
 * Returns one cell attribute of a `<c>` tag.
 * @param attributes The tag attribute text.
 * @param name The attribute name.
 * @returns The attribute value, or null when the tag holds none.
 */
function cellAttribute(attributes: string, name: string): string | null {
  const match = new RegExp(`(?:^|[ \\t])${name}="([^"]*)"`, "u").exec(attributes);
  return match === null ? null : (match[1] ?? null);
}

/**
 * Reads the cells of one worksheet part. A formula cell without a stored result
 * gives null, so the parser puts the document on the review list (PM-9).
 * @param xml The worksheet part text.
 * @param sharedStrings The shared strings of the workbook.
 * @returns The stored cell values by cell reference.
 */
function readWorksheetCells(
  xml: string,
  sharedStrings: readonly string[],
): Record<string, WorkbookCellValue> {
  const cells: Record<string, WorkbookCellValue> = {};
  const pattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gu;
  let match = pattern.exec(xml);
  while (match !== null) {
    const attributes = match[1] ?? "";
    const inner = match[2] ?? "";
    const reference = cellAttribute(attributes, "r");
    if (reference !== null) {
      const type = cellAttribute(attributes, "t") ?? "n";
      const rawValue = /<v\b[^>]*>([\s\S]*?)<\/v>/u.exec(inner)?.[1];
      let value: WorkbookCellValue = null;
      if (type === "s") {
        const index = rawValue === undefined ? Number.NaN : Number(rawValue);
        value = Number.isInteger(index) ? (sharedStrings[index] ?? null) : null;
      } else if (type === "inlineStr") {
        const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gu;
        const parts: string[] = [];
        let text = textPattern.exec(inner);
        while (text !== null) {
          parts.push(decodeXmlEntities(text[1] ?? ""));
          text = textPattern.exec(inner);
        }
        value = parts.join("") === "" ? null : parts.join("");
      } else if (type === "b") {
        value = rawValue === "1" ? "TRUE" : "FALSE";
      } else if (type === "e") {
        value = null;
      } else if (type === "d" || type === "str") {
        value = rawValue === undefined ? null : decodeXmlEntities(rawValue);
      } else if (rawValue !== undefined) {
        const parsed = Number(rawValue);
        value = Number.isFinite(parsed) ? parsed : decodeXmlEntities(rawValue);
      }
      cells[reference] = value;
    }
    match = pattern.exec(xml);
  }
  return cells;
}

/**
 * Reads an `.xlsx` workbook: every worksheet in workbook order, with the stored
 * values of its cells. The reader calculates no formula; a formula cell without
 * a stored result holds no value (PM-8, PM-9).
 * @param bytes The workbook bytes.
 * @returns The worksheets; an empty list when the bytes are not a workbook.
 */
export function readWorkbook(bytes: Uint8Array): Workbook {
  const buffer = Buffer.from(bytes);
  const entries = readZipEntries(buffer);
  const parts = new Map(entries.map((entry) => [entry.name, entry] as const));
  const readPart = (name: string): string | null => {
    const entry = parts.get(name);
    return entry === undefined ? null : readZipEntry(buffer, entry);
  };
  const sharedStrings = readSharedStrings(readPart("xl/sharedStrings.xml"));
  const relationships = readWorkbookRelationships(
    readPart("xl/_rels/workbook.xml.rels") ?? "",
  );
  const sheets = readWorkbookSheets(readPart("xl/workbook.xml") ?? "");
  const worksheets: WorkbookWorksheet[] = [];
  for (const sheet of sheets) {
    const target = relationships.get(sheet.relId);
    if (target === undefined) continue;
    const path = target.startsWith("/")
      ? target.slice(1)
      : target.startsWith("xl/")
        ? target
        : `xl/${target}`;
    const xml = readPart(path);
    if (xml === null) continue;
    worksheets.push({ name: sheet.name, cells: readWorksheetCells(xml, sharedStrings) });
  }
  return { worksheets };
}

/**
 * Selects the voucher worksheets of a workbook: each worksheet whose cell A2
 * holds the voucher form title. Every other worksheet is skipped and its name
 * is returned, so the guide worksheet is never parsed as a voucher (PM-8).
 * @param workbook The workbook read from the file.
 * @returns The voucher worksheets and the names of the skipped worksheets.
 */
export function readVoucherWorksheets(
  workbook: Workbook,
): VoucherWorkbookWorksheets {
  const vouchers: WorkbookWorksheet[] = [];
  const skipped: string[] = [];
  const title = normalizeSpace(VOUCHER_FORM_TITLE);
  for (const worksheet of workbook.worksheets) {
    const cell = worksheet.cells["A2"];
    const text = cell === null || cell === undefined ? "" : String(cell);
    if (normalizeSpace(text) === title) {
      vouchers.push(worksheet);
    } else {
      skipped.push(worksheet.name);
    }
  }
  return { vouchers, skipped };
}

/**
 * Decodes one PDF string body. A body with the UTF-16BE byte order mark is
 * read as UTF-16BE; otherwise the bytes are read as UTF-8, and as Latin-1 when
 * the UTF-8 read fails. A CID font without a ToUnicode map is outside this
 * reader, and the caller then treats the file as a non-text PDF.
 * @param raw The string body as a Latin-1 text.
 * @returns The decoded text.
 */
function decodePdfString(raw: string): string {
  const bytes = Buffer.from(raw, "latin1");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return bytes.subarray(2).swap16().toString("utf16le");
  }
  const utf8 = bytes.toString("utf8");
  return utf8.includes("\uFFFD") ? bytes.toString("latin1") : utf8;
}

/**
 * Reads one PDF literal string, starting at its opening parenthesis.
 * @param content The content stream text.
 * @param start The index of the opening parenthesis.
 * @returns The decoded text and the index after the closing parenthesis.
 */
function readPdfLiteralString(
  content: string,
  start: number,
): readonly [string, number] {
  let index = start + 1;
  let depth = 1;
  let raw = "";
  while (index < content.length && depth > 0) {
    const character = content[index] ?? "";
    if (character === "\\") {
      const next = content[index + 1] ?? "";
      if (next === "n") {
        raw += "\n";
        index += 2;
      } else if (next === "r") {
        raw += "\r";
        index += 2;
      } else if (next === "t") {
        raw += "\t";
        index += 2;
      } else if (next === "b") {
        raw += "\b";
        index += 2;
      } else if (next === "f") {
        raw += "\f";
        index += 2;
      } else if (next === "\n") {
        index += 2;
      } else if (next === "\r") {
        index += content[index + 2] === "\n" ? 3 : 2;
      } else if (/[0-7]/u.test(next)) {
        const octal = /^[0-7]{1,3}/u.exec(content.slice(index + 1))?.[0] ?? "";
        raw += String.fromCharCode(Number.parseInt(octal, 8));
        index += 1 + octal.length;
      } else {
        raw += next;
        index += 2;
      }
      continue;
    }
    if (character === "(") {
      depth += 1;
      raw += character;
      index += 1;
      continue;
    }
    if (character === ")") {
      depth -= 1;
      if (depth > 0) raw += character;
      index += 1;
      continue;
    }
    raw += character;
    index += 1;
  }
  return [decodePdfString(raw), index] as const;
}

/**
 * Reads one PDF hexadecimal string, starting at its opening angle bracket.
 * @param content The content stream text.
 * @param start The index of the opening angle bracket.
 * @returns The decoded text and the index after the closing bracket.
 */
function readPdfHexString(
  content: string,
  start: number,
): readonly [string, number] {
  const end = content.indexOf(">", start + 1);
  if (end === -1) return ["", content.length] as const;
  const hex = content.slice(start + 1, end).replace(/\s+/gu, "");
  const padded = hex.length % 2 === 0 ? hex : `${hex}0`;
  const bytes: string[] = [];
  for (let index = 0; index < padded.length; index += 2) {
    bytes.push(String.fromCharCode(Number.parseInt(padded.slice(index, index + 2), 16)));
  }
  return [decodePdfString(bytes.join("")), end + 1] as const;
}

/**
 * Returns true when one character ends a PDF name token.
 * @param character One character of a content stream.
 * @returns True for whitespace and a PDF delimiter.
 */
function isPdfDelimiter(character: string): boolean {
  return (
    character === " " ||
    character === "\t" ||
    character === "\r" ||
    character === "\n" ||
    character === "\f" ||
    character === "\0" ||
    character === "/" ||
    character === "<" ||
    character === ">" ||
    character === "[" ||
    character === "]" ||
    character === "(" ||
    character === ")"
  );
}

/**
 * Extracts the text of one PDF content stream from its text operators.
 * @param content The content stream text.
 * @returns The extracted text, or null when the stream holds no text.
 */
function extractPdfContentText(content: string): string | null {
  const output: string[] = [];
  let pending: string[] = [];
  let inText = false;
  let arrayDepth = 0;
  let index = 0;
  const flush = (): void => {
    if (pending.length === 0) return;
    output.push(pending.join(""));
    pending = [];
  };
  while (index < content.length) {
    const character = content[index] ?? "";
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === "%") {
      const newline = content.indexOf("\n", index);
      index = newline === -1 ? content.length : newline + 1;
      continue;
    }
    if (character === "(") {
      const [text, next] = readPdfLiteralString(content, index);
      if (inText) pending.push(text);
      index = next;
      continue;
    }
    if (character === "<" && content[index + 1] === "<") {
      index += 2;
      continue;
    }
    if (character === ">") {
      index += 1;
      continue;
    }
    if (character === "<") {
      const [text, next] = readPdfHexString(content, index);
      if (inText) pending.push(text);
      index = next;
      continue;
    }
    if (character === "[") {
      arrayDepth += 1;
      index += 1;
      continue;
    }
    if (character === "]") {
      arrayDepth = Math.max(0, arrayDepth - 1);
      index += 1;
      continue;
    }
    if (character === "/") {
      index += 1;
      while (index < content.length && !isPdfDelimiter(content[index] ?? "")) {
        index += 1;
      }
      continue;
    }
    if (/[0-9+.-]/u.test(character)) {
      let end = index + 1;
      while (end < content.length && /[0-9.]/u.test(content[end] ?? "")) end += 1;
      const value = Number(content.slice(index, end));
      if (inText && arrayDepth > 0 && Number.isFinite(value) && value <= -100) {
        pending.push(" ");
      }
      index = end;
      continue;
    }
    if (/[A-Za-z'"*]/u.test(character)) {
      let end = index + 1;
      while (end < content.length && /[A-Za-z'"*]/u.test(content[end] ?? "")) end += 1;
      const operator = content.slice(index, end);
      index = end;
      if (operator === "BT") {
        inText = true;
      } else if (operator === "ET") {
        flush();
        inText = false;
      } else if (operator === "Tj" || operator === "TJ") {
        flush();
      } else if (operator === "'" || operator === '"') {
        output.push("\n");
        flush();
      } else if (operator === "Td" || operator === "TD" || operator === "T*" || operator === "TL") {
        if (inText) {
          flush();
          if (output.length > 0) output.push("\n");
        }
      } else {
        pending = [];
      }
      continue;
    }
    index += 1;
  }
  flush();
  const text = output
    .join("")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
  return text === "" ? null : text;
}

/**
 * Reads the text layer of a PDF on this machine. The reader inflates the
 * content streams and decodes their text operators; it holds no decryption and
 * no CID font map, so an encrypted PDF and a scan give null. A caller then
 * treats the file as a non-text PDF and routes it to the model path (D-13).
 * @param bytes The PDF bytes.
 * @returns The page count and the text layer, or null text when none exists.
 */
export function readTextPdf(bytes: Uint8Array): TextPdfReadResult {
  const source = Buffer.from(bytes).toString("latin1");
  const pageCount = (source.match(/\/Type\s*\/Page(?!s)/gu) ?? []).length;
  const texts: string[] = [];
  const streamPattern = /\bstream\r?\n/gu;
  let match = streamPattern.exec(source);
  while (match !== null) {
    const streamStart = match.index + match[0].length;
    const streamEnd = source.indexOf("endstream", streamStart);
    if (streamEnd === -1) break;
    const dictionary = source.slice(Math.max(0, match.index - 400), match.index);
    if (!/\/Subtype\s*\/Image/u.test(dictionary)) {
      const raw = Buffer.from(source.slice(streamStart, streamEnd), "latin1");
      let content: string | null = null;
      if (/\/FlateDecode/u.test(dictionary)) {
        try {
          content = inflateSync(raw).toString("latin1");
        } catch {
          content = null;
        }
      } else {
        content = raw.toString("latin1");
      }
      if (content !== null) {
        const text = extractPdfContentText(content);
        if (text !== null) texts.push(text);
      }
    }
    streamPattern.lastIndex = streamEnd + "endstream".length;
    match = streamPattern.exec(source);
  }
  const text = texts.join("\n").trim();
  return { pageCount, text: text === "" ? null : text };
}

/**
 * Reads one workbook cell as trimmed text.
 * @param cells The stored cell values of the worksheet.
 * @param reference The cell reference, such as `I3`.
 * @returns The text, or null when the cell holds no stored value.
 */
function readCellText(
  cells: Readonly<Record<string, WorkbookCellValue>>,
  reference: string,
): string | null {
  const value = cells[reference];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/**
 * Reads one workbook cell as money in minor units.
 * @param cells The stored cell values of the worksheet.
 * @param reference The cell reference, such as `I26`.
 * @returns The minor units as digit text, or null when the cell holds no money.
 */
function readCellMoney(
  cells: Readonly<Record<string, WorkbookCellValue>>,
  reference: string,
): string | null {
  return toMinorUnits(cells[reference]);
}

/**
 * Reads the deduction rate of a voucher cell.
 * @param cells The stored cell values of the worksheet.
 * @returns The rate from 0 to 1, or null when the cell holds no rate.
 */
function readDeductionRate(
  cells: Readonly<Record<string, WorkbookCellValue>>,
): number | null {
  const value = cells["H27"];
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  const percent = /^([\d.]+)[ \t]*%$/u.exec(text);
  if (percent !== null) return Number(percent[1]) / 100;
  const rate = Number(text);
  return Number.isFinite(rate) ? rate : null;
}

/**
 * Reads the note cells A26 and B26 of a voucher worksheet.
 * @param cells The stored cell values of the worksheet.
 * @returns The note text, or null when both cells hold no note.
 */
function readVoucherNote(
  cells: Readonly<Record<string, WorkbookCellValue>>,
): string | null {
  const parts = [readCellText(cells, "A26"), readCellText(cells, "B26")]
    .filter((part): part is string => part !== null)
    .filter((part) => !/^หมายเหตุ/u.test(part));
  const note = parts.join(" ").trim();
  return note === "" ? null : note;
}

/**
 * Parses one payment voucher worksheet. The worksheet must carry the voucher
 * form title in A2, and each required cell must hold a stored value; otherwise
 * the worksheet gives a review-list result and no draft (PM-8, PM-9). The
 * parser accepts both voucher number forms of PM-10 and reads the cell map of
 * spec section 8 note 3.
 * @param input The stored cells of one worksheet and the file-name month.
 * @returns The parsed draft, or the review result that names the reason.
 */
export function parsePaymentVoucherSheet(input: {
  readonly cells: Readonly<Record<string, WorkbookCellValue>>;
  readonly fileNameMonth?: string;
}): DocumentParseResult<PaymentVoucherDraft> {
  const formTitle = readCellText(input.cells, "A2");
  if (
    formTitle === null ||
    normalizeSpace(formTitle) !== normalizeSpace(VOUCHER_FORM_TITLE)
  ) {
    return reviewDocument(REVIEW_GUIDE_WORKSHEET);
  }
  for (const reference of ["I3", "I4", "B5", "I26", "I28"]) {
    if (readCellText(input.cells, reference) === null) {
      return reviewDocument(REVIEW_MISSING_STORED_RESULT);
    }
  }
  const voucherNo = readCellText(input.cells, "I3") ?? "";
  const numberMonth = voucherNumberMonth(voucherNo);
  if (numberMonth === null) return reviewDocument("voucher-number-form");
  const date = readBuddhistNumericDate(readCellText(input.cells, "I4"));
  if (date === null) return reviewDocument(REVIEW_UNREADABLE);
  if (Number(date.slice(5, 7)) !== numberMonth) {
    return reviewDocument(REVIEW_MONTH_MISMATCH);
  }
  if (input.fileNameMonth !== undefined && date.slice(0, 7) !== input.fileNameMonth) {
    return reviewDocument(REVIEW_MONTH_MISMATCH);
  }
  const lines: PaymentVoucherDraft["lines"] = [];
  for (let row = 10; row <= 25; row += 1) {
    const description = readCellText(input.cells, `D${row}`);
    const amountCell = input.cells[`I${row}`];
    const hasAmount = amountCell !== null && amountCell !== undefined;
    if (description === null && !hasAmount) continue;
    if (description !== null && !hasAmount) {
      return reviewDocument(REVIEW_MISSING_STORED_RESULT);
    }
    const amount = toMinorUnits(amountCell);
    if (hasAmount && amount === null) return reviewDocument(REVIEW_UNREADABLE);
    lines.push({
      docDate: readBuddhistNumericDate(readCellText(input.cells, `A${row}`)),
      docNo: readCellText(input.cells, `B${row}`),
      description,
      amount,
    });
  }
  const draft: PaymentVoucherDraft = {
    companyName: readCellText(input.cells, "A1"),
    formTitle,
    voucherNo,
    date,
    payee: readCellText(input.cells, "B5") ?? "",
    paymentRef: readCellText(input.cells, "I6"),
    netAmount: readCellMoney(input.cells, "E7"),
    currency: null,
    lines,
    note: readVoucherNote(input.cells),
    subtotal: readCellMoney(input.cells, "I26"),
    deductionLabel: readCellText(input.cells, "G27"),
    deductionRate: readDeductionRate(input.cells),
    deductionAmount: readCellMoney(input.cells, "I27"),
    netTotal: readCellMoney(input.cells, "I28"),
    extraction: "local-text",
  };
  return parsedIfValid(paymentVoucherDraftSchema, draft);
}

/**
 * Parses the text layer of a payment voucher payslip print. Each page that
 * carries the form title becomes one draft (PM decision 2026-11-15); `draft`
 * is the first page and `drafts` holds every page. A document with no text
 * layer needs the model read path (D-13).
 * @param input The text layer, or null when the PDF has none.
 * @returns The parsed drafts, the review result, or `needs-model`.
 */
export function parsePaymentVoucherPdf(input: {
  readonly text: string | null;
}): DocumentParseResult<PaymentVoucherDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const lines = text.split(/\r?\n/u);
  const title = normalizeSpace(VOUCHER_FORM_TITLE);
  const starts: number[] = [];
  lines.forEach((line, index) => {
    if (normalizeSpace(line).includes(title)) starts.push(index);
  });
  if (starts.length === 0) return reviewDocument(REVIEW_GUIDE_WORKSHEET);
  const drafts: PaymentVoucherDraft[] = [];
  starts.forEach((start, index) => {
    const block = lines.slice(start, starts[index + 1] ?? lines.length).join("\n");
    const voucherNo =
      /(?:Voucher(?:\s*No\.?|\s*number)?|เลขที่)[ \t]*[:：]?[ \t]*(PV[0-9]{2}\/?[0-9]{1,2}-[0-9]{3})/iu.exec(
        block,
      )?.[1] ?? null;
    const payee =
      /(?:Payee|จ่ายให้แก่)[ \t]*[:：]?[ \t]*([^\n]+)/iu.exec(block)?.[1]?.trim() ??
      null;
    if (voucherNo === null || payee === null) return;
    const date =
      readBuddhistNumericDate(
        /(?:Date|วันที่)[ \t]*[:：]?[ \t]*(\d{1,2}\/\d{1,2}\/\d{4})/iu.exec(block)?.[1] ??
          /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/u.exec(block)?.[1] ??
          null,
      );
    const netAmount = readLabeledMoney(block, "Net|Net total|คงเหลือสุทธิ");
    drafts.push({
      companyName: lines[start - 1]?.trim() ?? null,
      formTitle: lines[start]?.trim() ?? null,
      voucherNo,
      date,
      payee,
      paymentRef: /PP:[ \t]*\d{10}/u.exec(block)?.[0] ?? null,
      netAmount,
      currency: readCurrency(block),
      lines: [],
      note: null,
      subtotal: readLabeledMoney(block, "จำนวนเงินรวม"),
      deductionLabel: /(?:หัก ณ ที่จ่าย|Social)[ \t]*[^\n]*/u.exec(block)?.[0] ?? null,
      deductionRate: null,
      deductionAmount: readLabeledMoney(block, "หัก ณ ที่จ่าย|Social"),
      netTotal: netAmount,
      extraction: "local-text",
    });
  });
  if (drafts.length === 0) return reviewDocument(REVIEW_MISSING_STORED_RESULT);
  const [first] = drafts;
  if (first === undefined) return reviewDocument(REVIEW_UNREADABLE);
  return parsedIfValid(paymentVoucherDraftSchema, first, drafts);
}

/**
 * Parses the text layer of a Google Cloud or Workspace tax invoice. A document
 * with no text layer needs the model read path (D-13).
 * @param input The text layer, or null when the PDF has none.
 * @returns The parsed draft, the review result, or `needs-model`.
 */
export function parseCloudInvoice(input: {
  readonly text: string | null;
}): DocumentParseResult<CloudInvoiceDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const invoiceNumber = readLabeledText(
    text,
    "Invoice number|Invoice No\\.?|เลขที่ใบแจ้งหนี้",
  );
  if (invoiceNumber === null) return reviewDocument(REVIEW_MISSING_STORED_RESULT);
  const period = /([A-Za-z]{3,9}[ \t]+\d{1,2},?[ \t]+\d{4})[ \t]*(?:to|-|–)[ \t]*([A-Za-z]{3,9}[ \t]+\d{1,2},?[ \t]+\d{4})/u.exec(
    text,
  );
  const draft: CloudInvoiceDraft = {
    invoiceNumber,
    gstRegNo: readLabeledText(text, "GST Reg No\\.?|GST reg no\\.?|GST registration number"),
    billTo: readLabeledText(text, "Bill to"),
    service: readLabeledText(text, "Service|Details"),
    invoiceDate: readEnglishDate(readLabeledText(text, "Invoice date")),
    billingId: readLabeledText(text, "Billing ID"),
    periodStart: readEnglishDate(period?.[1] ?? null),
    periodEnd: readEnglishDate(period?.[2] ?? null),
    currency: readCurrency(text),
    subtotal: readLabeledMoney(text, "Subtotal|Sub-total"),
    gstRate: /GST[ \t]*\(([\d.]+%)\)/iu.exec(text)?.[1] ?? null,
    gst: readLabeledMoney(text, "GST|Tax"),
    total: readLabeledMoney(text, "Total(?: in [A-Z]{3})?"),
    domain: readLabeledText(text, "Domain"),
    accountId: readLabeledText(text, "Account ID|Cloud account ID"),
    lines: [],
    extraction: "local-text",
  };
  return parsedIfValid(cloudInvoiceDraftSchema, draft);
}

/**
 * Parses the text layer of a Google Cloud or Workspace payment receipt. A
 * document with no text layer needs the model read path.
 * @param input The text layer, or null when the PDF has none.
 * @returns The parsed draft or `needs-model`.
 */
export function parseCloudPaymentReceipt(input: {
  readonly text: string | null;
}): DocumentParseResult<CloudPaymentReceiptDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const draft: CloudPaymentReceiptDraft = {
    documentTitle: /Payment[ \t]+Receipt/iu.exec(text)?.[0] ?? null,
    paymentDate:
      readEnglishDate(
        readLabeledText(text, "Amount received on") ??
          readLabeledText(text, "Payment date"),
      ) ?? readIsoDate(text),
    amount: readLabeledMoney(text, "Amount(?: received)?"),
    paymentNumber:
      /(?:Payment receipt|Payment number|Payment No\.?)[ \t]*[:：]?[ \t]*([A-Z0-9][A-Z0-9-]*)/iu.exec(
        text,
      )?.[1] ?? null,
    paymentId: readLabeledText(text, "Payment ID"),
    paidBy: readLabeledText(text, "Paid by"),
    paidTo: readLabeledText(text, "Paid to"),
    service: readLabeledText(text, "Service"),
    taxIdentificationNo: readLabeledText(text, "Tax identification No\\.?|Tax ID"),
    billingId: readLabeledText(text, "Billing ID"),
    paymentMethod: readLabeledText(text, "Payment method"),
    extraction: "local-text",
  };
  return parsedIfValid(cloudPaymentReceiptDraftSchema, draft);
}

/**
 * Parses the text layer of a Google Cloud statement. A document with no text
 * layer needs the model read path.
 * @param input The text layer, or null when the PDF has none.
 * @returns The parsed draft or `needs-model`.
 */
export function parseCloudStatement(input: {
  readonly text: string | null;
}): DocumentParseResult<CloudStatementDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const draft: CloudStatementDraft = {
    documentTitle: /Statement/iu.exec(text)?.[0] ?? null,
    to: readLabeledText(text, "To|Bill to"),
    service: readLabeledText(text, "Service"),
    cloudAccountId: readLabeledText(text, "Cloud account ID|Account ID"),
    paymentsAccountId: readLabeledText(text, "Payments account ID"),
    paymentsProfileId: readLabeledText(text, "Payments profile ID"),
    statementIssueDate: readEnglishDate(readLabeledText(text, "Statement date|Issue date")),
    periodStart: readEnglishDate(readLabeledText(text, "Period start")),
    periodEnd: readEnglishDate(readLabeledText(text, "Period end")),
    startingBalance: readLabeledMoney(text, "Starting balance"),
    totalNewActivity: readLabeledMoney(text, "Total new activity"),
    totalPaymentsReceived: readLabeledMoney(text, "Total payments received"),
    endingBalance:
      readLabeledMoney(text, "Ending balance") ??
      toMinorUnits(
        /ending[ \t]+balance[ \t]*[:：]?[ \t]*(-?[\d,]+(?:\.\d+)?)/iu.exec(text)?.[1] ??
          null,
      ),
    payments: [],
    extraction: "local-text",
  };
  return parsedIfValid(cloudStatementDraftSchema, draft);
}

/**
 * Parses the text layer of a foreign vendor invoice. The workbook form of this
 * type reaches the parsers through the workbook reader; this parser reads the
 * same text cells. A document with no text layer needs the model read path.
 * @param input The text layer, or null when the workbook text is absent.
 * @returns The parsed draft or `needs-model`.
 */
export function parseForeignVendorInvoice(input: {
  readonly text: string | null;
}): DocumentParseResult<ForeignVendorInvoiceDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const vendor =
    lines.find(
      (line) =>
        !/[:：]/u.test(line) &&
        !/^(?:invoice|description|quantity|qty|unit price|amount|to)\b/iu.test(line) &&
        readForeignDate(line) === null,
    ) ?? null;
  const amounts = [...text.matchAll(/RMB[ \t]*([\d,]+(?:\.\d+)?)/giu)].map(
    (match) => match[1] ?? "",
  );
  const descriptionLine = lines.findIndex((line) => /^DESCRIPTION\b/iu.test(line));
  const draft: ForeignVendorInvoiceDraft = {
    invoiceDate:
      readForeignDate(/DATE[ \t]*(\d{4}\.\d{2}\.\d{2})/iu.exec(text)?.[1] ?? null) ??
      readForeignDate(readLabeledText(text, "Date")),
    vendor,
    billTo: readLabeledText(text, "TO|Bill to"),
    description:
      descriptionLine === -1 ? null : (lines[descriptionLine + 1] ?? null),
    quantity: /(\d+)[ \t]*copies?/iu.exec(text)?.[1] ?? null,
    unitPrice: amounts.length > 1 ? `RMB${amounts[0] ?? ""}` : null,
    amount: amounts.length === 0 ? null : toMinorUnits(amounts[amounts.length - 1] ?? ""),
    currency: /\bRMB\b/iu.test(text) ? "RMB" : readCurrency(text),
    extraction: "local-text",
  };
  return parsedIfValid(foreignVendorInvoiceDraftSchema, draft);
}

/**
 * Parses the four-tab school invoice sheet. The adapter exports the Google
 * Sheet as `.xlsx`, the workbook reader reads all four tabs, and this parser
 * reads each tab that holds a title or a document number (open item Q21). The
 * tab text never goes to the model path.
 * @param input The worksheets read from the exported workbook.
 * @returns The parsed drafts, or the review result when no tab is readable.
 */
export function parseSchoolInvoiceSheet(input: {
  readonly worksheets: readonly WorkbookWorksheet[];
}): DocumentParseResult<SchoolInvoiceDraft> {
  const drafts: SchoolInvoiceDraft[] = [];
  for (const worksheet of input.worksheets) {
    const documentTitle = readCellText(worksheet.cells, "A2");
    const number =
      readCellText(worksheet.cells, "B5") ??
      Object.values(worksheet.cells)
        .map((value) => (value === null ? "" : String(value)))
        .map((value) => /\bPA-(?:INV|REC)-[0-9A-Za-z-]+/iu.exec(value)?.[0] ?? null)
        .find((value) => value !== null) ??
      null;
    if (documentTitle === null && number === null) continue;
    const isReceipt =
      documentTitle !== null &&
      /ใบเสร็จรับเงิน|receipt/iu.test(documentTitle);
    drafts.push({
      documentTitle,
      invoiceNo: number !== null && !isReceipt ? number : null,
      receiptNo: number !== null && isReceipt ? number : null,
      date: null,
      quotationRef: null,
      due: null,
      issuerCompanyNames: readCellText(worksheet.cells, "A1"),
      issuerTaxId: null,
      issuerBranch: null,
      issuerContact: null,
      customerName: null,
      customerAddress: null,
      customerTaxId: null,
      students: null,
      lines: [],
      subtotal: null,
      discounts: [],
      netTotal: null,
      netTotalInWords: null,
      payment: null,
      delivery: null,
      vatNote: null,
      terms: null,
      extraction: "local-text",
    });
  }
  const [first] = drafts;
  if (first === undefined) return reviewDocument(REVIEW_MISSING_STORED_RESULT);
  return parsedIfValid(schoolInvoiceDraftSchema, first, drafts);
}

/**
 * Parses the text layer of a school invoice PDF. The LibreOffice print has a
 * clean layer; the Google Sheets print has a broken Thai layer, and the
 * intake puts that file on the review list (open item Q21).
 * @param input The text layer, or null when the PDF has none.
 * @returns The parsed draft, the review result, or `needs-model`.
 */
export function parseSchoolInvoicePdf(input: {
  readonly text: string | null;
}): DocumentParseResult<SchoolInvoiceDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const number =
    /\bPA-(?:INV|REC)-[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*/iu.exec(text)?.[0] ?? null;
  if (number === null) return reviewDocument(REVIEW_MISSING_STORED_RESULT);
  const isReceipt = /ใบเสร็จรับเงิน|\breceipt\b/iu.test(text);
  const draft: SchoolInvoiceDraft = {
    documentTitle: /\b(?:Invoice|Receipt)\b/u.exec(text)?.[0] ?? null,
    invoiceNo: isReceipt ? null : number,
    receiptNo: isReceipt ? number : null,
    date:
      readThaiShortDate(
        /(\d{1,2}[ \t]*[^\s]+[ \t]*\d{4})/u.exec(text)?.[1] ?? null,
      ) ?? readEnglishDate(text),
    quotationRef: readLabeledText(text, "Quotation|Quotation No\\.?"),
    due: readThaiShortDate(readLabeledText(text, "Due|Due date")),
    issuerCompanyNames: null,
    issuerTaxId: null,
    issuerBranch: null,
    issuerContact: null,
    customerName: readLabeledText(text, "Customer|Bill to"),
    customerAddress: null,
    customerTaxId: null,
    students: null,
    lines: [],
    subtotal: readLabeledMoney(text, "Subtotal"),
    discounts: [],
    netTotal:
      readLabeledMoney(text, "Total|Net total") ??
      toMinorUnits(/\btotal[ \t]*[:：]?[ \t]*(-?[\d,]+(?:\.\d+)?)/iu.exec(text)?.[1] ?? null),
    netTotalInWords: readLabeledText(text, "Total in words"),
    payment: null,
    delivery: null,
    vatNote: null,
    terms: null,
    extraction: "local-text",
  };
  return parsedIfValid(schoolInvoiceDraftSchema, draft);
}

/**
 * Parses the text layer of a receipt. A receipt has no real sample, so the
 * fixture is synthetic and marked (PM-12). A JPEG, a PNG, and a non-text PDF
 * reach the model read path; a text PDF stays local.
 * @param input The text layer, or null when the file has none.
 * @returns The parsed draft or `needs-model`.
 */
export function parseReceipt(input: {
  readonly text: string | null;
}): DocumentParseResult<ReceiptDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const draft: ReceiptDraft = {
    vendor:
      lines.find(
        (line) => !/[:：]/u.test(line) && !/\breceipt\b/iu.test(line),
      ) ?? null,
    date:
      readIsoDate(readLabeledText(text, "Date")) ??
      readEnglishDate(readLabeledText(text, "Date")),
    amount: readLabeledMoney(text, "Total|Amount"),
    currency: readCurrency(text),
    paymentMethod: /Paid by[ \t]*[:：]?[ \t]*([^\n]+)/iu.exec(text)?.[1]?.trim() ?? null,
    extraction: "local-text",
  };
  return parsedIfValid(receiptDraftSchema, draft);
}

/**
 * Parses the text layer of an OpenAI invoice. The type has no real sample, so
 * the fixture is synthetic and marked (PM-12). A non-text PDF goes to the model
 * read path (D-13).
 * @param input The text layer, or null when the PDF has none.
 * @returns The parsed draft, the review result, or `needs-model`.
 */
export function parseOpenAiInvoice(input: {
  readonly text: string | null;
}): DocumentParseResult<OpenAiInvoiceDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const invoiceNumber =
    /(?:OpenAI invoice|Invoice number|Invoice No\.?)[ \t]*[:：]?[ \t]*([A-Z0-9][A-Z0-9-]*)/iu.exec(
      text,
    )?.[1] ?? null;
  if (invoiceNumber === null) return reviewDocument(REVIEW_MISSING_STORED_RESULT);
  const period = /([A-Za-z]{3,9}[ \t]+\d{1,2},?[ \t]+\d{4}|\d{4}-\d{2}-\d{2})[ \t]*(?:to|-|–)[ \t]*([A-Za-z]{3,9}[ \t]+\d{1,2},?[ \t]+\d{4}|\d{4}-\d{2}-\d{2})/u.exec(
    text,
  );
  const draft: OpenAiInvoiceDraft = {
    invoiceNumber,
    invoiceDate:
      readIsoDate(readLabeledText(text, "Invoice date")) ??
      readEnglishDate(readLabeledText(text, "Invoice date")),
    periodStart:
      readIsoDate(period?.[1] ?? null) ?? readEnglishDate(period?.[1] ?? null),
    periodEnd:
      readIsoDate(period?.[2] ?? null) ?? readEnglishDate(period?.[2] ?? null),
    currency: readCurrency(text),
    subtotal: readLabeledMoney(text, "Subtotal|Sub-total"),
    tax: readLabeledMoney(text, "Tax|GST"),
    total: readLabeledMoney(text, "Total"),
    extraction: "local-text",
  };
  return parsedIfValid(openAiInvoiceDraftSchema, draft);
}

/**
 * Parses the text layer of a withholding tax certificate. The type has no real
 * sample, so the fixture is synthetic and marked (PM-12). A non-text PDF goes
 * to the model read path.
 * @param input The text layer, or null when the PDF has none.
 * @returns The parsed draft or `needs-model`.
 */
export function parseWithholdingCertificate(input: {
  readonly text: string | null;
}): DocumentParseResult<WithholdingCertificateDraft> {
  if (input.text === null) return { status: "needs-model" };
  const text = normalizeDigits(input.text);
  const draft: WithholdingCertificateDraft = {
    withholderTaxId: readLabeledText(text, "Withholder tax id|Withholding tax id"),
    payeeName: readLabeledText(text, "Payee name|Payee"),
    payeeTaxId: readLabeledText(text, "Payee tax id"),
    paymentDate: readIsoDate(readLabeledText(text, "Payment date")),
    incomeType: readLabeledText(text, "Income type"),
    amountPaid: readLabeledMoney(text, "Amount paid"),
    taxWithheld: readLabeledMoney(text, "Tax withheld"),
    extraction: "local-text",
  };
  return parsedIfValid(withholdingCertificateDraftSchema, draft);
}

/**
 * Parses an encrypted bank statement. Without the secret the document needs a
 * password and gives no draft (PM-13); with the password a text read stays
 * local, and a file with no text layer needs the model read path.
 * @param input Whether the app holds the password, and the decrypted text.
 * @returns The parsed draft, `needs-password`, or `needs-model`.
 */
export function parseBankStatement(input: {
  readonly passwordHeld: boolean;
  readonly text?: string | null;
}): DocumentParseResult<BankStatementDraft> {
  if (!input.passwordHeld) return { status: "needs-password" };
  if (input.text === null || input.text === undefined) {
    return { status: "needs-model" };
  }
  return parsedIfValid(bankStatementDraftSchema, {
    extraction: "local-text",
  } satisfies BankStatementDraft);
}
