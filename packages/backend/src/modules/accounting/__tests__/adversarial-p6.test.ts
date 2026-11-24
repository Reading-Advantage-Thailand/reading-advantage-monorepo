/**
 * ADV6 adversarial probes for Phase 6 document parsing.
 *
 * This file attacks the parsers of `document-parsing.ts` at the boundary, the
 * failure path, and the hostile-input path. It never edits production code.
 * Every input is a fake built from the vocabulary of the 2026-11-11 structure
 * report. No real amount, payee, name, tax id, account number, e-mail, or
 * document text enters this file or any fixture.
 *
 * The probes split in two kinds.
 * - Behavior rows assert what the spec and the binding PM decisions require.
 *   They pass at HEAD and guard the school safe path, the whole-label date
 *   rule, the caps, malformed inputs, and the money and date edges.
 * - Characterization rows pin a known, deferred edge that Review A r8 called
 *   nonblocking: a lone modifier line that is not in EXCLUDED_DATE_WORDS lets
 *   the next `Date:` field win. These rows make the gap measurable. They do
 *   not assert that the behavior is correct.
 */
import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import * as dp from "../document-parsing.js";

type ParseResult = {
  readonly status: string;
  readonly reason?: string;
  readonly draft?: Record<string, unknown>;
};

type ZipPart = { readonly name: string; readonly data: Buffer; readonly method: 0 | 8 };

/** Builds a minimal in-memory ZIP archive. */
function buildZip(parts: readonly ZipPart[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  const offsets: number[] = [];
  let offset = 0;
  for (const part of parts) {
    const name = Buffer.from(part.name, "utf8");
    const local = Buffer.alloc(30 + name.length + part.data.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(part.method, 8);
    local.writeUInt32LE(part.data.length, 18);
    local.writeUInt32LE(part.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    part.data.copy(local, 30 + name.length);
    locals.push(local);
    offsets.push(offset);
    offset += local.length;
  }
  let centralSize = 0;
  parts.forEach((part, index) => {
    const name = Buffer.from(part.name, "utf8");
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(part.method, 10);
    central.writeUInt32LE(part.data.length, 20);
    central.writeUInt32LE(part.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offsets[index] ?? 0, 42);
    name.copy(central, 46);
    centrals.push(central);
    centralSize += central.length;
  });
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(parts.length, 8);
  eocd.writeUInt16LE(parts.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, eocd]);
}

/** Builds a one-sheet workbook whose worksheet part is exactly `partBytes` bytes. */
function workbookWithPartSize(partBytes: number): Buffer {
  const prefix =
    '<worksheet><sheetData><row r="1">' +
    '<c r="A2" t="inlineStr"><is><t>OK</t></is></c></row>';
  const suffix = "</sheetData></worksheet>";
  const pad = partBytes - prefix.length - suffix.length - 7;
  const xml = prefix + `<!--${"x".repeat(pad)}-->` + suffix;
  expect(Buffer.byteLength(xml, "utf8")).toBe(partBytes);
  const parts: ZipPart[] = [
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(
        '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
        "utf8",
      ),
      method: 0,
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(
        '<workbook><sheets><sheet name="S" r:id="rId1"/></sheets></workbook>',
        "utf8",
      ),
      method: 0,
    },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(xml, "utf8"), method: 0 },
  ];
  return buildZip(parts);
}

/** Builds a minimal text PDF with one uncompressed content stream. */
function buildTextPdf(content: string): Uint8Array {
  const payload = Buffer.from(content, "latin1");
  const head = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Contents 4 0 R >>\nendobj\n" +
      `4 0 obj\n<< /Length ${payload.length} >>\nstream\r\n`,
    "latin1",
  );
  const tail = Buffer.from("\r\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n", "latin1");
  return new Uint8Array(Buffer.concat([head, payload, tail]));
}

/** Builds a minimal text PDF with one FlateDecode content stream. */
function buildFlatePdf(payload: Buffer): Uint8Array {
  const head = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Contents 4 0 R >>\nendobj\n" +
      `4 0 obj\n<< /Length ${payload.length} /Filter /FlateDecode >>\nstream\r\n`,
    "latin1",
  );
  const tail = Buffer.from("\r\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n", "latin1");
  return new Uint8Array(Buffer.concat([head, payload, tail]));
}

/** Asserts a review-list result with no draft and returns the reason. */
function expectReview(result: ParseResult): string {
  expect(result.status).toBe("review");
  expect(String(result.reason)).toMatch(/^review:/);
  expect("draft" in result).toBe(false);
  return String(result.reason);
}

/** Fake voucher payslip text with the supplied date lines. */
function voucherPdf(dateLines: readonly string[]): string {
  return [
    "Test Company Ltd.",
    "ใบสำคัญจ่าย/PAYMENT  VOUCHER",
    "Voucher No: PV69/8-001",
    "Payee: Test Counterparty",
    ...dateLines,
    "จำนวนเงิน 10,000.00",
    "Net total 10,000.00",
  ].join("\n");
}

/** Fake foreign vendor invoice text with the supplied date lines. */
function foreignText(dateLines: readonly string[]): string {
  return [
    "Test Company",
    ...dateLines,
    "DESCRIPTION",
    "work book size",
    "QTY 1000copies",
    "UNIT PRICE RMB10.0",
    "AMOUNT RMB10000",
  ].join("\n");
}

describe("ADV6 school safe path cannot be bypassed (PM 2026-11-20)", () => {
  const parsePdf = dp.parseSchoolInvoicePdf as (i: unknown) => ParseResult;
  const parseSheet = dp.parseSchoolInvoiceSheet as (i: unknown) => ParseResult;

  it("ADV6 null-text school PDF returns needs-model and no draft", () => {
    const result = parsePdf({ text: null });
    expect(result.status).toBe("needs-model");
    expect("draft" in result).toBe(false);
  });

  it.each([
    ["empty text", ""],
    ["full-width colon and two dates", "ใบแจ้งหนี้ / INVOICE\nDate： 31/10/2569\nDate: 15 Oct 2026\nTotal: THB 30,000.00"],
    ["Thai digit date", "ใบแจ้งหนี้ / INVOICE\nDate: ๓๑/๑๐/๒๕๖๙"],
    ["bare date only", "ใบแจ้งหนี้ / INVOICE\n15/10/2569"],
  ])("ADV6 school PDF with %s stays review:unreadable", (_label, text) => {
    const result = parsePdf({ text });
    expect(expectReview(result)).toBe("review:unreadable");
  });

  it.each([
    ["empty worksheets", []],
    [
      "hostile cells",
      [
        {
          name: "ใบแจ้งหนี้",
          cells: {
            A2: "ใบแจ้งหนี้ / INVOICE",
            B5: "PA-INV-FAKE-001",
            A10: "Date： 31/10/2569",
            A11: "Date: 15 Oct 2026",
          },
        },
      ],
    ],
  ])("ADV6 school sheet with %s stays review:unreadable", (_label, worksheets) => {
    const result = parseSheet({ worksheets });
    expect(expectReview(result)).toBe("review:unreadable");
  });
});

describe("ADV6 whole-label date and modifier join (B620, F1)", () => {
  const parseVoucher = dp.parsePaymentVoucherPdf as (i: unknown) => ParseResult;
  const parseForeign = dp.parseForeignVendorInvoice as (i: unknown) => ParseResult;

  it("ADV6 one-line prefixed label supplies nothing on the voucher path", () => {
    const result = parseVoucher({
      text: voucherPdf(["Shipping Date: 31/10/2569", "Date: 15/10/2569"]),
    });
    expect(result.status).toBe("parsed");
    expect(result.draft?.["date"]).toBe("2026-10-15");
  });

  it("ADV6 full-width colon is a valid own-field separator", () => {
    const result = parseVoucher({ text: voucherPdf(["Date： 15/10/2569"]) });
    expect(result.status).toBe("parsed");
    expect(result.draft?.["date"]).toBe("2026-10-15");
  });

  it("ADV6 a prefix joined by a non-breaking space supplies nothing", () => {
    const result = parseVoucher({
      text: voucherPdf(["Shipping\u00A0Date: 31/10/2569", "Date: 15/10/2569"]),
    });
    expect(result.status).toBe("parsed");
    expect(result.draft?.["date"]).toBe("2026-10-15");
  });

  it("ADV6 an excluded lone modifier (Shipment) cannot substitute a decoy date", () => {
    const result = parseVoucher({
      text: voucherPdf(["Shipment", "Date: 31/10/2569", "Date: 15/10/2569"]),
    });
    expect(result.status).toBe("parsed");
    expect(result.draft?.["date"]).toBe("2026-10-15");
  });

  it("ADV6 an excluded lone modifier (Delivery) cannot substitute a foreign decoy", () => {
    const result = parseForeign({
      text: foreignText(["Delivery", "DATE 2026.10.31", "DATE 2026.10.15"]),
    });
    expect(result.status).toBe("parsed");
    expect(result.draft?.["invoiceDate"]).toBe("2026-10-15");
  });

  it("ADV6 an unreadable own field gives review, never a null-date draft", () => {
    const result = parseVoucher({ text: voucherPdf(["Date: not a date"]) });
    expect(expectReview(result)).toBe("review:unreadable");
  });

  // Characterization of the known, deferred edge (Review A r8 nit). These rows
  // do NOT claim the behavior is correct. They pin it so a future fix is visible.
  it("ADV6 CHARACTERIZATION: lone Shipping lets a voucher decoy Date win", () => {
    const result = parseVoucher({
      text: voucherPdf(["Shipping", "Date: 31/10/2569", "Date: 15/10/2569"]),
    });
    expect(result.status).toBe("parsed");
    expect(result.draft?.["date"]).toBe("2026-10-31");
  });

  it("ADV6 CHARACTERIZATION: lone Expiry lets a foreign decoy DATE win", () => {
    const result = parseForeign({
      text: foreignText(["Expiry", "DATE 2026.10.31", "DATE 2026.10.15"]),
    });
    expect(result.status).toBe("parsed");
    expect(result.draft?.["invoiceDate"]).toBe("2026-10-31");
  });
});

describe("ADV6 cap boundaries", () => {
  const readWorkbook = dp.readWorkbook as (b: Uint8Array) => {
    readonly worksheets: ReadonlyArray<unknown>;
  };
  const parseVoucher = dp.parsePaymentVoucherPdf as (i: unknown) => ParseResult;

  it("ADV6 a ZIP stored part at the cap is read and one byte over is dropped", () => {
    const cap = dp.MAX_ZIP_ENTRY_BYTES;
    expect(cap).toBe(8 * 1024 * 1024);
    const atCap = readWorkbook(new Uint8Array(workbookWithPartSize(cap)));
    expect(atCap.worksheets).toHaveLength(1);
    const overCap = readWorkbook(new Uint8Array(workbookWithPartSize(cap + 1)));
    expect(overCap.worksheets).toHaveLength(0);
  });

  it("ADV6 a PDF text layer at the char cap is kept and one byte over is dropped", () => {
    const cap = dp.MAX_PDF_TEXT_CHARS;
    expect(cap).toBe(1048576);
    // The value is printed inside a Tj string; total stream bytes track the text.
    const atCap = dp.readTextPdf(buildTextPdf(`BT (${"V".repeat(cap - 32)}) Tj ET`));
    expect(atCap.text === null).toBe(false);
    expect(atCap.text?.length).toBe(cap - 32);
    const overCap = dp.readTextPdf(buildTextPdf(`BT (${"V".repeat(cap + 32)}) Tj ET`));
    expect(overCap.text === null).toBe(true);
  });

  it("ADV6 an over-cap FlateDecode stream gives null text", () => {
    const cap = dp.MAX_PDF_TEXT_CHARS;
    const payload = deflateSync(Buffer.from("V".repeat(cap + 64 * 1024), "latin1"));
    const result = dp.readTextPdf(buildFlatePdf(payload));
    expect(result.text === null).toBe(true);
  });

  it("ADV6 a 4096-char date line is read and 4097 supplies nothing", () => {
    const field = "Date: 15/10/2569";
    const at = field + ";" + "x".repeat(4096 - field.length - 1);
    const over = field + ";" + "x".repeat(4097 - field.length - 1);
    expect(at.length).toBe(4096);
    expect(over.length).toBe(4097);
    expect(parseVoucher({ text: voucherPdf([at]) }).draft?.["date"]).toBe("2026-10-15");
    expect(expectReview(parseVoucher({ text: voucherPdf([over]) }))).toBe("review:unreadable");
  });

  it("ADV6 64 fields on the date line are read and 65 supply nothing", () => {
    const f64 = Array.from({ length: 63 }, () => "filler").join(";") + ";Date: 15/10/2569";
    const f65 = Array.from({ length: 64 }, () => "filler").join(";") + ";Date: 15/10/2569";
    expect(parseVoucher({ text: voucherPdf([f64]) }).draft?.["date"]).toBe("2026-10-15");
    expect(expectReview(parseVoucher({ text: voucherPdf([f65]) }))).toBe("review:unreadable");
  });
});

describe("ADV6 malformed inputs never yield a partial draft", () => {
  const readWorkbook = dp.readWorkbook as (b: Uint8Array) => {
    readonly worksheets: ReadonlyArray<unknown>;
  };

  it("ADV6 a non-ZIP byte string gives an empty workbook", () => {
    const workbook = readWorkbook(new Uint8Array(Buffer.from("not a zip")));
    expect(workbook.worksheets).toHaveLength(0);
  });

  it("ADV6 a non-PDF byte string gives null text", () => {
    const result = dp.readTextPdf(new Uint8Array(Buffer.from("not a pdf")));
    expect(result.text === null).toBe(true);
  });

  it("ADV6 an XML character reference above 0x10FFFF drops the workbook", () => {
    const xml =
      '<worksheet><sheetData><row r="1">' +
      '<c r="A2" t="s"><v>0</v></c>' +
      "</row></sheetData></worksheet>";
    const bytes = buildZip([
      {
        name: "xl/sharedStrings.xml",
        data: Buffer.from("<sst><si><t>A&#x110FFFF;B</t></si></sst>", "utf8"),
        method: 0,
      },
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(xml, "utf8"),
        method: 0,
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        data: Buffer.from(
          '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
          "utf8",
        ),
        method: 0,
      },
      {
        name: "xl/workbook.xml",
        data: Buffer.from(
          '<workbook><sheets><sheet name="S" r:id="rId1"/></sheets></workbook>',
          "utf8",
        ),
        method: 0,
      },
    ]);
    expect(readWorkbook(new Uint8Array(bytes)).worksheets).toHaveLength(0);
  });
});

describe("ADV6 money and date edges", () => {
  it("ADV6 money schema enforces the 18-digit cap and rejects decimals", () => {
    const schema = dp.draftMoneySchema;
    expect(schema.safeParse("1".repeat(18)).success).toBe(true);
    expect(schema.safeParse("1".repeat(19)).success).toBe(false);
    expect(schema.safeParse("-500000").success).toBe(true);
    expect(schema.safeParse("100.00").success).toBe(false);
  });

  it.each([
    ["Buddhist year 2569 converts to 2026", "Date: 15/10/2569", "2026-10-15"],
    ["a valid date with a full-width colon", "Date： 15/10/2569", "2026-10-15"],
  ])("ADV6 %s reads correctly", (_label, line, expected) => {
    const result = dp.parsePaymentVoucherPdf({ text: voucherPdf([line]) }) as ParseResult;
    expect(result.status).toBe("parsed");
    expect(result.draft?.["date"]).toBe(expected);
  });

  it.each([
    ["out-of-range Buddhist year", "Date: 15/10/9999"],
    ["impossible calendar day", "Date: 32/10/2569"],
  ])("ADV6 %s goes to review, not a guessed date", (_label, line) => {
    const result = dp.parsePaymentVoucherPdf({ text: voucherPdf([line]) }) as ParseResult;
    expect(expectReview(result)).toBe("review:unreadable");
  });
});
