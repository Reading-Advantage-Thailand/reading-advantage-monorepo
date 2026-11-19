// @vitest-environment node
/**
 * Red tests for the year-file dry-run structure report of the track
 * `accounting_drive_intake_20261109` (plan task 10.5, FR-30, spec section 9b).
 *
 * The module `packages/backend/src/modules/accounting/intake.ts` holds the walk
 * and the history mode of tasks 10.4. The dry-run function does not exist at
 * this base, so every row loads the module through a soft loader and fails on
 * an assertion that names the missing export `dryRunAccountingYearFiles`.
 * No row fails on a bare load error.
 *
 * The contract this file pins for the Green task 10.6:
 *
 *   dryRunAccountingYearFiles(request: {
 *     actor, folderId, source, textLayer, evidenceStore, intakeRepository,
 *     submissionRepository, localReader, extraction,  // the intake ports
 *     reportDir: string,        // the folder that receives the report file
 *   }): Promise<{ reportPath: string; report: string }>
 *
 * The dry-run calls the one walk function `walkAccountingYearFiles` of task
 * 10.4 and adds no second walk. It writes no database row, calls no evidence
 * store, and calls no model. It compares duplicates in memory: byte length
 * first, then byte equality (spec section 5.4).
 *
 * The report holds:
 * - the marker line `anonymized: no amount, no tax id, no payee, no file name,
 *   no Drive id`;
 * - one data row per file, nine fields separated by ` | `:
 *     file-NNN | folder=<name> | bytes=<n> | type=<key|unmatched>
 *       | kind=<form|attachment|receipt|statement|none>
 *       | period=<start..end|period-unreadable> | text-layer=<yes|no>
 *       | facts=<name[,name...] | none> | duplicate-group=<n>
 *   The facts field holds fact names only, never a value.
 * - seven count lines that start with `count `: by subfolder, by type, by
 *   period, with a text layer, without a text layer, unmatched, and duplicate
 *   groups.
 *
 * The log holds one JSON count line per subfolder and per type with
 * `event: "dry_run_count"`, `scope: "subfolder" | "type"`, `name`, and `files`.
 *
 * Every port is a fake. No row reads a real Drive folder, a real file, or a
 * real database. The Drive ids are `fake-drive-<n>`, the file names are
 * `fake-file-<n>.pdf`, and the text is synthetic with sentinel values only.
 * The report folder of every row is a temp folder; this file names no default
 * report path (the runner of task 10.6 takes the folder as an argument).
 *
 * Anti-pattern coverage:
 * - A2: the marker row asserts the anonymized line of the report.
 * - A3: every count is a labeled integer (`dry_run_files=6`,
 *   `report_fields_per_file=9`, `count_sections=7`, `duplicate_groups=1`,
 *   `walk_calls=1`, `db_writes=0`, `no_text_layer_rows=1`, `count_log_lines=7`).
 * - A4: a row that scans for no writes, no calls, or no tokens first asserts
 *   that the run processed its files and logged its count lines, so an empty
 *   run cannot pass.
 * - A7: the banned-token scans use sentinel literals and id patterns only and
 *   run once over a counterexample report that holds every sentinel.
 * - A9: the report path rows use temp folders and the file scans its own
 *   source for the default report path and must find none.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

/**
 * The five full names of the real layout, in the order of the table (PM
 * 2026-11-14 04:2x, task 10.12). Position 0 sits directly in the root; the
 * positions 1 to 4 sit inside the parent folder.
 */
const EXPECTED_FOLDER_NAMES = [
  "Fwd: เอกสารปี 2567 (Fwd: Document from 2024)",
  "Fwd: เอกสารปี 2568 (Fwd: Document from 2025)",
  "Fwd: เอกสารปี 2568-1 (Fwd: Document Year 2025-1)",
  "Fwd: เอกสารปี 2568-2 (Fwd: Document Year 2025-2)",
  "Fwd: เอกสารปี 2568-3 (Fwd: Document Year 2025-3)",
] as const;

/** The one parent folder that holds the four 2568 folders. */
const EXPECTED_PARENT_FOLDER_NAME = "เอกสารบัญชีรายปี";

/** The session actor of the dry run. */
const ACTOR = {
  accountId: ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "ACCOUNTANT",
};

/** The marker line of the report (A2). */
const ANONYMIZED_MARKER =
  "anonymized: no amount, no tax id, no payee, no file name, no Drive id";

/** The exact line that makes the fake text-layer reader return null. */
const NO_TEXT_LAYER_MARKER = "no text layer";

/** The expected number of dry-run files of the fixture set. */
const EXPECTED_DRY_RUN_FILES = 6;
/** The expected number of fields of one report row. */
const EXPECTED_FIELDS_PER_FILE = 9;
/** The expected number of count sections of the report. */
const EXPECTED_COUNT_SECTIONS = 7;
/** The expected number of duplicate groups of the fixture set. */
const EXPECTED_DUPLICATE_GROUPS = 1;

/** A synthetic PND.1 monthly text for month 1 of BE 2567, sentinels only. */
const PND1_MONTH1_TEXT = [
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
  "ผู้ลงนาม: Test Personname",
].join("\n");

/** A synthetic PND.1 monthly text for month 2 of BE 2567, sentinels only. */
const PND1_MONTH2_TEXT = [
  "no real sample",
  "แบบ ภ.ง.ด.1 รายการภาษีที่หัก ณ ที่จ่าย ประจำเดือน",
  "ประจำเดือนที่ 2 กุมภาพันธ์ 2567",
  "ช่วงเวลา 1 กุมภาพันธ์ 2567 ถึง 29 กุมภาพันธ์ 2567",
  "จำนวนผู้มีรายได้ (ราย): 12",
  "เงินที่จ่ายทั้งสิ้น (บาท): 1,234.56",
  "ภาษีที่หักได้ (บาท): 100.00",
  "เงินเพิ่ม (บาท): 100.00",
  "เงินภาษีที่นำส่ง (บาท): 7,890.12",
  "ชื่อผู้จ่ายเงิน: Test Counterparty",
  "เลขประจำตัวผู้เสียภาษี: 0000000000000",
  "ผู้ลงนาม: Test Personname",
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

/** A synthetic text that matches no year-file type. */
const UNKNOWN_TYPE_TEXT = [
  "no real sample",
  "หนังสือเชิญประชุมประจำปี",
].join("\n");

/** A synthetic body whose fake text layer is unreadable. */
const NO_TEXT_LAYER_TEXT = ["no real sample", NO_TEXT_LAYER_MARKER].join("\n");

/** One fixture file of the dry-run set: index, subfolder position, and text. */
const DRY_RUN_FILES = [
  { index: 1, folder: 0, text: PND1_MONTH1_TEXT },
  { index: 2, folder: 0, text: PND1_MONTH1_TEXT },
  { index: 3, folder: 1, text: PND1_NO_PERIOD_TEXT },
  { index: 4, folder: 2, text: UNKNOWN_TYPE_TEXT },
  { index: 5, folder: 3, text: NO_TEXT_LAYER_TEXT },
  { index: 6, folder: 4, text: PND1_MONTH2_TEXT },
] as const;

/** The serials of the report rows, in walk order. */
const EXPECTED_SERIALS = [
  "file-001",
  "file-002",
  "file-003",
  "file-004",
  "file-005",
  "file-006",
];

/** The fact names that the PND.1 monthly parser reads. */
const PND1_FACT_NAMES = [
  "payeeCount",
  "totalPaid",
  "totalTaxWithheld",
  "surcharge",
  "totalRemitted",
];

/** The period field of a parsed month 1 file. */
const MONTH1_PERIOD = "2024-01-01..2024-01-31";
/** The period field of a parsed month 2 file. */
const MONTH2_PERIOD = "2024-02-01..2024-02-29";

/** The count labels of the seven count sections. */
const COUNT_LABELS = [
  "by subfolder",
  "by type",
  "by period",
  "with a text layer",
  "without a text layer",
  "unmatched",
  "duplicate groups",
] as const;

const NAMED_SUBFOLDERS = EXPECTED_FOLDER_NAMES.length;
if (NAMED_SUBFOLDERS !== 5) {
  throw new Error(`named_subfolders=${NAMED_SUBFOLDERS} is wrong; spec section 9b names five.`);
}
console.log(`named_subfolders=${NAMED_SUBFOLDERS}`);

/** The subfolder ids of the fake listing, one for each name. */
const NAMED_FOLDER_IDS = EXPECTED_FOLDER_NAMES.map(
  (_name, index) => `fake-drive-folder-${index + 1}`,
);

/** The id of the parent folder of the fake listing. */
const PARENT_FOLDER_ID = "fake-drive-folder-80";

/** The sentinel tokens of the banned-value scans (P10.5). */
const AMOUNT_SENTINELS = ["1,234.56", "7,890.12", "100.00"] as const;
const TAX_ID_SENTINELS = ["0000000000000"] as const;
const PAYEE_SENTINELS = ["Test Counterparty"] as const;
const PERSON_NAME_SENTINELS = ["Test Personname"] as const;
/** The file-name and Drive-id patterns of the banned-value scans. */
const FILE_NAME_PATTERN = /fake-file-\d+\.pdf/u;
const DRIVE_ID_PATTERN = /fake-drive-/u;

/** One counterexample report that holds every sentinel (A3, A7). */
const COUNTEREXAMPLE_REPORT = [
  "amount 1,234.56",
  "amount 7,890.12",
  "amount 100.00",
  "tax id 0000000000000",
  "payee Test Counterparty",
  "person Test Personname",
  "file fake-file-1.pdf",
  "id fake-drive-root",
].join("\n");

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

/** One fake row of `accounting_year_file_facts`. */
interface FakeFactsRow {
  readonly intakeDocumentId: string;
  readonly formType: string;
  readonly filingKind: string;
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
  /** The read-only source port of the walk. */
  readonly source: Record<string, unknown>;
  /** The recorded calls. */
  readonly calls: FakeDriveCalls;
}

/** One fake intake repository with its recorded calls. */
interface FakeIntakeRepository {
  readonly port: Record<string, unknown>;
  readonly calls: string[];
  readonly rows: Record<string, unknown>[];
  readonly facts: FakeFactsRow[];
}

/** One fake evidence store with its recorded calls. */
interface FakeEvidenceStore {
  readonly port: Record<string, unknown>;
  readonly calls: string[];
}

/** One fake submission repository with its recorded writes. */
interface FakeSubmissionRepository {
  readonly port: Record<string, unknown>;
  readonly submissions: Record<string, unknown>[];
}

/** One failing extraction port with its recorded calls. */
interface FakeExtraction {
  readonly port: Record<string, unknown>;
  readonly count: { value: number };
}

/** The function type of the dry run. */
type DryRunFunction = (
  request: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/** One full dry-run outcome over fakes. */
interface DryRunOutcome {
  readonly reportPath: string;
  readonly report: string;
  readonly drive: FakeDrive;
  readonly evidenceStore: FakeEvidenceStore;
  readonly intakeRepository: FakeIntakeRepository;
  readonly submissionRepository: FakeSubmissionRepository;
  readonly extraction: FakeExtraction;
  readonly logLines: readonly string[];
  readonly tempDir: string;
}

/** The temp folders of this run; one `afterAll` removes them all. */
const TEMP_DIRS: string[] = [];
afterAll(() => {
  for (const dir of TEMP_DIRS) rmSync(dir, { recursive: true, force: true });
});

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
 * Requires the one dry-run function and fails with its name.
 * @returns The dry-run function, or undefined after a failed assertion.
 */
async function requireDryRun(): Promise<DryRunFunction | undefined> {
  const module = await loadIntakeModule();
  const dryRun = module["dryRunAccountingYearFiles"];
  expect(
    dryRun,
    "The module packages/backend/src/modules/accounting/intake.ts does not export dryRunAccountingYearFiles. Plan task 10.6 adds it (FR-30).",
  ).toBeDefined();
  expect(
    typeof dryRun,
    "The module packages/backend/src/modules/accounting/intake.ts does not export the function dryRunAccountingYearFiles",
  ).toBe("function");
  return typeof dryRun === "function"
    ? (dryRun as DryRunFunction)
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
 * @returns The fake file.
 */
function makeFile(index: number, text: string): FakeFile {
  const body = Buffer.from(text, "utf8");
  return {
    id: `fake-drive-${index}`,
    name: `fake-file-${index}.pdf`,
    mimeType: PDF_MIME_TYPE,
    byteSize: body.byteLength,
    body,
  };
}

/**
 * Builds the folder map of the real layout: the first named folder and the
 * parent folder in the root, and the four 2568 folders inside the parent.
 * @param entriesOfFolder The entries inside each named folder, by position.
 * @returns The folder map.
 */
function buildLayoutMap(
  entriesOfFolder: (index: number) => readonly FakeEntry[],
): Map<string, readonly FakeEntry[]> {
  const named: FakeEntry[] = EXPECTED_FOLDER_NAMES.map((name, index) => ({
    id: NAMED_FOLDER_IDS[index] ?? "",
    name,
    mimeType: FOLDER_MIME_TYPE,
  }));
  const entriesByFolder = new Map<string, readonly FakeEntry[]>();
  entriesByFolder.set(ROOT_FOLDER_ID, [
    ...named.slice(0, 1),
    {
      id: PARENT_FOLDER_ID,
      name: EXPECTED_PARENT_FOLDER_NAME,
      mimeType: FOLDER_MIME_TYPE,
    },
  ]);
  entriesByFolder.set(PARENT_FOLDER_ID, named.slice(1));
  for (const [index, folderId] of NAMED_FOLDER_IDS.entries()) {
    entriesByFolder.set(folderId, entriesOfFolder(index));
  }
  return entriesByFolder;
}

/**
 * Builds the dry-run fake Drive in the real layout: the five named folders
 * with the fixture files of `DRY_RUN_FILES`.
 * @returns The folder map and the files.
 */
function buildDryRunDrive(): {
  readonly entriesByFolder: ReadonlyMap<string, readonly FakeEntry[]>;
  readonly files: readonly FakeFile[];
} {
  const files = DRY_RUN_FILES.map((spec) => makeFile(spec.index, spec.text));
  const entriesByFolder = buildLayoutMap((index) =>
    files.filter((_file, fileIndex) => DRY_RUN_FILES[fileIndex]?.folder === index),
  );
  return { entriesByFolder, files };
}

/**
 * Builds one fake intake repository that records every call.
 * @returns The fake repository.
 */
function createFakeIntakeRepository(): FakeIntakeRepository {
  const calls: string[] = [];
  const rows: Record<string, unknown>[] = [];
  const facts: FakeFactsRow[] = [];
  const port: Record<string, unknown> = {
    /** Records one intake row insert. */
    async insert(draft: Record<string, unknown>): Promise<Record<string, unknown>> {
      calls.push("insert");
      const row = { ...draft };
      rows.push(row);
      return row;
    },
    /** Finds no row by its Drive file id. */
    async findByDriveFileId(): Promise<undefined> {
      calls.push("findByDriveFileId");
      return undefined;
    },
    /** Lists no row of one byte length. */
    async findByEvidenceByteSize(): Promise<readonly never[]> {
      calls.push("findByEvidenceByteSize");
      return [];
    },
    /** Lists no submission evidence. */
    async listRecentSubmissionEvidence(): Promise<readonly never[]> {
      calls.push("listRecentSubmissionEvidence");
      return [];
    },
    /** Records one duplicate mark. */
    async markDuplicate(): Promise<undefined> {
      calls.push("markDuplicate");
      return undefined;
    },
    /** Records one duplicate-of-intake mark. */
    async markDuplicateOfIntakeDocument(): Promise<undefined> {
      calls.push("markDuplicateOfIntakeDocument");
      return undefined;
    },
    /** Records one parsed mark. */
    async markParsed(): Promise<undefined> {
      calls.push("markParsed");
      return undefined;
    },
    /** Records one year-file parsed mark. */
    async markYearFileParsed(): Promise<undefined> {
      calls.push("markYearFileParsed");
      return undefined;
    },
    /** Records one failed mark. */
    async markFailed(): Promise<undefined> {
      calls.push("markFailed");
      return undefined;
    },
    /** Records one sighting bump. */
    async bumpSighting(): Promise<undefined> {
      calls.push("bumpSighting");
      return undefined;
    },
    /** Records one facts row insert. */
    async insertYearFileFacts(input: Record<string, unknown>): Promise<FakeFactsRow> {
      calls.push("insertYearFileFacts");
      const row: FakeFactsRow = {
        intakeDocumentId: String(input.intakeDocumentId),
        formType: String(input.formType),
        filingKind: String(input.filingKind),
        facts: (input.facts as Record<string, unknown> | undefined) ?? {},
      };
      facts.push(row);
      return row;
    },
  };
  return { port, calls, rows, facts };
}

/**
 * Builds one fake evidence store that records every call and then fails, so a
 * dry-run that calls the store breaks loudly.
 * @returns The fake store.
 */
function createFakeEvidenceStore(): FakeEvidenceStore {
  const calls: string[] = [];
  const port: Record<string, unknown> = {
    /** Records one put call and fails: the dry-run must call no store. */
    async put(): Promise<never> {
      calls.push("put");
      throw new Error("fake: the dry-run must call no evidence store");
    },
    /** Records one read call and fails. */
    async read(): Promise<never> {
      calls.push("read");
      throw new Error("fake: the dry-run must call no evidence store");
    },
    /** Records one byte compare and fails. */
    async sameEvidenceBytes(): Promise<never> {
      calls.push("sameEvidenceBytes");
      throw new Error("fake: the dry-run must call no evidence store");
    },
  };
  return { port, calls };
}

/**
 * Builds one fake submission repository that records every write.
 * @returns The fake repository.
 */
function createFakeSubmissionRepository(): FakeSubmissionRepository {
  const submissions: Record<string, unknown>[] = [];
  const port: Record<string, unknown> = {
    /** Records one submission insert. */
    async insert(submission: Record<string, unknown>): Promise<Record<string, unknown>> {
      submissions.push(submission);
      return submission;
    },
  };
  return { port, submissions };
}

/**
 * Builds a model port that records its calls and fails: no dry-run row may
 * call the model.
 * @returns The extraction port and its call count.
 */
function createFailingExtraction(): FakeExtraction {
  const count = { value: 0 };
  const port: Record<string, unknown> = {
    /** Records one model call and fails. */
    async extract(): Promise<never> {
      count.value += 1;
      throw new Error("fake: the dry-run must call no model");
    },
  };
  return { port, count };
}

/**
 * Builds the local reader stub of the poll ports.
 * @returns The local reader port.
 */
function createFakeLocalReader(): Record<string, unknown> {
  return {
    /** Returns one fake draft; the dry-run must not need it. */
    async read(): Promise<Record<string, unknown>> {
      return { kind: "text", draft: {} };
    },
  };
}

/**
 * Builds one fake text-layer reader that decodes the file bytes as UTF-8 and
 * returns null for the body that carries the unreadable marker.
 * @returns The text-layer port.
 */
function createFakeTextLayer(): Record<string, unknown> {
  return {
    /** Reads the text layer of one file body. */
    async read(input: { readonly body: Uint8Array }): Promise<{ readonly text: string | null }> {
      const text = Buffer.from(input.body).toString("utf8");
      if (text.includes(NO_TEXT_LAYER_MARKER)) return { text: null };
      return { text };
    },
  };
}

/**
 * Captures the log lines that one dry-run writes through `console.log`.
 * @returns The captured lines and the restore function.
 */
function captureLogLines(): { readonly lines: string[]; readonly restore: () => void } {
  const lines: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map((item) => String(item)).join(" "));
  });
  return { lines, restore: () => spy.mockRestore() };
}

/**
 * Runs one dry run over fresh fakes and one temp folder.
 * @returns The outcome of the run.
 */
async function runDryRun(): Promise<DryRunOutcome> {
  const dryRun = await requireDryRun();
  if (dryRun === undefined) throw new Error("dryRunAccountingYearFiles is missing");
  const tempDir = mkdtempSync(join(tmpdir(), "accounting-dry-run-"));
  TEMP_DIRS.push(tempDir);
  const { entriesByFolder, files } = buildDryRunDrive();
  const drive = createFakeDrive(entriesByFolder, files);
  const evidenceStore = createFakeEvidenceStore();
  const intakeRepository = createFakeIntakeRepository();
  const submissionRepository = createFakeSubmissionRepository();
  const extraction = createFailingExtraction();
  const captured = captureLogLines();
  let result: Record<string, unknown>;
  try {
    result = await dryRun({
      actor: ACTOR,
      folderId: ROOT_FOLDER_ID,
      source: drive.source,
      textLayer: createFakeTextLayer(),
      evidenceStore: evidenceStore.port,
      intakeRepository: intakeRepository.port,
      submissionRepository: submissionRepository.port,
      localReader: createFakeLocalReader(),
      extraction: extraction.port,
      reportDir: tempDir,
    });
  } finally {
    captured.restore();
  }
  return {
    reportPath: String(result.reportPath),
    report: String(result.report),
    drive,
    evidenceStore,
    intakeRepository,
    submissionRepository,
    extraction,
    logLines: captured.lines,
    tempDir,
  };
}

/**
 * Returns the data rows of one report.
 * @param report The report text.
 * @returns The lines that start with one serial.
 */
function parseReportRows(report: string): string[] {
  return report.split("\n").filter((line) => /^file-\d{3} \| /u.test(line));
}

/**
 * Reads one field of one report row.
 * @param row The row line.
 * @param prefix The field prefix, with its `=` sign.
 * @returns The field value, or null when the row holds no such field.
 */
function readField(row: string, prefix: string): string | null {
  const part = row.split(" | ").find((candidate) => candidate.startsWith(prefix));
  return part === undefined ? null : part.slice(prefix.length);
}

/**
 * Reads one integer count line of one report.
 * @param report The report text.
 * @param label The label after `count `.
 * @returns The integer of the line, after two assertions.
 */
function requireCountValue(report: string, label: string): number {
  const prefix = `count ${label}: `;
  const line = report
    .split("\n")
    .find((candidate) => candidate.startsWith(prefix));
  expect(
    line,
    `the report must hold the count line "count ${label}: "`,
  ).toBeDefined();
  const value = Number.parseInt(line?.slice(prefix.length) ?? "", 10);
  expect(
    Number.isInteger(value),
    `the count line "count ${label}: " must hold one integer, got "${line?.slice(prefix.length)}"`,
  ).toBe(true);
  return value;
}

/**
 * Reads the keyed entries of one keyed count line.
 * @param report The report text.
 * @param label The label after `count `.
 * @returns The entries as a map of name to count.
 */
function requireCountEntries(report: string, label: string): ReadonlyMap<string, number> {
  const prefix = `count ${label}: `;
  const line = report
    .split("\n")
    .find((candidate) => candidate.startsWith(prefix));
  expect(
    line,
    `the report must hold the count line "count ${label}: "`,
  ).toBeDefined();
  const entries = new Map<string, number>();
  for (const entry of (line?.slice(prefix.length) ?? "").split("; ")) {
    const cut = entry.lastIndexOf("=");
    if (cut === -1) continue;
    const value = Number.parseInt(entry.slice(cut + 1), 10);
    expect(
      Number.isInteger(value),
      `the count entry "${entry}" of "${label}" must hold one integer`,
    ).toBe(true);
    entries.set(entry.slice(0, cut), value);
  }
  return entries;
}

/**
 * Counts the non-overlapping hits of one literal sentinel.
 * @param text Text to scan.
 * @param sentinel Sentinel to count.
 * @returns The number of hits.
 */
function countLiteralHits(text: string, sentinel: string): number {
  return text.split(sentinel).length - 1;
}

/**
 * Counts the hits of one global pattern.
 * @param text Text to scan.
 * @param pattern Pattern to count.
 * @returns The number of hits.
 */
function countPatternHits(text: string, pattern: RegExp): number {
  return text.match(new RegExp(pattern.source, "gu"))?.length ?? 0;
}

/**
 * Runs the banned-token scan over one text (A3, A7): sentinel literals and id
 * patterns only, no English exclusion word.
 * @param text Text to scan.
 * @returns The hit counts of the six sentinel classes.
 */
function scanBannedTokens(text: string): {
  amount: number;
  taxId: number;
  payee: number;
  personName: number;
  fileName: number;
  driveId: number;
} {
  return {
    amount: AMOUNT_SENTINELS.reduce(
      (total, sentinel) => total + countLiteralHits(text, sentinel),
      0,
    ),
    taxId: TAX_ID_SENTINELS.reduce(
      (total, sentinel) => total + countLiteralHits(text, sentinel),
      0,
    ),
    payee: PAYEE_SENTINELS.reduce(
      (total, sentinel) => total + countLiteralHits(text, sentinel),
      0,
    ),
    personName: PERSON_NAME_SENTINELS.reduce(
      (total, sentinel) => total + countLiteralHits(text, sentinel),
      0,
    ),
    fileName: countPatternHits(text, FILE_NAME_PATTERN),
    driveId: countPatternHits(text, DRIVE_ID_PATTERN),
  };
}

/**
 * Parses the JSON log records of one captured log.
 * @param lines The captured lines.
 * @returns The lines that parse as one JSON object.
 */
function parseLogRecords(lines: readonly string[]): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed !== null && typeof parsed === "object") {
        records.push(parsed as Record<string, unknown>);
      }
    } catch {
      // A line that is no JSON object is no log record of the dry run.
    }
  }
  return records;
}

describe("the year-file dry-run surface (FR-30)", () => {
  it("exports one dry-run function and no second walk (dry_run_functions=1, second_walk_functions=0)", async () => {
    const module = await loadIntakeModule();
    const functionNames = Object.entries(module)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name);
    const dryRunNames = functionNames.filter((name) => /dryrun/iu.test(name));
    const walkNames = functionNames.filter((name) => /walk/iu.test(name));
    const secondWalkFunctions = walkNames.filter(
      (name) => name !== "walkAccountingYearFiles",
    ).length;
    console.log(`dry_run_functions=${dryRunNames.length}`);
    console.log(`second_walk_functions=${secondWalkFunctions}`);
    expect(
      dryRunNames,
      "dry_run_functions=1: the module must export exactly one dry-run function, dryRunAccountingYearFiles (plan task 10.6, FR-30)",
    ).toEqual(["dryRunAccountingYearFiles"]);
    expect(
      secondWalkFunctions,
      "second_walk_functions=0: the dry-run must add no walk function; the import and the dry-run call walkAccountingYearFiles (FR-29)",
    ).toBe(0);
    expect(
      walkNames,
      "the one walk function of task 10.4 must stay exported",
    ).toContain("walkAccountingYearFiles");
  });
});

describe("the dry-run report rows (FR-30)", () => {
  it("lists every file with its nine fields (dry_run_files=6, report_fields_per_file=9)", async () => {
    const run = await runDryRun();
    const rows = parseReportRows(run.report);
    console.log(`dry_run_files=${rows.length}`);
    expect(
      rows.length,
      "dry_run_files>=6: the dry-run must list one row per file",
    ).toBeGreaterThanOrEqual(6);
    expect(rows.length, "the fixture set holds six files").toBe(EXPECTED_DRY_RUN_FILES);
    const serials = rows.map((row) => row.split(" | ")[0]);
    expect(
      [...new Set(serials)],
      "the serials must be unique",
    ).toHaveLength(EXPECTED_DRY_RUN_FILES);
    expect(
      serials,
      "the serials must be sequential file-NNN values in walk order",
    ).toEqual(EXPECTED_SERIALS);
    for (const row of rows) {
      const fields = row.split(" | ");
      console.log(`report_fields_per_file=${fields.length}`);
      expect(
        fields.length,
        `report_fields_per_file=9: the row "${readField(row, "file-")}" must hold nine fields`,
      ).toBe(EXPECTED_FIELDS_PER_FILE);
      expect(
        EXPECTED_FOLDER_NAMES,
        "the folder field must name one of the five subfolders",
      ).toContain(readField(row, "folder="));
      expect(
        Number.parseInt(readField(row, "bytes=") ?? "", 10),
        "the bytes field must hold the byte length",
      ).toBeGreaterThan(0);
      expect(
        readField(row, "type="),
        "the type field must hold the type key or unmatched",
      ).toMatch(/^(wht-filing-pnd1|unmatched)$/u);
      expect(
        readField(row, "kind="),
        "the kind field must hold the filing kind or none",
      ).toMatch(/^(form|attachment|receipt|statement|none)$/u);
      expect(
        readField(row, "period="),
        "the period field must hold the period or period-unreadable",
      ).toMatch(/^(period-unreadable|\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2})$/u);
      expect(
        readField(row, "text-layer="),
        "the text-layer field must hold yes or no",
      ).toMatch(/^(yes|no)$/u);
      expect(
        readField(row, "duplicate-group="),
        "the duplicate-group field must hold a number",
      ).toMatch(/^\d+$/u);
    }
    const parsedRows = rows.filter((row) => readField(row, "type=") === "wht-filing-pnd1");
    expect(
      parsedRows.length,
      "the fixture set holds three parsed files",
    ).toBe(3);
    for (const row of parsedRows) {
      const factNames = readField(row, "facts=") ?? "";
      expect(
        factNames,
        "the facts field of a parsed row must hold fact names only, never a value (no digit)",
      ).not.toMatch(/\d/u);
      expect(
        PND1_FACT_NAMES,
        "the facts field must name the facts that the parser read",
      ).toContain(factNames.split(",")[0]);
      expect(factNames.split(",")).toContain("payeeCount");
    }
    const unmatchedRows = rows.filter((row) => readField(row, "type=") === "unmatched");
    for (const row of unmatchedRows) {
      expect(
        readField(row, "facts="),
        "an unmatched row lists no fact name",
      ).toBe("none");
    }
  });

  it("ends with the seven count sections (count_sections=7)", async () => {
    const run = await runDryRun();
    const rows = parseReportRows(run.report);
    const countLines = run.report
      .split("\n")
      .filter((line) => line.startsWith("count "));
    console.log(`count_sections=${countLines.length}`);
    expect(
      countLines.length,
      "count_sections=7: the report must end with the seven count sections (spec section 9b)",
    ).toBe(EXPECTED_COUNT_SECTIONS);
    for (const label of COUNT_LABELS) {
      expect(
        countLines.some((line) => line.startsWith(`count ${label}: `)),
        `the report must hold the count section "count ${label}: "`,
      ).toBe(true);
    }
    const bySubfolder = requireCountEntries(run.report, "by subfolder");
    const byType = requireCountEntries(run.report, "by type");
    const byPeriod = requireCountEntries(run.report, "by period");
    const subfolderSum = [...bySubfolder.values()].reduce((a, b) => a + b, 0);
    const typeSum = [...byType.values()].reduce((a, b) => a + b, 0);
    const periodSum = [...byPeriod.values()].reduce((a, b) => a + b, 0);
    expect(
      subfolderSum,
      "the count by subfolder must cover every file",
    ).toBe(rows.length);
    expect(bySubfolder.get(EXPECTED_FOLDER_NAMES[0]), "two files sit in the first subfolder").toBe(2);
    expect(byType.get("wht-filing-pnd1"), "three files parse as PND.1").toBe(3);
    expect(byType.get("unmatched"), "three files stay unmatched").toBe(3);
    expect(
      typeSum,
      "the count by type must cover every file",
    ).toBe(rows.length);
    expect(byPeriod.get(MONTH1_PERIOD), "two files hold the month 1 period").toBe(2);
    expect(byPeriod.get(MONTH2_PERIOD), "one file holds the month 2 period").toBe(1);
    expect(byPeriod.get("period-unreadable"), "three files hold no period").toBe(3);
    expect(
      periodSum,
      "the count by period must cover every file",
    ).toBe(rows.length);
    const withTextLayer = requireCountValue(run.report, "with a text layer");
    const withoutTextLayer = requireCountValue(run.report, "without a text layer");
    const unmatched = requireCountValue(run.report, "unmatched");
    const duplicateGroups = requireCountValue(run.report, "duplicate groups");
    expect(
      withTextLayer + withoutTextLayer,
      "the two text-layer counts must cover every file",
    ).toBe(rows.length);
    expect(withTextLayer, "five files hold a text layer").toBe(5);
    expect(withoutTextLayer, "one file holds no text layer").toBe(1);
    expect(
      unmatched,
      "count unmatched=3: the count of unmatched files must equal the rows whose type is unmatched",
    ).toBe(rows.filter((row) => readField(row, "type=") === "unmatched").length);
    expect(duplicateGroups, "count duplicate groups=1").toBe(EXPECTED_DUPLICATE_GROUPS);
  });

  it("gives one duplicate group to the two byte-equal files (duplicate_groups=1)", async () => {
    const run = await runDryRun();
    const rows = parseReportRows(run.report);
    const groups = rows.map((row) => readField(row, "duplicate-group=") ?? "");
    const firstGroup = groups[0] ?? "";
    const secondGroup = groups[1] ?? "";
    expect(
      readField(rows[0] ?? "", "folder="),
      "the two first files must sit in the same subfolder for the byte compare",
    ).toBe(readField(rows[1] ?? "", "folder="));
    expect(
      firstGroup,
      "the first file of the byte-equal pair must hold a group number",
    ).toMatch(/^[1-9]\d*$/u);
    expect(
      secondGroup,
      "the two byte-equal files must share one duplicate group number",
    ).toBe(firstGroup);
    for (const [index, group] of groups.entries()) {
      if (index <= 1) continue;
      expect(
        group,
        "a file with no byte-equal partner holds no duplicate group",
      ).toBe("0");
    }
    console.log(`duplicate_groups=${requireCountValue(run.report, "duplicate groups")}`);
    expect(
      requireCountValue(run.report, "duplicate groups"),
      "duplicate_groups=1: two byte-equal files give one duplicate group (spec section 5.4, in memory)",
    ).toBe(EXPECTED_DUPLICATE_GROUPS);
  });

  it("calls the same walk as the import and no second walk (walk_calls=1)", async () => {
    const run = await runDryRun();
    const rootCalls = run.drive.calls.listFolderEntries.filter(
      (folderId) => folderId === ROOT_FOLDER_ID,
    ).length;
    console.log(`walk_calls=${rootCalls}`);
    expect(
      rootCalls,
      "walk_calls=1: the dry-run must call the one walk function, which lists the root once (FR-29)",
    ).toBe(1);
    expect(
      run.drive.calls.listFolderEntries.filter((id) => id === PARENT_FOLDER_ID),
      "the one walk lists the parent folder once to find the four 2568 folders",
    ).toHaveLength(1);
    expect(
      run.drive.calls.listFolderEntries,
      "the dry-run must read the root, the parent, and the five named folders through the one walk",
    ).toHaveLength(NAMED_SUBFOLDERS + 2);
    for (const folderId of NAMED_FOLDER_IDS) {
      expect(
        run.drive.calls.listFolderEntries.filter((id) => id === folderId),
        `the walk must read the subfolder of ${folderId} once`,
      ).toHaveLength(1);
    }
  });
});

describe("the dry-run writes and calls nothing (FR-30)", () => {
  it("writes no database row, calls no evidence store, and calls no model (db_writes=0, evidence_store_calls=0, model_calls=0)", async () => {
    const run = await runDryRun();
    // A4 guard: the run must have listed its files before the no-write scan,
    // so a run over an empty listing cannot pass this row.
    const rows = parseReportRows(run.report);
    expect(
      rows.length,
      "the dry-run must list its files before the no-write scan (A4)",
    ).toBeGreaterThanOrEqual(1);
    const writeCalls = run.intakeRepository.calls.filter((call) =>
      /^(insert|mark|bump)/u.test(call),
    );
    console.log(`db_writes=${writeCalls.length}`);
    console.log(`evidence_store_calls=${run.evidenceStore.calls.length}`);
    console.log(`model_calls=${run.extraction.count.value}`);
    expect(
      writeCalls,
      "db_writes=0: the dry-run must write no database row",
    ).toEqual([]);
    expect(
      run.intakeRepository.facts,
      "the dry-run must write no facts row",
    ).toEqual([]);
    expect(
      run.submissionRepository.submissions,
      "the dry-run must write no submission row",
    ).toEqual([]);
    expect(
      run.evidenceStore.calls,
      "evidence_store_calls=0: the dry-run compares duplicates in memory and calls no store",
    ).toEqual([]);
    expect(
      run.extraction.count.value,
      "model_calls=0: the dry-run calls no model for a text PDF",
    ).toBe(0);
  });

  it("lists a PDF with no text layer and calls no model for it (no_text_layer_rows=1)", async () => {
    const run = await runDryRun();
    const rows = parseReportRows(run.report);
    const noTextLayerRows = rows.filter(
      (row) => readField(row, "text-layer=") === "no",
    );
    console.log(`no_text_layer_rows=${noTextLayerRows.length}`);
    expect(
      noTextLayerRows.length,
      "no_text_layer_rows>=1: a PDF with no text layer is listed in the report",
    ).toBeGreaterThanOrEqual(1);
    const noTextLayerBytes = Buffer.byteLength(NO_TEXT_LAYER_TEXT, "utf8");
    for (const row of noTextLayerRows) {
      expect(
        Number.parseInt(readField(row, "bytes=") ?? "", 10),
        "the listed no-text-layer row keeps the byte length of the fake file",
      ).toBe(noTextLayerBytes);
      expect(
        readField(row, "type="),
        "a file with no text layer holds no type key",
      ).toBe("unmatched");
      expect(
        readField(row, "period="),
        "a file with no text layer holds no period",
      ).toBe("period-unreadable");
      expect(
        readField(row, "facts="),
        "a file with no text layer lists no fact name",
      ).toBe("none");
    }
    expect(
      run.extraction.count.value,
      "a PDF with no text layer causes no model call in the dry-run (FR-30)",
    ).toBe(0);
  });
});

describe("the dry-run is deterministic and writes the report where the caller asks", () => {
  it("gives a second run equal counts (rerun_count_diffs=0)", async () => {
    const first = await runDryRun();
    const second = await runDryRun();
    const firstCounts = first.report
      .split("\n")
      .filter((line) => line.startsWith("count "));
    const secondCounts = second.report
      .split("\n")
      .filter((line) => line.startsWith("count "));
    expect(
      firstCounts.length,
      "the first run must hold the seven count sections",
    ).toBe(EXPECTED_COUNT_SECTIONS);
    const diffs = firstCounts.filter((line, index) => line !== secondCounts[index]);
    console.log(`rerun_count_diffs=${diffs.length}`);
    expect(
      diffs,
      "rerun_count_diffs=0: a second run over the same files must give equal counts",
    ).toEqual([]);
    expect(
      parseReportRows(first.report).length,
      "both runs must list the same files",
    ).toBe(parseReportRows(second.report).length);
  });

  it("writes the report into the folder the caller gives (report_path_in_temp=1)", async () => {
    const run = await runDryRun();
    console.log(`report_path_in_temp=${run.reportPath.startsWith(run.tempDir) ? 1 : 0}`);
    expect(
      run.reportPath.startsWith(run.tempDir),
      "the report file must sit inside the report folder that the caller gives",
    ).toBe(true);
    expect(
      existsSync(run.reportPath),
      "the dry-run must write the report file into that folder",
    ).toBe(true);
    expect(
      readFileSync(run.reportPath, "utf8"),
      "the written report file must hold the report text",
    ).toBe(run.report);
    expect(
      run.report,
      "the report must hold the anonymized marker line (A2)",
    ).toContain(ANONYMIZED_MARKER);
  });

  it("names no default report folder in its own source (a9_default_path_strings=0)", async () => {
    const source = readFileSync(new URL(import.meta.url).pathname, "utf8");
    const hits = source.match(/measure\/runs/u) ?? [];
    console.log(`a9_default_path_strings=${hits.length}`);
    expect(
      hits,
      "A9: the test uses temp folders and holds no default report folder string; the default is a runner argument of task 10.7, not a test fact",
    ).toEqual([]);
  });
});

describe("the dry-run enforces the size limit on the downloaded body (Review B F1001)", () => {
  it("lists a downloaded body above the limit as unmatched with no text layer and does not parse it when the declared size was under the limit (oversize_body_text_layer_reads=0)", async () => {
    const dryRun = await requireDryRun();
    const module = await loadIntakeModule();
    const limit = module["ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES"];
    expect(
      typeof limit,
      "the module must export ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES",
    ).toBe("number");
    if (dryRun === undefined || typeof limit !== "number") return;
    const small = makeFile(1, PND1_MONTH1_TEXT);
    const big: FakeFile = {
      id: "fake-drive-2",
      name: "fake-file-2.pdf",
      mimeType: PDF_MIME_TYPE,
      byteSize: 100,
      body: Buffer.alloc(limit + 1, 0x41),
    };
    const entriesByFolder = buildLayoutMap((index) =>
      index === 0 ? [small] : index === 1 ? [big] : [],
    );
    const drive = createFakeDrive(entriesByFolder, [small, big]);
    const textLayerBodies: number[] = [];
    const tempDir = mkdtempSync(join(tmpdir(), "accounting-dry-run-"));
    TEMP_DIRS.push(tempDir);
    const captured = captureLogLines();
    let result: Record<string, unknown>;
    try {
      result = await dryRun({
        actor: ACTOR,
        folderId: ROOT_FOLDER_ID,
        source: drive.source,
        textLayer: {
          /** Records the length of each body that reaches the text layer. */
          async read(input: {
            readonly body: Uint8Array;
          }): Promise<{ readonly text: string | null }> {
            textLayerBodies.push(input.body.byteLength);
            return { text: Buffer.from(input.body).toString("utf8") };
          },
        },
        evidenceStore: createFakeEvidenceStore().port,
        intakeRepository: createFakeIntakeRepository().port,
        submissionRepository: createFakeSubmissionRepository().port,
        localReader: createFakeLocalReader(),
        extraction: createFailingExtraction().port,
        reportDir: tempDir,
      });
    } finally {
      captured.restore();
    }
    const report = String(result.report);
    const rows = parseReportRows(report);
    console.log(`oversize_body_text_layer_reads=${textLayerBodies.filter((n) => n > limit).length}`);
    expect(rows, "the report lists both files").toHaveLength(2);
    expect(
      drive.calls.download,
      "the oversize file must reach the download step: its declared size is under the limit",
    ).toContain(big.id);
    expect(
      textLayerBodies.filter((length) => length > limit),
      "oversize_body_text_layer_reads=0: a body above the limit must not reach the text layer",
    ).toEqual([]);
    expect(
      textLayerBodies,
      "the normal file still reaches the text layer once",
    ).toHaveLength(1);
    const bigRow = rows[1] ?? "";
    expect(readField(bigRow, "type="), "the oversize file is listed unmatched").toBe("unmatched");
    expect(readField(bigRow, "text-layer="), "the oversize file is listed with no text layer").toBe("no");
    expect(
      readField(bigRow, "bytes="),
      "the listed byte length is the length of the downloaded body",
    ).toBe(String(limit + 1));
    expect(readField(bigRow, "duplicate-group="), "the oversize file is in no duplicate group").toBe("0");
    expect(
      readField(rows[0] ?? "", "text-layer="),
      "the normal file keeps its text layer",
    ).toBe("yes");
    expect(requireCountValue(report, "without a text layer")).toBe(1);
    expect(requireCountValue(report, "with a text layer")).toBe(1);
    expect(requireCountValue(report, "unmatched")).toBe(1);
  });
});

describe("the dry-run report and log hold no banned token (FR-30, R1)", () => {
  it("finds every sentinel in one counterexample report (counterexample_min_hits=1)", () => {
    const scan = scanBannedTokens(COUNTEREXAMPLE_REPORT);
    const lowest = Math.min(
      scan.amount,
      scan.taxId,
      scan.payee,
      scan.personName,
      scan.fileName,
      scan.driveId,
    );
    console.log(`counterexample_min_hits=${lowest}`);
    console.log(
      `counterexample_hits amount=${scan.amount} tax_id=${scan.taxId} payee=${scan.payee} person_name=${scan.personName} file_name=${scan.fileName} drive_id=${scan.driveId}`,
    );
    expect(
      lowest,
      "A3, A7: the sentinel scan must find every sentinel class in the counterexample report",
    ).toBeGreaterThanOrEqual(1);
  });

  it("holds no amount, tax id, payee, person name, file name, or Drive id in the report (report_amount_hits=0, report_tax_id_hits=0, report_payee_hits=0, report_person_name_hits=0, report_file_name_hits=0, report_drive_id_hits=0)", async () => {
    const run = await runDryRun();
    // A4 guard: the run must have listed its files before the token scan.
    expect(
      parseReportRows(run.report).length,
      "the dry-run must list its files before the token scan (A4)",
    ).toBeGreaterThanOrEqual(1);
    const scan = scanBannedTokens(run.report);
    console.log(`report_amount_hits=${scan.amount}`);
    console.log(`report_tax_id_hits=${scan.taxId}`);
    console.log(`report_payee_hits=${scan.payee}`);
    console.log(`report_person_name_hits=${scan.personName}`);
    console.log(`report_file_name_hits=${scan.fileName}`);
    console.log(`report_drive_id_hits=${scan.driveId}`);
    expect(
      scan.amount,
      "report_amount_hits=0: the report holds no amount sentinel",
    ).toBe(0);
    expect(
      scan.taxId,
      "report_tax_id_hits=0: the report holds no tax id sentinel",
    ).toBe(0);
    expect(
      scan.payee,
      "report_payee_hits=0: the report holds no payee sentinel",
    ).toBe(0);
    expect(
      scan.personName,
      "report_person_name_hits=0: the report holds no person name sentinel",
    ).toBe(0);
    expect(
      scan.fileName,
      "report_file_name_hits=0: the report holds no file name; the row names the serial and the subfolder only",
    ).toBe(0);
    expect(
      scan.driveId,
      "report_drive_id_hits=0: the report holds no Drive id (FR-29)",
    ).toBe(0);
  });

  it("holds no banned token in any log line (log_banned_token_hits=0)", async () => {
    const run = await runDryRun();
    // A4 guard: the run must have logged its count lines before the token scan.
    const records = parseLogRecords(run.logLines);
    const countRecords = records.filter(
      (record) => record.event === "dry_run_count",
    );
    expect(
      countRecords.length,
      "the dry-run must log its count lines before the token scan (A4)",
    ).toBeGreaterThanOrEqual(2);
    const scan = scanBannedTokens(run.logLines.join("\n"));
    console.log(`log_banned_token_hits=${scan.amount + scan.taxId + scan.payee + scan.personName + scan.fileName + scan.driveId}`);
    expect(
      scan.amount + scan.taxId + scan.payee + scan.personName + scan.fileName + scan.driveId,
      "log_banned_token_hits=0: every log line holds no amount, tax id, payee, person name, file name, or Drive id",
    ).toBe(0);
  });

  it("logs one count line for each subfolder and type (count_log_lines=7)", async () => {
    const run = await runDryRun();
    const records = parseLogRecords(run.logLines).filter(
      (record) => record.event === "dry_run_count",
    );
    console.log(`count_log_lines=${records.length}`);
    expect(
      records.length,
      "count_log_lines>=2: one count log line exists for each subfolder and type",
    ).toBeGreaterThanOrEqual(2);
    const subfolderRecords = records.filter((record) => record.scope === "subfolder");
    const typeRecords = records.filter((record) => record.scope === "type");
    expect(
      subfolderRecords.length,
      "one count log line must exist for each of the five subfolders",
    ).toBe(NAMED_SUBFOLDERS);
    expect(
      typeRecords.length,
      "at least one count log line must exist for the parsed types",
    ).toBeGreaterThanOrEqual(1);
    const subfolderNames = subfolderRecords
      .map((record) => String(record.name))
      .sort();
    expect(
      subfolderNames,
      "the subfolder count lines must name the five subfolders of the constant",
    ).toEqual([...EXPECTED_FOLDER_NAMES].sort());
    const countSum = records.reduce(
      (total, record) => total + Number(record.files ?? 0),
      0,
    );
    expect(
      countSum,
      "the count log lines must cover every file",
    ).toBe(EXPECTED_DRY_RUN_FILES);
  });
});
