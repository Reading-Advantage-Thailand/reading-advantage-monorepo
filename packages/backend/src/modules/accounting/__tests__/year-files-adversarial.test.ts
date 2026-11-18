// @vitest-environment node
/**
 * Adversarial tests for Phase 10 of the track
 * `accounting_drive_intake_20261109` (PM-24, FR-28 to FR-31, spec section 9b).
 *
 * The goal of this file is to break the phase implementation, not to repeat
 * the Red rows. Each case names the defect it catches. The attacks:
 *
 * 1. Hostile text of the year-file parsers (`year-file-parsers.ts`,
 *    `parseWhtFilingPnd3` of `document-parsing.ts`): a Buddhist Era year out of
 *    range, a CE year in the place of a BE year, month 0 and month 13, a 1 MB
 *    text, zero-width and combining marks, Thai digits with a zero-width mark,
 *    two conflicting period labels, a type marker of one form with the layout
 *    of another, an empty text, and a misleading file name. Every case fails
 *    safe with `unmatched` and a reason, or parses the correct period. No case
 *    may throw and no case may store a wrong period (Review B F1002).
 * 2. The read path: `canReadYearFiles` over the five roles and an unknown,
 *    empty, lowercase, padded, or missing role; `listYearFileFacts` over zero
 *    rows, the company scope, a null period, and five tax-year groups. No
 *    write member may be called.
 * 3. The walk and the dry run: a case-variant duplicate subfolder name, a
 *    missing named subfolder, a name in the root and the parent, a file above
 *    the size limit (declared and downloaded), two byte-equal files with
 *    different names, and a third byte-equal file.
 *
 * Fake data only, marked `no real sample`. No real amount, tax id, payee,
 * person name, file name, or Drive id enters this file. The Drive ids are
 * `fake-drive-<n>`, the file names are `fake-file-<n>.pdf`, and the text is
 * synthetic with sentinel values only.
 *
 * Anti-pattern coverage:
 * - A3: each count is a labeled integer (`parser_rows`, `role_rows`,
 *   `write_calls`, `groups`, `duplicate_groups`).
 * - A4: the role list and the group list are non-empty literals with a guard
 *   assertion before the loop; the duplicate-group row asserts a group count of
 *   1 over three members, so a run with no file fails.
 * - A5: this header names the surfaces the rows read, and each failure names
 *   the behavior it proves.
 * - A7: the walk-error scan first asserts that the error message holds the
 *   folder name it scans for, so the scan can hold.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES,
  AccountingYearFileFolderError,
  YEAR_FILE_FOLDER_NAMES,
  YEAR_FILE_PARENT_FOLDER_NAME,
  dryRunAccountingYearFiles,
  walkAccountingYearFiles,
  type AccountingDriveFile,
  type AccountingYearFileFactsRecord,
  type AccountingYearFileIntakeRepository,
  type AccountingYearFileSourcePort,
} from "../intake.js";
import { canReadYearFiles } from "../permissions.js";
import { AccountingSubmissionError, type AccountingActor } from "../submissions.js";
import { listYearFileFacts } from "../year-files.js";
import { parseWhtFilingPnd3 } from "../document-parsing.js";
import { parseYearFile } from "../year-file-parsers.js";

/** Fake company id of every fixture. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Second fake company id; a foreign scope never reads rows of the first. */
const OTHER_COMPANY_ID = "44444444-4444-4444-8444-444444444444";
/** Fake account id of the reader. */
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
/** MIME type of a Drive folder. */
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
/** MIME type of every fake year file. */
const PDF_MIME_TYPE = "application/pdf";

/** The five roles of the accounting app; the read gate admits two. */
const ROLE_ROWS = [
  { role: "OWNER", admitted: true },
  { role: "ACCOUNTANT", admitted: true },
  { role: "CEO", admitted: false },
  { role: "STAFF", admitted: false },
  { role: "CONTRACTOR", admitted: false },
] as const;

/** The write members of the intake repository port. */
const WRITE_MEMBERS: ReadonlySet<string> = new Set([
  "insert",
  "insertYearFileFacts",
  "update",
  "upsert",
  "save",
  "put",
  "delete",
  "remove",
  "markParsed",
  "markYearFileParsed",
  "markFailed",
  "markDuplicate",
  "markDuplicateOfIntakeDocument",
  "bumpSighting",
]);

/** A synthetic PND.1 monthly text with the sentinels of the fixture rule. */
const PND1_TEXT = [
  "no real sample",
  "แบบ ภ.ง.ด.1 รายการภาษีที่หัก ณ ที่จ่าย ประจำเดือน",
  "ประจำเดือนที่ 1 มกราคม 2568",
  "ช่วงเวลา 1 มกราคม 2568 ถึง 31 มกราคม 2568",
  "จำนวนผู้มีรายได้ (ราย): 12",
  "เงินที่จ่ายทั้งสิ้น (บาท): 1,234.56",
  "ภาษีที่หักได้ (บาท): 100.00",
].join("\n");

/** A synthetic PND.3 monthly text with a real-wording month block. */
const PND3_REAL_BLOCK_TEXT = [
  "no real sample",
  "แบบ ภ.ง.ด.3 รายการภาษีที่หัก ณ ที่จ่าย",
  "เดือนที่จ่ายเงินได้พึงประเมิน",
  "พ.ศ. 2568",
  "(1) มกราคม (2) กุมภาพันธ์",
  "(3) มีนาคม",
  "ü (4) เมษายน",
  "(5) พฤษภาคม (6) มิถุนายน",
  "(7) กรกฎาคม (8) สิงหาคม",
  "(9) กันยายน (10) ตุลาคม",
  "(11) พฤศจิกายน (12) ธันวาคม",
].join("\n");

/** A synthetic PND.3 text whose period comes from the old label only. */
const PND3_OLD_LABEL_TEXT = [
  "no real sample",
  "แบบ ภ.ง.ด.3 รายการภาษีที่หัก ณ ที่จ่าย ประจำเดือน",
  "ประจำเดือนที่ 3 มีนาคม 2568",
  "ช่วงเวลา 1 มีนาคม 2568 ถึง 31 มีนาคม 2568",
  "จำนวนผู้มีรายได้ (ราย): 9",
].join("\n");

/** A synthetic PND.50 text with an accounting-period range. */
const PND50_TEXT = [
  "no real sample",
  "แบบ ภ.ง.ด.50 รายการภาษีเงินได้นิติบุคคล",
  "รอบระยะเวลาบัญชี 1 มกราคม 2567 ถึง 31 ธันวาคม 2567",
  "กำไรสุทธิ (บาท): 1,234.56",
  "ภาษีที่ต้องชำระ (บาท): 100.00",
].join("\n");

/** One temp folder per dry-run row; removed after the file. */
const tempDirs: string[] = [];

/**
 * Creates one temp report folder.
 * @returns The absolute folder path.
 */
function makeReportDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "year-files-adversarial-"));
  tempDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/**
 * Asserts that one hostile text fails safe: unmatched, with a reason, and with
 * no period or tax year. A throw already fails the row.
 * @param result The parser result.
 * @param caseName The hostile case, for the failure message.
 */
function expectSafeUnmatched(
  result: ReturnType<typeof parseYearFile>,
  caseName: string,
): void {
  expect(result.status, `${caseName}: must not parse`).toBe("unmatched");
  expect(
    ["period-unreadable", "type-unmatched"],
    `${caseName}: must name a reason`,
  ).toContain(result.unmatchedReason);
  expect(result.unmatchedReason, `${caseName}: reason must not be null`).not.toBeNull();
  expect(result.periodStart, `${caseName}: no period start`).toBeNull();
  expect(result.periodEnd, `${caseName}: no period end`).toBeNull();
  expect(result.taxYear, `${caseName}: no tax year`).toBeNull();
  expect(result.facts, `${caseName}: no facts`).toBeNull();
}

describe("year-file parsers, hostile text (F1002)", () => {
  it("rejects a BE year below the floor of the range: 2400", () => {
    const text = PND1_TEXT.replace(/2568/gu, "2400");
    expectSafeUnmatched(parseWhtFilingPnd3({ text }), "BE 2400");
    expectSafeUnmatched(parseYearFile({ text }), "BE 2400, dispatch");
  });

  it("rejects a BE year just below the floor: 2499", () => {
    expectSafeUnmatched(
      parseYearFile({ text: PND1_TEXT.replace(/2568/gu, "2499") }),
      "BE 2499",
    );
  });

  it("rejects a BE year above the ceiling: 2701", () => {
    expectSafeUnmatched(
      parseYearFile({ text: PND1_TEXT.replace(/2568/gu, "2701") }),
      "BE 2701",
    );
  });

  it("pins the inclusive ceiling: BE 2700 reads as CE 2157, never 2700", () => {
    const result = parseYearFile({ text: PND1_TEXT.replace(/2568/gu, "2700") });
    expect(result.status, "BE 2700 is inside the accepted range").toBe("parsed");
    expect(result.taxYear, "the stored year is CE and not the BE value").toBe(2157);
    expect(result.sourceMonth).toBe("2157-01");
    expect(result.periodStart).toBe("2157-01-01");
    expect(result.periodEnd).toBe("2157-01-31");
  });

  it("never reads a CE year in the place of a BE year", () => {
    const result = parseYearFile({ text: PND1_TEXT.replace(/2568/gu, "2024") });
    expectSafeUnmatched(result, "CE 2024 in a BE field");
    expect(result.taxYear, "a CE year never becomes 1481").not.toBe(1481);
  });

  it("rejects month 0 and month 13 of the old monthly label", () => {
    const month0 = parseWhtFilingPnd3({
      text: PND1_TEXT.replace("ภ.ง.ด.1", "ภ.ง.ด.3").replace("ประจำเดือนที่ 1", "ประจำเดือนที่ 0"),
    });
    const month13 = parseWhtFilingPnd3({
      text: PND1_TEXT.replace("ภ.ง.ด.1", "ภ.ง.ด.3").replace("ประจำเดือนที่ 1", "ประจำเดือนที่ 13"),
    });
    expectSafeUnmatched(month0, "month 0 of the label");
    expectSafeUnmatched(month13, "month 13 of the label");
  });

  it("rejects month 0 and month 13 of the real PND.1 period line", () => {
    const withPeriodLine = (line: string) =>
      [
        "no real sample",
        "แบบ ภ.ง.ด.1 รายการภาษีที่หัก ณ ที่จ่าย",
        "เดือน/ปีภาษี",
        line,
      ].join("\n");
    expectSafeUnmatched(parseYearFile({ text: withPeriodLine("0/2568") }), "0/2568");
    expectSafeUnmatched(parseYearFile({ text: withPeriodLine("13/2568") }), "13/2568");
  });

  it("fails safe on a 1 MB text that holds a type marker and no period", () => {
    const mega = "ภ.ง.ด.3 ".repeat(Math.ceil(1_048_576 / 9));
    const result = parseYearFile({ text: `no real sample\n${mega}` });
    expectSafeUnmatched(result, "1 MB marker text");
    expect(result.unmatchedReason, "the type is known and the period is not").toBe(
      "period-unreadable",
    );
  });

  it("parses a valid text with 1 MB of trailing filler", () => {
    const filler = "x".repeat(1_048_576);
    const result = parseYearFile({ text: `${PND3_OLD_LABEL_TEXT}\n${filler}` });
    expect(result.status, "the filler after the period changes nothing").toBe("parsed");
    expect(result.typeKey).toBe("wht-filing-pnd3");
    expect(result.sourceMonth).toBe("2025-03");
    expect(result.periodEnd).toBe("2025-03-31");
  });

  it("fails safe on a zero-width space inside the month name", () => {
    const text = PND1_TEXT.replace("มกราคม", "มกรา\u200Bคม");
    expectSafeUnmatched(parseYearFile({ text }), "zero-width in the month");
  });

  it("fails safe on a zero-width space inside the year digits", () => {
    const text = PND1_TEXT.replace(/2568/gu, "25\u200B68");
    expectSafeUnmatched(parseYearFile({ text }), "zero-width in the year");
  });

  it("fails safe on a combining mark inside a Thai month name", () => {
    const text = PND1_TEXT.replace("มกราคม", "มกรา\u0301คม");
    expectSafeUnmatched(parseYearFile({ text }), "combining mark in the month");
  });

  it("fails safe on Thai digits with a zero-width mark in the year", () => {
    const text = PND1_TEXT.replace(/2568/gu, "๒๕\u200B๖๘").replace(
      "ประจำเดือนที่ 1 มกราคม",
      "ประจำเดือนที่ ๑ มกราคม",
    );
    expectSafeUnmatched(parseYearFile({ text }), "Thai digits with a mark");
  });

  it("gives the old label precedence over a conflicting real month block", () => {
    const text = [
      PND3_OLD_LABEL_TEXT,
      PND3_REAL_BLOCK_TEXT.split("\n").slice(1).join("\n"),
    ].join("\n");
    const result = parseYearFile({ text });
    expect(result.status).toBe("parsed");
    expect(result.typeKey).toBe("wht-filing-pnd3");
    expect(result.periodStart, "the old label month is March").toBe("2025-03-01");
    expect(result.periodEnd).toBe("2025-03-31");
    expect(result.sourceMonth, "the April tick never wins").not.toBe("2025-04");
  });

  it("gives the first accounting-period range precedence over a later one", () => {
    const text = [
      PND50_TEXT,
      "รอบระยะเวลาบัญชี 1 กุมภาพันธ์ 2569 ถึง 28 กุมภาพันธ์ 2569",
    ].join("\n");
    const result = parseYearFile({ text });
    expect(result.status).toBe("parsed");
    expect(result.typeKey).toBe("corporate-tax-pnd50");
    expect(result.taxYear, "the first range is 2567 BE and 2024 CE").toBe(2024);
    expect(result.periodEnd).toBe("2024-12-31");
  });

  it("does not parse a PND.50 marker with the layout of a monthly PND.1", () => {
    const text = PND1_TEXT.replace("ภ.ง.ด.1", "ภ.ง.ด.50");
    const result = parseYearFile({ text });
    expectSafeUnmatched(result, "PND.50 marker, monthly layout");
    expect(result.unmatchedReason, "the PND.50 period label is absent").toBe(
      "period-unreadable",
    );
    expect(result.typeKey, "no type is stored for an unmatched text").toBeNull();
  });

  it("does not parse a PND.1 marker with the layout of the annual PND.1A", () => {
    const text = [
      "no real sample",
      "แบบ ภ.ง.ด.1 รายการเงินได้ที่จ่าย ภาษีที่หัก และเงินภาษีที่นำส่ง ประจำปี",
      "ประจำปี 2568",
      "รอบระยะเวลา 1 มกราคม 2568 ถึง 31 ธันวาคม 2568",
    ].join("\n");
    expectSafeUnmatched(parseYearFile({ text }), "PND.1 marker, annual layout");
  });

  it("gives type-unmatched for an empty text and a whitespace text", () => {
    for (const text of ["", "   ", "\n\t\n"]) {
      const result = parseYearFile({ text });
      expectSafeUnmatched(result, JSON.stringify(text));
      expect(result.unmatchedReason, "an unknown text holds no type").toBe(
        "type-unmatched",
      );
    }
  });

  it("reads the type and the period from the text only, never from a name", () => {
    const fromText = parseYearFile({
      text: PND3_OLD_LABEL_TEXT,
      fileName: "no-real-sample-pnd1.pdf",
      folderName: YEAR_FILE_FOLDER_NAMES[0],
    });
    expect(fromText.status).toBe("parsed");
    expect(fromText.typeKey, "the name never overrides the text").toBe(
      "wht-filing-pnd3",
    );
    expect(fromText.sourceMonth).toBe("2025-03");

    const nameOnly = parseYearFile({
      text: "no real sample",
      fileName: "no-real-sample-pnd50-2567.pdf",
      folderName: YEAR_FILE_FOLDER_NAMES[0],
    });
    expectSafeUnmatched(nameOnly, "a name with no text marker");
  });
});

/** One fake intake row as the read path sees it. */
interface ReadFakeIntakeRow {
  readonly id: string;
  readonly isHistory: boolean;
  readonly historySource: string;
  readonly evidenceReference: string;
}

/** One fake read repository and its records. */
interface ReadFake {
  readonly repository: AccountingYearFileIntakeRepository;
  readonly calls: string[];
  readonly scopes: unknown[];
}

/**
 * Builds a fake intake repository. The two read members answer the fake rows.
 * Every other member is recorded and returns undefined.
 * @param input The facts rows and the intake rows.
 * @returns The port, its call names, and its scope arguments.
 */
function createReadRepository(input: {
  readonly factsRows: readonly AccountingYearFileFactsRecord[];
  readonly intakeRows: readonly ReadFakeIntakeRow[];
}): ReadFake {
  const calls: string[] = [];
  const scopes: unknown[] = [];
  const repository = new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== "string" || property === "then") return undefined;
        const member = property;
        return (...args: unknown[]) => {
          calls.push(member);
          scopes.push(args[0]);
          if (member === "listYearFileFactsByScope") {
            return Promise.resolve(input.factsRows);
          }
          if (member === "listByScope") {
            return Promise.resolve(input.intakeRows);
          }
          return undefined;
        };
      },
    },
  );
  return {
    repository: repository as unknown as AccountingYearFileIntakeRepository,
    calls,
    scopes,
  };
}

/**
 * Builds one actor.
 * @param role The role claim.
 * @returns The actor.
 */
function actorWith(role: string): AccountingActor {
  return { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role };
}

/**
 * Builds one fake facts row.
 * @param input The parts that differ between rows.
 * @returns The facts row.
 */
function factsRow(input: {
  readonly intakeDocumentId: string;
  readonly formType: AccountingYearFileFactsRecord["formType"];
  readonly taxYear: number;
  readonly periodStart?: string | null;
  readonly periodEnd?: string | null;
}): AccountingYearFileFactsRecord {
  const start = "periodStart" in input ? input.periodStart : `${input.taxYear}-01-01`;
  const end = "periodEnd" in input ? input.periodEnd : `${input.taxYear}-12-31`;
  return {
    intakeDocumentId: input.intakeDocumentId,
    formType: input.formType,
    filingKind: "form",
    periodKind: "year",
    periodStart: start as string,
    periodEnd: end as string,
    taxYear: input.taxYear,
    facts: { lineCount: 7 },
  };
}

describe("the year-file read path", () => {
  it("admits two of the five roles and refuses three, by role alone", () => {
    expect(ROLE_ROWS, "role_rows=5").toHaveLength(5);
    expect(ROLE_ROWS.filter((row) => row.admitted), "read_roles_allowed=2").toHaveLength(2);
    expect(ROLE_ROWS.filter((row) => !row.admitted), "read_roles_refused=3").toHaveLength(3);
    for (const row of ROLE_ROWS) {
      expect(
        canReadYearFiles(actorWith(row.role)),
        `canReadYearFiles must ${row.admitted ? "admit" : "refuse"} ${row.role}`,
      ).toBe(row.admitted);
    }
  });

  it("refuses an unknown, empty, lowercase, padded, or missing role", () => {
    const roleClaims: readonly (string | undefined)[] = [
      "ADMIN",
      "",
      "owner",
      " OWNER",
      "OWNER ",
      undefined,
    ];
    expect(roleClaims, "role_claims=6").toHaveLength(6);
    for (const role of roleClaims) {
      const actor = {
        accountId: ACCOUNT_ID,
        companyId: COMPANY_ID,
        role: role as string,
      };
      expect(
        canReadYearFiles(actor),
        `canReadYearFiles must refuse the role claim ${JSON.stringify(role)}`,
      ).toBe(false);
    }
  });

  it("returns no group for a company with zero rows", async () => {
    const fake = createReadRepository({ factsRows: [], intakeRows: [] });
    const groups = await listYearFileFacts({
      repository: fake.repository,
      actor: actorWith("OWNER"),
    });
    expect(groups, "zero facts rows give zero groups").toEqual([]);
    expect(fake.calls, "both read members run once").toHaveLength(2);
  });

  it("binds the company scope on both reads and calls no write member", async () => {
    const facts = [factsRow({ intakeDocumentId: "row-1", formType: "wht-filing-pnd1", taxYear: 2024 })];
    const fake = createReadRepository({
      factsRows: facts,
      intakeRows: [
        {
          id: "row-1",
          isHistory: true,
          historySource: "document",
          evidenceReference: "private-evidence://fake-scope/fake-object",
        },
      ],
    });
    await listYearFileFacts({ repository: fake.repository, actor: actorWith("ACCOUNTANT") });
    expect(
      fake.calls.slice().sort(),
      "the read calls exactly the two read members",
    ).toEqual(["listByScope", "listYearFileFactsByScope"]);
    expect(fake.scopes, "scope_calls=2").toHaveLength(2);
    for (const scope of fake.scopes) {
      expect(scope, "the scope is the session company and nothing else").toEqual({
        companyId: COMPANY_ID,
      });
    }
    expect(
      fake.calls.filter((member) => WRITE_MEMBERS.has(member)),
      "write_calls=0",
    ).toEqual([]);
    expect(
      fake.calls.every((member) => !member.includes(OTHER_COMPANY_ID)),
      "no call carries the other company",
    ).toBe(true);
  });

  it("refuses the CEO before any repository member runs", async () => {
    const fake = createReadRepository({ factsRows: [], intakeRows: [] });
    let caught: unknown;
    try {
      await listYearFileFacts({ repository: fake.repository, actor: actorWith("CEO") });
    } catch (error) {
      caught = error;
    }
    expect(caught, "a CEO read must throw").toBeInstanceOf(AccountingSubmissionError);
    expect((caught as AccountingSubmissionError).reason).toBe("forbidden");
    expect(fake.calls, "no repository member runs for a refused actor").toEqual([]);
  });

  it("lists a facts row whose period is null without a crash", async () => {
    const facts = [
      factsRow({
        intakeDocumentId: "row-null",
        formType: "general-ledger",
        taxYear: 2024,
        periodStart: null,
        periodEnd: null,
      }),
    ];
    const fake = createReadRepository({ factsRows: facts, intakeRows: [] });
    const groups = await listYearFileFacts({
      repository: fake.repository,
      actor: actorWith("OWNER"),
    });
    expect(groups, "groups=1").toHaveLength(1);
    expect(groups[0]?.rows, "rows=1").toHaveLength(1);
    expect(groups[0]?.rows[0]?.periodStart, "a null period stays null").toBeNull();
    expect(groups[0]?.rows[0]?.periodEnd).toBeNull();
    expect(groups[0]?.taxYear, "the group year comes from the row").toBe(2024);
    expect(groups[0]?.rows[0]?.isHistory, "a row without intake data is no history").toBe(
      false,
    );
    expect(groups[0]?.rows[0]?.evidenceReference).toBe("");
  });

  it("groups rows of five tax-year and form-type pairs, in order", async () => {
    const facts = [
      factsRow({ intakeDocumentId: "a1", formType: "wht-filing-pnd1", taxYear: 2024 }),
      factsRow({ intakeDocumentId: "a2", formType: "wht-filing-pnd1", taxYear: 2024 }),
      factsRow({ intakeDocumentId: "b1", formType: "year-end-financial-statement", taxYear: 2024 }),
      factsRow({ intakeDocumentId: "c1", formType: "wht-filing-pnd1", taxYear: 2025 }),
      factsRow({ intakeDocumentId: "d1", formType: "corporate-tax-pnd50", taxYear: 2025 }),
      factsRow({ intakeDocumentId: "d2", formType: "corporate-tax-pnd50", taxYear: 2025 }),
      factsRow({ intakeDocumentId: "e1", formType: "general-ledger", taxYear: 2026 }),
    ];
    const fake = createReadRepository({ factsRows: facts, intakeRows: [] });
    const groups = await listYearFileFacts({
      repository: fake.repository,
      actor: actorWith("OWNER"),
    });
    expect(groups, "groups=5").toHaveLength(5);
    expect(groups.map((group) => group.taxYear)).toEqual([2024, 2024, 2025, 2025, 2026]);
    expect(groups.map((group) => group.formType)).toEqual([
      "wht-filing-pnd1",
      "year-end-financial-statement",
      "wht-filing-pnd1",
      "corporate-tax-pnd50",
      "general-ledger",
    ]);
    expect(groups.map((group) => group.rows.length)).toEqual([2, 1, 1, 2, 1]);
    expect(groups.map((group) => group.rows.map((row) => row.intakeDocumentId))).toEqual([
      ["a1", "a2"],
      ["b1"],
      ["c1"],
      ["d1", "d2"],
      ["e1"],
    ]);
  });
});

/** One fake Drive entry. */
interface FakeEntry {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly byteSize?: number;
}

/** One fake Drive file with its bytes. */
interface FakeFile extends FakeEntry {
  readonly body: Uint8Array;
}

/** The recorded calls of one fake Drive source. */
interface FakeSourceCalls {
  readonly list: string[];
  readonly listFolderEntries: string[];
  readonly download: string[];
  readonly export: string[];
}

/** The fake root folder id; no real Drive id enters this file. */
const ROOT_ID = "fake-drive-root";
/** The fake parent folder id; no real Drive id enters this file. */
const PARENT_ID = "fake-drive-parent";
/** The five fake subfolder ids, in the order of the constant. */
const SUB_IDS = YEAR_FILE_FOLDER_NAMES.map((_name, index) => `fake-drive-sub-${index}`);

/**
 * Builds the standard five-subfolder layout with empty folders.
 * @returns The folder map.
 */
function standardLayout(): Map<string, FakeEntry[]> {
  const layout = new Map<string, FakeEntry[]>();
  layout.set(ROOT_ID, [
    { id: PARENT_ID, name: YEAR_FILE_PARENT_FOLDER_NAME, mimeType: FOLDER_MIME_TYPE },
    { id: SUB_IDS[0] ?? "", name: YEAR_FILE_FOLDER_NAMES[0], mimeType: FOLDER_MIME_TYPE },
  ]);
  layout.set(
    PARENT_ID,
    YEAR_FILE_FOLDER_NAMES.slice(1).map((name, index) => ({
      id: SUB_IDS[index + 1] ?? "",
      name,
      mimeType: FOLDER_MIME_TYPE,
    })),
  );
  for (const id of SUB_IDS) layout.set(id, []);
  return layout;
}

/**
 * Builds one fake file.
 * @param index Serial of the file.
 * @param text The fake text; it becomes the bytes.
 * @param name The fake file name.
 * @param declaredSize Optional declared size; the default is the byte length.
 * @returns The fake file.
 */
function makeFile(
  index: number,
  text: string,
  name = `fake-file-${index}.pdf`,
  declaredSize?: number,
): FakeFile {
  const body = Buffer.from(text, "utf8");
  return {
    id: `fake-drive-${index}`,
    name,
    mimeType: PDF_MIME_TYPE,
    byteSize: declaredSize ?? body.byteLength,
    body,
  };
}

/**
 * Builds one fake Drive source over a folder map.
 * @param layout The listing of each folder id.
 * @param files The files with their bytes.
 * @returns The port and its recorded calls.
 */
function createFakeSource(
  layout: ReadonlyMap<string, readonly FakeEntry[]>,
  files: readonly FakeFile[],
): { source: AccountingYearFileSourcePort; calls: FakeSourceCalls } {
  const bytesById = new Map(files.map((file) => [file.id, file.body]));
  const calls: FakeSourceCalls = {
    list: [],
    listFolderEntries: [],
    download: [],
    export: [],
  };
  const source: AccountingYearFileSourcePort = {
    /** Lists one folder and keeps folders out, as the poll does. */
    async list(input: { readonly folderId: string }): Promise<readonly AccountingDriveFile[]> {
      calls.list.push(input.folderId);
      return (layout.get(input.folderId) ?? []).filter(
        (entry) => entry.mimeType !== FOLDER_MIME_TYPE,
      );
    },
    /** Lists one folder and keeps folders in, as the walk needs. */
    async listFolderEntries(input: {
      readonly folderId: string;
    }): Promise<readonly AccountingDriveFile[]> {
      calls.listFolderEntries.push(input.folderId);
      return layout.get(input.folderId) ?? [];
    },
    /** Returns the fake bytes of one file. */
    async download(input: { readonly fileId: string }): Promise<Uint8Array> {
      calls.download.push(input.fileId);
      return bytesById.get(input.fileId) ?? new Uint8Array();
    },
    /** Returns the fake bytes of one exported file. */
    async export(input: { readonly fileId: string }): Promise<Uint8Array> {
      calls.export.push(input.fileId);
      return bytesById.get(input.fileId) ?? new Uint8Array();
    },
  };
  return { source, calls };
}

/**
 * Builds the dry-run request over one folder map.
 * @param input The folder map, the files, and the text per file id.
 * @returns The request and the text-layer read records.
 */
function createDryRunRequest(input: {
  readonly layout: ReadonlyMap<string, readonly FakeEntry[]>;
  readonly files: readonly FakeFile[];
  readonly texts: ReadonlyMap<string, string | null>;
  readonly reportDir: string;
}): {
  request: Parameters<typeof dryRunAccountingYearFiles>[0];
  textReads: string[];
  drive: FakeSourceCalls;
} {
  const textReads: string[] = [];
  const { source, calls } = createFakeSource(input.layout, input.files);
  const request = {
    actor: actorWith("ACCOUNTANT"),
    folderId: ROOT_ID,
    source,
    textLayer: {
      async read(readInput: { readonly body: Uint8Array }) {
        textReads.push(String(readInput.body.byteLength));
        const key = String(readInput.body.byteLength);
        return { text: input.texts.get(key) ?? null };
      },
    },
    submissionRepository: {} as never,
    localReader: {} as never,
    extraction: {} as never,
    reportDir: input.reportDir,
  };
  return { request, textReads, drive: calls };
}

/**
 * Parses the data rows of one dry-run report.
 * @param report The report text.
 * @returns One field record per data row, in order.
 */
function reportRows(report: string): Array<Record<string, string>> {
  return report
    .split("\n")
    .filter((line) => line.startsWith("file-"))
    .map((line) => {
      const parts = line.split(" | ");
      const fields: Record<string, string> = { serial: parts[0] ?? "" };
      for (const part of parts.slice(1)) {
        const at = part.indexOf("=");
        fields[part.slice(0, at)] = part.slice(at + 1);
      }
      return fields;
    });
}

describe("the year-file walk, hostile listings", () => {
  it("ignores a case-variant duplicate subfolder name and reads the exact folder", async () => {
    const layout = standardLayout();
    const exactFile = makeFile(1, PND3_OLD_LABEL_TEXT);
    const variantId = "fake-drive-variant";
    const variantFile = makeFile(2, PND3_OLD_LABEL_TEXT);
    layout.set(SUB_IDS[0] ?? "", [exactFile]);
    layout.set(ROOT_ID, [
      { id: PARENT_ID, name: YEAR_FILE_PARENT_FOLDER_NAME, mimeType: FOLDER_MIME_TYPE },
      { id: SUB_IDS[0] ?? "", name: YEAR_FILE_FOLDER_NAMES[0], mimeType: FOLDER_MIME_TYPE },
      {
        id: variantId,
        name: "FWD: เอกสารปี 2567 (FWD: Document from 2024)",
        mimeType: FOLDER_MIME_TYPE,
      },
    ]);
    layout.set(variantId, [variantFile]);
    const { source, calls } = createFakeSource(layout, [exactFile, variantFile]);
    const files = await walkAccountingYearFiles({ folderId: ROOT_ID, source });
    expect(files, "files=1: only the exact folder is read").toHaveLength(1);
    expect(files[0]?.id).toBe("fake-drive-1");
    expect(
      calls.listFolderEntries,
      "the case variant is never listed: the match is exact",
    ).not.toContain(variantId);
  });

  it("stops with folder-missing for a missing named subfolder and leaks no id", async () => {
    const layout = standardLayout();
    const missing = YEAR_FILE_FOLDER_NAMES[4];
    layout.set(
      PARENT_ID,
      (layout.get(PARENT_ID) ?? []).filter((entry) => entry.name !== missing),
    );
    const { source } = createFakeSource(layout, []);
    let caught: unknown;
    try {
      await walkAccountingYearFiles({ folderId: ROOT_ID, source });
    } catch (error) {
      caught = error;
    }
    expect(caught, "a missing name stops the walk").toBeInstanceOf(
      AccountingYearFileFolderError,
    );
    const error = caught as AccountingYearFileFolderError;
    expect(error.reason).toBe("folder-missing");
    expect(error.folderName).toBe(missing);
    expect(error.message, "guard: the message holds the name the scan looks for").toContain(
      missing,
    );
    expect(error.message, "no Drive id enters the message").not.toContain("fake-drive");
  });

  it("stops with folder-duplicate when one name sits in the root and the parent", async () => {
    const layout = standardLayout();
    layout.set(ROOT_ID, [
      ...(layout.get(ROOT_ID) ?? []),
      { id: "fake-drive-root-copy", name: YEAR_FILE_FOLDER_NAMES[1], mimeType: FOLDER_MIME_TYPE },
    ]);
    layout.set("fake-drive-root-copy", []);
    const { source } = createFakeSource(layout, []);
    let caught: unknown;
    try {
      await walkAccountingYearFiles({ folderId: ROOT_ID, source });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AccountingYearFileFolderError);
    expect((caught as AccountingYearFileFolderError).reason).toBe("folder-duplicate");
    expect((caught as AccountingYearFileFolderError).folderName).toBe(
      YEAR_FILE_FOLDER_NAMES[1],
    );
  });
});

describe("the year-file dry run, hostile files", () => {
  it("lists a file above the declared size limit and downloads nothing", async () => {
    const layout = standardLayout();
    const big = makeFile(
      1,
      "no real sample",
      "fake-file-1.pdf",
      ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES + 1,
    );
    layout.set(SUB_IDS[0] ?? "", [big]);
    const { request, textReads, drive } = createDryRunRequest({
      layout,
      files: [big],
      texts: new Map(),
      reportDir: makeReportDir(),
    });
    const result = await dryRunAccountingYearFiles(request);
    const rows = reportRows(result.report);
    expect(rows, "the file is listed and not parsed").toHaveLength(1);
    expect(rows[0]?.type).toBe("unmatched");
    expect(rows[0]?.["text-layer"]).toBe("no");
    expect(rows[0]?.bytes).toBe(String(ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES + 1));
    expect(drive.download, "no download for a declared over-limit file").toEqual([]);
    expect(textReads, "no text read for a declared over-limit file").toEqual([]);
    expect(result.report, "count unmatched: 1").toContain("count unmatched: 1");
  });

  it("rechecks the limit on a downloaded body that lies about its size", async () => {
    const layout = standardLayout();
    const liar = makeFile(1, "no real sample", "fake-file-1.pdf", 10);
    const body = Buffer.alloc(ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES + 1, "x");
    layout.set(SUB_IDS[0] ?? "", [liar]);
    const { request, textReads, drive } = createDryRunRequest({
      layout,
      files: [{ ...liar, body }],
      texts: new Map(),
      reportDir: makeReportDir(),
    });
    const result = await dryRunAccountingYearFiles(request);
    const rows = reportRows(result.report);
    expect(rows, "the file is listed and not parsed").toHaveLength(1);
    expect(rows[0]?.type).toBe("unmatched");
    expect(rows[0]?.["text-layer"]).toBe("no");
    expect(rows[0]?.bytes, "the real byte length is listed").toBe(
      String(ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES + 1),
    );
    expect(drive.download, "the body is downloaded once to recheck the limit").toEqual([
      "fake-drive-1",
    ]);
    expect(textReads, "no text read above the limit").toEqual([]);
  });

  it("puts two byte-equal files with different names in one duplicate group", async () => {
    const layout = standardLayout();
    const first = makeFile(1, PND3_OLD_LABEL_TEXT, "fake-file-alpha.pdf");
    const second = makeFile(2, PND3_OLD_LABEL_TEXT, "fake-file-beta.pdf");
    const different = makeFile(3, PND50_TEXT, "fake-file-gamma.pdf");
    layout.set(SUB_IDS[0] ?? "", [first, second, different]);
    const { request } = createDryRunRequest({
      layout,
      files: [first, second, different],
      texts: new Map([
        [String(first.body.byteLength), PND3_OLD_LABEL_TEXT],
      ]),
      reportDir: makeReportDir(),
    });
    const result = await dryRunAccountingYearFiles(request);
    const rows = reportRows(result.report);
    expect(rows, "files=3").toHaveLength(3);
    expect(rows[0]?.["duplicate-group"], "the first copy joins the group").toBe("1");
    expect(rows[1]?.["duplicate-group"], "the second copy joins the group").toBe("1");
    expect(rows[2]?.["duplicate-group"], "a different file has no group").toBe("0");
    expect(result.report, "count duplicate groups: 1").toContain(
      "count duplicate groups: 1",
    );
  });

  it("keeps three byte-equal files in one duplicate group", async () => {
    const layout = standardLayout();
    const copies = [
      makeFile(1, PND3_OLD_LABEL_TEXT, "fake-file-one.pdf"),
      makeFile(2, PND3_OLD_LABEL_TEXT, "fake-file-two.pdf"),
      makeFile(3, PND3_OLD_LABEL_TEXT, "fake-file-three.pdf"),
    ];
    layout.set(SUB_IDS[0] ?? "", copies);
    const { request } = createDryRunRequest({
      layout,
      files: copies,
      texts: new Map([[String(copies[0]?.body.byteLength ?? 0), PND3_OLD_LABEL_TEXT]]),
      reportDir: makeReportDir(),
    });
    const result = await dryRunAccountingYearFiles(request);
    const rows = reportRows(result.report);
    expect(rows, "files=3").toHaveLength(3);
    expect(
      rows.map((row) => row["duplicate-group"]),
      "one group of three, never a second group",
    ).toEqual(["1", "1", "1"]);
    expect(result.report).toContain("count duplicate groups: 1");
  });

  it("writes the anonymized marker and no amount, name, or Drive id in the report", async () => {
    const layout = standardLayout();
    const file = makeFile(1, PND1_TEXT, "fake-file-sentinel-name.pdf");
    layout.set(SUB_IDS[0] ?? "", [file]);
    const { request } = createDryRunRequest({
      layout,
      files: [file],
      texts: new Map([[String(file.body.byteLength), PND1_TEXT]]),
      reportDir: makeReportDir(),
    });
    const result = await dryRunAccountingYearFiles(request);
    expect(result.report, "the marker line opens the report").toContain(
      "anonymized: no amount, no tax id, no payee, no file name, no Drive id",
    );
    expect(result.report, "no fake file name from the listing").not.toContain(
      "fake-file-sentinel-name.pdf",
    );
    expect(result.report, "no fake Drive id").not.toContain("fake-drive");
    expect(result.report, "no sentinel amount").not.toContain("1,234.56");
    expect(result.report, "no sentinel amount in satang form").not.toContain("123456");
  });
});
