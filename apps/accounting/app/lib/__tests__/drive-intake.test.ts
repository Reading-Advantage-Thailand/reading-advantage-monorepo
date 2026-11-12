// @vitest-environment node
/**
 * Red tests for the Drive intake poll of the track
 * `accounting_drive_intake_20261109` (plan task 3.1).
 *
 * The domain module `packages/backend/src/modules/accounting/intake.ts` does
 * not exist yet, so every row loads it through a soft loader and fails on the
 * assertion `The module packages/backend/src/modules/accounting/intake.ts is
 * missing` or on the missing export `intakeDriveDocument`. The file loads
 * without any other error.
 *
 * This file pins the request contract of the poll:
 *
 *   intakeDriveDocument({
 *     actor,                 // the session actor; the company scope comes from it
 *     mode: "poll",          // the poll mode; the history mode arrives in task 8.2
 *     folderId,              // the Drive folder id of the intake folder
 *     source,                // the DocumentSourcePort: list, download, export
 *     evidenceStore,         // the AccountingEvidenceStore of spec section 5.4
 *     intakeRepository,      // the AccountingIntakeDocumentRepository of section 5.8
 *     submissionRepository,  // the AccountingSubmissionRepository of the module
 *     localReader,           // the local text and workbook reader
 *     extraction,            // the model reader on Vertex AI
 *   })
 *
 * The request also carries the alias names of the same ports, so a naming
 * drift in the Green task does not hide a behavior failure.
 *
 * Remediation r1 (plan task 3.8): pass 1 of the duplicate lookup reads the
 * newest submissions through `listRecentSubmissionEvidence({ scope, limit })`.
 * The fake intake repository returns the seeded submissions, then the
 * submissions that the poll wrote, as `{ submissionId, evidenceReference }`,
 * newest first. The member `listRecentWithEvidence` no longer exists.
 *
 * The read path has two ports. The local reader reads a text PDF, a Google
 * Sheet, and an `.xlsx` workbook on this machine. The extraction port reads a
 * non-text PDF, a JPEG, and a PNG on Vertex AI. The local reader returns
 * `{ kind: "text", draft }` for a readable file and `{ kind: "needs-model" }`
 * for a file with no text layer.
 *
 * Every port is a fake. No test reads a real Drive folder, a real document, a
 * real amount, or a real name. The Drive file id, the payee, the amount, and
 * the company id are fakes.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

/** Fake company id of every fixture. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake account id of the poll actor. */
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
/** Fake Drive folder id; no real Drive id enters this file. */
const FAKE_FOLDER_ID = "fake-intake-folder-id";
/** Fake payee of every document. */
const PAYEE = "Test Counterparty";
/** Fake payee of the earlier submission of the byte-only compare row. */
const OTHER_PAYEE = "Other Counterparty";
/** Fake amount of every document, in minor units. */
const AMOUNT_MINOR = "12345";
/** Fake amount of the earlier submission of the byte-only compare row. */
const OTHER_AMOUNT_MINOR = "99999";
/** Default scan cap of the content-duplicate lookup. */
const SCAN_CAP_DEFAULT = 500;
/** Number of passes of the content-duplicate lookup. */
const DUPLICATE_PASSES = 2;
/** Size limit of one intake file: 20 MB. */
const SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
/** Queue name of the intake lease. */
const QUEUE_NAME = "accounting-intake-poll";
/** Fake lease token of the intake lease. */
const LEASE_TOKEN = "fake-lease-token";
/** Fake worker id of the intake lease. */
const WORKER_ID = "fake-worker-1";

/** The session actor of the poll. */
const ACTOR = {
  accountId: ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "ACCOUNTANT",
};

/** The eight intake document type keys of the contract module. */
const INTAKE_DOCUMENT_TYPES = [
  "receipt",
  "tax-invoice",
  "bank-statement",
  "payroll-sheet",
  "withholding-certificate",
  "payment-voucher-sheet",
  "cloud-invoice",
  "openai-invoice",
] as const;

/** The names of the acceptance rows of this file. */
const ACCEPTANCE_ROWS = [
  "creates one submission for a new file and none for a stored file id",
  "adds no submission row for the same file id with equal bytes and increases sighting_count",
  "raises conflict for the same file id with different bytes and writes no second submission",
  "writes no submission and one failed row for a file above the size limit",
  "writes no submission and one failed row for a refused type",
  "keeps the failed row failed and creates a new row and a new submission for a re-upload",
  "never calls the extraction port for a text PDF",
  "never calls the extraction port for a Google Sheets voucher",
  "never calls the extraction port for an .xlsx voucher",
  "calls the extraction port for a non-text PDF and sets extraction = model",
  "calls the extraction port for a JPEG and sets extraction = model",
  "calls the extraction port for a PNG and sets extraction = model",
  "skips a file whose name does not match the rule and logs one count line",
  "moves a row from pending to parsed after a successful read",
  "never moves a parsed row back to pending",
  "finds a content duplicate through a byte-only compare when the payee and the amount differ",
  "reads at most the cap count of the newest rows that hold evidence in pass 1",
  "stops at the first byte match in pass 1",
  "takes the scan cap from ACCOUNTING_DUPLICATE_SCAN_CAP",
  "reads every row whose evidence_byte_size equals the candidate size in pass 2 and finds a history row outside the newest 500",
  "writes exactly one audit row with action submit for one submit request",
  "accepts the voucher file name and writes one intake row with the month 2026-11",
  "takes the type of the voucher row from the MIME type and the worksheet layout and not from the name",
  "skips a voucher file name whose month is 13 and logs one count line",
  "marks the content duplicate of a history row with duplicate_of_submission_id set",
  "sets evidence_byte_size to the byte length of the downloaded buffer",
  "uses the Drive file id as the idempotency key",
  "lists the intake folder once and names no year folder",
  "holds no file name, no payee, no amount, and no Drive id in the failure record",
  "reads the Drive folder id from ACCOUNTING_DRIVE_FOLDER_ID and holds no Drive id literal in the adapter source",
  "runs the duplicate lookup in two passes",
  "reads pass 1 through listRecentSubmissionEvidence with the company scope and not through listRecentWithEvidence",
  "gives a third byte-equal copy the original submission when the newest byte-equal row is a duplicate row (F302)",
  "skips a failed row with neither id in pass 2 without a byte compare and continues the scan (F302)",
  "finds a hand-made submission with no intake row in pass 1 and writes no second submission (F303)",
  "never sends an .xlsx file or a Google Sheet to the extraction port and marks the row failed with a review reason (F307)",
  "marks the row failed with a review reason for a read result with no draft field (F310)",
  "stores a native Google Sheet with the .xlsx MIME type and a PDF with the PDF type (F312)",
  "passes the actor company scope to every mark and bump call (Review B F304)",
] as const;

console.log(`acceptance_rows=${ACCEPTANCE_ROWS.length}`);
if (ACCEPTANCE_ROWS.length < 14) {
  throw new Error(
    `acceptance_rows=${ACCEPTANCE_ROWS.length} is below the floor of 14.`,
  );
}
console.log(`duplicate_passes=${DUPLICATE_PASSES}`);
console.log(`scan_cap_default=${SCAN_CAP_DEFAULT}`);

/** One recorded call of a fake port. */
interface RecordedCall {
  /** The method name the domain called. */
  readonly method: string;
  /** The arguments the domain passed. */
  readonly args: readonly unknown[];
}

/** One fake Drive file of the listing. */
interface FakeDriveFile {
  /** Fake Drive file id; it is the idempotency key. */
  readonly id: string;
  /** Fake Drive file name. */
  readonly name: string;
  /** Fake MIME type of the file. */
  readonly mimeType: string;
  /** Fake byte size of the file. */
  readonly byteSize: number;
  /** Fake Drive modified time. */
  readonly modifiedTime: string;
  /** Fake bytes of the file. */
  readonly body: Uint8Array;
}

/** One fake row of `accounting_intake_documents`. */
interface FakeIntakeRow {
  /** Row id. */
  id: string;
  /** Drive file id of the row. */
  driveFileId: string;
  /** Drive folder id of the row. */
  driveFolderId: string;
  /** Month of the document. */
  sourceMonth: string;
  /** Document type key of the row. */
  documentType: string;
  /** Lifecycle status of the row. */
  status: string;
  /** Submission id of the row. */
  submissionId: string | null;
  /** Submission id of the duplicated submission. */
  duplicateOfSubmissionId: string | null;
  /** Private evidence reference of the row. */
  evidenceReference: string | null;
  /** Extraction marker of the row. */
  extraction: string | null;
  /** Failure reason of a failed row. */
  failureReason: string | null;
  /** Number of failures of the row. */
  failureCount: number;
  /** Number of sightings of the row. */
  sightingCount: number;
  /** Stored byte length of the evidence. */
  evidenceByteSize: number | null;
  /** History marker of the row. */
  isHistory: boolean;
  /** Source of the month of a history row. */
  historySource: string | null;
  /** First sighting instant of the row. */
  firstSeenAt: string;
  /** Last sighting instant of the row. */
  lastSeenAt: string;
  /** Company scope of the row. */
  scopeCompanyId: string;
}

/** One fake row of `accounting_submissions`. */
interface FakeSubmission {
  /** Submission id. */
  id: string;
  /** Company scope of the submission. */
  scope: { readonly companyId: string };
  /** Lifecycle status of the submission. */
  status: string;
  /** Account that submitted the submission. */
  submittedByAccountId: string;
  /** Instant of the submission. */
  submittedAt: string;
  /** Kind of the submission. */
  kind: string;
  /** Payee of the submission. */
  payee: string;
  /** Category of the submission. */
  category: string;
  /** Money of the submission. */
  money: { readonly amountMinor: string; readonly currency: string };
  /** Private evidence reference of the submission. */
  evidenceReference: string;
}

/** The draft that every fake reader returns. */
const FAKE_DRAFT = {
  kind: "bill",
  payee: PAYEE,
  payeeName: PAYEE,
  category: "vendor-invoice",
  description: "Test Counterparty invoice",
  amountMinor: AMOUNT_MINOR,
  netAmountMinor: AMOUNT_MINOR,
  totalMinor: AMOUNT_MINOR,
  amount: AMOUNT_MINOR,
  currency: "THB",
  money: { amountMinor: AMOUNT_MINOR, currency: "THB" },
  invoiceNumber: "TEST-0001",
  documentType: "cloud-invoice",
  sourceMonth: "2026-11",
  month: "2026-11",
};

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

/**
 * Collects every number value inside one value tree.
 * @param value Value to walk.
 * @param found Collected numbers.
 * @returns The collected numbers.
 */
function collectNumbers(value: unknown, found: number[] = []): number[] {
  if (typeof value === "number") {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, found);
    return found;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectNumbers(item, found);
    }
  }
  return found;
}

/**
 * Finds the first property value whose key is one of the given names.
 * @param args Arguments of one call.
 * @param names Accepted property names.
 * @returns The first matching value, or undefined.
 */
function findNamed(args: readonly unknown[], names: readonly string[]): unknown {
  for (const arg of args) {
    const found = findNamedIn(arg, names);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Finds the first property value whose key is one of the given names.
 * @param value Value to walk.
 * @param names Accepted property names.
 * @returns The first matching value, or undefined.
 */
function findNamedIn(
  value: unknown,
  names: readonly string[],
): unknown {
  if (value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNamedIn(item, names);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (names.includes(key) && item !== undefined) return item;
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    const found = findNamedIn(item, names);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Finds the first byte buffer inside one argument list. The buffer sits in a
 * named field of one object argument, because spec section 5.4 gives `put` and
 * `read` one object input. A top-level buffer stays supported.
 * @param args Arguments of one call.
 * @returns The first byte buffer, or undefined.
 */
function findBytes(args: readonly unknown[]): Uint8Array | undefined {
  for (const arg of args) {
    if (arg instanceof Uint8Array) return arg;
    if (ArrayBuffer.isView(arg)) {
      return new Uint8Array(
        arg.buffer,
        arg.byteOffset,
        arg.byteLength,
      );
    }
  }
  for (const arg of args) {
    const named = findNamed([arg], ["body", "bytes", "buffer"]);
    if (named instanceof Uint8Array) return named;
    if (ArrayBuffer.isView(named)) {
      return new Uint8Array(
        named.buffer,
        named.byteOffset,
        named.byteLength,
      );
    }
  }
  return undefined;
}

/**
 * Decodes the first byte buffer of one argument list as text.
 * @param args Arguments of one call.
 * @returns The decoded text, or an empty string.
 */
function collectText(args: readonly unknown[]): string {
  const bytes = findBytes(args);
  if (bytes === undefined) return "";
  return Buffer.from(bytes).toString("latin1");
}

/**
 * Finds the first uuid string inside one argument list.
 * @param args Arguments of one call.
 * @returns The uuid, or undefined.
 */
function findUuid(args: readonly unknown[]): string | undefined {
  return collectStrings(args).find((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(
      value,
    ),
  );
}

/**
 * Builds a recording proxy for one fake port.
 * @param handlers Method implementations keyed by method name.
 * @param fallback Implementation for a method without its own handler.
 * @returns The proxy and its recorded calls.
 */
function createRecordingPort(
  handlers: Record<string, (args: readonly unknown[]) => unknown>,
  fallback?: (args: readonly unknown[]) => unknown,
): { readonly port: Record<string, unknown>; readonly calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const port = new Proxy({} as Record<string, unknown>, {
    get(_target, property) {
      if (typeof property !== "string" || property === "then") {
        return undefined;
      }
      return (...args: unknown[]) => {
        calls.push({ method: property, args });
        const handler = handlers[property] ?? fallback;
        return handler === undefined ? undefined : handler(args);
      };
    },
  });
  return { port, calls };
}

/**
 * Builds one fake Drive file.
 * @param input File id, name, MIME type, and body text.
 * @returns The fake file.
 */
function makeFile(input: {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly bodyText: string;
  readonly byteSize?: number;
}): FakeDriveFile {
  const body = new Uint8Array(Buffer.from(input.bodyText, "latin1"));
  return {
    id: input.id,
    name: input.name,
    mimeType: input.mimeType,
    byteSize: input.byteSize ?? body.byteLength,
    modifiedTime: "2026-11-12T02:00:00.000Z",
    body,
  };
}

/**
 * Builds the fake Drive source port.
 * @param files The fake listing of the poll.
 * @returns The port, its recorded calls, and its files.
 */
function createFakeSourcePort(files: readonly FakeDriveFile[]): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
  readonly files: readonly FakeDriveFile[];
} {
  const listing = [...files] as FakeDriveFile[] & { files: FakeDriveFile[] };
  listing.files = listing;
  const { port, calls } = createRecordingPort({
    list: () => listing,
    download: (args) => {
      const id = findNamed(args, ["fileId", "driveFileId", "id"]);
      const file = files.find((item) => item.id === id);
      return file?.body ?? new Uint8Array();
    },
    export: (args) => {
      const id = findNamed(args, ["fileId", "driveFileId", "id"]);
      const file = files.find((item) => item.id === id);
      return file?.body ?? new Uint8Array();
    },
  });
  return { port, calls, files };
}

/**
 * Builds the fake private evidence store.
 * @returns The port, its recorded calls, and its stored objects.
 */
function createFakeEvidenceStore(): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
  readonly objects: Map<string, Uint8Array>;
} {
  const objects = new Map<string, Uint8Array>();
  const { port, calls } = createRecordingPort({
    put: (args) => {
      const body = findBytes(args) ?? new Uint8Array();
      const companyId = findNamed(args, ["companyId"]) ?? COMPANY_ID;
      const reference = `private-evidence://${String(companyId)}/submissions/${randomUUID()}/evidence`;
      objects.set(reference, body);
      return { evidenceReference: reference, byteSize: body.byteLength };
    },
    read: (args) => {
      const reference = findNamed(args, ["evidenceReference"]) ?? "";
      return objects.get(String(reference)) ?? new Uint8Array();
    },
    sameEvidenceBytes: (args) => {
      const references = collectStrings(args).filter((value) =>
        value.startsWith("private-evidence://"),
      );
      const left = objects.get(references[0] ?? "");
      const right = objects.get(references[1] ?? "");
      if (left === undefined || right === undefined) return false;
      if (left.byteLength !== right.byteLength) return false;
      return left.every((byte, index) => byte === right[index]);
    },
  });
  return { port, calls, objects };
}

/**
 * Reads one property of a candidate intake row in camelCase or snake_case.
 * @param row Candidate row.
 * @param camelName Camel-case property name.
 * @param snakeName Snake-case property name.
 * @returns The property value, or undefined.
 */
function rowProperty(
  row: Record<string, unknown>,
  camelName: string,
  snakeName: string,
): unknown {
  return row[camelName] ?? row[snakeName];
}

/**
 * Builds one fake intake row from a candidate row object.
 * @param value Candidate row.
 * @returns The fake row.
 */
function toIntakeRow(value: Record<string, unknown>): FakeIntakeRow {
  return {
    id: String(rowProperty(value, "id", "id") ?? randomUUID()),
    driveFileId: String(rowProperty(value, "driveFileId", "drive_file_id") ?? ""),
    driveFolderId: String(
      rowProperty(value, "driveFolderId", "drive_folder_id") ?? FAKE_FOLDER_ID,
    ),
    sourceMonth: String(
      rowProperty(value, "sourceMonth", "source_month") ?? "2026-11",
    ),
    documentType: String(
      rowProperty(value, "documentType", "document_type") ?? "cloud-invoice",
    ),
    status: String(rowProperty(value, "status", "status") ?? "pending"),
    submissionId:
      (rowProperty(value, "submissionId", "submission_id") as string | null) ??
      null,
    duplicateOfSubmissionId:
      (rowProperty(
        value,
        "duplicateOfSubmissionId",
        "duplicate_of_submission_id",
      ) as string | null) ?? null,
    evidenceReference:
      (rowProperty(value, "evidenceReference", "evidence_reference") as
        | string
        | null) ?? null,
    extraction: (rowProperty(value, "extraction", "extraction") as string | null) ?? null,
    failureReason:
      (rowProperty(value, "failureReason", "failure_reason") as string | null) ??
      null,
    failureCount: Number(
      rowProperty(value, "failureCount", "failure_count") ?? 0,
    ),
    sightingCount: Number(
      rowProperty(value, "sightingCount", "sighting_count") ?? 1,
    ),
    evidenceByteSize:
      (rowProperty(value, "evidenceByteSize", "evidence_byte_size") as
        | number
        | null) ?? null,
    isHistory: Boolean(rowProperty(value, "isHistory", "is_history") ?? false),
    historySource:
      (rowProperty(value, "historySource", "history_source") as string | null) ??
      null,
    firstSeenAt: String(
      rowProperty(value, "firstSeenAt", "first_seen_at") ??
        "2026-11-12T02:00:00.000Z",
    ),
    lastSeenAt: String(
      rowProperty(value, "lastSeenAt", "last_seen_at") ??
        "2026-11-12T02:00:00.000Z",
    ),
    scopeCompanyId: String(
      rowProperty(value, "scopeCompanyId", "scope_company_id") ?? COMPANY_ID,
    ),
  };
}

/**
 * Applies one mark call to the stored intake rows.
 * @param rows The stored rows.
 * @param args Arguments of the mark call.
 * @param changes The fields the mark sets.
 * @returns The updated row, or undefined when no row matches.
 */
function applyMark(
  rows: FakeIntakeRow[],
  args: readonly unknown[],
  changes: Partial<FakeIntakeRow>,
): FakeIntakeRow | undefined {
  const id = findNamed(args, ["id", "intakeDocumentId", "documentId"]);
  const target =
    rows.find((row) => row.id === id) ??
    rows.find((row) => row.id === findUuid(args));
  if (target === undefined) return undefined;
  Object.assign(target, changes);
  const status = findNamed(args, ["status"]);
  if (typeof status === "string") target.status = status;
  const duplicateOf = findNamed(args, [
    "duplicateOfSubmissionId",
    "duplicate_of_submission_id",
    "duplicateOf",
  ]);
  if (typeof duplicateOf === "string") {
    target.duplicateOfSubmissionId = duplicateOf;
  }
  const failureReason = findNamed(args, [
    "failureReason",
    "failure_reason",
    "reason",
  ]);
  if (typeof failureReason === "string") {
    target.failureReason = failureReason;
  }
  const failureCount = findNamed(args, ["failureCount", "failure_count"]);
  if (typeof failureCount === "number") {
    target.failureCount = failureCount;
  } else if (changes.status === "failed") {
    target.failureCount += 1;
  }
  const sightingCount = findNamed(args, ["sightingCount", "sighting_count"]);
  if (typeof sightingCount === "number") {
    target.sightingCount = sightingCount;
  } else if (changes.sightingCount !== undefined) {
    target.sightingCount += 1;
  }
  const extraction = findNamed(args, ["extraction"]);
  if (typeof extraction === "string") target.extraction = extraction;
  return target;
}

/**
 * Builds the fake intake document repository.
 * @param seed The rows the repository holds before the poll.
 * @param listSubmissions The submissions that pass 1 reads, newest first.
 * @returns The port, its recorded calls, and its rows.
 */
function createFakeIntakeRepository(
  seed: readonly FakeIntakeRow[] = [],
  listSubmissions: () => readonly FakeSubmission[] = () => [],
): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
  readonly rows: FakeIntakeRow[];
} {
  const rows: FakeIntakeRow[] = seed.map((row) => ({ ...row }));
  const { port, calls } = createRecordingPort({
    insert: (args) => {
      const candidate = args.find(
        (arg) =>
          arg !== null &&
          typeof arg === "object" &&
          !Array.isArray(arg) &&
          ("driveFileId" in arg || "drive_file_id" in arg),
      ) as Record<string, unknown> | undefined;
      const row = toIntakeRow(candidate ?? {});
      rows.push(row);
      return row;
    },
    findByDriveFileId: (args) => {
      const id = findNamed(args, ["driveFileId", "drive_file_id", "fileId"]);
      return rows.find((row) => row.driveFileId === id);
    },
    listRecentSubmissionEvidence: (args) => {
      const limit = collectNumbers(args)[0] ?? SCAN_CAP_DEFAULT;
      return listSubmissions()
        .slice(0, limit)
        .map((submission) => ({
          submissionId: submission.id,
          evidenceReference: submission.evidenceReference,
        }));
    },
    findByEvidenceByteSize: (args) => {
      const size = collectNumbers(args)[0];
      return rows.filter((row) => row.evidenceByteSize === size);
    },
    listByScope: () => rows,
    markDuplicate: (args) => applyMark(rows, args, { status: "duplicate" }),
    markParsed: (args) => applyMark(rows, args, { status: "parsed" }),
    markFailed: (args) => applyMark(rows, args, { status: "failed" }),
    bumpSighting: (args) => applyMark(rows, args, {}),
  });
  return { port, calls, rows };
}

/**
 * Builds the fake submission repository. The seeded submissions stay in the
 * repository and the lookups see them. The `stored` list holds the
 * submissions the poll wrote, so a row that counts the writes of one poll
 * counts no seeded submission.
 * @param seed The submissions the repository holds before the poll.
 * @returns The port, its recorded calls, the written submissions, and the audit events.
 */
function createFakeSubmissionRepository(seed: readonly FakeSubmission[] = []): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
  readonly stored: FakeSubmission[];
  readonly auditEvents: { readonly action: string; readonly submissionId: string }[];
  readonly keys: Map<string, string>;
} {
  const seeded: FakeSubmission[] = seed.map((row) => ({ ...row }));
  const stored: FakeSubmission[] = [];
  const rows = (): FakeSubmission[] => [...seeded, ...stored];
  const keys = new Map<string, string>();
  const auditEvents: { action: string; submissionId: string }[] = [];
  const { port, calls } = createRecordingPort({
    insert: (args) => {
      const submission = args[0] as FakeSubmission;
      const idempotencyKey = args[1];
      const auditEvent = args[2] as
        | { action?: string; submissionId?: string }
        | undefined;
      if (typeof idempotencyKey === "string") {
        keys.set(submission.id, idempotencyKey);
      }
      if (auditEvent !== undefined && auditEvent !== null) {
        auditEvents.push({
          action: String(auditEvent.action),
          submissionId: String(auditEvent.submissionId),
        });
      }
      stored.push(submission);
      return submission;
    },
    findByIdempotencyKey: (args) => {
      const key = findNamed(args, ["idempotencyKey", "idempotency_key"]);
      return rows().find((row) => keys.get(row.id) === key);
    },
    findById: (args) => {
      const id = findNamed(args, ["submissionId", "submission_id", "id"]);
      return rows().find((row) => row.id === id);
    },
    listByScope: () => rows(),
    transition: () => undefined,
  });
  return { port, calls, stored, auditEvents, keys };
}

/**
 * Builds the result of a successful local read.
 * @returns The local read result.
 */
function localTextResult(): unknown {
  return {
    ...FAKE_DRAFT,
    kind: "text",
    outcome: "text",
    status: "parsed",
    ok: true,
    hasTextLayer: true,
    isTextLayer: true,
    needsModel: false,
    draft: FAKE_DRAFT,
  };
}

/**
 * Builds the result of a local read that found no text layer.
 * @returns The local read result.
 */
function localNeedsModelResult(): unknown {
  return {
    ...FAKE_DRAFT,
    kind: "needs-model",
    outcome: "needs-model",
    status: "needs-model",
    ok: false,
    hasTextLayer: false,
    isTextLayer: false,
    needsModel: true,
    requiresModel: true,
    reason: "needs-model",
    error: "needs-model",
    draft: null,
  };
}

/**
 * Builds the fake local text and workbook reader.
 * @returns The port and its recorded calls.
 */
function createFakeLocalReader(): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
} {
  return createRecordingPort({}, (args) => {
    const text = collectText(args);
    return text.includes("scan") ? localNeedsModelResult() : localTextResult();
  });
}

/**
 * Builds the fake model reader on Vertex AI.
 * @returns The port and its recorded calls.
 */
function createFakeExtractionPort(): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
} {
  return createRecordingPort({}, () => ({
    ...FAKE_DRAFT,
    kind: "model",
    outcome: "model",
    status: "parsed",
    ok: true,
    draft: FAKE_DRAFT,
  }));
}

/**
 * Builds one fake intake row.
 * @param overrides The fields that differ from the default row.
 * @returns The fake row.
 */
function makeIntakeRow(
  overrides: Partial<FakeIntakeRow> = {},
): FakeIntakeRow {
  return {
    id: randomUUID(),
    driveFileId: "fake-drive-file-id",
    driveFolderId: FAKE_FOLDER_ID,
    sourceMonth: "2026-11",
    documentType: "cloud-invoice",
    status: "pending",
    submissionId: null,
    duplicateOfSubmissionId: null,
    evidenceReference: null,
    extraction: null,
    failureReason: null,
    failureCount: 0,
    sightingCount: 1,
    evidenceByteSize: null,
    isHistory: false,
    historySource: null,
    firstSeenAt: "2026-11-12T02:00:00.000Z",
    lastSeenAt: "2026-11-12T02:00:00.000Z",
    scopeCompanyId: COMPANY_ID,
    ...overrides,
  };
}

/**
 * Builds one fake submission.
 * @param overrides The fields that differ from the default submission.
 * @returns The fake submission.
 */
function makeSubmission(
  overrides: Partial<FakeSubmission> = {},
): FakeSubmission {
  return {
    id: randomUUID(),
    scope: { companyId: COMPANY_ID },
    status: "pending",
    submittedByAccountId: ACCOUNT_ID,
    submittedAt: "2026-11-12T02:00:00.000Z",
    kind: "bill",
    payee: PAYEE,
    category: "vendor-invoice",
    money: { amountMinor: AMOUNT_MINOR, currency: "THB" },
    evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`,
    ...overrides,
  };
}

/**
 * Loads the intake domain module without a static import, so a missing module
 * fails an assertion instead of the whole file load.
 * @returns The module, or null when the module is missing.
 */
async function loadIntakeModule(): Promise<Record<string, unknown> | null> {
  const href = new URL(
    "../../../../../packages/backend/src/modules/accounting/intake.ts",
    import.meta.url,
  ).href;
  try {
    return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolves the poll entry of the intake module.
 * @returns The poll function, or null after a failed assertion.
 */
async function requireIntakeDriveDocument(): Promise<
  ((request: Record<string, unknown>) => Promise<unknown>) | null
> {
  const module = await loadIntakeModule();
  expect(
    module,
    "The module packages/backend/src/modules/accounting/intake.ts is missing",
  ).not.toBeNull();
  if (module === null) return null;
  expect(
    typeof module.intakeDriveDocument,
    "The module packages/backend/src/modules/accounting/intake.ts does not export intakeDriveDocument",
  ).toBe("function");
  if (typeof module.intakeDriveDocument !== "function") return null;
  return module.intakeDriveDocument as (
    request: Record<string, unknown>,
  ) => Promise<unknown>;
}

/** The fake ports of one poll run. */
interface PollFakes {
  /** The fake Drive source port. */
  readonly source: ReturnType<typeof createFakeSourcePort>;
  /** The fake private evidence store. */
  readonly evidenceStore: ReturnType<typeof createFakeEvidenceStore>;
  /** The fake intake document repository. */
  readonly intakeRepository: ReturnType<typeof createFakeIntakeRepository>;
  /** The fake submission repository. */
  readonly submissionRepository: ReturnType<
    typeof createFakeSubmissionRepository
  >;
  /** The fake local reader. */
  readonly localReader: ReturnType<typeof createFakeLocalReader>;
  /** The fake model reader. */
  readonly extraction: ReturnType<typeof createFakeExtractionPort>;
}

/**
 * Builds the fake ports of one poll run.
 * @param files The fake Drive listing.
 * @param intakeSeed The intake rows the repository holds before the poll.
 * @param submissionSeed The submissions the repository holds before the poll,
 *   newest first. Pass 1 of the duplicate lookup reads them.
 * @returns The fake ports.
 */
function createPollFakes(
  files: readonly FakeDriveFile[],
  intakeSeed: readonly FakeIntakeRow[] = [],
  submissionSeed: readonly FakeSubmission[] = [],
): PollFakes {
  const submissionRepository = createFakeSubmissionRepository(submissionSeed);
  // Newest first: the submissions that the poll wrote, then the seed. The seed
  // array is already ordered newest first.
  const listSubmissions = (): readonly FakeSubmission[] => [
    ...[...submissionRepository.stored].reverse(),
    ...submissionSeed,
  ];
  return {
    source: createFakeSourcePort(files),
    evidenceStore: createFakeEvidenceStore(),
    intakeRepository: createFakeIntakeRepository(intakeSeed, listSubmissions),
    submissionRepository,
    localReader: createFakeLocalReader(),
    extraction: createFakeExtractionPort(),
  };
}

/**
 * Builds the request of one poll run.
 * @param fakes The fake ports.
 * @returns The request of the poll.
 */
function buildRequest(fakes: PollFakes): Record<string, unknown> {
  return {
    actor: ACTOR,
    mode: "poll",
    folderId: FAKE_FOLDER_ID,
    source: fakes.source.port,
    documentSource: fakes.source.port,
    evidenceStore: fakes.evidenceStore.port,
    intakeRepository: fakes.intakeRepository.port,
    submissionRepository: fakes.submissionRepository.port,
    localReader: fakes.localReader.port,
    reader: fakes.localReader.port,
    textReader: fakes.localReader.port,
    extraction: fakes.extraction.port,
    extractionPort: fakes.extraction.port,
    extractor: fakes.extraction.port,
  };
}

/**
 * Runs the poll once and captures the log lines it writes.
 * @param fakes The fake ports.
 * @returns The result, the error, and the captured log lines.
 */
async function runPoll(fakes: PollFakes): Promise<{
  readonly result: unknown;
  readonly error: unknown;
  readonly logs: readonly string[];
}> {
  const intakeDriveDocument = await requireIntakeDriveDocument();
  const logs: string[] = [];
  const record = (...args: unknown[]): void => {
    logs.push(
      args
        .map((arg) => {
          if (typeof arg === "string") return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return "";
          }
        })
        .join(" "),
    );
  };
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  console.log = record;
  console.info = record;
  console.warn = record;
  console.error = record;
  try {
    if (intakeDriveDocument === null) {
      return { result: undefined, error: undefined, logs };
    }
    try {
      const result = await intakeDriveDocument(buildRequest(fakes));
      return { result, error: undefined, logs };
    } catch (error) {
      return { result: undefined, error, logs };
    }
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  }
}

/**
 * Reads the Drive adapter source of the app.
 * @returns The source text, or an empty string when the file is missing.
 */
function readDriveAdapterSource(): string {
  const path = new URL("../drive-document-source.ts", import.meta.url);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

/**
 * Counts the matches of one pattern inside one text.
 * @param text Text to scan.
 * @param pattern Pattern to count.
 * @returns The number of matches.
 */
function countMatches(text: string, pattern: RegExp): number {
  return text.match(new RegExp(pattern.source, pattern.flags.replace("g", "") + "g"))
    ?.length ?? 0;
}

describe("the Drive intake poll", () => {
  it("creates one submission for a new file and none for a stored file id", async () => {
    const storedFile = makeFile({
      id: "fake-stored-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 stored",
    });
    const newFile = makeFile({
      id: "fake-new-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 new",
    });
    const storedRow = makeIntakeRow({
      driveFileId: storedFile.id,
      status: "parsed",
      sightingCount: 1,
      evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`,
      evidenceByteSize: storedFile.body.byteLength,
    });
    const fakes = createPollFakes([storedFile, newFile], [storedRow]);

    await runPoll(fakes);

    expect(fakes.submissionRepository.stored.length).toBe(1);
    const inserted = fakes.intakeRepository.rows.filter(
      (row) => row.driveFileId === newFile.id,
    );
    expect(inserted.length).toBe(1);
    expect(fakes.intakeRepository.rows.filter((row) => row.driveFileId === storedFile.id).length).toBe(1);
  });

  it("adds no submission row for the same file id with equal bytes and increases sighting_count", async () => {
    const bodyText = "%PDF-1.4 equal";
    const file = makeFile({
      id: "fake-replay-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText,
    });
    const reference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const storedRow = makeIntakeRow({
      driveFileId: file.id,
      status: "parsed",
      sightingCount: 1,
      evidenceReference: reference,
      evidenceByteSize: file.body.byteLength,
    });
    const fakes = createPollFakes([file], [storedRow]);
    fakes.evidenceStore.objects.set(reference, file.body);

    await runPoll(fakes);

    expect(fakes.submissionRepository.stored.length).toBe(0);
    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row).toBeDefined();
    expect(row?.sightingCount).toBe(2);
  });

  it("raises conflict for the same file id with different bytes and writes no second submission", async () => {
    const file = makeFile({
      id: "fake-conflict-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 changed",
    });
    const reference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const storedRow = makeIntakeRow({
      driveFileId: file.id,
      status: "parsed",
      sightingCount: 1,
      evidenceReference: reference,
      evidenceByteSize: 999,
    });
    const fakes = createPollFakes([file], [storedRow]);
    fakes.evidenceStore.objects.set(
      reference,
      new Uint8Array(Buffer.from("%PDF-1.4 original", "latin1")),
    );

    const { error } = await runPoll(fakes);

    expect(error).toBeDefined();
    expect(String(error)).toContain("conflict");
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("writes no submission and one failed row for a file above the size limit", async () => {
    const file = makeFile({
      id: "fake-large-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 large",
      byteSize: SIZE_LIMIT_BYTES + 1,
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.submissionRepository.stored.length).toBe(0);
    const failed = fakes.intakeRepository.rows.filter(
      (row) => row.status === "failed",
    );
    expect(failed.length).toBe(1);
    expect(failed[0].failureReason).toBeTruthy();
    expect(failed[0].failureCount).toBe(1);
  });

  it("writes no submission and one failed row for a refused type", async () => {
    const file = makeFile({
      id: "fake-refused-file-id",
      name: "2026-11_receipt_Test Counterparty.txt",
      mimeType: "text/plain",
      bodyText: "plain text",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.submissionRepository.stored.length).toBe(0);
    const failed = fakes.intakeRepository.rows.filter(
      (row) => row.status === "failed",
    );
    expect(failed.length).toBe(1);
    expect(failed[0].failureReason).toBeTruthy();
    expect(failed[0].failureCount).toBe(1);
  });

  it("keeps the failed row failed and creates a new row and a new submission for a re-upload", async () => {
    const failedRow = makeIntakeRow({
      driveFileId: "fake-failed-file-id",
      status: "failed",
      failureReason: "review: the workbook cell holds no stored result",
      failureCount: 1,
    });
    const reUploaded = makeFile({
      id: "fake-reupload-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 reupload",
    });
    const fakes = createPollFakes([reUploaded], [failedRow]);

    await runPoll(fakes);

    const failed = fakes.intakeRepository.rows.find(
      (row) => row.driveFileId === failedRow.driveFileId,
    );
    expect(failed?.status).toBe("failed");
    const created = fakes.intakeRepository.rows.filter(
      (row) => row.driveFileId === reUploaded.id,
    );
    expect(created.length).toBe(1);
    expect(fakes.submissionRepository.stored.length).toBe(1);
  });

  it("never calls the extraction port for a text PDF", async () => {
    const file = makeFile({
      id: "fake-text-pdf-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 local-text",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.extraction.calls.length).toBe(0);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.extraction).toBe("local-text");
  });

  it("never calls the extraction port for a Google Sheets voucher", async () => {
    const file = makeFile({
      id: "fake-sheet-voucher-id",
      name: "2026-11_school-invoice_Test Counterparty.xlsx",
      mimeType: "application/vnd.google-apps.spreadsheet",
      bodyText: "PK local sheet",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.extraction.calls.length).toBe(0);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.extraction).toBe("local-text");
  });

  it("never calls the extraction port for an .xlsx voucher", async () => {
    const file = makeFile({
      id: "fake-xlsx-voucher-id",
      name: "ใบสำคัญจ่าย 2026-11.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bodyText: "PK local workbook",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.extraction.calls.length).toBe(0);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.extraction).toBe("local-text");
  });

  it("calls the extraction port for a non-text PDF and sets extraction = model", async () => {
    const file = makeFile({
      id: "fake-scan-pdf-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 scan",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.extraction.calls.length).toBeGreaterThan(0);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.extraction).toBe("model");
  });

  it("calls the extraction port for a JPEG and sets extraction = model", async () => {
    const file = makeFile({
      id: "fake-jpeg-id",
      name: "2026-11_receipt_Test Counterparty.jpg",
      mimeType: "image/jpeg",
      bodyText: "\xFF\xD8\xFF scan jpeg",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.extraction.calls.length).toBeGreaterThan(0);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.extraction).toBe("model");
  });

  it("calls the extraction port for a PNG and sets extraction = model", async () => {
    const file = makeFile({
      id: "fake-png-id",
      name: "2026-11_receipt_Test Counterparty.png",
      mimeType: "image/png",
      bodyText: "\x89PNG scan png",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.extraction.calls.length).toBeGreaterThan(0);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.extraction).toBe("model");
  });

  it("skips a file whose name does not match the rule and logs one count line", async () => {
    const file = makeFile({
      id: "fake-unnamed-file-id",
      name: "year end working papers.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bodyText: "PK local workbook",
    });
    const fakes = createPollFakes([file]);

    const { logs } = await runPoll(fakes);

    expect(fakes.intakeRepository.rows.length).toBe(0);
    expect(fakes.submissionRepository.stored.length).toBe(0);
    const logText = logs.join("\n");
    expect(countMatches(logText, /skip[a-z_]*["']?\s*[:=]\s*["']?1\b/iu)).toBe(1);
    expect(logText).not.toContain(file.name);
    expect(logText).not.toContain(PAYEE);
    expect(logText).not.toContain(file.id);
  });

  it("moves a row from pending to parsed after a successful read", async () => {
    const file = makeFile({
      id: "fake-parsed-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 local-text",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    const row = fakes.intakeRepository.rows[0];
    expect(row?.status).toBe("parsed");
    expect(row?.submissionId).toBeTruthy();
    expect(row?.extraction).toBe("local-text");
  });

  it("never moves a parsed row back to pending", async () => {
    const file = makeFile({
      id: "fake-stay-parsed-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 local-text",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);
    await runPoll(fakes);

    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row?.status).toBe("parsed");
    const pendingMarks = fakes.intakeRepository.calls.filter((call) => {
      const status = findNamed(call.args, ["status"]);
      return status === "pending";
    });
    expect(pendingMarks.length).toBe(0);
  });

  it("finds a content duplicate through a byte-only compare when the payee and the amount differ", async () => {
    const bodyText = "%PDF-1.4 duplicate";
    const file = makeFile({
      id: "fake-duplicate-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText,
    });
    const reference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const earlierSubmission = makeSubmission({
      payee: OTHER_PAYEE,
      money: { amountMinor: OTHER_AMOUNT_MINOR, currency: "THB" },
      evidenceReference: reference,
    });
    const earlierRow = makeIntakeRow({
      driveFileId: "fake-earlier-file-id",
      status: "parsed",
      submissionId: earlierSubmission.id,
      evidenceReference: reference,
      evidenceByteSize: file.body.byteLength,
    });
    const fakes = createPollFakes(
      [file],
      [earlierRow],
      [earlierSubmission],
    );
    fakes.evidenceStore.objects.set(reference, file.body);

    await runPoll(fakes);

    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row?.status).toBe("duplicate");
    expect(row?.duplicateOfSubmissionId).toBe(earlierSubmission.id);
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("reads at most the cap count of the newest rows that hold evidence in pass 1", async () => {
    const bodyText = "%PDF-1.4 pass-one";
    const file = makeFile({
      id: "fake-pass-one-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText,
    });
    const reference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const submissionSeed: FakeSubmission[] = [];
    for (let index = 0; index < 600; index += 1) {
      submissionSeed.push(
        makeSubmission({
          evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`,
        }),
      );
    }
    const matchingSubmission = makeSubmission({ evidenceReference: reference });
    submissionSeed.unshift(matchingSubmission);
    const fakes = createPollFakes([file], [], submissionSeed);
    fakes.evidenceStore.objects.set(reference, file.body);

    await runPoll(fakes);

    const passOne = fakes.intakeRepository.calls.find(
      (call) => call.method === "listRecentSubmissionEvidence",
    );
    expect(passOne).toBeDefined();
    expect(collectNumbers(passOne?.args ?? [])[0]).toBe(SCAN_CAP_DEFAULT);
    expect(
      fakes.evidenceStore.calls.filter(
        (call) => call.method === "sameEvidenceBytes",
      ).length,
    ).toBeLessThanOrEqual(SCAN_CAP_DEFAULT);
  });

  it("stops at the first byte match in pass 1", async () => {
    const bodyText = "%PDF-1.4 first-match";
    const file = makeFile({
      id: "fake-first-match-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText,
    });
    const references = [0, 1, 2].map(
      () => `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`,
    );
    const submissionSeed = references.map((reference) =>
      makeSubmission({ evidenceReference: reference }),
    );
    const fakes = createPollFakes([file], [], submissionSeed);
    fakes.evidenceStore.objects.set(references[0], file.body);
    fakes.evidenceStore.objects.set(references[1], file.body);
    fakes.evidenceStore.objects.set(references[2], file.body);

    await runPoll(fakes);

    const compares = fakes.evidenceStore.calls.filter(
      (call) => call.method === "sameEvidenceBytes",
    );
    expect(compares.length).toBe(1);
    // Pass 2 runs only when pass 1 finds no match.
    expect(
      fakes.intakeRepository.calls.filter(
        (call) => call.method === "findByEvidenceByteSize",
      ).length,
    ).toBe(0);
    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row?.status).toBe("duplicate");
    expect(row?.duplicateOfSubmissionId).toBe(submissionSeed[0]?.id);
  });

  it("takes the scan cap from ACCOUNTING_DUPLICATE_SCAN_CAP", async () => {
    const file = makeFile({
      id: "fake-cap-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 cap",
    });
    const previous = process.env.ACCOUNTING_DUPLICATE_SCAN_CAP;
    process.env.ACCOUNTING_DUPLICATE_SCAN_CAP = "7";
    const fakes = createPollFakes([file]);
    try {
      await runPoll(fakes);
    } finally {
      if (previous === undefined) {
        delete process.env.ACCOUNTING_DUPLICATE_SCAN_CAP;
      } else {
        process.env.ACCOUNTING_DUPLICATE_SCAN_CAP = previous;
      }
    }

    const passOne = fakes.intakeRepository.calls.find(
      (call) => call.method === "listRecentSubmissionEvidence",
    );
    expect(passOne).toBeDefined();
    expect(collectNumbers(passOne?.args ?? [])[0]).toBe(7);
  });

  it("reads every row whose evidence_byte_size equals the candidate size in pass 2 and finds a history row outside the newest 500", async () => {
    const bodyText = "%PDF-1.4 history";
    const file = makeFile({
      id: "fake-history-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText,
    });
    const reference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const historySubmission = makeSubmission({ evidenceReference: reference });
    const seed: FakeIntakeRow[] = [];
    // 600 newer submissions fill pass 1 up to the cap; the history submission is older.
    const submissionSeed: FakeSubmission[] = [];
    for (let index = 0; index < 600; index += 1) {
      seed.push(
        makeIntakeRow({
          driveFileId: `fake-recent-file-id-${index}`,
          status: "parsed",
          evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`,
          evidenceByteSize: 2000 + index,
        }),
      );
      submissionSeed.push(
        makeSubmission({
          evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`,
        }),
      );
    }
    submissionSeed.push(historySubmission);
    const historyRow = makeIntakeRow({
      driveFileId: "fake-history-row-file-id",
      status: "parsed",
      isHistory: true,
      historySource: "drive-folder",
      submissionId: historySubmission.id,
      evidenceReference: reference,
      evidenceByteSize: file.body.byteLength,
    });
    seed.push(historyRow);
    const fakes = createPollFakes([file], seed, submissionSeed);
    fakes.evidenceStore.objects.set(reference, file.body);

    await runPoll(fakes);

    const passTwo = fakes.intakeRepository.calls.find(
      (call) => call.method === "findByEvidenceByteSize",
    );
    expect(passTwo).toBeDefined();
    expect(collectNumbers(passTwo?.args ?? [])[0]).toBe(file.body.byteLength);
    expect(collectNumbers(passTwo?.args ?? []).length).toBe(1);
    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row?.status).toBe("duplicate");
    expect(row?.duplicateOfSubmissionId).toBe(historySubmission.id);
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("writes exactly one audit row with action submit for one submit request", async () => {
    const file = makeFile({
      id: "fake-audit-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 audit",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.submissionRepository.stored.length).toBe(1);
    const submitEvents = fakes.submissionRepository.auditEvents.filter(
      (event) => event.action === "submit",
    );
    expect(submitEvents.length).toBe(1);
    expect(fakes.intakeRepository.rows.length).toBe(1);
  });

  it("accepts the voucher file name and writes one intake row with the month 2026-11", async () => {
    const file = makeFile({
      id: "fake-voucher-file-id",
      name: "ใบสำคัญจ่าย 2026-11.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bodyText: "PK local workbook",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.intakeRepository.rows.length).toBe(1);
    expect(fakes.intakeRepository.rows[0].sourceMonth).toBe("2026-11");
  });

  it("takes the type of the voucher row from the MIME type and the worksheet layout and not from the name", async () => {
    const voucherFile = makeFile({
      id: "fake-voucher-type-file-id",
      name: "ใบสำคัญจ่าย 2026-11.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bodyText: "PK local workbook",
    });
    const namedFile = makeFile({
      id: "fake-named-type-file-id",
      name: "2026-11_payment-voucher_Test Counterparty.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bodyText: "PK local workbook two",
    });
    const voucherFakes = createPollFakes([voucherFile]);
    const namedFakes = createPollFakes([namedFile]);

    await runPoll(voucherFakes);
    await runPoll(namedFakes);

    const voucherType = voucherFakes.intakeRepository.rows[0]?.documentType;
    const namedType = namedFakes.intakeRepository.rows[0]?.documentType;
    expect(INTAKE_DOCUMENT_TYPES).toContain(voucherType as never);
    expect(voucherType).toBe(namedType);
  });

  it("skips a voucher file name whose month is 13 and logs one count line", async () => {
    const file = makeFile({
      id: "fake-bad-month-file-id",
      name: "ใบสำคัญจ่าย 2026-13.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bodyText: "PK local workbook",
    });
    const fakes = createPollFakes([file]);

    const { logs } = await runPoll(fakes);

    expect(fakes.intakeRepository.rows.length).toBe(0);
    expect(fakes.submissionRepository.stored.length).toBe(0);
    const logText = logs.join("\n");
    expect(countMatches(logText, /skip[a-z_]*["']?\s*[:=]\s*["']?1\b/iu)).toBe(1);
  });

  it("marks the content duplicate of a history row with duplicate_of_submission_id set", async () => {
    const bodyText = "%PDF-1.4 pm-condition";
    const file = makeFile({
      id: "fake-pm-condition-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText,
    });
    const reference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const historySubmission = makeSubmission({ evidenceReference: reference });
    const historyRow = makeIntakeRow({
      driveFileId: "fake-history-condition-file-id",
      status: "parsed",
      isHistory: true,
      historySource: "drive-modified-date",
      submissionId: historySubmission.id,
      evidenceReference: reference,
      evidenceByteSize: file.body.byteLength,
    });
    // The history submission is not in the newest submissions of pass 1, so pass 2 finds it.
    const fakes = createPollFakes([file], [historyRow], []);
    fakes.evidenceStore.objects.set(reference, file.body);

    await runPoll(fakes);

    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row?.status).toBe("duplicate");
    expect(row?.duplicateOfSubmissionId).toBe(historySubmission.id);
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("sets evidence_byte_size to the byte length of the downloaded buffer", async () => {
    const file = makeFile({
      id: "fake-byte-size-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 byte-size",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    const row = fakes.intakeRepository.rows[0];
    expect(row?.evidenceByteSize).toBe(file.body.byteLength);
  });

  it("uses the Drive file id as the idempotency key", async () => {
    const file = makeFile({
      id: "fake-idempotency-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 idempotency",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    expect(fakes.submissionRepository.stored.length).toBe(1);
    const keys = [...fakes.submissionRepository.keys.values()];
    expect(keys).toEqual([file.id]);
    expect(file.id.length).toBeLessThanOrEqual(256);
  });

  it("lists the intake folder once and names no year folder", async () => {
    const file = makeFile({
      id: "fake-list-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 list",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    const listCalls = fakes.source.calls.filter(
      (call) => call.method === "list",
    );
    expect(listCalls.length).toBe(1);
    const argumentsText = JSON.stringify(listCalls[0]?.args ?? []);
    expect(argumentsText).not.toContain("2024");
    expect(argumentsText).not.toContain("2025");
  });

  it("holds no file name, no payee, no amount, and no Drive id in the failure record", async () => {
    const file = makeFile({
      id: "fake-failure-record-file-id",
      name: "2026-11_receipt_Test Counterparty.txt",
      mimeType: "text/plain",
      bodyText: "plain text",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    const markFailed = fakes.intakeRepository.calls.find(
      (call) => call.method === "markFailed",
    );
    expect(markFailed).toBeDefined();
    const reason = String(findNamed(markFailed?.args ?? [], ["failureReason", "reason"]));
    expect(reason.length).toBeGreaterThan(0);
    expect(reason).not.toContain(file.name);
    expect(reason).not.toContain(PAYEE);
    expect(reason).not.toContain(AMOUNT_MINOR);
    expect(reason).not.toContain(file.id);
  });

  it("reads the Drive folder id from ACCOUNTING_DRIVE_FOLDER_ID and holds no Drive id literal in the adapter source", () => {
    const source = readDriveAdapterSource();
    expect(
      source,
      "The adapter source apps/accounting/app/lib/drive-document-source.ts is missing",
    ).not.toBe("");
    expect(source).toContain("process.env.ACCOUNTING_DRIVE_FOLDER_ID");
    expect(countMatches(source, /["'][A-Za-z0-9_-]{28,}["']/u)).toBe(0);
  });

  it("runs the duplicate lookup in two passes", async () => {
    const bodyText = "%PDF-1.4 two-passes";
    const file = makeFile({
      id: "fake-two-pass-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText,
    });
    const reference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const earlierSubmissionId = randomUUID();
    const earlierRow = makeIntakeRow({
      driveFileId: "fake-two-pass-earlier-file-id",
      status: "parsed",
      submissionId: earlierSubmissionId,
      evidenceReference: reference,
      evidenceByteSize: file.body.byteLength,
    });
    const fakes = createPollFakes([file], [earlierRow]);
    fakes.evidenceStore.objects.set(reference, file.body);

    await runPoll(fakes);

    const methods = fakes.intakeRepository.calls.map((call) => call.method);
    expect(methods).toContain("listRecentSubmissionEvidence");
    expect(methods).toContain("findByEvidenceByteSize");
    expect(methods).not.toContain("listRecentWithEvidence");
    expect(methods.indexOf("listRecentSubmissionEvidence")).toBeLessThan(
      methods.indexOf("findByEvidenceByteSize"),
    );
    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row?.status).toBe("duplicate");
    expect(row?.duplicateOfSubmissionId).toBe(earlierSubmissionId);
    expect(DUPLICATE_PASSES).toBe(2);
  });

  it("reads pass 1 through listRecentSubmissionEvidence with the company scope and not through listRecentWithEvidence", async () => {
    const file = makeFile({
      id: "fake-pass-one-member-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 pass-one-member",
    });
    const fakes = createPollFakes([file]);

    await runPoll(fakes);

    const passOneCalls = fakes.intakeRepository.calls.filter(
      (call) => call.method === "listRecentSubmissionEvidence",
    );
    expect(passOneCalls.length).toBe(1);
    expect(
      fakes.intakeRepository.calls.filter(
        (call) => call.method === "listRecentWithEvidence",
      ).length,
    ).toBe(0);
    const scope = findNamed(passOneCalls[0]?.args ?? [], ["scope"]) as
      | { readonly companyId?: string }
      | undefined;
    expect(scope?.companyId).toBe(COMPANY_ID);
    expect(collectNumbers(passOneCalls[0]?.args ?? [])[0]).toBe(
      SCAN_CAP_DEFAULT,
    );
  });

  it("gives a third byte-equal copy the original submission when the newest byte-equal row is a duplicate row (F302)", async () => {
    const file = makeFile({
      id: "fake-f302-file-3",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 same bytes",
    });
    const originalReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const copyReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const originalSubmissionId = randomUUID();
    const duplicateRow = makeIntakeRow({
      driveFileId: "fake-f302-file-2",
      status: "duplicate",
      submissionId: null,
      duplicateOfSubmissionId: originalSubmissionId,
      evidenceReference: copyReference,
      evidenceByteSize: file.body.byteLength,
    });
    const originalRow = makeIntakeRow({
      driveFileId: "fake-f302-file-1",
      status: "parsed",
      submissionId: originalSubmissionId,
      evidenceReference: originalReference,
      evidenceByteSize: file.body.byteLength,
    });
    // The original submission is older than the newest submissions of pass 1,
    // so only pass 2 can reach it (limit D-33).
    const newerSubmissions = [0, 1].map(() =>
      makeSubmission({
        evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`,
      }),
    );
    const fakes = createPollFakes(
      [file],
      [duplicateRow, originalRow],
      newerSubmissions,
    );
    fakes.evidenceStore.objects.set(originalReference, file.body);
    fakes.evidenceStore.objects.set(copyReference, file.body);

    await runPoll(fakes);

    const third = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    console.log(
      `f302_third_status=${third?.status} f302_new_submissions=${fakes.submissionRepository.stored.length}`,
    );
    expect(third?.status).toBe("duplicate");
    expect(third?.duplicateOfSubmissionId).toBe(originalSubmissionId);
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("skips a failed row with neither id in pass 2 without a byte compare and continues the scan (F302)", async () => {
    const file = makeFile({
      id: "fake-f302-skip-file-3",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 skip bytes",
    });
    const failedReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const olderReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const originalSubmissionId = randomUUID();
    const failedRow = makeIntakeRow({
      driveFileId: "fake-f302-skip-file-2",
      status: "failed",
      failureReason: "review: the document read failed",
      failureCount: 1,
      submissionId: null,
      duplicateOfSubmissionId: null,
      evidenceReference: failedReference,
      evidenceByteSize: file.body.byteLength,
    });
    const olderRow = makeIntakeRow({
      driveFileId: "fake-f302-skip-file-1",
      status: "parsed",
      submissionId: originalSubmissionId,
      evidenceReference: olderReference,
      evidenceByteSize: file.body.byteLength,
    });
    const fakes = createPollFakes([file], [failedRow, olderRow]);
    fakes.evidenceStore.objects.set(failedReference, file.body);
    fakes.evidenceStore.objects.set(olderReference, file.body);

    await runPoll(fakes);

    const row = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    expect(row?.status).toBe("duplicate");
    expect(row?.duplicateOfSubmissionId).toBe(originalSubmissionId);
    expect(fakes.submissionRepository.stored.length).toBe(0);
    const compares = fakes.evidenceStore.calls.filter(
      (call) => call.method === "sameEvidenceBytes",
    );
    expect(compares.length).toBeGreaterThan(0);
    expect(
      compares.filter((call) =>
        collectStrings(call.args).includes(failedReference),
      ).length,
    ).toBe(0);
  });

  it("finds a hand-made submission with no intake row in pass 1 and writes no second submission (F303)", async () => {
    const file = makeFile({
      id: "fake-f303-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 hand made",
    });
    const handReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const handSubmission = makeSubmission({ evidenceReference: handReference });
    const fakes = createPollFakes([file], [], [handSubmission]);
    fakes.evidenceStore.objects.set(handReference, file.body);

    await runPoll(fakes);

    const created = fakes.intakeRepository.rows.find(
      (candidate) => candidate.driveFileId === file.id,
    );
    console.log(
      `f303_status=${created?.status} f303_new_submissions=${fakes.submissionRepository.stored.length}`,
    );
    expect(created?.status).toBe("duplicate");
    expect(created?.duplicateOfSubmissionId).toBe(handSubmission.id);
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("never sends an .xlsx file or a Google Sheet to the extraction port and marks the row failed with a review reason (F307)", async () => {
    const cases = [
      {
        label: "xlsx workbook",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      {
        label: "Google Sheet",
        mimeType: "application/vnd.google-apps.spreadsheet",
      },
    ] as const;
    let xlsxModelCalls = 0;
    for (const item of cases) {
      const file = makeFile({
        id: `fake-f307-${item.label.replace(" ", "-")}-id`,
        name: "2026-11_cloud-invoice_Test Counterparty.xlsx",
        mimeType: item.mimeType,
        bodyText: `PK ${item.label} workbook bytes`,
      });
      const needsModelReader = createRecordingPort({}, () =>
        localNeedsModelResult(),
      );
      const fakes: PollFakes = {
        ...createPollFakes([file]),
        localReader: needsModelReader,
      };

      await runPoll(fakes);

      xlsxModelCalls += fakes.extraction.calls.length;
      expect(needsModelReader.calls.length, item.label).toBeGreaterThan(0);
      expect(fakes.submissionRepository.stored.length, item.label).toBe(0);
      expect(fakes.intakeRepository.rows.length, item.label).toBe(1);
      const row = fakes.intakeRepository.rows[0];
      expect(row?.status, item.label).toBe("failed");
      expect(row?.failureReason ?? "", item.label).toMatch(/^review:/u);
    }
    console.log(`xlsx_model_calls=${xlsxModelCalls}`);
    expect(xlsxModelCalls).toBe(0);
  });

  it("marks the row failed with a review reason for a read result with no draft field (F310)", async () => {
    const withoutDraft = { ...FAKE_DRAFT, kind: "text" };
    const modelWithoutDraft = { ...FAKE_DRAFT, kind: "model", outcome: "model" };
    const cases = [
      {
        label: "local text result with no draft",
        file: makeFile({
          id: "fake-f310-local-file-id",
          name: "2026-11_cloud-invoice_Test Counterparty.pdf",
          mimeType: "application/pdf",
          bodyText: "%PDF-1.4 local no draft",
        }),
        localReader: createRecordingPort({}, () => withoutDraft),
        extraction: createFakeExtractionPort(),
      },
      {
        label: "model result for a non-text PDF with no draft",
        file: makeFile({
          id: "fake-f310-model-pdf-file-id",
          name: "2026-11_cloud-invoice_Test Counterparty.pdf",
          mimeType: "application/pdf",
          bodyText: "%PDF-1.4 model no draft",
        }),
        localReader: createRecordingPort({}, () => localNeedsModelResult()),
        extraction: createRecordingPort({}, () => modelWithoutDraft),
      },
      {
        label: "model result for a JPEG with no draft",
        file: makeFile({
          id: "fake-f310-model-jpeg-file-id",
          name: "2026-11_receipt_Test Counterparty.jpg",
          mimeType: "image/jpeg",
          bodyText: "\xFF\xD8\xFF model no draft",
        }),
        localReader: createFakeLocalReader(),
        extraction: createRecordingPort({}, () => modelWithoutDraft),
      },
    ];
    for (const item of cases) {
      const fakes: PollFakes = {
        ...createPollFakes([item.file]),
        localReader: item.localReader,
        extraction: item.extraction,
      };

      await runPoll(fakes);

      expect(fakes.submissionRepository.stored.length, item.label).toBe(0);
      expect(fakes.intakeRepository.rows.length, item.label).toBe(1);
      const row = fakes.intakeRepository.rows[0];
      expect(row?.status, item.label).toBe("failed");
      expect(row?.failureReason ?? "", item.label).toMatch(/^review:/u);
    }
  });

  it("stores a native Google Sheet with the .xlsx MIME type and a PDF with the PDF type (F312)", async () => {
    const xlsxMimeType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const sheet = makeFile({
      id: "fake-f312-sheet-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.xlsx",
      mimeType: "application/vnd.google-apps.spreadsheet",
      bodyText: "PK exported sheet bytes",
    });
    const pdf = makeFile({
      id: "fake-f312-pdf-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 content type",
    });
    const sheetFakes = createPollFakes([sheet]);
    const pdfFakes = createPollFakes([pdf]);

    await runPoll(sheetFakes);
    await runPoll(pdfFakes);

    const sheetPuts = sheetFakes.evidenceStore.calls.filter(
      (call) => call.method === "put",
    );
    expect(sheetPuts.length).toBeGreaterThan(0);
    for (const call of sheetPuts) {
      expect(findNamed(call.args, ["contentType"])).toBe(xlsxMimeType);
      expect(
        collectStrings(call.args).filter((value) =>
          value.includes("google-apps"),
        ),
      ).toEqual([]);
    }
    const pdfPuts = pdfFakes.evidenceStore.calls.filter(
      (call) => call.method === "put",
    );
    expect(pdfPuts.length).toBeGreaterThan(0);
    for (const call of pdfPuts) {
      expect(findNamed(call.args, ["contentType"])).toBe("application/pdf");
    }
  });

  it("passes the actor company scope to every mark and bump call (Review B F304)", async () => {
    const parsedFile = makeFile({
      id: "fake-scope-parsed-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 scope bytes",
    });
    const duplicateFile = makeFile({
      id: "fake-scope-duplicate-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 scope bytes",
    });
    const failedFile = makeFile({
      id: "fake-scope-failed-file-id",
      name: "2026-11_receipt_Test Counterparty.txt",
      mimeType: "text/plain",
      bodyText: "plain text",
    });
    const replayFile = makeFile({
      id: "fake-scope-replay-file-id",
      name: "2026-11_cloud-invoice_Test Counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "%PDF-1.4 replay bytes",
    });
    const replayReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const replayRow = makeIntakeRow({
      driveFileId: replayFile.id,
      status: "parsed",
      submissionId: randomUUID(),
      evidenceReference: replayReference,
      evidenceByteSize: replayFile.body.byteLength,
    });
    const fakes = createPollFakes(
      [parsedFile, duplicateFile, failedFile, replayFile],
      [replayRow],
    );
    fakes.evidenceStore.objects.set(replayReference, replayFile.body);

    await runPoll(fakes);

    const markMethods = [
      "markDuplicate",
      "markParsed",
      "markFailed",
      "bumpSighting",
    ];
    const markCalls = fakes.intakeRepository.calls.filter((call) =>
      markMethods.includes(call.method),
    );
    const scopedCalls = markCalls.filter((call) => {
      const scope = findNamed(call.args, ["scope"]) as
        | { readonly companyId?: string }
        | undefined;
      return scope?.companyId === COMPANY_ID;
    });
    console.log(`scoped_mark_calls=${scopedCalls.length}`);
    expect(new Set(markCalls.map((call) => call.method))).toEqual(
      new Set(markMethods),
    );
    expect(markCalls.length).toBeGreaterThanOrEqual(4);
    expect(scopedCalls.length).toBe(markCalls.length);
  });
});
