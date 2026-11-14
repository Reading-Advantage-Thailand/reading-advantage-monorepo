import {
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

/**
 * Reads the period of the real PND.3 wording: the year from `พ.ศ. {yyyy}` on
 * the line after the `เดือนที่จ่ายเงินได้พึงประเมิน` label line, and the month
 * from the `({n}) {month}` entry that follows the single tick on its line. The
 * instruction line holds a quoted tick and is not a tick.
 * @param text Normalized document text.
 * @returns The CE year and month, or null when the label is absent, the line
 *   after the label holds no year, the ticks are not exactly one, or the tick
 *   line holds no entry after the tick.
 */
function readPnd3RealMonth(text: string): MonthPeriod | null {
  const lines = text.split("\n");
  const labelIndex = lines.findIndex((line) => line.includes(PND3_PERIOD_LABEL));
  if (labelIndex === -1) return null;
  const yearMatch = PND3_YEAR_LINE.exec(lines[labelIndex + 1] ?? "");
  const year = yearMatch === null ? null : toCommonEra(Number(yearMatch[1]));
  if (year === null) return null;
  const tickedLines = lines
    .slice(labelIndex + 2)
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
