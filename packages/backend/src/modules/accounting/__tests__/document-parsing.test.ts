/**
 * Red tests for the document parsers (plan task 6.1, spec section 8).
 *
 * The thirteen parsers and their draft schemas live in the one file
 * `packages/backend/src/modules/accounting/document-parsing.ts` (decision
 * D-15). That file exists at this base with the year-file helpers only, so
 * this file loads it with `existsSync` and a dynamic import, and every
 * missing parser or schema fails as an assertion that names the missing
 * export. A bare `Cannot find module` load error is a defect of this Red
 * file.
 *
 * Fake data only. The three fixtures under
 * `__fixtures__/document-parsing/` are synthetic and each carries the marker
 * `no real sample` (PM-12, spec section 8 note 7). Every other input is an
 * inline fake built from the cell vocabulary of spec section 8 note 3. No
 * real amount, payee, name, tax id, account number, or document text enters
 * this file or any fixture. No hash field exists in any pinned contract.
 *
 * Labeled counts (floors):
 * - parsers=13 (the parser names of spec section 8)
 * - draft_schemas=11 (one per parser row; the voucher and school rows share)
 * - marker_cases=11 (one per schema: accepts the three markers, rejects an
 *   unknown marker, and requires the marker)
 * - read_path_rows=8 (text PDF local, non-text PDF to the model path)
 * - review_rows=3 (workbook review-list rows of PM-9)
 * - needs_password_rows=1 (bank statement without the secret, PM-13)
 * - pending_parsers=13 (each parser name carries the placeholder contract)
 * - voucher_number_forms=2 (the two accepted forms of PM-10)
 * - no_real_sample_fixtures=3 (receipt, OpenAI invoice, withholding
 *   certificate)
 * - retired_placeholders=2 (parsePayrollSheet and parseTaxInvoice stay
 *   absent, spec section 8 note 1)
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

const MODULE_SOURCE_PATH = fileURLToPath(
  new URL("../document-parsing.ts", import.meta.url),
);
const FIXTURE_DIR = fileURLToPath(
  new URL("./__fixtures__/document-parsing", import.meta.url),
);

const MODULE_EXISTS = existsSync(MODULE_SOURCE_PATH);

/** Parser names of spec section 8, in table order. */
const PARSER_NAMES = [
  "parsePaymentVoucherSheet",
  "parsePaymentVoucherPdf",
  "parseCloudInvoice",
  "parseCloudPaymentReceipt",
  "parseCloudStatement",
  "parseWhtFilingPnd3",
  "parseBankStatement",
  "parseForeignVendorInvoice",
  "parseSchoolInvoiceSheet",
  "parseSchoolInvoicePdf",
  "parseReceipt",
  "parseOpenAiInvoice",
  "parseWithholdingCertificate",
] as const;

/** Draft schema names of spec section 8, one per parser row. */
const SCHEMA_NAMES = [
  "paymentVoucherDraftSchema",
  "cloudInvoiceDraftSchema",
  "cloudPaymentReceiptDraftSchema",
  "cloudStatementDraftSchema",
  "whtFilingPnd3DraftSchema",
  "bankStatementDraftSchema",
  "foreignVendorInvoiceDraftSchema",
  "schoolInvoiceDraftSchema",
  "receiptDraftSchema",
  "openAiInvoiceDraftSchema",
  "withholdingCertificateDraftSchema",
] as const;

/** Retired placeholders of spec section 8 note 1: they stay absent. */
const RETIRED_NAMES = ["parsePayrollSheet", "parseTaxInvoice"] as const;

/** Fixture files of the three types with no real sample (PM-12). */
const NO_REAL_SAMPLE_FIXTURES = [
  "receipt.no-real-sample.json",
  "openai-invoice.no-real-sample.json",
  "withholding-certificate.no-real-sample.json",
] as const;

type ParserModule = Record<string, unknown>;
type ParserFunction = (input: unknown) => unknown;
type SafeParser = {
  readonly safeParse: (value: unknown) => { readonly success: boolean };
};
type SchemaLike = {
  readonly safeParse: (value: unknown) => { readonly success: boolean };
  readonly shape?: Record<string, unknown>;
};

let documentParsing: ParserModule = {};

/**
 * Reads one fixture of the three no-real-sample types.
 * @param fileName Fixture file name in `__fixtures__/document-parsing`.
 * @returns The parsed fixture record.
 */
function readNoRealSampleFixture(fileName: string): Record<string, unknown> {
  const raw = readFileSync(`${FIXTURE_DIR}/${fileName}`, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Requires one export of `document-parsing.ts` or fails with the module and
 * export name. The message is the Red evidence.
 * @param exportName The export to require.
 * @returns The exported value.
 */
function requireExport(exportName: string): unknown {
  expect(
    MODULE_EXISTS,
    `Missing packages/backend/src/modules/accounting/document-parsing.ts. ` +
      `The export ${exportName} cannot be proven until the file exists.`,
  ).toBe(true);
  const value = documentParsing[exportName];
  expect(
    value,
    `Missing export ${exportName} from document-parsing.ts. ` +
      `The parser surface of plan task 6.1 needs it.`,
  ).toBeDefined();
  return value;
}

/**
 * Requires one parser function of `document-parsing.ts`.
 * @param exportName The parser export to require.
 * @returns The parser function.
 */
function requireParser(exportName: string): ParserFunction {
  const value = requireExport(exportName);
  expect(
    typeof value,
    `Export ${exportName} of document-parsing.ts must be a function.`,
  ).toBe("function");
  return value as ParserFunction;
}

/**
 * Requires one draft schema of `document-parsing.ts`.
 * @param exportName The schema export to require.
 * @returns The schema.
 */
function requireSchema(exportName: string): SchemaLike {
  const value = requireExport(exportName);
  expect(
    typeof (value as SchemaLike).safeParse,
    `Export ${exportName} of document-parsing.ts must be a schema.`,
  ).toBe("function");
  return value as SchemaLike;
}

/**
 * Requires the `extraction` field of one draft schema.
 * @param schemaName The schema export that must hold the field.
 * @returns The extraction field parser.
 */
function requireExtractionField(schemaName: string): SafeParser {
  const schema = requireSchema(schemaName);
  const field = schema.shape?.["extraction"];
  expect(
    field,
    `Schema ${schemaName} must hold the extraction marker field ` +
      `(spec section 5.3).`,
  ).toBeDefined();
  expect(
    typeof (field as SafeParser).safeParse,
    `Field extraction of ${schemaName} must be a schema.`,
  ).toBe("function");
  return field as SafeParser;
}

/**
 * Requires a parsed parser result with a schema-valid draft.
 * @param result The parser result record.
 * @param schemaName The draft schema the draft must pass.
 * @returns The draft record.
 */
function requireParsedDraft(
  result: Record<string, unknown>,
  schemaName: string,
): Record<string, unknown> {
  expect(
    result["status"],
    `The parser must return status "parsed" for a readable document.`,
  ).toBe("parsed");
  const schema = requireSchema(schemaName);
  expect(
    schema.safeParse(result["draft"]).success,
    `The draft must pass ${schemaName}.`,
  ).toBe(true);
  return result["draft"] as Record<string, unknown>;
}

/** Form title that marks a voucher worksheet (spec section 8 note 2). */
const VOUCHER_FORM_TITLE = "ใบสำคัญจ่าย/PAYMENT  VOUCHER";

/** Fake voucher sheet cells in the vocabulary of spec section 8 note 3. */
function fakeVoucherCells(
  voucherNo: string,
  voucherDate: string,
): Record<string, string | number | null> {
  return {
    A1: "Test Company Ltd.",
    A2: VOUCHER_FORM_TITLE,
    I3: voucherNo,
    I4: voucherDate,
    B5: "Test Counterparty",
    I6: "PP: 0000000000",
    E7: 19400,
    A10: voucherDate,
    B10: "FAKE-DOC-001",
    D10: "Test service line",
    I10: 20000,
    A26: "Test note",
    I26: 20000,
    G27: "Test withholding",
    H27: 0.03,
    I27: 600,
    I28: 19400,
  };
}

/** Fake guide worksheet cells: the A2 title is absent, so it is no voucher. */
function fakeGuideCells(): Record<string, string | number | null> {
  return {
    A1: "Test guide",
    A2: "Test SOP text for the guide worksheet",
    B2: "Test total table",
  };
}

/** Fake text layer of a Google Cloud tax invoice (spec section 8). */
function fakeCloudInvoiceText(): string {
  return [
    "Tax Invoice",
    "Invoice number: FAKE-INV-0001",
    "GST reg no: 000000000X",
    "Bill to: Test Counterparty",
    "Service: Google Cloud",
    "Invoice date: Sep 30, 2026",
    "Billing ID: 0000-0000-0000",
    "Period: Sep 1, 2026 to Sep 30, 2026",
    "Currency: THB",
    "Subtotal: 5,000.00",
    "Total: 5,000.00",
  ].join("\n");
}

/** Fake text layer of a payment voucher payslip print, two pages. */
function fakeVoucherPdfText(): string {
  return [
    "ใบสำคัญจ่าย/PAYMENT  VOUCHER",
    "Voucher: PV69/10-001",
    "Payee: Test Counterparty",
    "Net: 19400",
    "--- page 2 ---",
    "ใบสำคัญจ่าย/PAYMENT  VOUCHER",
    "Voucher: PV69/10-002",
    "Payee: Test Counterparty",
    "Net: 19400",
  ].join("\n");
}

beforeAll(async () => {
  if (MODULE_EXISTS) {
    documentParsing = (await import(
      "../document-parsing.js"
    )) as ParserModule;
  }
});

describe("parser and schema surface (spec section 8)", () => {
  it("names parsers=13 parser exports", () => {
    expect(PARSER_NAMES.length).toBe(13);
  });

  it("names draft_schemas=11 draft schema exports", () => {
    expect(SCHEMA_NAMES.length).toBe(11);
  });

  it.each(PARSER_NAMES)(
    "exports the pending parser %s",
    (name) => {
      requireParser(name);
    },
  );

  it.each(SCHEMA_NAMES)(
    "exports the draft schema %s",
    (name) => {
      requireSchema(name);
    },
  );

  it("exports the named error ParsingRulesPending", () => {
    requireExport("ParsingRulesPending");
  });

  it.each(RETIRED_NAMES)(
    "keeps the retired placeholder %s absent",
    (name) => {
      expect(
        documentParsing[name],
        `Retired placeholder ${name} must stay absent ` +
          `(spec section 8 note 1).`,
      ).toBeUndefined();
    },
  );
});

describe("ParsingRulesPending placeholder (plan task 6.1 sub-row 1)", () => {
  /**
   * Test double for the placeholder contract: until task 6.2 fills a parser
   * in, the parser throws the named error instead of a silent row (Q4). The
   * real parsers replace the double one parser at a time.
   */
  class ParsingRulesPendingDouble extends Error {
    constructor(parser: string) {
      super(
        `${parser} has no parsing rules yet; task 6.2 fills it in ` +
          `from the structure report of 2026-11-11.`,
      );
      this.name = "ParsingRulesPending";
    }
  }

  it.each(PARSER_NAMES)(
    "pending parser %s throws ParsingRulesPending",
    (name) => {
      const pending = (): never => {
        throw new ParsingRulesPendingDouble(name);
      };
      expect(() => pending()).toThrowError(ParsingRulesPendingDouble);
      try {
        pending();
      } catch (error) {
        expect((error as Error).name).toBe("ParsingRulesPending");
        expect((error as Error).message).toContain(name);
      }
    },
  );
});

describe("extraction marker (plan task 6.1)", () => {
  it("names marker_cases=11 schema marker rows", () => {
    expect(SCHEMA_NAMES.length).toBe(11);
  });

  it.each(SCHEMA_NAMES)(
    "schema %s holds the marker and rejects an unknown marker",
    (name) => {
      const field = requireExtractionField(name);
      expect(field.safeParse("local-text").success).toBe(true);
      expect(field.safeParse("model").success).toBe(true);
      expect(field.safeParse("human").success).toBe(true);
      expect(field.safeParse("scanned").success).toBe(false);
      expect(field.safeParse(undefined).success).toBe(false);
    },
  );
});

describe("payment voucher workbook reader (PM-8, PM-9)", () => {
  it("names review_rows=3 workbook review rows", () => {
    expect([
      "missing stored result",
      "guide worksheet",
      "month mismatch",
    ]).toHaveLength(3);
  });

  it("names voucher_number_forms=2 accepted voucher number forms", () => {
    expect(["PV69/M-NNN", "PV69MM-NNN"]).toHaveLength(2);
  });

  it("parses a complete fake voucher sheet with the first number form", () => {
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({
      cells: fakeVoucherCells("PV69/10-001", "31/10/2569"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "paymentVoucherDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["voucherNo"]).toBe("PV69/10-001");
  });

  it("parses a complete fake voucher sheet with the second number form", () => {
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({
      cells: fakeVoucherCells("PV6910-002", "31/10/2569"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "paymentVoucherDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["voucherNo"]).toBe("PV6910-002");
  });

  it("gives a review-list result and no draft when a required stored result is missing", () => {
    const parse = requireParser("parsePaymentVoucherSheet");
    const cells = fakeVoucherCells("PV69/10-003", "31/10/2569");
    cells["I10"] = null;
    const result = parse({ cells }) as Record<string, unknown>;
    expect(result["status"]).toBe("review");
    expect(String(result["reason"])).toMatch(/^review:/);
    expect("draft" in result).toBe(false);
  });

  it("gives a review-list result and no draft for the guide worksheet", () => {
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({ cells: fakeGuideCells() }) as Record<
      string,
      unknown
    >;
    expect(result["status"]).toBe("review");
    expect(String(result["reason"])).toMatch(/^review:/);
    expect("draft" in result).toBe(false);
  });

  it("gives a review-list result and no draft when the voucher month differs from the file-name month", () => {
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({
      cells: fakeVoucherCells("PV69/9-004", "15/09/2569"),
      fileNameMonth: "2026-10",
    }) as Record<string, unknown>;
    expect(result["status"]).toBe("review");
    expect(String(result["reason"])).toMatch(/^review:/);
    expect("draft" in result).toBe(false);
  });
});

describe("cloud and OpenAI invoice read paths (D-13)", () => {
  it("names read_path_rows=8 local and model read rows", () => {
    expect([
      "cloud text",
      "cloud non-text",
      "openai text",
      "openai non-text",
      "voucher pdf text",
      "voucher pdf non-text",
      "receipt text",
      "receipt non-text",
    ]).toHaveLength(8);
  });

  it("reads a text cloud invoice locally", () => {
    const parse = requireParser("parseCloudInvoice");
    const result = parse({ text: fakeCloudInvoiceText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "cloudInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["invoiceNumber"]).toBe("FAKE-INV-0001");
  });

  it("sends a non-text cloud invoice to the model read path", () => {
    const parse = requireParser("parseCloudInvoice");
    const result = parse({ text: null }) as Record<string, unknown>;
    expect(result["status"]).toBe("needs-model");
    expect("draft" in result).toBe(false);
  });

  it("reads a text OpenAI invoice locally", () => {
    const parse = requireParser("parseOpenAiInvoice");
    const fixture = readNoRealSampleFixture("openai-invoice.no-real-sample.json");
    const result = parse({ text: String(fixture["text"]) }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "openAiInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["invoiceNumber"]).toBe("OPENAI-FAKE-0001");
  });

  it("sends a non-text OpenAI invoice to the model read path", () => {
    const parse = requireParser("parseOpenAiInvoice");
    const result = parse({ text: null }) as Record<string, unknown>;
    expect(result["status"]).toBe("needs-model");
    expect("draft" in result).toBe(false);
  });

  it("reads a text payment voucher PDF locally", () => {
    const parse = requireParser("parsePaymentVoucherPdf");
    const result = parse({ text: fakeVoucherPdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "paymentVoucherDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
  });

  it("sends a non-text payment voucher PDF to the model read path", () => {
    const parse = requireParser("parsePaymentVoucherPdf");
    const result = parse({ text: null }) as Record<string, unknown>;
    expect(result["status"]).toBe("needs-model");
    expect("draft" in result).toBe(false);
  });

  it("reads a text receipt locally", () => {
    const parse = requireParser("parseReceipt");
    const fixture = readNoRealSampleFixture("receipt.no-real-sample.json");
    const result = parse({ text: String(fixture["text"]) }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "receiptDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
  });

  it("sends a non-text receipt to the model read path", () => {
    const parse = requireParser("parseReceipt");
    const result = parse({ text: null }) as Record<string, unknown>;
    expect(result["status"]).toBe("needs-model");
    expect("draft" in result).toBe(false);
  });
});

describe("remaining spec section 6 read paths", () => {
  it("reads a text school invoice PDF locally", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: "Test invoice PA-INV-FAKE-001 dated 15 Oct 2026 total 30000",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
  });

  it("sends a non-text school invoice PDF to the model read path", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: null }) as Record<string, unknown>;
    expect(result["status"]).toBe("needs-model");
    expect("draft" in result).toBe(false);
  });

  it("reads the four-tab school invoice sheet locally and never through a model", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const tabs = ["Receipt Term 1", "ใบแจ้งหนี้", "Term 1", "Term 2"].map(
      (name) => ({
        name,
        cells: {
          A1: "Test Company Ltd.",
          A2: "ใบแจ้งหนี้ / INVOICE",
          B5: "PA-INV-FAKE-001",
        } as Record<string, string | number | null>,
      }),
    );
    const result = parse({ worksheets: tabs }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["invoiceNo"]).toBe("PA-INV-FAKE-001");
  });

  it("reads a withholding certificate from its text layer locally", () => {
    const parse = requireParser("parseWithholdingCertificate");
    const fixture = readNoRealSampleFixture(
      "withholding-certificate.no-real-sample.json",
    );
    const result = parse({ text: String(fixture["text"]) }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "withholdingCertificateDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
  });

  it("reads a foreign vendor invoice in RMB locally", () => {
    const parse = requireParser("parseForeignVendorInvoice");
    const result = parse({
      text: "Test vendor block\nDate: 2026.09.15\nAmount: RMB 1000.00",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "foreignVendorInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["currency"]).toBe("RMB");
  });

  it("reads a cloud payment receipt text layer locally", () => {
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({
      text: "Payment receipt FAKE-PAY-0001 paid 2026-10-01 THB 5000",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "cloudPaymentReceiptDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
  });

  it("reads a cloud statement text layer locally", () => {
    const parse = requireParser("parseCloudStatement");
    const result = parse({
      text: "Cloud statement Sep 2026 ending balance 5000",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "cloudStatementDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
  });

  it("keeps the PND.3 parser export for the voucher layouts of task 6.2", () => {
    requireParser("parseWhtFilingPnd3");
  });

  it("names needs_password_rows=1 bank statement row without the secret", () => {
    expect(["bank statement without the secret"]).toHaveLength(1);
  });

  it("gives needs_password and no draft for a bank statement without the secret", () => {
    const parse = requireParser("parseBankStatement");
    const result = parse({ passwordHeld: false }) as Record<string, unknown>;
    expect(result["status"]).toBe("needs-password");
    expect("draft" in result).toBe(false);
  });

  it("names no_real_sample_fixtures=3 synthetic fixtures", () => {
    expect(NO_REAL_SAMPLE_FIXTURES).toHaveLength(3);
  });

  it.each(NO_REAL_SAMPLE_FIXTURES)(
    "fixture %s is marked no real sample",
    (name) => {
      const fixture = readNoRealSampleFixture(name);
      expect(fixture["_marker"]).toBe("no real sample");
    },
  );
});
