/**
 * Red tests for the read-only year-end view of the track
 * `accounting_drive_intake_20261109` (plan task 10.8, FR-31, spec section 9b).
 *
 * The module `packages/backend/src/modules/accounting/year-files.ts` does not
 * exist at this base. The permissions module holds no `canReadYearFiles`
 * (fact Y11). Both surfaces load through soft loaders, so every row fails on
 * an assertion that names the missing export. No row fails on a load error.
 *
 * The contract this file pins for the Green task 10.9:
 *
 *   canReadYearFiles(actor: AccountingActor): boolean
 *     The OWNER and the ACCOUNTANT read the year files. The CEO, the STAFF,
 *     and the CONTRACTOR are refused. The check reads the role only. A
 *     display name never opens the view.
 *
 *   listYearFileFacts(request: {
 *     repository: <the intake repository port>,
 *     actor: AccountingActor,
 *   }): Promise<readonly YearFileFactsGroup[]>
 *
 *   YearFileFactsGroup = {
 *     taxYear: number,
 *     formType: string,
 *     rows: readonly YearFileFactRow[],
 *   }
 *
 *   YearFileFactRow = {
 *     intakeDocumentId: string,
 *     filingKind: string,
 *     periodKind: string,
 *     periodStart: string,
 *     periodEnd: string,
 *     facts: Record<string, unknown>,
 *     isHistory: boolean,
 *     historySource: string,
 *     evidenceReference: string,
 *   }
 *
 * The groups hold one entry per tax year and form type. The function reads the
 * rows through the repository port. It calls no write member.
 *
 * The repository is a fake. It answers every read member with the fake rows
 * and records every call. A row therefore fails on the result, not on a
 * member name.
 *
 * Fake rows only. The marker `no real sample` names the data. No real amount,
 * tax id, payee, person name, file name, or Drive id enters this file.
 *
 * Anti-pattern coverage:
 * - A3: every count is a labeled integer (`read_roles_allowed=2`,
 *   `read_roles_refused=3`, `tax_years=2`, `form_type_groups=2`,
 *   `write_calls=0`, `history_marker_rows=3`, `evidence_link_rows=3`).
 * - A4: the role list holds five roles. The guard row asserts the list size
 *   and the two role counts before any role row runs.
 * - A5: every failing row names the missing export.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import type { AccountingActor } from "../submissions.js";

const PERMISSIONS_SOURCE_PATH = fileURLToPath(
  new URL("../permissions.ts", import.meta.url),
);
const PERMISSIONS_MODULE_EXISTS = existsSync(PERMISSIONS_SOURCE_PATH);
const YEAR_FILES_SOURCE_PATH = fileURLToPath(
  new URL("../year-files.ts", import.meta.url),
);
const YEAR_FILES_MODULE_EXISTS = existsSync(YEAR_FILES_SOURCE_PATH);

type PermissionModule = Record<string, unknown>;
type YearFilesModule = Record<string, unknown>;
type ReadCheck = (actor: AccountingActor) => boolean;
type ListRequest = {
  readonly repository: unknown;
  readonly actor: AccountingActor;
};
type ListFunction = (request: ListRequest) => Promise<unknown>;

let permissions: PermissionModule = {};
let yearFiles: YearFilesModule = {};

beforeAll(async () => {
  if (PERMISSIONS_MODULE_EXISTS) {
    permissions = (await import("../permissions.js")) as PermissionModule;
  }
  if (YEAR_FILES_MODULE_EXISTS) {
    const href = new URL("../year-files.ts", import.meta.url).href;
    try {
      yearFiles = (await import(/* @vite-ignore */ href)) as YearFilesModule;
    } catch {
      yearFiles = {};
    }
  }
});

/** Fake company id of every fixture row. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake account id of every actor. */
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
/** Fake display name of the OWNER actor; the CEO actor carries it too. */
const OWNER_DISPLAY_NAME = "fake-owner-display";

/** The five roles of the read gate. */
const READ_ROLES = ["OWNER", "CEO", "ACCOUNTANT", "CONTRACTOR", "STAFF"] as const;
type ReadRole = (typeof READ_ROLES)[number];

/** The expected result of the read gate for each role. */
const READ_ROLE_EXPECTATIONS: Readonly<Record<ReadRole, boolean>> = {
  OWNER: true,
  CEO: false,
  ACCOUNTANT: true,
  CONTRACTOR: false,
  STAFF: false,
};

/** The display name of each actor; the CEO carries the OWNER display name. */
const READ_ROLE_DISPLAY_NAMES: Readonly<Record<ReadRole, string>> = {
  OWNER: OWNER_DISPLAY_NAME,
  CEO: OWNER_DISPLAY_NAME,
  ACCOUNTANT: "fake-accountant-display",
  CONTRACTOR: "fake-contractor-display",
  STAFF: "fake-staff-display",
};

/** One actor of the read gate, with the display name of its role. */
interface ReadActor extends AccountingActor {
  /** Display name of the session user; it never opens the view. */
  readonly name: string;
}

/**
 * Builds one actor of the read gate.
 * @param role Company role of the actor.
 * @returns The actor with the display name of its role.
 */
function buildActor(role: ReadRole): ReadActor {
  return {
    accountId: ACCOUNT_ID,
    companyId: COMPANY_ID,
    role,
    name: READ_ROLE_DISPLAY_NAMES[role],
  };
}

/** One fake year-file row of the repository (no real sample). */
interface FakeYearFileRow {
  readonly id: string;
  readonly intakeDocumentId: string;
  readonly formType: string;
  readonly documentType: string;
  readonly filingKind: string;
  readonly periodKind: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly taxYear: number;
  readonly facts: Readonly<Record<string, unknown>>;
  readonly isHistory: boolean;
  readonly historySource: string;
  readonly evidenceReference: string;
  readonly status: string;
  readonly sourceMonth: string;
  readonly submissionId: string | null;
  readonly driveFileId: string;
}

/** The three fake year-file rows of the fixture set (no real sample). */
const FAKE_YEAR_FILE_ROWS: readonly FakeYearFileRow[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    intakeDocumentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    formType: "wht-filing-pnd1",
    documentType: "wht-filing-pnd1",
    filingKind: "form",
    periodKind: "month",
    periodStart: "2024-01-01",
    periodEnd: "2024-01-31",
    taxYear: 2024,
    facts: { payeeCount: 3, totalPaid: 111 },
    isHistory: true,
    historySource: "document",
    evidenceReference:
      "private-evidence://33333333-3333-4333-8333-333333333333/year-files/0001",
    status: "parsed",
    sourceMonth: "2024-01",
    submissionId: null,
    driveFileId: "fake-drive-1",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    intakeDocumentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    formType: "year-end-financial-statement",
    documentType: "year-end-financial-statement",
    filingKind: "statement",
    periodKind: "year",
    periodStart: "2024-01-01",
    periodEnd: "2024-12-31",
    taxYear: 2024,
    facts: { totalAssets: 222 },
    isHistory: true,
    historySource: "document",
    evidenceReference:
      "private-evidence://33333333-3333-4333-8333-333333333333/year-files/0002",
    status: "parsed",
    sourceMonth: "2024-12",
    submissionId: null,
    driveFileId: "fake-drive-2",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    intakeDocumentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    formType: "wht-filing-pnd1",
    documentType: "wht-filing-pnd1",
    filingKind: "receipt",
    periodKind: "month",
    periodStart: "2025-03-01",
    periodEnd: "2025-03-31",
    taxYear: 2025,
    facts: { payeeCount: 1 },
    isHistory: true,
    historySource: "document",
    evidenceReference:
      "private-evidence://33333333-3333-4333-8333-333333333333/year-files/0003",
    status: "parsed",
    sourceMonth: "2025-03",
    submissionId: null,
    driveFileId: "fake-drive-3",
  },
];

/** One fake intake row of the scope (no real sample). */
interface FakeIntakeRow {
  readonly id: string;
  readonly driveFileId: string;
  readonly driveFolderId: string;
  readonly sourceMonth: string;
  readonly documentType: string;
  readonly status: string;
  readonly submissionId: string | null;
  readonly duplicateOfSubmissionId: string | null;
  readonly evidenceReference: string | null;
  readonly extraction: string | null;
  readonly failureReason: string | null;
  readonly failureCount: number;
  readonly sightingCount: number;
  readonly evidenceByteSize: number | null;
  readonly isHistory: boolean;
  readonly historySource: string | null;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly scopeCompanyId: string;
}

/** The three fake intake rows of the scope (no real sample). */
const FAKE_INTAKE_ROWS: readonly FakeIntakeRow[] = FAKE_YEAR_FILE_ROWS.map(
  (row) => ({
    id: row.intakeDocumentId,
    driveFileId: row.driveFileId,
    driveFolderId: "fake-drive-folder",
    sourceMonth: row.sourceMonth,
    documentType: row.documentType,
    status: row.status,
    submissionId: row.submissionId,
    duplicateOfSubmissionId: null,
    evidenceReference: row.evidenceReference,
    extraction: "local-text",
    failureReason: null,
    failureCount: 0,
    sightingCount: 1,
    evidenceByteSize: 1024,
    isHistory: row.isHistory,
    historySource: row.historySource,
    firstSeenAt: "2026-11-14T00:00:00.000Z",
    lastSeenAt: "2026-11-14T00:00:00.000Z",
    scopeCompanyId: COMPANY_ID,
  }),
);

/** The write member names of the repository port. */
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

/** The fake repository port and its recorded calls. */
interface FakeRepository {
  /** The port object the domain reads through. */
  readonly repository: unknown;
  /** Every member name the domain called. */
  readonly calls: string[];
  /** Every write member name the domain called. */
  readonly writeCalls: string[];
}

/**
 * Builds the fake repository port. Every member answers with the fake rows.
 * The write members record the call and change nothing.
 * @returns The port and its recorded calls.
 */
function createFakeRepository(): FakeRepository {
  const calls: string[] = [];
  const writeCalls: string[] = [];
  const repository = new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== "string") return undefined;
        if (property === "then") return undefined;
        const member = property;
        return (..._args: unknown[]) => {
          calls.push(member);
          if (WRITE_MEMBERS.has(member)) {
            writeCalls.push(member);
            return undefined;
          }
          if (member === "listByScope") {
            return Promise.resolve(FAKE_INTAKE_ROWS);
          }
          return Promise.resolve(FAKE_YEAR_FILE_ROWS);
        };
      },
    },
  );
  return { repository, calls, writeCalls };
}

/**
 * Requires the read permission check and fails with its name.
 * @returns The read check of the permissions module.
 */
function requireReadCheck(): ReadCheck {
  const value = permissions["canReadYearFiles"];
  expect(
    value,
    "The module packages/backend/src/modules/accounting/permissions.ts does not export canReadYearFiles. Plan task 10.9 adds it (FR-31, fact Y11).",
  ).toBeDefined();
  expect(
    typeof value,
    "canReadYearFiles must be a function that takes the AccountingActor.",
  ).toBe("function");
  return value as ReadCheck;
}

/**
 * Requires the list function and fails with its name.
 * @returns The list function of the year-files module.
 */
function requireListFunction(): ListFunction {
  const value = yearFiles["listYearFileFacts"];
  expect(
    value,
    "The module packages/backend/src/modules/accounting/year-files.ts does not export listYearFileFacts. Plan task 10.9 adds it (FR-31).",
  ).toBeDefined();
  expect(
    typeof value,
    "listYearFileFacts must be a function that takes the repository port and the actor.",
  ).toBe("function");
  return value as ListFunction;
}

/** One group of the list result. */
interface ValidatedGroup {
  readonly taxYear: number;
  readonly formType: string;
  readonly rows: readonly ValidatedRow[];
}

/** One row of the list result. */
interface ValidatedRow {
  readonly intakeDocumentId: string;
  readonly filingKind: string;
  readonly periodKind: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly facts: Readonly<Record<string, unknown>>;
  readonly isHistory: boolean;
  readonly historySource: string;
  readonly evidenceReference: string;
}

/** The list result and the problems of the shape check. */
interface ValidatedResult {
  readonly groups: readonly ValidatedGroup[];
  readonly problems: readonly string[];
}

/**
 * Reports whether a value is a record.
 * @param value Value to inspect.
 * @returns True when the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validates the list result against the pinned group and row shape.
 * @param value The value the list function returned.
 * @returns The validated groups and the problems of the shape check.
 */
function validateResult(value: unknown): ValidatedResult {
  const problems: string[] = [];
  if (!Array.isArray(value)) {
    return {
      groups: [],
      problems: [
        `listYearFileFacts must return an array of groups, received ${typeof value}`,
      ],
    };
  }
  const groups: ValidatedGroup[] = [];
  value.forEach((entry, groupIndex) => {
    if (!isRecord(entry)) {
      problems.push(`group ${groupIndex} is not a record`);
      return;
    }
    const taxYear = entry["taxYear"];
    const formType = entry["formType"];
    const rows = entry["rows"];
    if (typeof taxYear !== "number" || !Number.isInteger(taxYear)) {
      problems.push(`group ${groupIndex} holds no integer taxYear`);
    }
    if (typeof formType !== "string" || formType.length === 0) {
      problems.push(`group ${groupIndex} holds no formType`);
    }
    if (!Array.isArray(rows)) {
      problems.push(`group ${groupIndex} holds no rows array`);
      return;
    }
    const validatedRows: ValidatedRow[] = [];
    rows.forEach((row, rowIndex) => {
      if (!isRecord(row)) {
        problems.push(`row ${groupIndex}.${rowIndex} is not a record`);
        return;
      }
      const facts = row["facts"];
      const intakeDocumentId = row["intakeDocumentId"];
      const filingKind = row["filingKind"];
      const periodKind = row["periodKind"];
      const periodStart = row["periodStart"];
      const periodEnd = row["periodEnd"];
      const isHistory = row["isHistory"];
      const historySource = row["historySource"];
      const evidenceReference = row["evidenceReference"];
      if (typeof intakeDocumentId !== "string" || intakeDocumentId.length === 0) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no intakeDocumentId`);
      }
      if (typeof filingKind !== "string" || filingKind.length === 0) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no filingKind`);
      }
      if (typeof periodKind !== "string" || periodKind.length === 0) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no periodKind`);
      }
      if (typeof periodStart !== "string" || periodStart.length === 0) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no periodStart`);
      }
      if (typeof periodEnd !== "string" || periodEnd.length === 0) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no periodEnd`);
      }
      if (!isRecord(facts)) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no facts object`);
      }
      if (isHistory !== true) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no history marker`);
      }
      if (historySource !== "document") {
        problems.push(
          `row ${groupIndex}.${rowIndex} holds no document history source`,
        );
      }
      if (typeof evidenceReference !== "string" || evidenceReference.length === 0) {
        problems.push(`row ${groupIndex}.${rowIndex} holds no evidence link`);
      }
      validatedRows.push({
        intakeDocumentId: String(intakeDocumentId),
        filingKind: String(filingKind),
        periodKind: String(periodKind),
        periodStart: String(periodStart),
        periodEnd: String(periodEnd),
        facts: isRecord(facts) ? facts : {},
        isHistory: isHistory === true,
        historySource: String(historySource),
        evidenceReference: String(evidenceReference),
      });
    });
    groups.push({
      taxYear: typeof taxYear === "number" ? taxYear : -1,
      formType: typeof formType === "string" ? formType : "",
      rows: validatedRows,
    });
  });
  return { groups, problems };
}

/** The expected number of roles in the read gate. */
const READ_ROLE_COUNT = READ_ROLES.length;
/** The expected number of admitted roles. */
const READ_ROLES_ALLOWED = READ_ROLES.filter(
  (role) => READ_ROLE_EXPECTATIONS[role],
).length;
/** The expected number of refused roles. */
const READ_ROLES_REFUSED = READ_ROLE_COUNT - READ_ROLES_ALLOWED;
/** The expected number of tax years of the fixture set. */
const FIXTURE_TAX_YEARS = new Set(
  FAKE_YEAR_FILE_ROWS.map((row) => row.taxYear),
).size;
/** The expected number of form types of the fixture set. */
const FIXTURE_FORM_TYPES = new Set(
  FAKE_YEAR_FILE_ROWS.map((row) => row.formType),
).size;
/** The expected number of year-file rows of the fixture set. */
const FIXTURE_ROW_COUNT = FAKE_YEAR_FILE_ROWS.length;

describe("the read surface of the year-end view (FR-31)", () => {
  it("holds the year-files module of the read view", () => {
    expect(
      YEAR_FILES_MODULE_EXISTS,
      "Missing packages/backend/src/modules/accounting/year-files.ts. Plan task 10.9 creates it.",
    ).toBe(true);
  });

  it("keeps five roles in the read gate with two admitted and three refused (A4 guard)", () => {
    console.log(`read_role_rows=${READ_ROLE_COUNT}`);
    console.log(`read_roles_allowed=${READ_ROLES_ALLOWED}`);
    console.log(`read_roles_refused=${READ_ROLES_REFUSED}`);
    expect(READ_ROLE_COUNT, "read_role_rows=5").toBe(5);
    expect(READ_ROLES_ALLOWED, "read_roles_allowed=2").toBe(2);
    expect(READ_ROLES_REFUSED, "read_roles_refused=3").toBe(3);
  });

  for (const role of READ_ROLES) {
    it(`canReadYearFiles ${
      READ_ROLE_EXPECTATIONS[role] ? "admits" : "refuses"
    } the ${role} actor`, () => {
      if (role === "OWNER") {
        console.log(`read_role_rows=${READ_ROLE_COUNT}`);
        console.log(`read_roles_allowed=${READ_ROLES_ALLOWED}`);
        console.log(`read_roles_refused=${READ_ROLES_REFUSED}`);
      }
      const check = requireReadCheck();
      const actor = buildActor(role);
      const expected = READ_ROLE_EXPECTATIONS[role];
      expect(
        check(actor),
        `canReadYearFiles must ${expected ? "admit" : "refuse"} the ${role} actor ` +
          `(read_roles_allowed=2, read_roles_refused=3). The CEO actor carries the ` +
          `OWNER display name, and the check reads the role only.`,
      ).toBe(expected);
    });
  }
});

describe("the grouped year-file list (FR-31)", () => {
  it("returns the rows grouped by tax year and form type with the history marker and the evidence link", async () => {
    console.log(`tax_years=${FIXTURE_TAX_YEARS}`);
    console.log(`form_type_groups=${FIXTURE_FORM_TYPES}`);
    console.log(`year_file_rows=${FIXTURE_ROW_COUNT}`);
    console.log(`history_marker_rows=${FIXTURE_ROW_COUNT}`);
    console.log(`evidence_link_rows=${FIXTURE_ROW_COUNT}`);
    const list = await requireListFunction();
    const fake = createFakeRepository();
    const value = await list({
      repository: fake.repository,
      actor: buildActor("OWNER"),
    });
    const { groups, problems } = validateResult(value);
    const taxYears = new Set(groups.map((group) => group.taxYear));
    const formTypes = new Set(groups.map((group) => group.formType));
    const rows = groups.flatMap((group) => group.rows);
    const historyRows = rows.filter(
      (row) => row.isHistory && row.historySource === "document",
    );
    const evidenceRows = rows.filter(
      (row) => row.evidenceReference.length > 0,
    );
    console.log(`tax_years=${taxYears.size}`);
    console.log(`form_type_groups=${formTypes.size}`);
    console.log(`year_file_groups=${groups.length}`);
    console.log(`year_file_rows=${rows.length}`);
    console.log(`history_marker_rows=${historyRows.length}`);
    console.log(`evidence_link_rows=${evidenceRows.length}`);
    expect(
      problems,
      `the list must return the groups of the pinned shape: ${problems.join("; ")}`,
    ).toEqual([]);
    expect(taxYears.size, "tax_years=2").toBe(FIXTURE_TAX_YEARS);
    expect(formTypes.size, "form_type_groups=2").toBe(FIXTURE_FORM_TYPES);
    expect(rows.length, "year_file_rows=3").toBe(FIXTURE_ROW_COUNT);
    expect(
      historyRows.length,
      "history_marker_rows=3: every row carries the history marker",
    ).toBe(FIXTURE_ROW_COUNT);
    expect(
      evidenceRows.length,
      "evidence_link_rows=3: every row carries the evidence link",
    ).toBe(FIXTURE_ROW_COUNT);
  });

  it("calls no write member of the repository", async () => {
    const fake = createFakeRepository();
    console.log(`write_calls=${fake.writeCalls.length}`);
    const list = await requireListFunction();
    await list({
      repository: fake.repository,
      actor: buildActor("ACCOUNTANT"),
    });
    console.log(`write_calls=${fake.writeCalls.length}`);
    expect(
      fake.writeCalls,
      `write_calls=0: the list calls no write member, called ${fake.writeCalls.join(", ")}`,
    ).toEqual([]);
  });

  it("refuses the CEO, the STAFF, and the CONTRACTOR", async () => {
    const list = await requireListFunction();
    const fake = createFakeRepository();
    const refusedRoles: readonly ReadRole[] = ["CEO", "STAFF", "CONTRACTOR"];
    for (const role of refusedRoles) {
      const outcome = await list({
        repository: fake.repository,
        actor: buildActor(role),
      }).then(
        (value: unknown) => value,
        (error: unknown) => error,
      );
      if (outcome instanceof Error) continue;
      const groups = Array.isArray(outcome) ? outcome : [];
      expect(
        groups.length,
        `the list must refuse the ${role} actor (read_roles_refused=3)`,
      ).toBe(0);
    }
  });
});
