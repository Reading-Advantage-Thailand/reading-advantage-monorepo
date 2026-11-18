import {
  ACCOUNTING_PERIOD_LABEL,
  LABELS,
  LEDGER_PERIOD_LABEL,
  STATEMENT_DATE_LABEL,
  normalizeDigits,
  parseMonthlyWhtFiling,
  parseWhtFilingPnd3,
  parsed,
  readAmount,
  readCount,
  readDateRange,
  readLabeledDate,
  readLabeledYear,
  readWhtFilingKind,
  unmatched,
  yearRange,
  type YearFileParseInput,
  type YearFileParseResult,
  type YearFileParser,
} from "./document-parsing.js";

export type {
  YearFileParseInput,
  YearFileParseResult,
  YearFileUnmatchedReason,
} from "./document-parsing.js";

/**
 * Parses a PND.1 monthly withholding filing on salary.
 * @param input The text layer of the file.
 * @returns The parsed filing, or unmatched with `period-unreadable`.
 */
export function parseWhtFilingPnd1(input: YearFileParseInput): YearFileParseResult {
  return parseMonthlyWhtFiling(normalizeDigits(input.text), "wht-filing-pnd1");
}

/**
 * Parses a PND.1A annual summary of PND.1.
 * @param input The text layer of the file.
 * @returns The parsed filing, or unmatched with `period-unreadable`.
 */
export function parseWhtFilingPnd1a(input: YearFileParseInput): YearFileParseResult {
  const text = normalizeDigits(input.text);
  const year = readLabeledYear(text, "ประจำปี");
  if (year === null) return unmatched("period-unreadable");
  return parsed({
    typeKey: "wht-filing-pnd1a",
    filingKind: readWhtFilingKind(text),
    periodKind: "year",
    range: yearRange(year),
    facts: {
      payeeCount: readCount(text, LABELS.payeeCount),
      totalPaid: readAmount(text, LABELS.totalPaid),
      totalTaxWithheld: readAmount(text, LABELS.totalTaxWithheld),
    },
  });
}

/**
 * Parses a PND.53 monthly withholding filing for payments to a company.
 * @param input The text layer of the file.
 * @returns The parsed filing, or unmatched with `period-unreadable`.
 */
export function parseWhtFilingPnd53(input: YearFileParseInput): YearFileParseResult {
  return parseMonthlyWhtFiling(normalizeDigits(input.text), "wht-filing-pnd53");
}

/**
 * Parses a PND.50 annual corporate income tax return.
 * @param input The text layer of the file.
 * @returns The parsed filing, or unmatched with `period-unreadable`.
 */
export function parseCorporateTaxPnd50(input: YearFileParseInput): YearFileParseResult {
  const text = normalizeDigits(input.text);
  const range = readDateRange(text, ACCOUNTING_PERIOD_LABEL);
  if (range === null) return unmatched("period-unreadable");
  return parsed({
    typeKey: "corporate-tax-pnd50",
    filingKind: readWhtFilingKind(text) === "receipt" ? "receipt" : "form",
    periodKind: "year",
    range,
    facts: {
      accountingPeriodStart: range.start,
      accountingPeriodEnd: range.end,
      netProfitOrLoss: readAmount(text, LABELS.netProfitOrLoss),
      taxPayable: readAmount(text, LABELS.taxPayable),
      taxPaid: readAmount(text, LABELS.taxPaid),
    },
  });
}

/**
 * Parses the financial statement of the year end.
 * @param input The text layer of the file.
 * @returns The parsed statement, or unmatched with `period-unreadable`.
 */
export function parseYearEndFinancialStatement(
  input: YearFileParseInput,
): YearFileParseResult {
  const text = normalizeDigits(input.text);
  const range = readDateRange(text, ACCOUNTING_PERIOD_LABEL);
  if (range === null) return unmatched("period-unreadable");
  return parsed({
    typeKey: "year-end-financial-statement",
    filingKind: "statement",
    periodKind: "year",
    range,
    facts: {
      statementDate: readLabeledDate(text, STATEMENT_DATE_LABEL),
      totalAssets: readAmount(text, LABELS.totalAssets),
      totalLiabilities: readAmount(text, LABELS.totalLiabilities),
      totalEquity: readAmount(text, LABELS.totalEquity),
      totalRevenue: readAmount(text, LABELS.totalRevenue),
      netProfitOrLoss: readAmount(text, LABELS.netProfitOrLoss),
    },
  });
}

/**
 * Parses a general ledger of one accounting period.
 * @param input The text layer of the file.
 * @returns The parsed ledger, or unmatched with `period-unreadable`.
 */
export function parseGeneralLedger(input: YearFileParseInput): YearFileParseResult {
  const text = normalizeDigits(input.text);
  const range = readDateRange(text, LEDGER_PERIOD_LABEL);
  if (range === null) return unmatched("period-unreadable");
  return parsed({
    typeKey: "general-ledger",
    filingKind: "statement",
    periodKind: "year",
    range,
    facts: {
      periodStart: range.start,
      periodEnd: range.end,
      lineCount: readCount(text, LABELS.lineCount),
      totalDebit: readAmount(text, LABELS.totalDebit),
      totalCredit: readAmount(text, LABELS.totalCredit),
    },
  });
}

/**
 * Parses an สบช.3 annual financial statement filing.
 * @param input The text layer of the file.
 * @returns The parsed filing, or unmatched with `period-unreadable`.
 */
export function parseDbdFilingSbor3(input: YearFileParseInput): YearFileParseResult {
  const text = normalizeDigits(input.text);
  const fiscalYear = readLabeledYear(text, "ปีภาษี");
  const range =
    readDateRange(text, ACCOUNTING_PERIOD_LABEL) ??
    (fiscalYear === null ? null : yearRange(fiscalYear));
  if (range === null) return unmatched("period-unreadable");
  return parsed({
    typeKey: "dbd-filing-sbor3",
    filingKind: "statement",
    periodKind: "year",
    range,
    facts: {
      fiscalYear,
      statementDate: readLabeledDate(text, "งบการเงิน[ \\t]*ณ(?:[ \\t]*วันที่)?"),
      totalAssets: readAmount(text, LABELS.totalAssets),
      totalRevenue: readAmount(text, LABELS.totalRevenue),
      netProfitOrLoss: readAmount(text, LABELS.netProfitOrLoss),
    },
  });
}

/** One dispatcher row: the text pattern of a type and the parser it picks. */
type DispatchRow = { readonly pattern: RegExp; readonly parse: YearFileParser };

/**
 * Dispatcher rows in match order. The statement titles come first, then the
 * specific form titles. Each pattern reads the text and never a file name.
 */
const DISPATCH_ROWS: readonly DispatchRow[] = [
  { pattern: /สบช\.?[ \t]*3/u, parse: parseDbdFilingSbor3 },
  { pattern: /งบแสดงฐานะการเงิน|งบดุล/u, parse: parseYearEndFinancialStatement },
  { pattern: /สมุดรายวันทั่วไป|บัญชีแยกประเภท/u, parse: parseGeneralLedger },
  { pattern: /ภ\.ง\.ด\.[ \t]*50(?!\d)/u, parse: parseCorporateTaxPnd50 },
  { pattern: /ภ\.ง\.ด\.[ \t]*53(?!\d)/u, parse: parseWhtFilingPnd53 },
  { pattern: /ภ\.ง\.ด\.[ \t]*1[ \t]*ก/u, parse: parseWhtFilingPnd1a },
  { pattern: /ภ\.ง\.ด\.[ \t]*1(?!\d)/u, parse: parseWhtFilingPnd1 },
  { pattern: /ภ\.ง\.ด\.[ \t]*3(?!\d)/u, parse: parseWhtFilingPnd3 },
];

/**
 * Parses one year file: picks the type from the text and runs that parser.
 * The file name and the folder name never decide the type or the period.
 * @param input The text layer of the file; the names are ignored.
 * @returns The parsed filing, unmatched `type-unmatched` for an unknown text,
 *   or unmatched `period-unreadable` for a known text with no readable period.
 */
export function parseYearFile(input: YearFileParseInput): YearFileParseResult {
  const text = normalizeDigits(input.text);
  const row = DISPATCH_ROWS.find((candidate) => candidate.pattern.test(text));
  if (row === undefined) return unmatched("type-unmatched");
  return row.parse(input);
}
