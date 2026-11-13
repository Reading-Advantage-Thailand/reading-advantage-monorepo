// @vitest-environment node
/**
 * Red tests for the year-file subfolder walk and the year-file history write of
 * the track `accounting_drive_intake_20261109` (plan task 10.3, FR-28, FR-29,
 * spec sections 9b and 5.5).
 *
 * The module `packages/backend/src/modules/accounting/intake.ts` exists at the
 * base. The walk, the constant, the history mode, and the facts write do not,
 * so every row loads the module through a soft loader and fails on an
 * assertion that names the missing export. No row fails on a bare load error.
 *
 * The contract this file pins for the Green task 10.4:
 *
 *   YEAR_FILE_FOLDER_NAMES  // the five names of spec section 9b, exact
 *
 *   walkAccountingYearFiles(input: {
 *     folderId: string;
 *     source: AccountingYearFileSourcePort;  // the poll source plus
 *                                            // listFolderEntries({ folderId })
 *   }): Promise<readonly {
 *     id: string; name: string; mimeType: string;
 *     byteSize?: number; folderName: string;
 *   }[]>                                     // one walk, one level deep
 *
 *   intakeDriveDocument({
 *     mode: "history",                       // the one intake function
 *     actor, folderId, source,               // source holds listFolderEntries
 *     textLayer,                             // { read({ companyId, mimeType,
 *                                            //   body }) => { text | null } }
 *     evidenceStore, intakeRepository, submissionRepository,
 *     localReader, extraction,
 *   }) // writes one intake row and one facts row for each parsed year file,
 *      // and returns `unmatched` with the files whose period is unreadable
 *
 * The intake repository port gains `insertYearFileFacts` and
 * `markDuplicateOfIntakeDocument`. A parsed year file may reach `parsed`
 * through `markYearFileParsed` or through a draft `status` of `parsed`; the
 * fake accepts both, so the row asserts the stored status only.
 *
 * Every port is a fake. No row reads a real Drive folder, a real file, or a
 * real database. The Drive ids are `fake-drive-<n>`, the file names are
 * `fake-file-<n>.pdf`, and the text is synthetic with sentinel values only.
 *
 * Anti-pattern coverage:
 * - A3: counts are labeled integers (`named_subfolders=5`, `subfolders_read=5`,
 *   `deeper_list_calls=0`, `poll_year_file_folder_reads=0`,
 *   `facts_rows_per_year_file=1`, `document_type_keys` of the db file).
 * - A4: a row with zero parsed files fails before its loops, so a phase with no
 *   year file cannot pass.
 * - A5: every failure names the export or the behavior it proves.
 * - A6: the folder-id scan reads the walk output only and never a production
 *   file path outside the two named adapters.
 */
import { describe, expect, it } from "vitest";

/** Fake company id of every fixture. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake account id of the intake actor. */
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
/** Fake root folder id; no real Drive id enters this file. */
const ROOT_FOLDER_ID = "fake-drive-root";
/** MIME type of a Drive folder. */
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
/** MIME type of every fake year file. */
const PDF_MIME_TYPE = "application/pdf";

/** The five names of spec section 9b, in the order of the table. */
const EXPECTED_FOLDER_NAMES = [
  "Fwd: เอกสารปี 2567",
  "Fwd: เอกสารปี 2568",
  "2568-1",
  "2568-2",
  "2568-3",
] as const;

/** The session actor of the intake run. */
const ACTOR = {
  accountId: ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "ACCOUNTANT",
};

/** A synthetic PND.1 text with the sentinels of the fixture rule. */
const PND1_TEXT = [
  "no real sample",
  "แบบ ภ.ง.ด.1 รายการภาษีที่หัก ณ ที่จ่าย ประจำเดือน",
  "ประจำเดือนที่ 1 มกราคม 2567",
  "ช่วงเวลา 1 มกราคม 2567 ถึง 31 มกราคม 2567",
  "จำนวนผู้มีรายได้ (ราย): 12",
  "เงินที่จ่ายทั้งสิ้น (บาท): 1,234.56",
  "ภาษีที่หักได้ (บาท): 100.00",
  "เงินเพิ่ม (บาท): 100.00",
  "เงินภาษีที่นำส่ง (บาท): 7,890.12",
  "ชื่อผู้จ่ายเงิน: Test Counterparty",
  "เลขประจำตัวผู้เสียภาษี: 0000000000000",
].join("\n");

/** A synthetic PND.1 text whose period lines are absent. */
const PND1_NO_PERIOD_TEXT = [
  "no real sample",
  "แบบ ภ.ง.ด.1 รายการภาษีที่หัก ณ ที่จ่าย ประจำเดือน",
  "จำนวนผู้มีรายได้ (ราย): 12",
  "เงินที่จ่ายทั้งสิ้น (บาท): 1,234.56",
  "ภาษีที่หักได้ (บาท): 100.00",
  "เงินเพิ่ม (บาท): 100.00",
  "เงินภาษีที่นำส่ง (บาท): 7,890.12",
].join("\n");

/** The draft that the fake local reader returns for a voucher. */
const FAKE_DRAFT = {
  kind: "bill",
  payee: "Test Counterparty",
  category: "vendor-invoice",
  description: "Test Counterparty invoice",
  money: { amountMinor: "12345", currency: "THB" },
};

const NAMED_SUBFOLDERS = EXPECTED_FOLDER_NAMES.length;
if (NAMED_SUBFOLDERS !== 5) {
  throw new Error(`named_subfolders=${NAMED_SUBFOLDERS} is wrong; spec section 9b names five.`);
}
console.log(`named_subfolders=${NAMED_SUBFOLDERS}`);

/** The subfolder ids of the main fake listing, one for each name. */
const NAMED_FOLDER_IDS = EXPECTED_FOLDER_NAMES.map(
  (_name, index) => `fake-drive-folder-${index + 1}`,
);
/** The id of the customer folder of the fake listing. */
const CUSTOMER_FOLDER_ID = "fake-drive-folder-90";
/** The id of the unnamed subfolder of the fake listing. */
const UNNAMED_FOLDER_ID = "fake-drive-folder-91";
/** The id of the folder two levels deep. */
const DEEPER_FOLDER_ID = "fake-drive-folder-92";
/** The id of the lookalike folder whose name holds a trailing space. */
const LOOKALIKE_FOLDER_ID = "fake-drive-folder-93";

/** One fake Drive listing entry. */
interface FakeEntry {
  /** Fake Drive id. */
  readonly id: string;
  /** Fake Drive name. */
  readonly name: string;
  /** Fake MIME type. */
  readonly mimeType: string;
  /** Fake declared byte size. */
  readonly byteSize?: number;
}

/** One fake file with its bytes. */
interface FakeFile extends FakeEntry {
  /** Fake file bytes. */
  readonly body: Uint8Array;
}

/** One fake row of `accounting_intake_documents`. */
interface FakeIntakeRow {
  id: string;
  driveFileId: string;
  driveFolderId: string;
  sourceMonth: string;
  documentType: string;
  status: string;
  submissionId: string | null;
  duplicateOfSubmissionId: string | null;
  duplicateOfIntakeDocumentId: string | null;
  evidenceReference: string | null;
  extraction: string | null;
  failureReason: string | null;
  failureCount: number;
  sightingCount: number;
  evidenceByteSize: number | null;
  isHistory: boolean;
  historySource: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  scopeCompanyId: string;
}

/** One fake row of `accounting_year_file_facts`. */
interface FakeFactsRow {
  readonly intakeDocumentId: string;
  readonly formType: string;
  readonly filingKind: string;
  readonly periodKind: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly taxYear: number;
  readonly facts: Record<string, unknown>;
}

/** The recorded calls of one fake Drive port. */
interface FakeDriveCalls {
  readonly list: string[];
  readonly listFolderEntries: string[];
  readonly download: string[];
  readonly export: string[];
}

/** One fake Drive port with its calls. */
interface FakeDrive {
  /** The read-only source port of the poll and the walk. */
  readonly source: Record<string, unknown>;
  /** The recorded calls. */
  readonly calls: FakeDriveCalls;
}

/**
 * Loads the intake domain module without a static import, so a missing export
 * fails an assertion instead of the whole file load.
 * @returns The module namespace.
 */
async function loadIntakeModule(): Promise<Record<string, unknown>> {
  const href = new URL(
    "../../../../../packages/backend/src/modules/accounting/intake.ts",
    import.meta.url,
  ).href;
  return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
}

/**
 * Requires one export of the intake module and fails with its name.
 * @param name Export name.
 * @returns The export value.
 */
async function requireExport(name: string): Promise<unknown> {
  const module = await loadIntakeModule();
  expect(
    module[name],
    `The module packages/backend/src/modules/accounting/intake.ts does not export ${name}. ` +
      `Plan task 10.4 adds it (FR-28, FR-29).`,
  ).toBeDefined();
  return module[name];
}

/**
 * Requires the one walk function.
 * @returns The walk, or undefined after a failed assertion.
 */
async function requireWalk(): Promise<
  ((input: Record<string, unknown>) => Promise<unknown>) | undefined
> {
  const walk = await requireExport("walkAccountingYearFiles");
  expect(
    typeof walk,
    "The module packages/backend/src/modules/accounting/intake.ts does not export the function walkAccountingYearFiles",
  ).toBe("function");
  return typeof walk === "function"
    ? (walk as (input: Record<string, unknown>) => Promise<unknown>)
    : undefined;
}

/**
 * Requires the one intake function.
 * @returns The intake function, or undefined after a failed assertion.
 */
async function requireIntake(): Promise<
  ((request: Record<string, unknown>) => Promise<Record<string, unknown>>) | undefined
> {
  const intake = await requireExport("intakeDriveDocument");
  expect(
    typeof intake,
    "The module packages/backend/src/modules/accounting/intake.ts does not export the function intakeDriveDocument",
  ).toBe("function");
  return typeof intake === "function"
    ? (intake as (
        request: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>)
    : undefined;
}

/**
 * Builds one fake Drive port over a folder map.
 * @param entriesByFolder Listing of each folder id.
 * @param files The fake files, keyed by id in the listing.
 * @returns The fake port and its recorded calls.
 */
function createFakeDrive(
  entriesByFolder: ReadonlyMap<string, readonly FakeEntry[]>,
  files: readonly FakeFile[],
): FakeDrive {
  const bytesByFileId = new Map(files.map((file) => [file.id, file.body]));
  const calls: FakeDriveCalls = {
    list: [],
    listFolderEntries: [],
    download: [],
    export: [],
  };
  const source: Record<string, unknown> = {
    /** Lists one folder of the fake map and keeps folders out, as the poll does. */
    async list(input: { readonly folderId: string }): Promise<readonly FakeEntry[]> {
      calls.list.push(input.folderId);
      return (entriesByFolder.get(input.folderId) ?? []).filter(
        (entry) => entry.mimeType !== FOLDER_MIME_TYPE,
      );
    },
    /** Lists one folder of the fake map and keeps folders in, as the walk needs. */
    async listFolderEntries(input: {
      readonly folderId: string;
    }): Promise<readonly FakeEntry[]> {
      calls.listFolderEntries.push(input.folderId);
      return entriesByFolder.get(input.folderId) ?? [];
    },
    /** Returns the fake bytes of one file. */
    async download(input: { readonly fileId: string }): Promise<Uint8Array> {
      calls.download.push(input.fileId);
      const body = bytesByFileId.get(input.fileId);
      if (body === undefined) throw new Error("fake: unknown file id");
      return body;
    },
    /** Returns the fake bytes of one exported file. */
    async export(input: { readonly fileId: string }): Promise<Uint8Array> {
      calls.export.push(input.fileId);
      const body = bytesByFileId.get(input.fileId);
      if (body === undefined) throw new Error("fake: unknown file id");
      return body;
    },
  };
  return { source, calls };
}

/**
 * Builds one fake file with the bytes of one text.
 * @param index Serial of the file.
 * @param text Text to encode.
 * @param nameOverride Optional Drive name; the default follows the fixture rule.
 * @returns The fake file.
 */
function makeFile(index: number, text: string, nameOverride?: string): FakeFile {
  const body = Buffer.from(text, "utf8");
  return {
    id: `fake-drive-${index}`,
    name: nameOverride ?? `fake-file-${index}.pdf`,
    mimeType: PDF_MIME_TYPE,
    byteSize: body.byteLength,
    body,
  };
}

/**
 * Builds the full main listing: the five named subfolders with one PDF each,
 * a customer folder, an unnamed subfolder, a lookalike, and a nested folder.
 * @returns The folder map, the files, and the folder id list.
 */
function buildMainDrive(): {
  readonly entriesByFolder: ReadonlyMap<string, readonly FakeEntry[]>;
  readonly files: readonly FakeFile[];
} {
  const files = EXPECTED_FOLDER_NAMES.map((_name, index) =>
    makeFile(index + 1, `${PND1_TEXT}\n#${index + 1}`),
  );
  const rootEntries: FakeEntry[] = [
    ...EXPECTED_FOLDER_NAMES.map((name, index) => ({
      id: NAMED_FOLDER_IDS[index] ?? "",
      name,
      mimeType: FOLDER_MIME_TYPE,
    })),
    { id: CUSTOMER_FOLDER_ID, name: "Boonyathat", mimeType: FOLDER_MIME_TYPE },
    { id: UNNAMED_FOLDER_ID, name: "unnamed-subfolder", mimeType: FOLDER_MIME_TYPE },
    {
      id: LOOKALIKE_FOLDER_ID,
      name: `${EXPECTED_FOLDER_NAMES[0]} `,
      mimeType: FOLDER_MIME_TYPE,
    },
  ];
  const entriesByFolder = new Map<string, readonly FakeEntry[]>();
  entriesByFolder.set(ROOT_FOLDER_ID, rootEntries);
  for (const [index, folderId] of NAMED_FOLDER_IDS.entries()) {
    const entries: FakeEntry[] = [];
    if (index === 0) {
      entries.push({ id: DEEPER_FOLDER_ID, name: "nested", mimeType: FOLDER_MIME_TYPE });
    }
    if (index === 1) {
      entries.push({
        id: "fake-drive-50",
        name: "fake-file-50.txt",
        mimeType: "text/plain",
        byteSize: 10,
      });
    }
    const file = files[index];
    if (file !== undefined) entries.push(file);
    entriesByFolder.set(folderId, entries);
  }
  entriesByFolder.set(DEEPER_FOLDER_ID, [
    {
      id: "fake-drive-51",
      name: "fake-file-51.pdf",
      mimeType: PDF_MIME_TYPE,
      byteSize: 10,
    },
  ]);
  entriesByFolder.set(CUSTOMER_FOLDER_ID, [
    {
      id: "fake-drive-52",
      name: "fake-file-52.pdf",
      mimeType: PDF_MIME_TYPE,
      byteSize: 10,
    },
  ]);
  return { entriesByFolder, files };
}

/**
 * Builds the history listing with one PDF in one named subfolder.
 * @param text Text of the file.
 * @param fileIndex Serial of the file.
 * @returns The folder map and the files.
 */
function buildSingleDrive(
  text: string,
  fileIndex = 1,
): {
  readonly entriesByFolder: ReadonlyMap<string, readonly FakeEntry[]>;
  readonly files: readonly FakeFile[];
} {
  const file = makeFile(fileIndex, text);
  const rootEntries: FakeEntry[] = EXPECTED_FOLDER_NAMES.map((name, index) => ({
    id: NAMED_FOLDER_IDS[index] ?? "",
    name,
    mimeType: FOLDER_MIME_TYPE,
  }));
  const entriesByFolder = new Map<string, readonly FakeEntry[]>();
  entriesByFolder.set(ROOT_FOLDER_ID, rootEntries);
  for (const [index, folderId] of NAMED_FOLDER_IDS.entries()) {
    entriesByFolder.set(folderId, index === 0 ? [file] : []);
  }
  return { entriesByFolder, files: [file] };
}

/** One fake evidence store with its stored byte map. */
interface FakeEvidenceStore {
  readonly port: Record<string, unknown>;
  readonly stored: ReadonlyMap<string, Uint8Array>;
}

/**
 * Builds one fake private evidence store that compares stored bytes.
 * @returns The fake store.
 */
function createFakeEvidenceStore(): FakeEvidenceStore {
  const stored = new Map<string, Uint8Array>();
  let serial = 0;
  const port: Record<string, unknown> = {
    /** Stores one body under a fresh reference inside the company scope. */
    async put(input: {
      readonly companyId: string;
      readonly contentType: string;
      readonly body: Uint8Array;
    }): Promise<{ readonly evidenceReference: string }> {
      serial += 1;
      const evidenceReference = `private-evidence://${input.companyId}/intake/${serial}`;
      stored.set(evidenceReference, input.body);
      return { evidenceReference };
    },
    /** Reads one stored body. */
    async read(input: { readonly evidenceReference: string }): Promise<Uint8Array> {
      const body = stored.get(input.evidenceReference);
      if (body === undefined) throw new Error("fake: unknown evidence reference");
      return body;
    },
    /** Compares two stored bodies byte by byte. */
    async sameEvidenceBytes(input: {
      readonly leftEvidenceReference: string;
      readonly rightEvidenceReference: string;
    }): Promise<boolean> {
      const left = stored.get(input.leftEvidenceReference);
      const right = stored.get(input.rightEvidenceReference);
      if (left === undefined || right === undefined) return false;
      return Buffer.from(left).equals(Buffer.from(right));
    },
  };
  return { port, stored };
}

/** One fake intake repository with its rows, facts rows, and calls. */
interface FakeIntakeRepository {
  readonly port: Record<string, unknown>;
  readonly rows: FakeIntakeRow[];
  readonly facts: FakeFactsRow[];
  readonly calls: string[];
}

/**
 * Builds one fake intake repository. The `insert` member keeps a draft status
 * when the domain gives one, so a parsed year file may arrive already parsed.
 * @param seed Rows that the repository holds before the run.
 * @returns The fake repository.
 */
function createFakeIntakeRepository(
  seed: readonly FakeIntakeRow[] = [],
): FakeIntakeRepository {
  const rows: FakeIntakeRow[] = [...seed];
  const facts: FakeFactsRow[] = [];
  const calls: string[] = [];
  let serial = 0;
  const now = "2026-11-13T05:00:00.000Z";
  const port: Record<string, unknown> = {
    /** Persists one intake row draft. */
    async insert(draft: Record<string, unknown>): Promise<FakeIntakeRow> {
      calls.push("insert");
      serial += 1;
      const row: FakeIntakeRow = {
        id: `fake-row-${serial}`,
        driveFileId: String(draft.driveFileId),
        driveFolderId: String(draft.driveFolderId),
        sourceMonth: String(draft.sourceMonth),
        documentType: String(draft.documentType),
        status: typeof draft.status === "string" ? draft.status : "pending",
        submissionId: (draft.submissionId as string | null) ?? null,
        duplicateOfSubmissionId:
          (draft.duplicateOfSubmissionId as string | null) ?? null,
        duplicateOfIntakeDocumentId:
          (draft.duplicateOfIntakeDocumentId as string | null) ?? null,
        evidenceReference: (draft.evidenceReference as string | null) ?? null,
        extraction: (draft.extraction as string | null) ?? null,
        failureReason: (draft.failureReason as string | null) ?? null,
        failureCount: Number(draft.failureCount ?? 0),
        sightingCount: Number(draft.sightingCount ?? 1),
        evidenceByteSize: (draft.evidenceByteSize as number | null) ?? null,
        isHistory: Boolean(draft.isHistory ?? false),
        historySource: (draft.historySource as string | null) ?? null,
        firstSeenAt: now,
        lastSeenAt: now,
        scopeCompanyId: String(
          (draft.scopeCompanyId as string | undefined) ?? COMPANY_ID,
        ),
      };
      rows.push(row);
      return row;
    },
    /** Finds one row by its Drive file id. */
    async findByDriveFileId(input: {
      readonly driveFileId: string;
    }): Promise<FakeIntakeRow | undefined> {
      calls.push("findByDriveFileId");
      return rows.find((row) => row.driveFileId === input.driveFileId);
    },
    /** Lists the submissions that hold evidence; the fakes seed none. */
    async listRecentSubmissionEvidence(): Promise<readonly unknown[]> {
      calls.push("listRecentSubmissionEvidence");
      return [];
    },
    /** Lists every intake row of one byte length. */
    async findByEvidenceByteSize(input: {
      readonly evidenceByteSize: number;
    }): Promise<readonly FakeIntakeRow[]> {
      calls.push("findByEvidenceByteSize");
      return rows.filter((row) => row.evidenceByteSize === input.evidenceByteSize);
    },
    /** Lists every intake row. */
    async listByScope(): Promise<readonly FakeIntakeRow[]> {
      calls.push("listByScope");
      return rows;
    },
    /** Marks one row a duplicate of a submission. */
    async markDuplicate(input: Record<string, unknown>): Promise<FakeIntakeRow | undefined> {
      calls.push("markDuplicate");
      const row = rows.find((candidate) => candidate.id === input.id);
      if (row === undefined) return undefined;
      row.status = "duplicate";
      row.duplicateOfSubmissionId =
        (input.duplicateOfSubmissionId as string | undefined) ?? null;
      if (typeof input.duplicateOfIntakeDocumentId === "string") {
        row.duplicateOfIntakeDocumentId = input.duplicateOfIntakeDocumentId;
      }
      return row;
    },
    /** Marks one row a duplicate of an earlier intake row. */
    async markDuplicateOfIntakeDocument(
      input: Record<string, unknown>,
    ): Promise<FakeIntakeRow | undefined> {
      calls.push("markDuplicateOfIntakeDocument");
      const row = rows.find((candidate) => candidate.id === input.id);
      if (row === undefined) return undefined;
      row.status = "duplicate";
      row.duplicateOfIntakeDocumentId =
        (input.duplicateOfIntakeDocumentId as string | undefined) ?? null;
      return row;
    },
    /** Marks one row parsed with its submission id. */
    async markParsed(input: Record<string, unknown>): Promise<FakeIntakeRow | undefined> {
      calls.push("markParsed");
      const row = rows.find((candidate) => candidate.id === input.id);
      if (row === undefined) return undefined;
      row.status = "parsed";
      row.submissionId = (input.submissionId as string | null) ?? null;
      row.extraction = (input.extraction as string | undefined) ?? null;
      return row;
    },
    /** Marks one year-file row parsed without a submission. */
    async markYearFileParsed(
      input: Record<string, unknown>,
    ): Promise<FakeIntakeRow | undefined> {
      calls.push("markYearFileParsed");
      const row = rows.find((candidate) => candidate.id === input.id);
      if (row === undefined) return undefined;
      row.status = "parsed";
      row.submissionId = null;
      return row;
    },
    /** Marks one row failed. */
    async markFailed(input: Record<string, unknown>): Promise<FakeIntakeRow | undefined> {
      calls.push("markFailed");
      const row = rows.find((candidate) => candidate.id === input.id);
      if (row === undefined) return undefined;
      row.status = "failed";
      row.failureReason = (input.failureReason as string | undefined) ?? null;
      return row;
    },
    /** Increases the sighting count of one row. */
    async bumpSighting(input: Record<string, unknown>): Promise<FakeIntakeRow | undefined> {
      calls.push("bumpSighting");
      const row = rows.find((candidate) => candidate.id === input.id);
      if (row === undefined) return undefined;
      row.sightingCount = Number(input.sightingCount ?? row.sightingCount);
      row.lastSeenAt = (input.lastSeenAt as string | undefined) ?? row.lastSeenAt;
      return row;
    },
    /** Persists one facts row of a year file. */
    async insertYearFileFacts(input: Record<string, unknown>): Promise<FakeFactsRow> {
      calls.push("insertYearFileFacts");
      const row: FakeFactsRow = {
        intakeDocumentId: String(input.intakeDocumentId),
        formType: String(input.formType),
        filingKind: String(input.filingKind),
        periodKind: String(input.periodKind),
        periodStart: String(input.periodStart),
        periodEnd: String(input.periodEnd),
        taxYear: Number(input.taxYear),
        facts: (input.facts as Record<string, unknown> | undefined) ?? {},
      };
      facts.push(row);
      return row;
    },
  };
  return { port, rows, facts, calls };
}

/** One fake submission repository with its writes and audit rows. */
interface FakeSubmissionRepository {
  readonly port: Record<string, unknown>;
  readonly submissions: Record<string, unknown>[];
  readonly auditActions: string[];
}

/**
 * Builds one fake submission repository that records every write.
 * @returns The fake repository.
 */
function createFakeSubmissionRepository(): FakeSubmissionRepository {
  const submissions: Record<string, unknown>[] = [];
  const auditActions: string[] = [];
  const port: Record<string, unknown> = {
    /** Stores one submission and its audit event. */
    async insert(
      submission: Record<string, unknown>,
      _idempotencyKey: string | undefined,
      auditEvent: { readonly action?: string },
    ): Promise<Record<string, unknown>> {
      submissions.push(submission);
      auditActions.push(String(auditEvent.action));
      return submission;
    },
    /** Finds no stored idempotency key. */
    async findByIdempotencyKey(): Promise<undefined> {
      return undefined;
    },
    /** Lists the stored submissions. */
    async listByScope(): Promise<readonly Record<string, unknown>[]> {
      return submissions;
    },
    /** Finds one stored submission by id. */
    async findById(input: {
      readonly submissionId: string;
    }): Promise<Record<string, unknown> | undefined> {
      return submissions.find(
        (submission) => submission.id === input.submissionId,
      );
    },
  };
  return { port, submissions, auditActions };
}

/**
 * Builds one fake text-layer reader that decodes the file bytes as UTF-8.
 * @returns The text-layer port.
 */
function createFakeTextLayer(): Record<string, unknown> {
  return {
    /** Reads the text layer of one file body. */
    async read(input: { readonly body: Uint8Array }): Promise<{ readonly text: string | null }> {
      return { text: Buffer.from(input.body).toString("utf8") };
    },
  };
}

/**
 * Builds the local text reader of the poll, which returns one fake draft.
 * @returns The local reader port.
 */
function createFakeLocalReader(): Record<string, unknown> {
  return {
    /** Returns a fake text draft for one file. */
    async read(): Promise<{ readonly kind: "text"; readonly draft: typeof FAKE_DRAFT }> {
      return { kind: "text", draft: FAKE_DRAFT };
    },
  };
}

/**
 * Builds a model port that fails when the domain calls it.
 * @returns The extraction port.
 */
function createFailingExtraction(): Record<string, unknown> {
  return {
    /** Fails: no row of this file may call the model. */
    async extract(): Promise<never> {
      throw new Error("fake: the extraction port must not be called");
    },
  };
}

/**
 * Builds one history request over fake ports.
 * @param drive The fake Drive port.
 * @param fakes The fakes of the run.
 * @returns The request object.
 */
function buildHistoryRequest(input: {
  readonly drive: FakeDrive;
  readonly evidenceStore: FakeEvidenceStore;
  readonly intakeRepository: FakeIntakeRepository;
  readonly submissionRepository: FakeSubmissionRepository;
}): Record<string, unknown> {
  return {
    actor: ACTOR,
    mode: "history",
    folderId: ROOT_FOLDER_ID,
    source: input.drive.source,
    textLayer: createFakeTextLayer(),
    evidenceStore: input.evidenceStore.port,
    intakeRepository: input.intakeRepository.port,
    submissionRepository: input.submissionRepository.port,
    localReader: createFakeLocalReader(),
    extraction: createFailingExtraction(),
  };
}

/**
 * Builds one poll request over fake ports.
 * @param drive The fake Drive port.
 * @param fakes The fakes of the run.
 * @returns The request object.
 */
function buildPollRequest(input: {
  readonly drive: FakeDrive;
  readonly evidenceStore: FakeEvidenceStore;
  readonly intakeRepository: FakeIntakeRepository;
  readonly submissionRepository: FakeSubmissionRepository;
}): Record<string, unknown> {
  return {
    actor: ACTOR,
    mode: "poll",
    folderId: ROOT_FOLDER_ID,
    source: input.drive.source,
    evidenceStore: input.evidenceStore.port,
    intakeRepository: input.intakeRepository.port,
    submissionRepository: input.submissionRepository.port,
    localReader: createFakeLocalReader(),
    extraction: createFailingExtraction(),
  };
}

/**
 * Collects every string value inside one value tree.
 * @param value Value to walk.
 * @param found Collected strings.
 * @returns The collected strings.
 */
function collectStrings(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, found);
    return found;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, found);
    }
  }
  return found;
}

describe("the year-file subfolder walk (FR-29)", () => {
  it("exports YEAR_FILE_FOLDER_NAMES with the five names of spec section 9b", async () => {
    const names = await requireExport("YEAR_FILE_FOLDER_NAMES");
    expect(Array.isArray(names), "YEAR_FILE_FOLDER_NAMES must be an array").toBe(true);
    expect([...(names as readonly string[])]).toEqual([...EXPECTED_FOLDER_NAMES]);
  });

  it("exports one walk function and keeps one intake function (walk_functions=1, intake_functions=1)", async () => {
    const module = await loadIntakeModule();
    const functionNames = Object.entries(module)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name);
    const walkNames = functionNames.filter((name) => /walk/iu.test(name));
    const intakeNames = functionNames.filter((name) => /^intake[A-Z]/u.test(name));
    console.log(`walk_functions=${walkNames.length}`);
    console.log(`intake_functions=${intakeNames.length}`);
    expect(
      walkNames,
      "walk_functions=1: the module must hold exactly one walk function, walkAccountingYearFiles",
    ).toEqual(["walkAccountingYearFiles"]);
    expect(
      intakeNames,
      "intake_functions=1: the module must hold exactly one intake function, intakeDriveDocument",
    ).toEqual(["intakeDriveDocument"]);
  });

  it("reads the PDFs directly inside the five named subfolders only (subfolders_read=5)", async () => {
    const walk = await requireWalk();
    if (walk === undefined) return;
    const { entriesByFolder, files } = buildMainDrive();
    const drive = createFakeDrive(entriesByFolder, files);
    const result = (await walk({
      folderId: ROOT_FOLDER_ID,
      source: drive.source,
    })) as readonly Record<string, unknown>[];

    expect(Array.isArray(result), "the walk must return an array of files").toBe(true);
    expect(result.length, "subfolders_read=5: one PDF per named subfolder").toBe(
      NAMED_SUBFOLDERS,
    );
    const folderNames = result.map((file) => file.folderName);
    expect([...folderNames].sort()).toEqual([...EXPECTED_FOLDER_NAMES].sort());
    for (const file of result) {
      expect(String(file.name)).toMatch(/^fake-file-\d+\.pdf$/u);
      expect(file.mimeType).toBe(PDF_MIME_TYPE);
    }

    const readFolders = drive.calls.listFolderEntries;
    expect(readFolders[0], "the walk must list the root first").toBe(ROOT_FOLDER_ID);
    const namedReads = readFolders.filter((folderId) =>
      NAMED_FOLDER_IDS.includes(folderId),
    );
    console.log(`subfolders_read=${namedReads.length}`);
    console.log(
      `deeper_list_calls=${readFolders.filter((folderId) => folderId === DEEPER_FOLDER_ID).length}`,
    );
    console.log(
      `unnamed_subfolder_reads=${readFolders.filter((folderId) => folderId === UNNAMED_FOLDER_ID || folderId === LOOKALIKE_FOLDER_ID).length}`,
    );
    console.log(
      `customer_folder_reads_by_walk=${readFolders.filter((folderId) => folderId === CUSTOMER_FOLDER_ID).length}`,
    );
    expect(namedReads.length, "subfolders_read=5").toBe(NAMED_SUBFOLDERS);
    expect(
      readFolders,
      "the walk must read the root and the five named subfolders only",
    ).toHaveLength(NAMED_SUBFOLDERS + 1);
    expect(
      readFolders,
      "deeper_list_calls=0: the walk must not read a folder two levels deep",
    ).not.toContain(DEEPER_FOLDER_ID);
    expect(
      readFolders,
      "unnamed_subfolder_reads=0: the walk must skip a name outside the constant",
    ).not.toContain(UNNAMED_FOLDER_ID);
    expect(
      readFolders,
      "unnamed_subfolder_reads=0: the walk must skip a lookalike name with a trailing space",
    ).not.toContain(LOOKALIKE_FOLDER_ID);
    expect(
      readFolders,
      "customer_folder_reads_by_walk=0: the walk must skip the customer folder",
    ).not.toContain(CUSTOMER_FOLDER_ID);
    const deeperNames = collectStrings(result).filter((value) =>
      value.includes("fake-file-51"),
    );
    expect(
      deeperNames,
      "the walk must not return a PDF two levels deep",
    ).toEqual([]);
    const nonPdf = collectStrings(result).filter((value) =>
      value.includes("fake-file-50"),
    );
    expect(nonPdf, "the walk must not return a non-PDF file").toEqual([]);
  });

  it("keeps every folder id out of the walk output (folder_id_output_hits=0)", async () => {
    const walk = await requireWalk();
    if (walk === undefined) return;
    const { entriesByFolder, files } = buildMainDrive();
    const drive = createFakeDrive(entriesByFolder, files);
    const result = await walk({ folderId: ROOT_FOLDER_ID, source: drive.source });
    const output = collectStrings(result);
    const folderIds = [
      ROOT_FOLDER_ID,
      ...NAMED_FOLDER_IDS,
      CUSTOMER_FOLDER_ID,
      UNNAMED_FOLDER_ID,
      LOOKALIKE_FOLDER_ID,
      DEEPER_FOLDER_ID,
    ];
    const hits = output.filter((value) =>
      folderIds.some((folderId) => value.includes(folderId)),
    );
    console.log(`folder_id_output_hits=${hits.length}`);
    expect(
      hits,
      "folder_id_output_hits=0: the walk resolves each folder id from the listing and puts none in its output",
    ).toEqual([]);
    expect(
      drive.calls.listFolderEntries,
      "the walk must resolve each folder id from the fake listing",
    ).toContain(NAMED_FOLDER_IDS[0]);
  });

  it("stops with a safe error when a name of the constant is absent (missing_name_rows=1)", async () => {
    const walk = await requireWalk();
    if (walk === undefined) return;
    const { entriesByFolder, files } = buildMainDrive();
    const withoutOne = new Map(entriesByFolder);
    const rootEntries = (withoutOne.get(ROOT_FOLDER_ID) ?? []).filter(
      (entry) => entry.name !== "2568-2",
    );
    withoutOne.set(ROOT_FOLDER_ID, rootEntries);
    const drive = createFakeDrive(withoutOne, files);
    let error: unknown;
    try {
      await walk({ folderId: ROOT_FOLDER_ID, source: drive.source });
    } catch (caught) {
      error = caught;
    }
    expect(error, "a missing name of YEAR_FILE_FOLDER_NAMES must stop the walk").toBeDefined();
    const message = error instanceof Error ? error.message : String(error);
    expect(message, "the safe error must name the missing subfolder").toContain("2568-2");
    expect(
      message,
      "the safe error must hold no Drive id",
    ).not.toMatch(/fake-drive/u);
  });

  it("stops with the same safe error when two subfolders hold one name (duplicate_name_rows=1)", async () => {
    const walk = await requireWalk();
    if (walk === undefined) return;
    const { entriesByFolder, files } = buildMainDrive();
    const withDuplicate = new Map(entriesByFolder);
    const rootEntries = [
      ...(withDuplicate.get(ROOT_FOLDER_ID) ?? []),
      {
        id: "fake-drive-folder-4b",
        name: "2568-1",
        mimeType: FOLDER_MIME_TYPE,
      },
    ];
    withDuplicate.set(ROOT_FOLDER_ID, rootEntries);
    const drive = createFakeDrive(withDuplicate, files);
    let error: unknown;
    try {
      await walk({ folderId: ROOT_FOLDER_ID, source: drive.source });
    } catch (caught) {
      error = caught;
    }
    expect(error, "a duplicate name of YEAR_FILE_FOLDER_NAMES must stop the walk (Q20)").toBeDefined();
    const message = error instanceof Error ? error.message : String(error);
    expect(message, "the safe error must name the duplicated subfolder").toContain("2568-1");
    expect(message, "the safe error must hold no Drive id").not.toMatch(/fake-drive/u);
  });

  it("reads none of the five subfolders in the poll (poll_year_file_folder_reads=0)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const { entriesByFolder, files } = buildMainDrive();
    const drive = createFakeDrive(entriesByFolder, files);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    const result = await intake(
      buildPollRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );
    const yearFolderReads = drive.calls.listFolderEntries.filter((folderId) =>
      NAMED_FOLDER_IDS.includes(folderId),
    );
    console.log(`poll_year_file_folder_reads=${yearFolderReads.length}`);
    expect(
      yearFolderReads,
      "poll_year_file_folder_reads=0: the poll reads the root files and the customer folder as before (Q16, Q29)",
    ).toEqual([]);
    expect(drive.calls.list, "the poll must list the root once").toEqual([ROOT_FOLDER_ID]);
    expect(result, "the poll must read the root files and the customer folder as before").toBeDefined();
  });
});

describe("the year-file history write (FR-28)", () => {
  it("writes one intake row and one facts row for one year file (facts_rows_per_year_file=1)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const { entriesByFolder, files } = buildSingleDrive(PND1_TEXT);
    const drive = createFakeDrive(entriesByFolder, files);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    await intake(
      buildHistoryRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );

    expect(
      intakeRepository.rows.length,
      "the history mode must write exactly one intake row for one year file",
    ).toBe(1);
    const row = intakeRepository.rows[0] as FakeIntakeRow | undefined;
    expect(row, "the history mode must store the year-file row").toBeDefined();
    if (row === undefined) {
      throw new Error("the history mode must store the year-file row");
    }
    expect(row?.isHistory, "a year file writes isHistory true").toBe(true);
    expect(row?.historySource, "a year file writes historySource document").toBe("document");
    expect(row?.status, "a year file writes status parsed").toBe("parsed");
    expect(row?.submissionId, "a year file writes submissionId null").toBeNull();
    expect(row?.documentType, "the type comes from the text").toBe("wht-filing-pnd1");
    expect(row?.sourceMonth, "the month comes from the parsed period").toBe("2024-01");
    const file = files[0] as FakeFile;
    expect(row?.evidenceByteSize, "the row keeps the stored byte length").toBe(
      file.body.byteLength,
    );

    expect(
      intakeRepository.facts,
      "facts_rows_per_year_file=1: one year file writes one facts row",
    ).toHaveLength(1);
    const factsRow = intakeRepository.facts[0] as FakeFactsRow;
    expect(
      factsRow.intakeDocumentId,
      "the facts row names its intake row",
    ).toBe(row.id);
    expect(factsRow.formType, "the facts row keeps the type key").toBe("wht-filing-pnd1");
    expect(factsRow.taxYear, "the facts row keeps the CE tax year").toBe(2024);
    expect(
      factsRow.facts.payeeCount,
      "the facts row keeps the parsed fact values",
    ).toBe(12);
  });

  it("writes no submission, no submit audit row, and no close row (submissions_written=0)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const { entriesByFolder, files } = buildSingleDrive(PND1_TEXT);
    const drive = createFakeDrive(entriesByFolder, files);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    await intake(
      buildHistoryRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );
    const submitAuditRows = submissionRepository.auditActions.filter(
      (action) => action === "submit",
    );
    const closeCalls = intakeRepository.calls.filter((call) => /close/iu.test(call));
    // The no-write scan is meaningful only when the history mode wrote the
    // parsed year-file row first. A run that writes nothing at all must not
    // pass this row (A4).
    expect(
      intakeRepository.rows.length,
      "the history mode must write the parsed year-file row before the no-write scan",
    ).toBe(1);
    const row = intakeRepository.rows[0] as FakeIntakeRow | undefined;
    expect(row?.status, "the year-file row must reach parsed").toBe("parsed");
    expect(row?.isHistory, "the parsed row is the year-file row").toBe(true);
    console.log(`submissions_written=${submissionRepository.submissions.length}`);
    console.log(`submit_audit_rows=${submitAuditRows.length}`);
    console.log(`close_rows=${closeCalls.length}`);
    expect(submissionRepository.submissions, "submissions_written=0").toEqual([]);
    expect(submitAuditRows, "submit_audit_rows=0").toEqual([]);
    expect(closeCalls, "close_rows=0").toEqual([]);
  });

  it("adds no row on a second run (second_run_rows_added=0)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const { entriesByFolder, files } = buildSingleDrive(PND1_TEXT);
    const drive = createFakeDrive(entriesByFolder, files);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    const request = buildHistoryRequest({
      drive,
      evidenceStore,
      intakeRepository,
      submissionRepository,
    });
    await intake(request);
    const rowsAfterFirstRun = intakeRepository.rows.length;
    const factsAfterFirstRun = intakeRepository.facts.length;
    await intake(request);
    console.log(
      `second_run_rows_added=${intakeRepository.rows.length - rowsAfterFirstRun}`,
    );
    expect(
      intakeRepository.rows.length - rowsAfterFirstRun,
      "second_run_rows_added=0: the Drive file id is the idempotency key",
    ).toBe(0);
    expect(
      intakeRepository.facts.length,
      "a second run adds no second facts row",
    ).toBe(factsAfterFirstRun);
    expect(rowsAfterFirstRun, "the first run writes one row").toBe(1);
  });

  it("marks a second byte-equal file a duplicate of the first row (duplicate_facts_rows=0)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const first = makeFile(1, PND1_TEXT);
    const second = makeFile(2, PND1_TEXT);
    const rootEntries: FakeEntry[] = EXPECTED_FOLDER_NAMES.map((name, index) => ({
      id: NAMED_FOLDER_IDS[index] ?? "",
      name,
      mimeType: FOLDER_MIME_TYPE,
    }));
    const entriesByFolder = new Map<string, readonly FakeEntry[]>();
    entriesByFolder.set(ROOT_FOLDER_ID, rootEntries);
    for (const [index, folderId] of NAMED_FOLDER_IDS.entries()) {
      entriesByFolder.set(folderId, index === 0 ? [first, second] : []);
    }
    const drive = createFakeDrive(entriesByFolder, [first, second]);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    await intake(
      buildHistoryRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );

    expect(
      intakeRepository.rows.length,
      "two byte-equal files write two intake rows",
    ).toBe(2);
    const duplicateRow = intakeRepository.rows.find(
      (row) => row.status === "duplicate",
    );
    expect(duplicateRow, "the second file writes status duplicate").toBeDefined();
    const firstRow = intakeRepository.rows.find(
      (row) => row.status === "parsed",
    );
    expect(
      duplicateRow?.duplicateOfIntakeDocumentId,
      "the duplicate row names the first intake row",
    ).toBe(firstRow?.id);
    expect(
      duplicateRow?.duplicateOfSubmissionId,
      "the duplicate row names no submission",
    ).toBeNull();
    console.log(`duplicate_facts_rows=${intakeRepository.facts.length}`);
    expect(
      intakeRepository.facts,
      "duplicate_facts_rows=0: a duplicate writes no facts row",
    ).toHaveLength(1);
  });

  it("keeps a parsed year-file row a pass 2 candidate, a byte-equal year file matches it, and a voucher lookup skips it (year_file_pass2_candidate=1)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const first = makeFile(1, PND1_TEXT);
    const second = makeFile(2, PND1_TEXT);
    const rootEntries: FakeEntry[] = EXPECTED_FOLDER_NAMES.map((name, index) => ({
      id: NAMED_FOLDER_IDS[index] ?? "",
      name,
      mimeType: FOLDER_MIME_TYPE,
    }));
    const entriesByFolder = new Map<string, readonly FakeEntry[]>();
    entriesByFolder.set(ROOT_FOLDER_ID, rootEntries);
    for (const [index, folderId] of NAMED_FOLDER_IDS.entries()) {
      entriesByFolder.set(folderId, index === 0 ? [first, second] : []);
    }
    const drive = createFakeDrive(entriesByFolder, [first, second]);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    await intake(
      buildHistoryRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );

    const firstRow = intakeRepository.rows.find((row) => row.status === "parsed");
    expect(firstRow, "the first year file writes a parsed row").toBeDefined();
    expect(
      firstRow?.submissionId,
      "year_file_pass2_candidate=1: the parsed year-file row names no submission and stays a pass 2 candidate (spec section 5.5)",
    ).toBeNull();

    const duplicateRow = intakeRepository.rows.find(
      (row) => row.status === "duplicate",
    );
    expect(
      duplicateRow?.duplicateOfIntakeDocumentId,
      "a first byte-equal year file matches the year-file row through duplicate_of_intake_document_id",
    ).toBe(firstRow?.id);
    const yearFileMatches = intakeRepository.rows.filter(
      (row) => row.duplicateOfIntakeDocumentId === firstRow?.id,
    );
    console.log(`year_file_pass2_matches=${yearFileMatches.length}`);
    expect(yearFileMatches.length, "one byte-equal year file gives one match").toBe(1);

    const voucher = makeFile(70, PND1_TEXT, "2026-01_receipt_fake-70.pdf");
    const pollDrive = createFakeDrive(
      new Map([[ROOT_FOLDER_ID, [voucher]]]),
      [voucher],
    );
    await intake(
      buildPollRequest({
        drive: pollDrive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );
    const voucherRow = intakeRepository.rows.find(
      (row) => row.driveFileId === voucher.id,
    );
    expect(
      voucherRow,
      "the voucher candidate must write its own intake row (spec sections 5.5 and 5.7)",
    ).toBeDefined();
    expect(
      voucherRow?.status,
      "a voucher lookup still skips the year-file row: the voucher row is not a duplicate",
    ).not.toBe("duplicate");
    expect(
      voucherRow?.duplicateOfIntakeDocumentId,
      "a voucher lookup still skips the year-file row: it names no year-file row",
    ).toBeNull();
  });

  it("does not match a voucher candidate to a year file (voucher_to_year_file_matches=0)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const yearFileText = PND1_TEXT;
    const { entriesByFolder, files } = buildSingleDrive(yearFileText);
    const drive = createFakeDrive(entriesByFolder, files);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    await intake(
      buildHistoryRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );
    const yearRow = intakeRepository.rows[0] as FakeIntakeRow | undefined;
    expect(
      intakeRepository.rows.length,
      "the history run must write the year-file row before the voucher run",
    ).toBe(1);
    expect(
      yearRow?.status,
      "the year file is parsed before the voucher run",
    ).toBe("parsed");

    // A voucher candidate must pass the file-name rule of spec section 5.7,
    // or the poll skips it before pass 2 and the row proves nothing.
    const voucher = makeFile(70, yearFileText, "2026-01_receipt_fake-70.pdf");
    const pollDrive = createFakeDrive(
      new Map([[ROOT_FOLDER_ID, [voucher]]]),
      [voucher],
    );
    await intake(
      buildPollRequest({
        drive: pollDrive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );
    const voucherRow = intakeRepository.rows.find(
      (row) => row.driveFileId === voucher.id,
    );
    expect(
      voucherRow,
      "the voucher candidate must write its own intake row (spec sections 5.5 and 5.7)",
    ).toBeDefined();
    const matches = intakeRepository.rows.filter(
      (row) => row.duplicateOfIntakeDocumentId === yearRow?.id,
    );
    console.log(`voucher_to_year_file_matches=${matches.length}`);
    expect(
      matches,
      "voucher_to_year_file_matches=0: a voucher candidate does not match a year-file row (spec section 5.5)",
    ).toEqual([]);
    expect(
      voucherRow?.status,
      "the voucher row must not be a duplicate of the year-file row",
    ).not.toBe("duplicate");
    expect(
      voucherRow?.duplicateOfIntakeDocumentId,
      "the voucher row names no year-file row as its duplicate target",
    ).toBeNull();
  });

  it("does not match a year file to a submission (year_file_to_submission_matches=0)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const { entriesByFolder, files } = buildSingleDrive(PND1_TEXT);
    const drive = createFakeDrive(entriesByFolder, files);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    const file = files[0] as FakeFile;
    const putEvidence = evidenceStore.port.put as (input: {
      readonly companyId: string;
      readonly contentType: string;
      readonly body: Uint8Array;
    }) => Promise<{ readonly evidenceReference: string }>;
    const submissionEvidence = await putEvidence({
      companyId: COMPANY_ID,
      contentType: PDF_MIME_TYPE,
      body: file.body,
    });
    expect(
      submissionEvidence.evidenceReference,
      "the seeded submission holds the same bytes as the year file",
    ).toBeDefined();

    await intake(
      buildHistoryRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );
    const matches = intakeRepository.rows.filter(
      (row) => row.status === "duplicate",
    );
    console.log(`year_file_to_submission_matches=${matches.length}`);
    expect(
      matches,
      "year_file_to_submission_matches=0: pass 1 does not run for a year file",
    ).toEqual([]);
    expect(
      intakeRepository.rows[0]?.status,
      "the year file stays parsed",
    ).toBe("parsed");
  });

  it("lists a file with no readable period and writes no row (unreadable_period_rows_written=0)", async () => {
    const intake = await requireIntake();
    if (intake === undefined) return;
    const { entriesByFolder, files } = buildSingleDrive(PND1_NO_PERIOD_TEXT);
    const drive = createFakeDrive(entriesByFolder, files);
    const evidenceStore = createFakeEvidenceStore();
    const intakeRepository = createFakeIntakeRepository();
    const submissionRepository = createFakeSubmissionRepository();
    const result = await intake(
      buildHistoryRequest({
        drive,
        evidenceStore,
        intakeRepository,
        submissionRepository,
      }),
    );
    console.log(`unreadable_period_rows_written=${intakeRepository.rows.length}`);
    expect(
      intakeRepository.rows,
      "unreadable_period_rows_written=0: a file with no readable period writes no row",
    ).toEqual([]);
    expect(
      intakeRepository.facts,
      "a file with no readable period writes no facts row",
    ).toEqual([]);
    const unmatched = result.unmatched;
    expect(
      Array.isArray(unmatched),
      "the history result must list the files with no readable period",
    ).toBe(true);
    const entry = (unmatched as readonly Record<string, unknown>[])[0];
    expect(
      entry?.reason,
      "the listed file names the reason period-unreadable",
    ).toBe("period-unreadable");
  });
});

describe("the Drive port stays read-only", () => {
  it("holds no write member in the adapter and calls none in the walk (drive_write_members=0)", async () => {
    const adapterSource = await loadAdapterSource();
    const writeCall = /files\.(create|update|delete|copy|move)\s*\(/u;
    const writeMembers = adapterSource.match(writeCall) ?? [];
    console.log(`drive_write_members=${writeMembers.length}`);
    expect(
      writeMembers,
      "drive_write_members=0: the Drive adapter holds no create, update, delete, copy, or move call",
    ).toEqual([]);

    const walk = await requireWalk();
    if (walk === undefined) return;
    const { entriesByFolder, files } = buildMainDrive();
    const drive = createFakeDrive(entriesByFolder, files);
    await walk({ folderId: ROOT_FOLDER_ID, source: drive.source });
    const calledMembers = Object.entries(drive.calls)
      .filter(([, calls]) => calls.length > 0)
      .map(([member]) => member);
    expect(
      calledMembers.sort(),
      "the walk calls the read members listFolderEntries and no write member",
    ).toEqual(["listFolderEntries"]);
  });
});

/**
 * Reads the Drive adapter source text.
 * @returns The adapter source.
 */
async function loadAdapterSource(): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const href = new URL("../drive-document-source.ts", import.meta.url);
  return readFile(href, "utf8");
}
