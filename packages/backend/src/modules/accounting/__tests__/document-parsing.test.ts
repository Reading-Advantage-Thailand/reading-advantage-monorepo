/**
 * Red tests for the document parsers (plan task 6.1, spec section 8).
 *
 * Round r2 pins the Phase 6 review findings (review-a-p6-eef95ea70.json and
 * review-b-p6-eef95ea70.json). Green task 6.2 filled the thirteen parsers, so
 * this file calls the module exports directly and asserts the report shapes.
 * Every row that names a finding fails at the r2 base for the reason the
 * finding gives; the rows marked characterization pass at the base and guard
 * behavior that already works.
 *
 * The thirteen parsers and their draft schemas live in the one file
 * `packages/backend/src/modules/accounting/document-parsing.ts` (decision
 * D-15). This file loads it with `existsSync` and a dynamic import, and every
 * missing export fails as an assertion that names the missing export. A bare
 * `Cannot find module` load error is a defect of this Red file.
 *
 * Fake data only. The three fixtures under
 * `__fixtures__/document-parsing/` are synthetic and each carries the marker
 * `no real sample` (PM-12, spec section 8 note 7). Every other input is an
 * inline fake built from the vocabulary of the structure report of
 * 2026-11-11, whose own values the report marks fake. No real amount, payee,
 * name, tax id, account number, e-mail, or document text enters this file or
 * any fixture. No new identity or digest field exists in any pinned contract.
 *
 * Counts computed from the module exports (A609):
 * - draft schema exports whose name ends in `DraftSchema`
 * - spec parser names present as module functions
 * - reader inflate cap exports
 *
 * Round r6 pins the date-label findings: A630 (the whole-text date fallback
 * must not use the due or delivery date as the document date) and B620 (an
 * invoice date counts only next to an accepted date label; an unlabelled date
 * goes to the review list; the sheet path takes a bare date only beside the
 * document title or invoice number). Fake data only.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateRawSync, deflateSync } from "node:zlib";

import { beforeAll, describe, expect, it } from "vitest";

const MODULE_SOURCE_PATH = fileURLToPath(
  new URL("../document-parsing.js", import.meta.url),
);
const MODULE_PATH = MODULE_SOURCE_PATH.replace(/\.js$/, ".ts");
const FIXTURE_DIR = fileURLToPath(
  new URL("./__fixtures__/document-parsing", import.meta.url),
);

const MODULE_EXISTS = existsSync(MODULE_PATH);

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

/**
 * Requires a review-list result with no draft.
 * @param result The parser result record.
 * @returns The review reason.
 */
function requireReviewResult(result: Record<string, unknown>): string {
  expect(result["status"]).toBe("review");
  expect(String(result["reason"])).toMatch(/^review:/);
  expect("draft" in result).toBe(false);
  return String(result["reason"]);
}

/**
 * Requires a parsed draft, or accepts the whole-document review result that
 * the finding allows for a field the parser cannot read (A606).
 * @param result The parser result record.
 * @param schemaName The draft schema the draft must pass when parsed.
 * @returns The draft record, or null when the document is on the review list.
 */
function requireParsedOrReview(
  result: Record<string, unknown>,
  schemaName: string,
): Record<string, unknown> | null {
  if (result["status"] === "review") {
    requireReviewResult(result);
    return null;
  }
  return requireParsedDraft(result, schemaName);
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
    "Date: 31/10/2569",
    "Net: 19400",
    "--- page 2 ---",
    "ใบสำคัญจ่าย/PAYMENT  VOUCHER",
    "Voucher: PV69/10-002",
    "Payee: Test Counterparty",
    "Date: 31/10/2569",
    "Net: 19400",
  ].join("\n");
}

/**
 * Fake text layer in the report sample 4.2 layout: no colons on the detail
 * labels and two-space columns (A603). The money values are unequal so a
 * label-boundary defect shows (A601).
 * @returns The fake invoice text.
 */
function fakeCloudInvoiceSample42Text(): string {
  return [
    "Tax Invoice            Invoice number: FAKE-CLOUD-0002   GST Reg No: 000000000X",
    "Bill to: Test Counterparty",
    "Details Google Cloud   Invoice date: Sep 30, 2026",
    "Billing ID FAKE-BILL-0000   Account ID FAKE-ACCT-000000",
    "Summary for Sep 1, 2026 - Sep 30, 2026",
    "Subtotal THB 5,000.00",
    "Description: Google Cloud - Fee for September 2026   5,000.00",
    "GST (7%) THB 350.00     Total in THB: THB 5,350.00",
  ].join("\n");
}

/**
 * Fake text layer of a Google Cloud statement with the fixture values: the
 * minus-before-currency total and the two PAYMENTS RECEIVED rows (A604).
 * @returns The fake statement text.
 */
function fakeCloudStatementText(): string {
  return [
    "Statement",
    "To: Test Company",
    "Service: Google Cloud",
    "Cloud account ID: FAKE-CLOUD-000000",
    "Payments account ID: FAKE-PAY-0000-0000",
    "Payments profile ID: FAKE-PROF-0000",
    "Statement date: Aug 31, 2026",
    "Period start: Aug 1, 2026",
    "Period end: Aug 31, 2026",
    "Starting balance: 0.00",
    "Total new activity: 5,000.00",
    "Total payments received: -THB 5,000.00",
    "Ending balance: 0.00",
    "PAYMENTS RECEIVED",
    "Aug 3 Manual payment: Visa ending 0000. V000000. CLOUD AbCdEf -2,500.00",
    "Aug 30 Manual payment: Visa ending 0000. V000001. CLOUD GhIjKl -2,500.00",
  ].join("\n");
}

/**
 * Fake text layer of a payment voucher payslip print, verbatim from the
 * report fixture payment_voucher_pdf.json (A605).
 * @returns The fake payslip text.
 */
function fakeVoucherPayslipFixtureText(): string {
  return [
    "บริษัท ตัวอย่าง(ไทยแลนด์) จำกัด",
    "ใบสำคัญจ่าย/PAYMENT VOUCHER",
    "เลขที่ PV6910-003",
    "วันที่ 31/10/2569",
    "จ่ายให้แก่ Mr. Fake Contractor",
    "เงินสด โอน เช็คธนาคาร สาขา เลขที่เช็ค PP: 0000000000",
    "เช็คลงวันที่ จำนวนเงิน 10,000.00",
    "วันที่เอกสาร เลขที่เอกสาร รายการ / Description จำนวนเงิน",
    "31/10/2569 Salary 10,000.00",
    "หมายเหตุ: จำนวนเงินรวม 10,000.00",
    "หัก ณ ที่จ่าย 3% 300.00",
    "จำนวนเงิน คงเหลือสุทธิ 9,700.00",
    "ผู้จัดทำ ผู้ตรวจสอบ ผู้อนุมัติ ผู้รับเงิน",
  ].join("\n");
}

/**
 * Fake text layer of a Cloud payment receipt in the report section 3.3 Cloud
 * layout: the date follows `Amount received on` and the amount stands alone
 * with its currency (A607).
 * @returns The fake receipt text.
 */
function fakeCloudReceiptText(): string {
  return [
    "Payment Receipt",
    "Amount received on Mar 1, 2026",
    "THB 5,000.00",
    "Paid by Test Company",
    "Paid to Test Vendor",
    "Service: Google Cloud",
    "Tax identification No: 000000000R",
    "Billing ID: FAKE-BILL-0000",
    "Payment method: Test card ending 0000",
    "Payment number: FAKE-PAY-0001",
    "Payment ID: CLOUD AbCdEf",
  ].join("\n");
}

/**
 * Fake text layer of a Workspace payment receipt: the date follows
 * `Payment date` with no colon (A607).
 * @returns The fake receipt text.
 */
function fakeWorkspaceReceiptText(): string {
  return [
    "Payment Receipt",
    "Payment date Mar 2, 2026",
    "Amount: THB 2,000.00",
    "Paid by Test Company",
  ].join("\n");
}

/**
 * Fake text layer of a school invoice PDF with an uppercase INVOICE title
 * and unequal subtotal and net total (A601, A606).
 * @returns The fake school invoice text.
 */
function fakeSchoolInvoicePdfText(): string {
  return [
    "Test School Company Ltd.",
    "ใบแจ้งหนี้ / INVOICE",
    "No: PA-INV-FAKE-002-T2",
    "Date: 15 Oct 2026",
    "Quotation: FAKE-Q-002",
    "Due: 31 ต.ค. 2569",
    "Issuer Tax ID: 0000000000000",
    "Branch: 00000",
    "Contact: Test contact 000",
    "Customer: Test School",
    "Address: Test Address 1",
    "Customer Tax ID: 0000000000000",
    "Students: 100",
    "1 App licence per student 500.00 x 100 = 50,000.00",
    "Subtotal: 50,000.00",
    "Discount Founding 40%: -20,000.00",
    "Total: 30,000.00",
    "Total in words: Test thirty thousand",
    "Bank: Test Bank Branch: 0000 Account: Test Company 000-0-00000-0",
    "Delivery: Test delivery 15 Oct 2026",
    "VAT: Test VAT note",
    "Terms: Test terms",
  ].join("\n");
}

/**
 * Fake rich school invoice tab with labeled cells for every fixture field
 * (A606). The parser reads the fields it can and returns the review result
 * for the fields it cannot read.
 * @returns The fake worksheet.
 */
function fakeRichSchoolTab(): {
  readonly name: string;
  readonly cells: Record<string, string | number | null>;
} {
  return {
    name: "Term 2",
    cells: {
      A1: "Test School Company Ltd.",
      A2: "ใบแจ้งหนี้ / INVOICE",
      B5: "PA-INV-FAKE-002-T2",
      A10: "Date: 15 Oct 2026",
      B10: "Quotation: FAKE-Q-002",
      C10: "Due: 31 Oct 2026",
      A11: "Issuer Tax ID: 0000000000000",
      B11: "Branch: 00000",
      C11: "Contact: Test contact 000",
      A12: "Customer: Test School",
      B12: "Address: Test Address 1",
      C12: "Customer Tax ID: 0000000000000",
      A13: "Students: 100",
      A14: "App licence (1 year), per student",
      B14: "500.00",
      C14: "100",
      D14: "50,000.00",
      A15: "Subtotal: 50,000.00",
      A16: "Discount Founding partner 40%: -20,000.00",
      A17: "Total: 30,000.00",
      A18: "Total in words: Test thirty thousand",
      A19: "Bank: Test Bank",
      B19: "Branch: 0000",
      C19: "Account: Test Company 000-0-00000-0",
      A20: "Delivery: Test delivery 15 Oct 2026",
      A21: "VAT: Test VAT note",
      A22: "Terms: Test terms",
    },
  };
}

/**
 * Fake PND.3 filing text from the fixture wht_filing_pnd3.json values: the
 * header labels plus the report section 4.3 row shape (A602).
 * @returns The fake filing text.
 */
function fakeWhtFilingPnd3Text(): string {
  return [
    "Reference: P030000000000",
    "Withholder tax id: 0-0000-00000-00-0 Branch: 1 Sheet 1 of 1",
    "1  0-0000-00000-00-0   Mr. Fake Contractor   30/10/2569  ค่าจ้าง  3.00  10,000 00  300 00  1",
    "Total  10,000 00  300 00",
  ].join("\n");
}

/**
 * Fake foreign vendor workbook cells from the fixture
 * foreign_vendor_invoice_xlsx.json (A616).
 * @returns The fake cell map.
 */
function fakeForeignVendorCells(): Record<string, string | number | null> {
  return {
    A1: "Invoice   DATE 2026.10.30",
    A2: "VENDOR A PRINTING CO.,LTD\n1 Example Road, Example City, Country",
    A3: "TO:Test Company",
    B3: "QTY",
    C3: "UNIT PRICE",
    D3: "AMOUNT\nDDP Thailand",
    A4: "DESCRIPTION",
    A5: "work book size 28.5x21cm, 184pages. perfect binding. Full color.",
    B5: "1000copies",
    C5: "RMB10.0",
    D5: "RMB10000",
    A6: "VENDOR A PRINTING CO.,LTD\n2026.10.30",
  };
}

type ZipPartInput = {
  readonly name: string;
  readonly data: Buffer;
  readonly method: 0 | 8;
};

/**
 * Builds a minimal ZIP archive for the reader rows (B601-B604). The reader
 * checks signatures, offsets, and sizes only, so the archive carries no
 * file-system path and stays in memory.
 * @param parts The archive entries in order.
 * @returns The archive bytes.
 */
function buildZip(parts: readonly ZipPartInput[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  const offsets: number[] = [];
  let offset = 0;
  for (const part of parts) {
    const name = Buffer.from(part.name, "utf8");
    const local = Buffer.alloc(30 + name.length + part.data.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(part.method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(part.data.length, 18);
    local.writeUInt32LE(part.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    part.data.copy(local, 30 + name.length);
    locals.push(local);
    offsets.push(offset);
    offset += local.length;
  }
  let centralSize = 0;
  let entryIndex = 0;
  for (const part of parts) {
    const name = Buffer.from(part.name, "utf8");
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(part.method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(part.data.length, 20);
    central.writeUInt32LE(part.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    const localOffset = offsets[entryIndex] ?? 0;
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centrals.push(central);
    centralSize += central.length;
    entryIndex += 1;
  }
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(parts.length, 8);
  eocd.writeUInt16LE(parts.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, ...centrals, eocd]);
}

/**
 * Builds a minimal `.xlsx` workbook with stored parts for the reader rows.
 * @param sheets The sheet names, targets, and worksheet XML in order.
 * @param sharedStrings The shared-strings XML, or null for no part.
 * @param deflatedTargets Targets stored deflated, for the inflate-cap row.
 * @returns The workbook bytes.
 */
function buildWorkbookZip(
  sheets: readonly { readonly name: string; readonly target: string }[],
  sheetXml: Readonly<Record<string, string>>,
  sharedStrings: string | null,
  deflatedTargets: readonly string[] = [],
): Buffer {
  const parts: ZipPartInput[] = [];
  if (sharedStrings !== null) {
    parts.push({
      name: "xl/sharedStrings.xml",
      data: Buffer.from(sharedStrings, "utf8"),
      method: 0,
    });
  }
  const rels = sheets
    .map(
      (sheet, index) =>
        `<Relationship Id="rId${index + 1}" Target="${sheet.target}"/>`,
    )
    .join("");
  parts.push({
    name: "xl/_rels/workbook.xml.rels",
    data: Buffer.from(
      `<Relationships>${rels}</Relationships>`,
      "utf8",
    ),
    method: 0,
  });
  const sheetTags = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${sheet.name}" r:id="rId${index + 1}"/>`,
    )
    .join("");
  parts.push({
    name: "xl/workbook.xml",
    data: Buffer.from(`<workbook><sheets>${sheetTags}</sheets></workbook>`, "utf8"),
    method: 0,
  });
  for (const sheet of sheets) {
    const xml = sheetXml[sheet.target] ?? "";
    const raw = Buffer.from(xml, "utf8");
    const deflated = deflatedTargets.includes(sheet.target);
    parts.push({
      name: `xl/${sheet.target}`,
      data: deflated ? deflateRawSync(raw) : raw,
      method: deflated ? 8 : 0,
    });
  }
  return buildZip(parts);
}

/**
 * Builds a minimal PDF with one FlateDecode content stream for the reader
 * rows (B601). The stream dictionary sits inside the 400-character window
 * the reader scans, and the page object feeds the page count.
 * @param payload The raw bytes the content stream carries after inflation.
 * @returns The PDF bytes.
 */
function buildFlatePdf(payload: Buffer): Buffer {
  const header = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Contents 4 0 R /Resources << >> >>\nendobj\n" +
      `4 0 obj\n<< /Length ${payload.length} /Filter /FlateDecode >>\nstream\r\n`,
    "latin1",
  );
  const footer = Buffer.from("\r\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n", "latin1");
  return Buffer.concat([header, payload, footer]);
}

/**
 * Builds a minimal PDF with two FlateDecode content streams for the B610
 * row: one normal stream and one stream that inflates past the cap. Each
 * dictionary sits inside the 400-character window the reader scans.
 * @param normalPayload The raw bytes of the normal stream after inflation.
 * @param bombPayload The raw bytes of the over-cap stream after inflation.
 * @returns The PDF bytes.
 */
function buildTwoStreamFlatePdf(normalPayload: Buffer, bombPayload: Buffer): Buffer {
  const header = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Contents [4 0 R 5 0 R] /Resources << >> >>\nendobj\n" +
      `4 0 obj\n<< /Length ${normalPayload.length} /Filter /FlateDecode >>\nstream\r\n`,
    "latin1",
  );
  const middle = Buffer.from(
    `\r\nendstream\nendobj\n5 0 obj\n<< /Length ${bombPayload.length} ` +
      "/Filter /FlateDecode >>\nstream\r\n",
    "latin1",
  );
  const footer = Buffer.from("\r\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n", "latin1");
  return Buffer.concat([header, normalPayload, middle, bombPayload, footer]);
}

beforeAll(async () => {
  if (MODULE_EXISTS) {
    documentParsing = (await import(
      "../document-parsing.js"
    )) as ParserModule;
  }
});

describe("parser and schema surface (spec section 8)", () => {
  it.each(PARSER_NAMES)(
    "exports the parser %s",
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

  it("counts every draft schema export from the module", () => {
    const schemas = Object.keys(documentParsing).filter((name) =>
      name.endsWith("DraftSchema"),
    );
    expect(schemas.length).toBe(11);
  });

  it("covers every spec parser name with a module export", () => {
    const present = PARSER_NAMES.filter(
      (name) => typeof documentParsing[name] === "function",
    );
    expect(present.length).toBe(PARSER_NAMES.length);
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

describe("extraction marker (plan task 6.1)", () => {
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
    requireReviewResult(result);
  });

  it("gives a review-list result and no draft for the guide worksheet", () => {
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({ cells: fakeGuideCells() }) as Record<
      string,
      unknown
    >;
    requireReviewResult(result);
  });

  it("gives a review-list result and no draft when the voucher month differs from the file-name month", () => {
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({
      cells: fakeVoucherCells("PV69/9-004", "15/09/2569"),
      fileNameMonth: "2026-10",
    }) as Record<string, unknown>;
    requireReviewResult(result);
  });
});

describe("cloud and OpenAI invoice read paths (D-13)", () => {
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
      text: "Test invoice PA-INV-FAKE-001 Date: 15 Oct 2026 total 30000",
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
          A10: "Date: 15 Oct 2026",
        } as Record<string, string | number | null>,
      }),
    );
    const result = parse({ worksheets: tabs }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["invoiceNo"]).toBe("PA-INV-FAKE-001");
    expect(draft["date"]).toBe("2026-10-15");
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
      text: "Payment receipt FAKE-PAY-0001\nPayment date: 2026-10-01\npaid THB 5000",
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

  it("gives needs_password and no draft for a bank statement without the secret", () => {
    const parse = requireParser("parseBankStatement");
    const result = parse({ passwordHeld: false }) as Record<string, unknown>;
    expect(result["status"]).toBe("needs-password");
    expect("draft" in result).toBe(false);
  });

  it.each(NO_REAL_SAMPLE_FIXTURES)(
    "fixture %s is marked no real sample",
    (name) => {
      const fixture = readNoRealSampleFixture(name);
      expect(fixture["_marker"]).toBe("no real sample");
    },
  );
});

describe("A601 label boundary with unequal money", () => {
  it("reads the OpenAI fixture subtotal, tax, and total exactly", () => {
    const parse = requireParser("parseOpenAiInvoice");
    const fixture = readNoRealSampleFixture("openai-invoice.no-real-sample.json");
    const result = parse({ text: String(fixture["text"]) }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "openAiInvoiceDraftSchema");
    expect(draft["invoiceNumber"]).toBe("OPENAI-FAKE-0001");
    expect(draft["invoiceDate"]).toBe("2026-10-01");
    expect(draft["periodStart"]).toBe("2026-09-01");
    expect(draft["periodEnd"]).toBe("2026-09-30");
    expect(draft["currency"]).toBe("USD");
    expect(draft["subtotal"]).toBe("1000");
    expect(draft["tax"]).toBe("70");
    expect(draft["total"]).toBe("1070");
  });

  it("reads unequal school subtotal and net total exactly", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: "Test invoice PA-INV-FAKE-009\nDate: 15 ต.ค. 2569\nSubtotal: 50,000.00\nTotal: 30,000.00",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
    expect(draft["subtotal"]).toBe("5000000");
    expect(draft["netTotal"]).toBe("3000000");
  });
});

describe("A602 PND.3 section 8 draft on the extended parser", () => {
  it("extends parseWhtFilingPnd3 with the fixture-validated section 8 draft", () => {
    const parse = requireParser("parseWhtFilingPnd3");
    const result = parse({ text: fakeWhtFilingPnd3Text() }) as Record<
      string,
      unknown
    >;
    expect(result["status"]).toBe("parsed");
    const draft = requireParsedDraft(result, "whtFilingPnd3DraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["referenceNumber"]).toBe("P030000000000");
    expect(draft["withholderTaxId"]).toBe("0-0000-00000-00-0");
    expect(draft["withholderBranch"]).toBe("1");
    expect(draft["sheetNo"]).toBe("1");
    expect(draft["sheetsTotal"]).toBe("1");
    expect(draft["totalAmountPaid"]).toBe("1000000");
    expect(draft["totalTaxWithheld"]).toBe("30000");
    const rows = draft["rows"] as ReadonlyArray<Record<string, unknown>>;
    expect(rows.length).toBe(1);
    const row = rows[0] ?? {};
    expect(row["seq"]).toBe(1);
    expect(row["payeeTaxId"]).toBe("0-0000-00000-00-0");
    expect(row["payeeName"]).toBe("Mr. Fake Contractor");
    expect(row["payeeAddress"] ?? null).toBeNull();
    expect(row["paymentDate"]).toBe("2026-10-30");
    expect(row["incomeType"]).toBe("ค่าจ้าง");
    expect(row["taxRatePercent"]).toBe(3);
    expect(row["amountPaid"]).toBe("1000000");
    expect(row["taxWithheld"]).toBe("30000");
    expect(row["condition"]).toBe(1);
  });
});

describe("A603 cloud invoice in the report sample 4.2 layout", () => {
  it("reads every field of the two-space-column sample", () => {
    const parse = requireParser("parseCloudInvoice");
    const result = parse({ text: fakeCloudInvoiceSample42Text() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "cloudInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["invoiceNumber"]).toBe("FAKE-CLOUD-0002");
    expect(draft["gstRegNo"]).toBe("000000000X");
    expect(draft["billTo"]).toBe("Test Counterparty");
    expect(draft["service"]).toBe("Google Cloud");
    expect(draft["invoiceDate"]).toBe("2026-09-30");
    expect(draft["billingId"]).toBe("FAKE-BILL-0000");
    expect(draft["accountId"]).toBe("FAKE-ACCT-000000");
    expect(draft["periodStart"]).toBe("2026-09-01");
    expect(draft["periodEnd"]).toBe("2026-09-30");
    expect(draft["currency"]).toBe("THB");
    expect(draft["subtotal"]).toBe("500000");
    expect(draft["gstRate"]).toBe("7%");
    expect(draft["gst"]).toBe("35000");
    expect(draft["total"]).toBe("535000");
    const lines = draft["lines"] as ReadonlyArray<Record<string, unknown>>;
    expect(lines.length).toBeGreaterThan(0);
    const line = lines[0] ?? {};
    expect(String(line["description"] ?? "")).toContain("Google Cloud");
    expect(line["amount"]).toBe("500000");
  });
});

describe("A604 cloud statement with the fixture values", () => {
  it("reads every field and both payment rows", () => {
    const parse = requireParser("parseCloudStatement");
    const result = parse({ text: fakeCloudStatementText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "cloudStatementDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["documentTitle"]).toBe("Statement");
    expect(draft["to"]).toBe("Test Company");
    expect(draft["service"]).toBe("Google Cloud");
    expect(draft["cloudAccountId"]).toBe("FAKE-CLOUD-000000");
    expect(draft["paymentsAccountId"]).toBe("FAKE-PAY-0000-0000");
    expect(draft["paymentsProfileId"]).toBe("FAKE-PROF-0000");
    expect(draft["statementIssueDate"]).toBe("2026-08-31");
    expect(draft["periodStart"]).toBe("2026-08-01");
    expect(draft["periodEnd"]).toBe("2026-08-31");
    expect(draft["startingBalance"]).toBe("0");
    expect(draft["totalNewActivity"]).toBe("500000");
    expect(draft["totalPaymentsReceived"]).toBe("-500000");
    expect(draft["endingBalance"]).toBe("0");
    const payments = draft["payments"] as ReadonlyArray<
      Record<string, unknown>
    >;
    expect(payments.length).toBe(2);
    const first = payments[0] ?? {};
    expect(first["date"]).toBe("2026-08-03");
    expect(String(first["description"] ?? "")).toContain("Visa ending 0000");
    expect(first["amount"]).toBe("-250000");
    const second = payments[1] ?? {};
    expect(second["date"]).toBe("2026-08-30");
    expect(second["amount"]).toBe("-250000");
  });
});

describe("A605 payment voucher PDF from the report fixture", () => {
  it("reads the payslip print verbatim with separate net figures", () => {
    const parse = requireParser("parsePaymentVoucherPdf");
    const result = parse({ text: fakeVoucherPayslipFixtureText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "paymentVoucherDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["companyName"]).toBe("บริษัท ตัวอย่าง(ไทยแลนด์) จำกัด");
    expect(draft["voucherNo"]).toBe("PV6910-003");
    expect(draft["date"]).toBe("2026-10-31");
    expect(draft["payee"]).toBe("Mr. Fake Contractor");
    expect(draft["paymentRef"]).toBe("PP: 0000000000");
    expect(draft["netAmount"]).toBe("1000000");
    expect(draft["subtotal"]).toBe("1000000");
    expect(String(draft["deductionLabel"] ?? "")).toContain("หัก ณ ที่จ่าย");
    expect(draft["deductionRate"]).toBe(0.03);
    expect(draft["deductionAmount"]).toBe("30000");
    expect(draft["netTotal"]).toBe("970000");
    const lines = draft["lines"] as ReadonlyArray<Record<string, unknown>>;
    expect(lines.length).toBe(1);
    const line = lines[0] ?? {};
    expect(line["docDate"]).toBe("2026-10-31");
    expect(line["description"]).toBe("Salary");
    expect(line["amount"]).toBe("1000000");
  });
});

describe("A606 school invoice sheet fields", () => {
  it("reads the document title and the invoice number from the tab", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({ worksheets: [fakeRichSchoolTab()] }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["documentTitle"]).toBe("ใบแจ้งหนี้ / INVOICE");
    expect(draft["invoiceNo"]).toBe("PA-INV-FAKE-002-T2");
  });

  it("reads the receipt number from a receipt tab", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Receipt Term 1",
          cells: {
            A1: "Test Company Ltd.",
            A2: "ใบเสร็จรับเงิน / RECEIPT",
            B5: "PA-REC-FAKE-001-T1",
            A10: "Date: 15 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["receiptNo"]).toBe("PA-REC-FAKE-001-T1");
    expect(draft["invoiceNo"]).toBeNull();
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the invoice date or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the quotation reference or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["quotationRef"]).toBe("FAKE-Q-002");
  });

  it("reads the due date or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["due"]).toBe("2026-10-31");
  });

  it("reads the issuer company names from the tab", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({ worksheets: [fakeRichSchoolTab()] }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["issuerCompanyNames"]).toBe("Test School Company Ltd.");
  });

  it("reads the issuer tax id or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["issuerTaxId"]).toBe("0000000000000");
  });

  it("reads the issuer branch or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["issuerBranch"]).toBe("00000");
  });

  it("reads the issuer contact or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["issuerContact"]).toBe("Test contact 000");
  });

  it("reads the customer name or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["customerName"]).toBe("Test School");
  });

  it("reads the customer address or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["customerAddress"]).toBe("Test Address 1");
  });

  it("reads the customer tax id or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["customerTaxId"]).toBe("0000000000000");
  });

  it("reads the student count or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["students"]).toBe(100);
  });

  it("reads the invoice lines or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) {
      const lines = draft["lines"] as ReadonlyArray<Record<string, unknown>>;
      expect(lines.length).toBeGreaterThan(0);
      expect(String(lines[0]?.["description"] ?? "")).toContain("licence");
    }
  });

  it("reads the subtotal or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["subtotal"]).toBe("5000000");
  });

  it("reads the discounts or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) {
      const discounts = draft["discounts"] as ReadonlyArray<
        Record<string, unknown>
      >;
      expect(discounts.length).toBeGreaterThan(0);
      expect(discounts[0]?.["amount"]).toBe("-2000000");
    }
  });

  it("reads the net total or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["netTotal"]).toBe("3000000");
  });

  it("reads the net total in words or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null)
      expect(draft["netTotalInWords"]).toBe("Test thirty thousand");
  });

  it("reads the payment block or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) {
      const payment = draft["payment"] as Record<string, unknown> | null;
      expect(payment).not.toBeNull();
      expect(payment?.["bank"]).toBe("Test Bank");
    }
  });

  it("reads the delivery block or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null)
      expect(String(draft["delivery"] ?? "")).toContain("delivery");
  });

  it("reads the VAT note or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["vatNote"]).toBe("Test VAT note");
  });

  it("reads the terms or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const draft = requireParsedOrReview(
      parse({ worksheets: [fakeRichSchoolTab()] }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["terms"]).toBe("Test terms");
  });
});

describe("A606 school invoice PDF fields", () => {
  it("reads the uppercase INVOICE title", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: fakeSchoolInvoicePdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(String(draft["documentTitle"] ?? "")).toMatch(/invoice/iu);
  });

  it("reads the invoice number and date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: fakeSchoolInvoicePdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["invoiceNo"]).toBe("PA-INV-FAKE-002-T2");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the quotation reference", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: fakeSchoolInvoicePdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["quotationRef"]).toBe("FAKE-Q-002");
  });

  it("reads the due date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: fakeSchoolInvoicePdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["due"]).toBe("2026-10-31");
  });

  it("reads the customer name", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: fakeSchoolInvoicePdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["customerName"]).toBe("Test School");
  });

  it("reads the subtotal and the net total exactly", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: fakeSchoolInvoicePdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["subtotal"]).toBe("5000000");
    expect(draft["netTotal"]).toBe("3000000");
  });

  it("reads the net total in words", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({ text: fakeSchoolInvoicePdfText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["netTotalInWords"]).toBe("Test thirty thousand");
  });

  it("reads the issuer tax id or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["issuerTaxId"]).toBe("0000000000000");
  });

  it("reads the issuer branch or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["issuerBranch"]).toBe("00000");
  });

  it("reads the issuer contact or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["issuerContact"]).toBe("Test contact 000");
  });

  it("reads the customer address or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["customerAddress"]).toBe("Test Address 1");
  });

  it("reads the customer tax id or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["customerTaxId"]).toBe("0000000000000");
  });

  it("reads the student count or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["students"]).toBe(100);
  });

  it("reads the invoice lines or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) {
      const lines = draft["lines"] as ReadonlyArray<Record<string, unknown>>;
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  it("reads the discounts or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) {
      const discounts = draft["discounts"] as ReadonlyArray<
        Record<string, unknown>
      >;
      expect(discounts.length).toBeGreaterThan(0);
      expect(discounts[0]?.["amount"]).toBe("-2000000");
    }
  });

  it("reads the payment block or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) {
      const payment = draft["payment"] as Record<string, unknown> | null;
      expect(payment).not.toBeNull();
      expect(payment?.["bank"]).toBe("Test Bank");
    }
  });

  it("reads the delivery block or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null)
      expect(String(draft["delivery"] ?? "")).toContain("delivery");
  });

  it("reads the VAT note or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["vatNote"]).toBe("Test VAT note");
  });

  it("reads the terms or returns the review result", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const draft = requireParsedOrReview(
      parse({ text: fakeSchoolInvoicePdfText() }) as Record<string, unknown>,
      "schoolInvoiceDraftSchema",
    );
    if (draft !== null) expect(draft["terms"]).toBe("Test terms");
  });
});

describe("A607 cloud payment receipt layouts", () => {
  it("reads the Cloud layout with Amount received on and the standalone THB line", () => {
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({ text: fakeCloudReceiptText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "cloudPaymentReceiptDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["documentTitle"]).toBe("Payment Receipt");
    expect(draft["paymentDate"]).toBe("2026-03-01");
    expect(draft["amount"]).toBe("500000");
    expect(draft["paidBy"]).toBe("Test Company");
    expect(draft["paidTo"]).toBe("Test Vendor");
    expect(draft["service"]).toBe("Google Cloud");
    expect(draft["taxIdentificationNo"]).toBe("000000000R");
    expect(draft["billingId"]).toBe("FAKE-BILL-0000");
    expect(draft["paymentMethod"]).toBe("Test card ending 0000");
    expect(draft["paymentNumber"]).toBe("FAKE-PAY-0001");
    expect(draft["paymentId"]).toBe("CLOUD AbCdEf");
  });

  it("reads the Workspace layout with Payment date and no colon", () => {
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({ text: fakeWorkspaceReceiptText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "cloudPaymentReceiptDraftSchema");
    expect(draft["paymentDate"]).toBe("2026-03-02");
    expect(draft["amount"]).toBe("200000");
  });
});

describe("A612 minor units without leading zeros", () => {
  it("reads a zero balance as 0", () => {
    const parse = requireParser("parseCloudStatement");
    const result = parse({
      text: "Statement\nStarting balance: 0.00",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "cloudStatementDraftSchema");
    expect(draft["startingBalance"]).toBe("0");
  });

  it("reads 0.70 as 70", () => {
    const parse = requireParser("parseOpenAiInvoice");
    const fixture = readNoRealSampleFixture("openai-invoice.no-real-sample.json");
    const result = parse({ text: String(fixture["text"]) }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "openAiInvoiceDraftSchema");
    expect(draft["tax"]).toBe("70");
  });

  it("reads a negative zero balance as 0", () => {
    const parse = requireParser("parseCloudStatement");
    const result = parse({
      text: "Statement\nEnding balance: -0.00",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "cloudStatementDraftSchema");
    expect(draft["endingBalance"]).toBe("0");
  });

  it("keeps the minus sign of a nonzero negative balance", () => {
    const parse = requireParser("parseCloudStatement");
    const result = parse({
      text: "Statement\nEnding balance: -5,000.00",
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "cloudStatementDraftSchema");
    expect(draft["endingBalance"]).toBe("-500000");
  });
});

describe("A616 foreign vendor invoice from the workbook cells", () => {
  it("flattens the fixture cells in sheet order", () => {
    const parse = requireParser("parseForeignVendorInvoice");
    const result = parse({ cells: fakeForeignVendorCells() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "foreignVendorInvoiceDraftSchema");
    expect(draft["extraction"]).toBe("local-text");
    expect(draft["invoiceDate"]).toBe("2026-10-30");
    expect(draft["vendor"]).toBe("VENDOR A PRINTING CO.,LTD");
    expect(draft["billTo"]).toBe("Test Company");
    expect(draft["description"]).toContain("work book");
    expect(draft["quantity"]).toBe("1000");
    expect(draft["unitPrice"]).toBe("RMB10.0");
    expect(draft["amount"]).toBe("1000000");
    expect(draft["currency"]).toBe("RMB");
  });
});

describe("B601 B602 reader inflate caps", () => {
  it("exports the ZIP entry inflate cap", () => {
    const cap = requireExport("MAX_ZIP_ENTRY_BYTES");
    expect(typeof cap).toBe("number");
    expect(cap as number).toBeGreaterThan(0);
    expect(cap as number).toBeLessThanOrEqual(20 * 1024 * 1024);
  });

  it("exports the PDF inflate cap", () => {
    const cap = requireExport("MAX_PDF_INFLATE_BYTES");
    expect(typeof cap).toBe("number");
    expect(cap as number).toBeGreaterThan(0);
    expect(cap as number).toBeLessThanOrEqual(20 * 1024 * 1024);
  });

  it("returns an empty workbook when a sheet part inflates past the ZIP cap", () => {
    const cap =
      typeof documentParsing["MAX_ZIP_ENTRY_BYTES"] === "number"
        ? (documentParsing["MAX_ZIP_ENTRY_BYTES"] as number)
        : 2 * 1024 * 1024;
    const readWorkbook = requireParser("readWorkbook") as (
      input: unknown,
    ) => { readonly worksheets: ReadonlyArray<unknown> };
    const padding = "0".repeat(cap + 64 * 1024);
    const sheetXml =
      `<worksheet><sheetData><row r="1">` +
      `<c r="A1" t="inlineStr"><is><t>Bomb</t></is></c></row>` +
      `<!--${padding}--></sheetData></worksheet>`;
    const bytes = buildWorkbookZip(
      [{ name: "Bomb", target: "worksheets/sheet1.xml" }],
      { "worksheets/sheet1.xml": sheetXml },
      null,
      ["worksheets/sheet1.xml"],
    );
    const workbook = readWorkbook(new Uint8Array(bytes));
    expect(workbook.worksheets).toHaveLength(0);
  });

  it("returns null text when a FlateDecode stream inflates past the PDF cap", () => {
    const cap =
      typeof documentParsing["MAX_PDF_INFLATE_BYTES"] === "number"
        ? (documentParsing["MAX_PDF_INFLATE_BYTES"] as number)
        : 2 * 1024 * 1024;
    const readTextPdf = requireParser("readTextPdf") as (
      input: unknown,
    ) => { readonly pageCount: number; readonly text: string | null };
    const repeats = Math.ceil((cap + 64 * 1024) / 7);
    const payload = deflateSync(Buffer.from(`BT\n${"(V) Tj\n".repeat(repeats)}ET\n`, "utf8"));
    const result = readTextPdf(new Uint8Array(buildFlatePdf(payload)));
    expect(result.text === null).toBe(true);
  });
});

describe("B604 hostile XML character reference (A608)", () => {
  it("drops a hostile shared-strings part without raising", () => {
    const readWorkbook = requireParser("readWorkbook") as (
      input: unknown,
    ) => {
      readonly worksheets: ReadonlyArray<{
        readonly cells: Record<string, unknown>;
      }>;
    };
    const bytes = buildWorkbookZip(
      [{ name: "Hostile", target: "worksheets/sheet1.xml" }],
      {
        "worksheets/sheet1.xml":
          `<worksheet><sheetData><row r="1">` +
          `<c r="A2" t="s"><v>0</v></c></row></sheetData></worksheet>`,
      },
      `<sst><si><t>A&#x110FFFF;B</t></si><si><t>C&#999999999999;D</t></si></sst>`,
    );
    const workbook = readWorkbook(new Uint8Array(bytes));
    expect(workbook.worksheets).toHaveLength(0);
  });

  it("keeps the literal text of an inline-string hostile reference without raising", () => {
    const readWorkbook = requireParser("readWorkbook") as (
      input: unknown,
    ) => {
      readonly worksheets: ReadonlyArray<{
        readonly cells: Record<string, unknown>;
      }>;
    };
    const bytes = buildWorkbookZip(
      [{ name: "Inline", target: "worksheets/sheet1.xml" }],
      {
        "worksheets/sheet1.xml":
          `<worksheet><sheetData><row r="1">` +
          `<c r="A2" t="inlineStr"><is><t>A&#x110FFFF;B</t></is></c>` +
          `</row></sheetData></worksheet>`,
      },
      null,
    );
    const workbook = readWorkbook(new Uint8Array(bytes));
    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0]?.cells["A2"]).toBe("A&#x110FFFF;B");
  });
});

describe("B605 draft money length cap", () => {
  it("rejects a digit string longer than the cap and accepts normal money", () => {
    const schema = requireSchema("draftMoneySchema");
    expect(schema.safeParse("9".repeat(30)).success).toBe(false);
    expect(schema.safeParse("500000").success).toBe(true);
    expect(schema.safeParse("0").success).toBe(true);
  });
});

describe("A620 currency on every section 8 draft", () => {
  it("reads the payment receipt currency from the printed text", () => {
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({ text: fakeCloudReceiptText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "cloudPaymentReceiptDraftSchema");
    expect(draft["currency"]).toBe("THB");
  });

  it("reads the statement currency from the printed text", () => {
    const parse = requireParser("parseCloudStatement");
    const result = parse({ text: fakeCloudStatementText() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "cloudStatementDraftSchema");
    expect(draft["currency"]).toBe("THB");
  });

  it("holds THB for the PND.3 sheet whose print carries no prefix", () => {
    const parse = requireParser("parseWhtFilingPnd3");
    const result = parse({ text: fakeWhtFilingPnd3Text() }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(result, "whtFilingPnd3DraftSchema");
    expect(draft["currency"]).toBe("THB");
  });

  it("reads the school sheet currency from the printed text", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-004-T2",
            A10: "Date: 15 Oct 2026",
            A23: "Currency: THB",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
    expect(draft["currency"]).toBe("THB");
  });

  it("reads the school PDF currency from the printed text", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-005-T2",
        "Date: 15 ต.ค. 2569",
        "Total: THB 30,000.00",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
    expect(draft["currency"]).toBe("THB");
  });

  it("holds THB for the withholding certificate whose Thai form prints no prefix", () => {
    const parse = requireParser("parseWithholdingCertificate");
    const fixture = readNoRealSampleFixture(
      "withholding-certificate.no-real-sample.json",
    );
    const result = parse({ text: String(fixture["text"]) }) as Record<
      string,
      unknown
    >;
    const draft = requireParsedDraft(
      result,
      "withholdingCertificateDraftSchema",
    );
    expect(draft["currency"]).toBe("THB");
  });
});

describe("A621 school dates with no label and no date", () => {
  it("returns review unreadable for an unlabeled Thai school date line (B620 supersedes the bare-line fallback)", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-003-T2",
        "15 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable for a school sheet tab with no date", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-006-T2",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    expect(result["status"]).toBe("review");
    expect(result["reason"]).toBe("review:unreadable");
    expect("draft" in result).toBe(false);
  });

  it("returns review unreadable for a school PDF with no readable date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-007-T2",
        "Customer: Test School",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(result["status"]).toBe("review");
    expect(result["reason"]).toBe("review:unreadable");
    expect("draft" in result).toBe(false);
  });
});

describe("B610 two streams with one over the PDF cap", () => {
  it("returns null text when the second stream inflates past the cap", () => {
    const cap =
      typeof documentParsing["MAX_PDF_INFLATE_BYTES"] === "number"
        ? (documentParsing["MAX_PDF_INFLATE_BYTES"] as number)
        : 2 * 1024 * 1024;
    const readTextPdf = requireParser("readTextPdf") as (
      input: unknown,
    ) => { readonly pageCount: number; readonly text: string | null };
    const normal = deflateSync(Buffer.from("BT (Hi) Tj ET", "utf8"));
    const bomb = deflateSync(Buffer.alloc(cap + 64 * 1024, 0));
    const result = readTextPdf(
      new Uint8Array(buildTwoStreamFlatePdf(normal, bomb)),
    );
    expect(result.text === null).toBe(true);
  });
});

describe("B611 two sheets with one over the ZIP cap", () => {
  it("returns no worksheet when one sheet part inflates past the cap", () => {
    const cap =
      typeof documentParsing["MAX_ZIP_ENTRY_BYTES"] === "number"
        ? (documentParsing["MAX_ZIP_ENTRY_BYTES"] as number)
        : 2 * 1024 * 1024;
    const readWorkbook = requireParser("readWorkbook") as (
      input: unknown,
    ) => {
      readonly worksheets: ReadonlyArray<{
        readonly name: string;
        readonly cells: Record<string, string | number | null>;
      }>;
    };
    const readVouchers = requireParser("readVoucherWorksheets") as (
      input: unknown,
    ) => {
      readonly vouchers: ReadonlyArray<{ readonly name: string }>;
      readonly skipped: ReadonlyArray<string>;
    };
    const padding = "0".repeat(cap + 64 * 1024);
    const bombXml =
      `<worksheet><sheetData><row r="1">` +
      `<c r="A1" t="inlineStr"><is><t>Bomb</t></is></c></row>` +
      `<!--${padding}--></sheetData></worksheet>`;
    const goodXml =
      `<worksheet><sheetData>` +
      `<row r="1"><c r="A1" t="inlineStr"><is><t>Test Company Ltd.</t></is></c></row>` +
      `<row r="2"><c r="A2" t="inlineStr"><is><t>${VOUCHER_FORM_TITLE}</t></is></c></row>` +
      `<row r="3"><c r="I3" t="inlineStr"><is><t>PV69/10-001</t></is></c></row>` +
      `<row r="4"><c r="I4" t="inlineStr"><is><t>31/10/2569</t></is></c></row>` +
      `<row r="5"><c r="B5" t="inlineStr"><is><t>Test Counterparty</t></is></c></row>` +
      `<row r="26"><c r="I26"><v>20000</v></c><c r="I28"><v>19400</v></c></row>` +
      `</sheetData></worksheet>`;
    const bytes = buildWorkbookZip(
      [
        { name: "Good", target: "worksheets/sheet1.xml" },
        { name: "Bomb", target: "worksheets/sheet2.xml" },
      ],
      {
        "worksheets/sheet1.xml": goodXml,
        "worksheets/sheet2.xml": bombXml,
      },
      null,
      ["worksheets/sheet2.xml"],
    );
    const workbook = readWorkbook(new Uint8Array(bytes));
    expect(workbook.worksheets).toHaveLength(0);
    expect(readVouchers(workbook).vouchers).toHaveLength(0);
  });
});

describe("B612 whole-text PDF cap", () => {
  it("returns null text when the text layer exceeds the cap", () => {
    const cap = requireExport("MAX_PDF_TEXT_CHARS") as number;
    expect(typeof cap).toBe("number");
    expect(cap).toBeGreaterThan(0);
    const readTextPdf = requireParser("readTextPdf") as (
      input: unknown,
    ) => { readonly pageCount: number; readonly text: string | null };
    const repeats = Math.ceil((cap + 1024) / 7);
    const payload = deflateSync(
      Buffer.from(`BT\n${"(V) Tj\n".repeat(repeats)}ET\n`, "utf8"),
    );
    const result = readTextPdf(new Uint8Array(buildFlatePdf(payload)));
    expect(result.text === null).toBe(true);
  });
});

describe("B603 reader characterization rows", () => {
  it("returns an empty workbook for a malformed ZIP without raising", () => {
    const readWorkbook = requireParser("readWorkbook") as (
      input: unknown,
    ) => { readonly worksheets: ReadonlyArray<unknown> };
    const workbook = readWorkbook(
      new Uint8Array(Buffer.from("not a zip archive", "utf8")),
    );
    expect(workbook.worksheets).toHaveLength(0);
  });

  it("returns null text for bytes with no PDF structure without raising", () => {
    const readTextPdf = requireParser("readTextPdf") as (
      input: unknown,
    ) => { readonly pageCount: number; readonly text: string | null };
    const result = readTextPdf(
      new Uint8Array(Buffer.from("not a pdf file", "utf8")),
    );
    expect(result.pageCount).toBe(0);
    expect(result.text).toBeNull();
  });

  it("reads one text line from a minimal text PDF", () => {
    const readTextPdf = requireParser("readTextPdf") as (
      input: unknown,
    ) => { readonly pageCount: number; readonly text: string | null };
    const payload = deflateSync(Buffer.from("BT (Hi) Tj ET", "utf8"));
    const result = readTextPdf(new Uint8Array(buildFlatePdf(payload)));
    expect(result.pageCount).toBe(1);
    expect(result.text).toBe("Hi");
  });

  it("skips the guide worksheet of a generated workbook", () => {
    const readWorkbook = requireParser("readWorkbook") as (
      input: unknown,
    ) => {
      readonly worksheets: ReadonlyArray<{
        readonly name: string;
        readonly cells: Record<string, string | number | null>;
      }>;
    };
    const readVouchers = requireParser("readVoucherWorksheets") as (
      input: unknown,
    ) => {
      readonly vouchers: ReadonlyArray<{
        readonly name: string;
        readonly cells: Record<string, string | number | null>;
      }>;
      readonly skipped: ReadonlyArray<string>;
    };
    const voucherXml =
      `<worksheet><sheetData>` +
      `<row r="1"><c r="A1" t="inlineStr"><is><t>Test Company Ltd.</t></is></c></row>` +
      `<row r="2"><c r="A2" t="inlineStr"><is><t>${VOUCHER_FORM_TITLE}</t></is></c></row>` +
      `<row r="3"><c r="I3" t="inlineStr"><is><t>PV69/10-001</t></is></c></row>` +
      `<row r="4"><c r="I4" t="inlineStr"><is><t>31/10/2569</t></is></c></row>` +
      `<row r="5"><c r="B5" t="inlineStr"><is><t>Test Counterparty</t></is></c></row>` +
      `<row r="26"><c r="I26"><v>20000</v></c><c r="I28"><v>19400</v></c></row>` +
      `</sheetData></worksheet>`;
    const guideXml =
      `<worksheet><sheetData>` +
      `<row r="1"><c r="A1" t="inlineStr"><is><t>Test guide</t></is></c></row>` +
      `<row r="2"><c r="A2" t="inlineStr"><is><t>Test SOP text</t></is></c></row>` +
      `</sheetData></worksheet>`;
    const bytes = buildWorkbookZip(
      [
        { name: "Test Payee", target: "worksheets/sheet1.xml" },
        { name: "Guide", target: "worksheets/sheet2.xml" },
      ],
      {
        "worksheets/sheet1.xml": voucherXml,
        "worksheets/sheet2.xml": guideXml,
      },
      null,
    );
    const workbook = readWorkbook(new Uint8Array(bytes));
    const selected = readVouchers(workbook);
    expect(selected.vouchers).toHaveLength(1);
    expect(selected.vouchers[0]?.name).toBe("Test Payee");
    expect(selected.skipped).toEqual(["Guide"]);
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({
      cells: selected.vouchers[0]?.cells ?? {},
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "paymentVoucherDraftSchema");
    expect(draft["voucherNo"]).toBe("PV69/10-001");
  });

  it("reviews a formula cell with no cached value in a generated workbook", () => {
    const readWorkbook = requireParser("readWorkbook") as (
      input: unknown,
    ) => {
      readonly worksheets: ReadonlyArray<{
        readonly name: string;
        readonly cells: Record<string, string | number | null>;
      }>;
    };
    const sheetXml =
      `<worksheet><sheetData>` +
      `<row r="2"><c r="A2" t="inlineStr"><is><t>${VOUCHER_FORM_TITLE}</t></is></c></row>` +
      `<row r="3"><c r="I3" t="inlineStr"><is><t>PV69/10-005</t></is></c></row>` +
      `<row r="4"><c r="I4" t="inlineStr"><is><t>31/10/2569</t></is></c></row>` +
      `<row r="5"><c r="B5" t="inlineStr"><is><t>Test Counterparty</t></is></c></row>` +
      `<row r="10"><c r="A10" t="inlineStr"><is><t>31/10/2569</t></is></c>` +
      `<c r="D10" t="inlineStr"><is><t>Test service line</t></is></c>` +
      `<c r="I10"><v>20000</v></c></row>` +
      `<row r="26"><c r="I26"><f>SUM(I10:I25)</f></c>` +
      `<c r="I28"><v>19400</v></c></row>` +
      `</sheetData></worksheet>`;
    const bytes = buildWorkbookZip(
      [{ name: "Test Payee", target: "worksheets/sheet1.xml" }],
      { "worksheets/sheet1.xml": sheetXml },
      null,
    );
    const workbook = readWorkbook(new Uint8Array(bytes));
    expect(workbook.worksheets).toHaveLength(1);
    const parse = requireParser("parsePaymentVoucherSheet");
    const result = parse({
      cells: workbook.worksheets[0]?.cells ?? {},
    }) as Record<string, unknown>;
    requireReviewResult(result);
  });
});

describe("A630 unreadable document date with a readable due or delivery date", () => {
  it("returns review unreadable when the document date is unreadable and only the due date is readable", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-009-T2",
        "Date: unreadable",
        "Due: 31 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when the document date is unreadable and only the delivery date is readable", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-010-T2",
        "Date: unreadable",
        "Delivery: Test delivery 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("B620 invoice date labels", () => {
  it("reads the document date from the Date label and not from the excluded Payment date label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-011-T2",
        "Payment date: 31 Oct 2026",
        "Date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the Invoice date label and not from the excluded Payment date label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-012-T2",
        "Payment date: 31 Oct 2026",
        "Invoice date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the Issue date label and not from the excluded Payment date label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-013-T2",
        "Payment date: 31 Oct 2026",
        "Issue date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the Invoice Date label and not from the excluded Payment date label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-014-T2",
        "Payment date: 31 Oct 2026",
        "Invoice Date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the วันที่ label and not from the excluded วันที่ชำระ label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-015-T2",
        "วันที่ชำระ: 31 ต.ค. 2569",
        "วันที่: 15 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the วันที่ออก label and not from the excluded วันที่ชำระ label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-016-T2",
        "วันที่ชำระ: 31 ต.ค. 2569",
        "วันที่ออก: 15 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the ลงวันที่ label and not from the excluded วันที่ชำระ label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-017-T2",
        "วันที่ชำระ: 31 ต.ค. 2569",
        "ลงวันที่: 15 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the วันที่ออกใบแจ้งหนี้ label and not from the excluded วันที่ชำระ label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-018-T2",
        "วันที่ชำระ: 31 ต.ค. 2569",
        "วันที่ออกใบแจ้งหนี้: 15 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the document date from the วันที่ออกใบกำกับภาษี label and not from the excluded วันที่ชำระ label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-019-T2",
        "วันที่ชำระ: 31 ต.ค. 2569",
        "วันที่ออกใบกำกับภาษี: 15 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });
});

describe("B620 excluded labels carry no document date", () => {
  it("returns review unreadable when only the delivery label วันที่ส่งของ carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-020-T2",
        "วันที่ส่งของ: 31 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when only the Delivery label carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-021-T2",
        "Delivery: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when only the ครบกำหนด label carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-022-T2",
        "ครบกำหนด: 31 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when only the Due label carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-023-T2",
        "Due: 31 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when only the Payment date label carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-024-T2",
        "Payment date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when only the วันที่ชำระ label carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-025-T2",
        "วันที่ชำระ: 31 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("B620 unlabelled dates and sheet bare-date cells", () => {
  it("returns review unreadable for an unlabelled non-bare date line", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-026-T2",
        "The goods arrived 15 Oct 2026 at the office",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("reads the sheet bare date beside the title and not the elsewhere cell", () => {
    // Characterization: passes at HEAD through the scan-all bare-date
    // fallback, and it must stay green after the beside-only change (B620).
    // B2 sits on the title row beside A2; D20 sits on no title or number
    // row, so only B2 may supply the date.
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B2: "15 ต.ค. 2569",
            B5: "PA-INV-FAKE-030-T2",
            D20: "31 ต.ค. 2569",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("returns review unreadable for a sheet bare date elsewhere only", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-031-T2",
            D20: "31 ต.ค. 2569",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R7 A630 split-line due and delivery dates carry no document date", () => {
  it("returns review unreadable when Due and its Thai date sit on separate lines", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-040-T2",
        "Date: unreadable",
        "Due:",
        "31 ต.ค. 2569",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when a Delivery line and its English date sit on separate lines", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-041-T2",
        "Date: unreadable",
        "Delivery",
        "31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable for a standalone English date line with no label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-042-T2",
        "15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R7 A640 dated is no accepted document date label", () => {
  it("returns review unreadable for a dated-only school invoice", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-043-T2",
        "dated: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R7 A641 hyphen and nested excluded labels on the PDF path", () => {
  it("reads the accepted Date and not the hyphenated Payment-date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-044-T2",
        "Payment-date: 31 Oct 2026",
        "Date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the accepted Date and not the nested Delivery: Date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-045-T2",
        "Delivery: Date: 31 Oct 2026",
        "Date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("returns review unreadable when only the hyphenated Payment-date carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-046-T2",
        "Payment-date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when only the nested Delivery: Date carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-047-T2",
        "Delivery: Date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R7 A641 hyphen and nested excluded labels on the sheet path", () => {
  it("reads the accepted Date cell and not the hyphenated Payment-date cell", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-048-T2",
            A10: "Payment-date: 31 Oct 2026",
            A11: "Date: 15 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the accepted Date cell and not the nested Delivery: Date cell", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-049-T2",
            A10: "Delivery: Date: 31 Oct 2026",
            A11: "Date: 15 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("returns review unreadable when only the hyphenated Payment-date cell carries a date", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-050-T2",
            A10: "Payment-date: 31 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R7 A642 each parser reads its date only from its own field", () => {
  it("returns review unreadable for a voucher with an unreadable Date and a Delivery date", () => {
    const parse = requireParser("parsePaymentVoucherPdf");
    const result = parse({
      text: [
        "Test Company Ltd.",
        "ใบสำคัญจ่าย/PAYMENT  VOUCHER",
        "Voucher: PV69/10-009",
        "Payee: Test Counterparty",
        "Date: unreadable",
        "Delivery: 31/10/2569",
        "Net: 19400",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable for a cloud receipt with an unreadable Payment date and a Due date", () => {
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({
      text: [
        "Payment Receipt",
        "Payment date: unreadable",
        "Due: 2026-10-31",
        "Amount: THB 2,000.00",
        "Paid by Test Company",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable for a foreign invoice with only a Delivery DATE", () => {
    const parse = requireParser("parseForeignVendorInvoice");
    const result = parse({
      text: [
        "VENDOR A PRINTING CO.,LTD",
        "Delivery DATE 2026.10.31",
        "TO:Test Company",
        "DESCRIPTION",
        "work book test",
        "1000copies",
        "RMB10.0",
        "RMB10000",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("keeps a genuine receipt Payment date for paymentDate beside a Due date", () => {
    // Characterization: passes at HEAD; a genuine Payment date field stays
    // valid for paymentDate while the Due date supplies nothing.
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({
      text: [
        "Payment Receipt",
        "Payment date: 15 Oct 2026",
        "Due: 2026-10-31",
        "Amount: THB 2,000.00",
        "Paid by Test Company",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "cloudPaymentReceiptDraftSchema");
    expect(draft["paymentDate"]).toBe("2026-10-15");
  });
});

describe("R8 A641 slash and longer excluded labels on the PDF path", () => {
  it("reads the accepted Date and not the slashed Delivery / Date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-051-T2",
        "Delivery / Date: 31 Oct 2026",
        "Date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the accepted Date and not the longer Shipment date label", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-052-T2",
        "Shipment date: 31 Oct 2026",
        "Date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("returns review unreadable when only the longer Shipment date label carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-053-T2",
        "Shipment date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when the accepted field is unreadable and a later field on the line carries a date", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-054-T2",
        "Date: unreadable; Due: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R8 A641 slash and longer excluded labels on the sheet path", () => {
  it("reads the accepted Date cell and not the slashed Delivery / Date cell", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-055-T2",
            A10: "Delivery / Date: 31 Oct 2026",
            A11: "Date: 15 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("reads the accepted Date cell and not the longer Shipment date cell", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-056-T2",
            A10: "Shipment date: 31 Oct 2026",
            A11: "Date: 15 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });

  it("returns review unreadable when only the longer Shipment date cell carries a date", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-057-T2",
            A10: "Shipment date: 31 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when the accepted cell is unreadable and a later field in the cell carries a date", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-058-T2",
            A10: "Date: unreadable; Due: 31 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R8 F1 excluded word on the line before the Date line", () => {
  it("returns review unreadable when a lone Payment line precedes the Date line", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-059-T2",
        "Payment",
        "Date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when a lone Due line precedes the Date line", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-060-T2",
        "Due",
        "Date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable when a lone Delivery line precedes the Date line", () => {
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-061-T2",
        "Delivery",
        "Date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable for a non-breaking space between Payment and Date", () => {
    // The separator between the excluded word and the label is U+00A0, which
    // the single-line boundary does not cross at HEAD.
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-062-T2",
        "Payment\u00A0Date: 31 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("reads the Date line when the line before it is unrelated text", () => {
    // Characterization: passes at HEAD; a lone excluded word must join the
    // Date line, while unrelated text must not block the accepted label.
    const parse = requireParser("parseSchoolInvoicePdf");
    const result = parse({
      text: [
        "Test School Company Ltd.",
        "ใบแจ้งหนี้ / INVOICE",
        "No: PA-INV-FAKE-063-T2",
        "Bill to: Fake School",
        "Date: 15 Oct 2026",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "schoolInvoiceDraftSchema");
    expect(draft["date"]).toBe("2026-10-15");
  });
});

describe("R8 F1 excluded word in the cell before the Date cell", () => {
  it("returns review unreadable when a Payment cell precedes the Date cell", () => {
    const parse = requireParser("parseSchoolInvoiceSheet");
    const result = parse({
      worksheets: [
        {
          name: "Term 2",
          cells: {
            A1: "Test School Company Ltd.",
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-064-T2",
            A10: "Payment",
            B10: "Date: 31 Oct 2026",
          } as Record<string, string | number | null>,
        },
      ],
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});

describe("R8 A642 residual own-field dates", () => {
  it("returns review unreadable for a cloud receipt with an unreadable Payment date and a Due date on one line", () => {
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({
      text: [
        "Payment Receipt",
        "Payment date: unreadable; Due: 2026-10-31",
        "Amount: THB 2,000.00",
        "Paid by Test Company",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("reads the genuine DATE field and not an earlier Delivery / DATE field", () => {
    const parse = requireParser("parseForeignVendorInvoice");
    const result = parse({
      text: [
        "VENDOR A PRINTING CO.,LTD",
        "Delivery / DATE 2026.10.31",
        "DATE 2026.10.15",
        "TO:Test Company",
        "DESCRIPTION",
        "work book test",
        "1000copies",
        "RMB10.0",
        "RMB10000",
      ].join("\n"),
    }) as Record<string, unknown>;
    const draft = requireParsedDraft(result, "foreignVendorInvoiceDraftSchema");
    expect(draft["invoiceDate"]).toBe("2026-10-15");
  });
});

describe("R8 F2 documents with no own date field go to the review list", () => {
  it("returns review unreadable for a voucher PDF whose only date is a Delivery date", () => {
    const parse = requireParser("parsePaymentVoucherPdf");
    const result = parse({
      text: [
        "Test Company Ltd.",
        "ใบสำคัญจ่าย/PAYMENT  VOUCHER",
        "Voucher: PV69/10-011",
        "Payee: Test Counterparty",
        "Delivery: 31/10/2569",
        "Net: 19400",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });

  it("returns review unreadable for a cloud receipt with no date label", () => {
    const parse = requireParser("parseCloudPaymentReceipt");
    const result = parse({
      text: [
        "Payment Receipt",
        "Amount: THB 2,000.00",
        "Paid by Test Company",
      ].join("\n"),
    }) as Record<string, unknown>;
    expect(requireReviewResult(result)).toBe("review:unreadable");
  });
});
