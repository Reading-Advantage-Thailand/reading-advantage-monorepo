/**
 * Red tests for the year-file parsers (plan task 10.1, spec section 9b).
 *
 * `year-file-parsers.ts` and `document-parsing.ts` do not exist at the base
 * (strategy fact Y1). This file loads both with `existsSync` and a dynamic
 * import, so every failure is an assertion that names the missing module and
 * the missing export. A bare `Cannot find module` load error is a defect of
 * this Red file.
 *
 * Fake data only. The fixtures under `__fixtures__/year-files/` are synthetic
 * text marked `no real sample` and hold sentinel values only. No real amount,
 * payee, person name, tax id, account number, file name, or Drive id enters
 * this file or any parser result. No hash exists in any pinned contract.
 *
 * Labeled counts (strategy P10.6 floors):
 * - year_file_types=8, type_keys_added=8, unknown_key_rows=1
 * - filing_kinds=4
 * - year_file_fixtures>=8 (13 at the base), fixtures_without_marker=0
 * - be_to_ce_cases>=2, period_unreadable_rows>=1, null_fact_rows>=1
 * - type_from_text_rows>=2, banned_fact_rows>=1
 * - duplicate_target_rows=4
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  accountingIntakeDocumentSchema,
  accountingIntakeDocumentTypeSchema,
} from "../intake-contracts.js";
import { beforeAll, describe, expect, it } from "vitest";

const PARSER_SOURCE_PATH = fileURLToPath(
  new URL("../year-file-parsers.ts", import.meta.url),
);
const PND3_SOURCE_PATH = fileURLToPath(
  new URL("../document-parsing.ts", import.meta.url),
);
const FIXTURE_DIR = fileURLToPath(
  new URL("./__fixtures__/year-files", import.meta.url),
);

const PARSER_MODULE_EXISTS = existsSync(PARSER_SOURCE_PATH);
const PND3_MODULE_EXISTS = existsSync(PND3_SOURCE_PATH);

type YearFileFilingKind = "form" | "attachment" | "receipt" | "statement";

type YearFileParseInput = {
  readonly text: string;
  readonly fileName?: string;
  readonly folderName?: string;
};

type YearFileFacts = Readonly<Record<string, number | string | null>>;

type YearFileParseResult = {
  readonly status: "parsed" | "unmatched";
  readonly unmatchedReason: string | null;
  readonly typeKey: string | null;
  readonly filingKind: YearFileFilingKind | null;
  readonly periodKind: "month" | "year" | null;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly taxYear: number | null;
  readonly sourceMonth: string | null;
  readonly extraction: string | null;
  readonly facts: YearFileFacts | null;
};

type ParserFunction = (input: YearFileParseInput) => YearFileParseResult;

let parsers: Record<string, unknown> = {};
let pnd3Module: Record<string, unknown> = {};

beforeAll(async () => {
  if (PARSER_MODULE_EXISTS) {
    parsers = (await import("../year-file-parsers.js")) as Record<
      string,
      unknown
    >;
  }
  if (PND3_MODULE_EXISTS) {
    pnd3Module = (await import("../document-parsing.js")) as Record<
      string,
      unknown
    >;
  }
});

/**
 * Returns one exported parser function or fails with the module and export
 * name. The message is the Red evidence: it names the not-yet-written file.
 * @param exportName The parser export to require.
 * @param sourceName The module file that must hold the export.
 * @returns The exported function.
 */
function requireParser(
  exportName: string,
  sourceName: "year-file-parsers.ts" | "document-parsing.ts",
): ParserFunction {
  const moduleExists =
    sourceName === "year-file-parsers.ts" ? PARSER_MODULE_EXISTS : PND3_MODULE_EXISTS;
  const moduleExports =
    sourceName === "year-file-parsers.ts" ? parsers : pnd3Module;
  expect(
    moduleExists,
    `Missing packages/backend/src/modules/accounting/${sourceName}. ` +
      `The export ${exportName} cannot be proven until the file exists.`,
  ).toBe(true);
  const value = moduleExports[exportName];
  expect(
    value,
    `Missing export ${exportName} from ${sourceName}. ` +
      `The year-file parser surface of plan task 10.2 needs it.`,
  ).toBeDefined();
  expect(
    typeof value,
    `Export ${exportName} of ${sourceName} must be a function.`,
  ).toBe("function");
  return value as ParserFunction;
}

/** Reads one fixture text and fails when the fixture file is missing. */
function fixtureText(name: string): string {
  return readFileSync(`${FIXTURE_DIR}/${name}`, "utf8");
}

/** The eight type keys of the spec section 9b table. Seven keys are new; the key `wht-filing-pnd3` is added with them (strategy fact Y2, Q13 default). */
const YEAR_FILE_TYPE_KEYS = [
  "wht-filing-pnd1",
  "wht-filing-pnd1a",
  "wht-filing-pnd3",
  "wht-filing-pnd53",
  "corporate-tax-pnd50",
  "year-end-financial-statement",
  "general-ledger",
  "dbd-filing-sbor3",
] as const;

/** The four filing kinds of the spec section 9b table. */
const FILING_KINDS = ["form", "attachment", "receipt", "statement"] as const;

/** Sentinel tokens that no parser result may hold (P10.5 fixture rule). */
const BANNED_RESULT_TOKENS = [
  "Test Counterparty",
  "0000000000000",
  "000-0-00000-0",
  "fake-drive-",
  "fake-file-",
  "เอกสารปี",
  "2568-2",
];

type ParsedCase = {
  readonly fixture: string;
  readonly typeKey: string;
  readonly filingKind: YearFileFilingKind;
  readonly periodKind: "month" | "year";
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly taxYear: number;
  readonly sourceMonth: string;
  readonly facts: YearFileFacts;
  readonly fileName?: string;
  readonly folderName?: string;
};

/** One expected parse result per fixture. Amounts are satang integers. */
const PARSED_CASES: readonly ParsedCase[] = [
  {
    fixture: "pnd1-monthly.txt",
    typeKey: "wht-filing-pnd1",
    filingKind: "form",
    periodKind: "month",
    periodStart: "2024-01-01",
    periodEnd: "2024-01-31",
    taxYear: 2024,
    sourceMonth: "2024-01",
    facts: {
      payeeCount: 12,
      totalPaid: 123456,
      totalTaxWithheld: 10000,
      surcharge: 10000,
      totalRemitted: 789012,
    },
  },
  {
    fixture: "pnd1a-annual.txt",
    typeKey: "wht-filing-pnd1a",
    filingKind: "form",
    periodKind: "year",
    periodStart: "2024-01-01",
    periodEnd: "2024-12-31",
    taxYear: 2024,
    sourceMonth: "2024-12",
    facts: {
      payeeCount: 12,
      totalPaid: 123456,
      totalTaxWithheld: 10000,
    },
  },
  {
    fixture: "pnd3-monthly.txt",
    typeKey: "wht-filing-pnd3",
    filingKind: "form",
    periodKind: "month",
    periodStart: "2025-03-01",
    periodEnd: "2025-03-31",
    taxYear: 2025,
    sourceMonth: "2025-03",
    facts: {
      payeeCount: 9,
      totalPaid: 123456,
      totalTaxWithheld: 10000,
      surcharge: 10000,
      totalRemitted: 789012,
    },
  },
  {
    fixture: "pnd3-attachment.txt",
    typeKey: "wht-filing-pnd3",
    filingKind: "attachment",
    periodKind: "month",
    periodStart: "2025-03-01",
    periodEnd: "2025-03-31",
    taxYear: 2025,
    sourceMonth: "2025-03",
    facts: {
      payeeCount: 9,
      totalPaid: 123456,
      totalTaxWithheld: 10000,
      surcharge: 10000,
      totalRemitted: 789012,
    },
  },
  {
    fixture: "pnd3-receipt.txt",
    typeKey: "wht-filing-pnd3",
    filingKind: "receipt",
    periodKind: "month",
    periodStart: "2025-03-01",
    periodEnd: "2025-03-31",
    taxYear: 2025,
    sourceMonth: "2025-03",
    facts: {
      payeeCount: null,
      totalPaid: null,
      totalTaxWithheld: 10000,
      surcharge: null,
      totalRemitted: 789012,
    },
  },
  {
    fixture: "pnd53-monthly.txt",
    typeKey: "wht-filing-pnd53",
    filingKind: "form",
    periodKind: "month",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    taxYear: 2025,
    sourceMonth: "2025-02",
    facts: {
      payeeCount: 3,
      totalPaid: 123456,
      totalTaxWithheld: 10000,
      surcharge: null,
      totalRemitted: 789012,
    },
  },
  {
    fixture: "pnd50-annual.txt",
    typeKey: "corporate-tax-pnd50",
    filingKind: "form",
    periodKind: "year",
    periodStart: "2024-01-01",
    periodEnd: "2024-12-31",
    taxYear: 2024,
    sourceMonth: "2024-12",
    facts: {
      accountingPeriodStart: "2024-01-01",
      accountingPeriodEnd: "2024-12-31",
      netProfitOrLoss: 123456,
      taxPayable: 789012,
      taxPaid: 10000,
    },
  },
  {
    fixture: "financial-statement.txt",
    typeKey: "year-end-financial-statement",
    filingKind: "statement",
    periodKind: "year",
    periodStart: "2024-01-01",
    periodEnd: "2024-12-31",
    taxYear: 2024,
    sourceMonth: "2024-12",
    facts: {
      statementDate: "2024-12-31",
      totalAssets: 789012,
      totalLiabilities: 123456,
      totalEquity: 10000,
      totalRevenue: 789012,
      netProfitOrLoss: 123456,
    },
  },
  {
    fixture: "general-ledger.txt",
    typeKey: "general-ledger",
    filingKind: "statement",
    periodKind: "year",
    periodStart: "2024-01-01",
    periodEnd: "2024-12-31",
    taxYear: 2024,
    sourceMonth: "2024-12",
    facts: {
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      lineCount: 24,
      totalDebit: 123456,
      totalCredit: 123456,
    },
  },
  {
    fixture: "sbor3.txt",
    typeKey: "dbd-filing-sbor3",
    filingKind: "statement",
    periodKind: "year",
    periodStart: "2025-01-01",
    periodEnd: "2025-12-31",
    taxYear: 2025,
    sourceMonth: "2025-12",
    facts: {
      fiscalYear: 2025,
      statementDate: "2025-06-30",
      totalAssets: 789012,
      totalRevenue: 123456,
      netProfitOrLoss: 10000,
    },
  },
  {
    fixture: "pnd1-thai-digit-year.txt",
    typeKey: "wht-filing-pnd1",
    filingKind: "form",
    periodKind: "month",
    periodStart: "2025-04-01",
    periodEnd: "2025-04-30",
    taxYear: 2025,
    sourceMonth: "2025-04",
    facts: {
      payeeCount: 12,
      totalPaid: 123456,
      totalTaxWithheld: 10000,
      surcharge: 10000,
      totalRemitted: 789012,
    },
  },
  {
    fixture: "misleading-name.txt",
    typeKey: "wht-filing-pnd3",
    filingKind: "form",
    periodKind: "month",
    periodStart: "2025-03-01",
    periodEnd: "2025-03-31",
    taxYear: 2025,
    sourceMonth: "2025-03",
    facts: {
      payeeCount: 9,
      totalPaid: 123456,
      totalTaxWithheld: 10000,
      surcharge: 10000,
      totalRemitted: 789012,
    },
    fileName: "fake-file-invoice-summary.pdf",
    folderName: "Fwd: เอกสารปี 2568",
  },
];

const UNREADABLE_CASE_NAME = "pnd1-period-unreadable.txt";

describe("year-file parser module surface", () => {
  it("exports parseYearFile from year-file-parsers.ts", () => {
    requireParser("parseYearFile", "year-file-parsers.ts");
  });

  it("exports parseWhtFilingPnd1 from year-file-parsers.ts", () => {
    requireParser("parseWhtFilingPnd1", "year-file-parsers.ts");
  });

  it("exports parseWhtFilingPnd1a from year-file-parsers.ts", () => {
    requireParser("parseWhtFilingPnd1a", "year-file-parsers.ts");
  });

  it("exports parseWhtFilingPnd53 from year-file-parsers.ts", () => {
    requireParser("parseWhtFilingPnd53", "year-file-parsers.ts");
  });

  it("exports parseCorporateTaxPnd50 from year-file-parsers.ts", () => {
    requireParser("parseCorporateTaxPnd50", "year-file-parsers.ts");
  });

  it("exports parseYearEndFinancialStatement from year-file-parsers.ts", () => {
    requireParser("parseYearEndFinancialStatement", "year-file-parsers.ts");
  });

  it("exports parseGeneralLedger from year-file-parsers.ts", () => {
    requireParser("parseGeneralLedger", "year-file-parsers.ts");
  });

  it("exports parseDbdFilingSbor3 from year-file-parsers.ts", () => {
    requireParser("parseDbdFilingSbor3", "year-file-parsers.ts");
  });

  it("exports parseWhtFilingPnd3 from document-parsing.ts (Q13)", () => {
    requireParser("parseWhtFilingPnd3", "document-parsing.ts");
  });
});

describe("year-file fixtures", () => {
  it("holds at least eight fixture files (year_file_fixtures>=8)", () => {
    const names = readdirSync(FIXTURE_DIR).filter((name) =>
      name.endsWith(".txt"),
    );
    expect(
      names.length,
      "The fixture folder of plan task 10.1 needs at least eight fixture files.",
    ).toBeGreaterThanOrEqual(8);
  });

  it("marks every fixture with line 1 'no real sample' (fixtures_without_marker=0)", () => {
    const unmarked = readdirSync(FIXTURE_DIR)
      .filter((name) => name.endsWith(".txt"))
      .filter((name) => !fixtureText(name).startsWith("no real sample\n"));
    expect(
      unmarked,
      "Every fixture must start with the marker 'no real sample'.",
    ).toEqual([]);
  });

  it("covers all four filing kinds across the fixtures (filing_kinds=4)", () => {
    const kinds = new Set(PARSED_CASES.map((testCase) => testCase.filingKind));
    expect(
      [...kinds].sort(),
      "The parsed fixture set must cover the four filing kinds.",
    ).toEqual([...FILING_KINDS].sort());
  });
});

describe("intake document type contract", () => {
  it("holds eight year-file type keys (type_keys_added=8, year_file_types=8)", () => {
    expect(YEAR_FILE_TYPE_KEYS).toHaveLength(8);
  });

  for (const typeKey of YEAR_FILE_TYPE_KEYS) {
    it(`accepts the year-file type key ${typeKey}`, () => {
      expect(
        accountingIntakeDocumentTypeSchema.safeParse(typeKey).success,
        `The type key ${typeKey} of the spec section 9b table must parse.`,
      ).toBe(true);
    });
  }

  it("rejects an unknown type key (unknown_key_rows=1)", () => {
    expect(
      accountingIntakeDocumentTypeSchema.safeParse("unknown-year-form").success,
      "An unknown type key must fail the type contract.",
    ).toBe(false);
  });
});

describe("parseYearFile per fixture", () => {
  it.each(PARSED_CASES.map((testCase) => [testCase.fixture, testCase]))(
    "parses %s",
    (_name, testCase: ParsedCase) => {
      const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
      const result = parseYearFile({
        text: fixtureText(testCase.fixture),
        fileName: testCase.fileName ?? "fake-file-1.pdf",
        folderName: testCase.folderName,
      }) as YearFileParseResult;
      expect(result.status).toBe("parsed");
      expect(result.unmatchedReason).toBeNull();
      expect(result.typeKey).toBe(testCase.typeKey);
      expect(result.filingKind).toBe(testCase.filingKind);
      expect(result.periodKind).toBe(testCase.periodKind);
      expect(result.periodStart).toBe(testCase.periodStart);
      expect(result.periodEnd).toBe(testCase.periodEnd);
      expect(result.taxYear).toBe(testCase.taxYear);
      expect(result.sourceMonth).toBe(testCase.sourceMonth);
      expect(result.extraction).toBe("local-text");
      expect(result.facts).toEqual(testCase.facts);
    },
  );

  it("gives unmatched with reason period-unreadable and no folder fallback (period_unreadable_rows>=1)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText(UNREADABLE_CASE_NAME),
      fileName: "fake-file-2.pdf",
      folderName: "2568-2",
    }) as YearFileParseResult;
    expect(result.status).toBe("unmatched");
    expect(result.unmatchedReason).toBe("period-unreadable");
    expect(result.typeKey).toBeNull();
    expect(result.periodKind).toBeNull();
    expect(result.periodStart).toBeNull();
    expect(result.periodEnd).toBeNull();
    expect(result.taxYear).toBeNull();
    expect(result.sourceMonth).toBeNull();
  });

  it("gives unmatched with reason type-unmatched for text that matches no form", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: "ข้อความที่ไม่ตรงกับแบบฟอร์มใด ๆ",
      fileName: "fake-file-3.pdf",
    }) as YearFileParseResult;
    expect(result.status).toBe("unmatched");
    expect(result.unmatchedReason).toBe("type-unmatched");
    expect(result.typeKey).toBeNull();
    expect(result.facts).toBeNull();
  });

  it("parses the PND.3 fixture through parseWhtFilingPnd3 directly (Q13)", () => {
    const parseWhtFilingPnd3 = requireParser(
      "parseWhtFilingPnd3",
      "document-parsing.ts",
    );
    const result = parseWhtFilingPnd3({
      text: fixtureText("pnd3-monthly.txt"),
      fileName: "fake-file-pnd3.pdf",
    }) as YearFileParseResult;
    expect(result.status).toBe("parsed");
    expect(result.typeKey).toBe("wht-filing-pnd3");
    expect(result.filingKind).toBe("form");
    expect(result.taxYear).toBe(2025);
    expect(result.sourceMonth).toBe("2025-03");
  });
});

describe("period conversion from Buddhist Era to CE", () => {
  it("converts BE 2567 to CE 2024 (be_to_ce_cases>=2)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText("pnd1-monthly.txt"),
      fileName: "fake-file-4.pdf",
    }) as YearFileParseResult;
    expect(result.taxYear).toBe(2024);
    expect(result.periodEnd).toBe("2024-01-31");
  });

  it("converts BE 2568 to CE 2025 (be_to_ce_cases>=2)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText("pnd53-monthly.txt"),
      fileName: "fake-file-5.pdf",
    }) as YearFileParseResult;
    expect(result.taxYear).toBe(2025);
    expect(result.periodEnd).toBe("2025-02-28");
  });

  it("converts a Thai-digit BE year ๒๕๖๘ to CE 2025 (be_to_ce_cases>=2)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText("pnd1-thai-digit-year.txt"),
      fileName: "fake-file-6.pdf",
    }) as YearFileParseResult;
    expect(result.taxYear).toBe(2025);
    expect(result.sourceMonth).toBe("2025-04");
  });
});

describe("the type comes from the text", () => {
  it("reads a PND.1 type key with a misleading fake file name (type_from_text_rows>=2)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText("pnd1-monthly.txt"),
      fileName: "fake-file-invoice-summary.pdf",
      folderName: "2568-2",
    }) as YearFileParseResult;
    expect(result.typeKey).toBe("wht-filing-pnd1");
  });

  it("reads a PND.3 type key with a misleading fake file name and subfolder (type_from_text_rows>=2)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText("misleading-name.txt"),
      fileName: "fake-file-7.pdf",
      folderName: "Fwd: เอกสารปี 2568",
    }) as YearFileParseResult;
    expect(result.typeKey).toBe("wht-filing-pnd3");
  });
});

describe("a fact the text does not give is null", () => {
  it("gives null for the absent surcharge of PND.53 and does not fail the file (null_fact_rows>=1)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText("pnd53-monthly.txt"),
      fileName: "fake-file-8.pdf",
    }) as YearFileParseResult;
    expect(result.status).toBe("parsed");
    expect(result.facts?.surcharge).toBeNull();
  });

  it("gives null for the absent payeeCount and totalPaid of the PND.3 receipt (null_fact_rows>=1)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const result = parseYearFile({
      text: fixtureText("pnd3-receipt.txt"),
      fileName: "fake-file-9.pdf",
    }) as YearFileParseResult;
    expect(result.status).toBe("parsed");
    expect(result.facts?.payeeCount).toBeNull();
    expect(result.facts?.totalPaid).toBeNull();
    expect(result.facts?.surcharge).toBeNull();
  });
});

describe("no banned value in any parser result", () => {
  it("holds no payee, person name, tax id, account number, file name, Drive id, or subfolder name (banned_fact_rows>=1)", () => {
    const parseYearFile = requireParser("parseYearFile", "year-file-parsers.ts");
    const scanned: string[] = [];
    for (const testCase of PARSED_CASES) {
      const result = parseYearFile({
        text: fixtureText(testCase.fixture),
        fileName: testCase.fileName ?? "fake-file-10.pdf",
        folderName: testCase.folderName,
      }) as YearFileParseResult;
      const printed = JSON.stringify(result) ?? "";
      for (const token of BANNED_RESULT_TOKENS) {
        expect(
          printed.includes(token),
          `The parse result of ${testCase.fixture} holds the banned token "${token}".`,
        ).toBe(false);
      }
      scanned.push(testCase.fixture);
    }
    expect(
      scanned.length,
      "The banned-value scan must cover every parsed fixture result.",
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("the intake duplicate contract of FR-28", () => {
  const UUID_A = "00000000-0000-4000-8000-00000000000a";
  const UUID_B = "00000000-0000-4000-8000-00000000000b";

  /**
   * Builds a valid intake document row for the duplicate rule rows.
   * @param overrides The fields the row changes from the base row.
   * @returns The candidate row for the schema.
   */
  function baseIntakeRow(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      id: "00000000-0000-4000-8000-000000000001",
      driveFileId: "fake-drive-1",
      driveFolderId: "fake-drive-folder-1",
      sourceMonth: "2024-01",
      documentType: "receipt",
      status: "parsed",
      submissionId: null,
      duplicateOfSubmissionId: null,
      duplicateOfIntakeDocumentId: null,
      evidenceReference: null,
      extraction: "local-text",
      failureReason: null,
      failureCount: 0,
      sightingCount: 1,
      evidenceByteSize: 2048,
      isHistory: false,
      historySource: null,
      firstSeenAt: "2024-02-01T00:00:00.000Z",
      lastSeenAt: "2024-02-01T00:00:00.000Z",
      scopeCompanyId: "00000000-0000-4000-8000-000000000002",
      ...overrides,
    };
  }

  it("accepts a duplicate that names only the submission (duplicate_target_rows=4)", () => {
    const result = accountingIntakeDocumentSchema.safeParse(
      baseIntakeRow({
        status: "duplicate",
        submissionId: null,
        duplicateOfSubmissionId: UUID_A,
        duplicateOfIntakeDocumentId: null,
      }),
    );
    expect(
      result.success,
      "A duplicate with duplicateOfSubmissionId set alone must parse (FR-28).",
    ).toBe(true);
  });

  it("accepts a duplicate that names only the intake document (duplicate_target_rows=4)", () => {
    const result = accountingIntakeDocumentSchema.safeParse(
      baseIntakeRow({
        status: "duplicate",
        submissionId: null,
        duplicateOfSubmissionId: null,
        duplicateOfIntakeDocumentId: UUID_A,
      }),
    );
    expect(
      result.success,
      "A year-file duplicate with duplicateOfIntakeDocumentId set alone must parse (FR-28).",
    ).toBe(true);
  });

  it("rejects a duplicate that names neither target (duplicate_target_rows=4)", () => {
    const result = accountingIntakeDocumentSchema.safeParse(
      baseIntakeRow({
        status: "duplicate",
        submissionId: null,
        duplicateOfSubmissionId: null,
        duplicateOfIntakeDocumentId: null,
      }),
    );
    expect(
      result.success,
      "A duplicate with neither duplicate target must fail the contract (FR-28).",
    ).toBe(false);
  });

  it("rejects a duplicate that names both targets (duplicate_target_rows=4)", () => {
    const result = accountingIntakeDocumentSchema.safeParse(
      baseIntakeRow({
        status: "duplicate",
        submissionId: null,
        duplicateOfSubmissionId: UUID_A,
        duplicateOfIntakeDocumentId: UUID_B,
      }),
    );
    expect(
      result.success,
      "A duplicate with both duplicate targets set must fail the contract (FR-28).",
    ).toBe(false);
  });
});

describe("the parser source holds no hash", () => {
  it("holds no hash, checksum, or digest token in the parser sources", () => {
    const sources: string[] = [];
    if (PARSER_MODULE_EXISTS) {
      sources.push(readFileSync(PARSER_SOURCE_PATH, "utf8"));
    }
    if (PND3_MODULE_EXISTS) {
      sources.push(readFileSync(PND3_SOURCE_PATH, "utf8"));
    }
    const hashPattern = /sha1|sha256|sha512|md5|crc32|createHash|checksum|\.digest\(/i;
    for (const [index, source] of sources.entries()) {
      expect(
        hashPattern.test(source),
        `Parser source ${index} holds a hash, checksum, or digest token. ` +
          `The plan task 10.1 rule says the parser code holds no hash.`,
      ).toBe(false);
    }
    expect(
      sources.length,
      "Missing packages/backend/src/modules/accounting/year-file-parsers.ts. " +
        "The parser source cannot be scanned for hash tokens until it exists.",
    ).toBeGreaterThanOrEqual(1);
  });
});
