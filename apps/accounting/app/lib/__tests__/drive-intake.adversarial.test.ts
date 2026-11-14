// @vitest-environment node
/**
 * Adversarial tests for the Phase 3 Drive intake poll of the track
 * `accounting_drive_intake_20261109`.
 *
 * Every port is a fake. No row reads a real Drive folder, a real document, a
 * real file name, a real Drive id, a real amount, or a real payee. The file
 * ids, the company ids, the payee, and the amounts are fakes. No row calls the
 * network, the real Drive API, the real `gcloud`, or a real Cloud Build.
 *
 * The rows attack the boundary cases of the two remediation groups:
 *
 *   r1: a hostile file name, a file over the size limit, a refused type, a
 *   Drive listing with a missing field, a lease that a second worker claims,
 *   and a duplicate with a different payee.
 *   r2: a third byte-equal copy, a failed row first in the scan, a hand-made
 *   submission copy, an `.xlsx` that a reader sends to the model, an empty
 *   substitution, a malformed scan cap, an existing scheduler job, a Drive
 *   error that carries an id, and a cross-company row id.
 *
 * Each row asserts the safe behavior of the spec and carries an explicit
 * assertion message, so a failure names the rule it broke. Each row guards the
 * fixture it scans: a row that looks for a leaked token first asserts that the
 * token is inside the fixture it reads.
 */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

/** Fake company id of every fixture. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake second company id of the cross-company rows. */
const OTHER_COMPANY_ID = "44444444-4444-4444-8444-444444444444";
/** Fake account id of the poll actor. */
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
/** Fake Drive folder id; no real Drive id enters this file. */
const FAKE_FOLDER_ID = "fake-intake-folder-id";
/** Fake payee of every document. */
const PAYEE = "Test Counterparty";
/** Fake amount of every document, in minor units. */
const AMOUNT_MINOR = "12345";
/** Size limit of one intake file: 20 MB. */
const SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
/** Queue name of the intake lease. */
const QUEUE_NAME = "accounting-intake-poll";
/** Fake lease token of the first worker. */
const LEASE_TOKEN = "fake-lease-token-one";
/** Fake lease token of the second worker. */
const OTHER_LEASE_TOKEN = "fake-lease-token-two";
/** Fake worker id of the second worker. */
const OTHER_WORKER_ID = "fake-worker-2";
/** The MIME type of a workbook the intake accepts. */
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
/** A MIME type the intake refuses. */
const REFUSED_MIME_TYPE = "application/x-msdownload";
/** The paths of a hostile file name; each row keeps them out of the output. */
const HOSTILE_PATH_MARKERS = ["../", "/etc/", "passwd"] as const;
/** The six substitution keys of the build file of the intake job. */
const SUBSTITUTION_KEYS = [
  "_ACCOUNTING_IMAGE",
  "_ACCOUNTING_DRIVE_FOLDER_ID",
  "_ACCOUNTING_INTAKE_ACTOR_ID",
  "_ACCOUNTING_INTAKE_COMPANY_ID",
  "_ACCOUNTING_DUPLICATE_SCAN_CAP",
  "_ACCOUNTING_EXTRACTION_MODEL",
] as const;
/** A fake value for each substitution key. No value is a real id or image. */
const FAKE_VALUES: Record<(typeof SUBSTITUTION_KEYS)[number], string> = {
  _ACCOUNTING_IMAGE:
    "asia-southeast1-docker.pkg.dev/fake-project/accounting/accounting:fake-tag-0001",
  _ACCOUNTING_DRIVE_FOLDER_ID: "fake-folder-id-0002",
  _ACCOUNTING_INTAKE_ACTOR_ID: "fake-actor-id-0003",
  _ACCOUNTING_INTAKE_COMPANY_ID: "fake-company-id-0004",
  _ACCOUNTING_DUPLICATE_SCAN_CAP: "4217",
  _ACCOUNTING_EXTRACTION_MODEL: "fake-model-name-0006",
};
/** The Cloud Run Admin API run endpoint of the job. */
const SCHEDULER_URI =
  "https://run.googleapis.com/v2/projects/$PROJECT_ID/locations/asia-southeast1/jobs/accounting-intake-poll:run";

/** The names of the adversarial rows of this file. */
const ADVERSARIAL_ROWS = [
  "keeps a hostile file name out of every row and every log line",
  "writes no row when one listing entry breaks the listing contract",
  "holds the size boundary at the limit and fails the file above it",
  "downloads nothing for a refused type and writes one failed row",
  "writes no row for a listing entry with a missing field",
  "marks a byte-equal file with a different payee duplicate and writes no submission",
  "gives a third byte-equal copy the origin submission",
  "runs no byte compare for a row with no evidence reference and keeps scanning",
  "finds a hand-made submission copy in pass 1 and never reads pass 2",
  "never sends an .xlsx to the extraction port when the local reader asks for the model",
  "runs no poll and releases no lease when a second worker holds the lease",
  "keeps a Drive id out of the rows and the logs when the download fails",
  "keeps a Drive id out of the entry log when the listing fails",
  "rejects each empty substitution and prints only the key",
  "rejects a malformed scan cap and runs no token of it",
  "updates an existing scheduler job and creates a missing one",
  "never replays a foreign intake row of the same Drive file id",
  "never links a foreign submission as a duplicate",
] as const;

console.log(`adversarial_rows=${ADVERSARIAL_ROWS.length}`);
if (ADVERSARIAL_ROWS.length < 14) {
  throw new Error(
    `adversarial_rows=${ADVERSARIAL_ROWS.length} is below the floor of 14.`,
  );
}
console.log(`guard_empty_cases=${SUBSTITUTION_KEYS.length}`);

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
  description: "fake adversarial fixture draft",
  amountMinor: AMOUNT_MINOR,
  currency: "THB",
  money: { amountMinor: AMOUNT_MINOR, currency: "THB" },
  invoiceNumber: "TEST-0001",
  documentType: "cloud-invoice",
  sourceMonth: "2026-11",
  month: "2026-11",
};

/** The result of a successful local text read. */
const LOCAL_TEXT_RESULT: Record<string, unknown> = {
  ...FAKE_DRAFT,
  kind: "text",
  outcome: "text",
  status: "parsed",
  ok: true,
  draft: FAKE_DRAFT,
};

/** The result of a local read that hands the workbook to the model. */
const LOCAL_MODEL_RESULT: Record<string, unknown> = {
  ...FAKE_DRAFT,
  kind: "model",
  outcome: "model",
  status: "parsed",
  ok: true,
  draft: FAKE_DRAFT,
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
 * @param value Value to walk.
 * @param names Accepted property names.
 * @returns The first matching value, or undefined.
 */
function findNamedIn(value: unknown, names: readonly string[]): unknown {
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
 * Reads the company scope of one repository call.
 * @param args Arguments of one call.
 * @returns The company id the call bound, or an empty string for no scope.
 */
function scopeOf(args: readonly unknown[]): string {
  const scope = findNamed(args, ["scope"]);
  if (scope !== null && typeof scope === "object") {
    const companyId = (scope as { readonly companyId?: unknown }).companyId;
    if (typeof companyId === "string") return companyId;
  }
  const companyId = findNamed(args, ["companyId"]);
  return typeof companyId === "string" ? companyId : "";
}

/**
 * Finds the first byte buffer inside one argument list.
 * @param args Arguments of one call.
 * @returns The first byte buffer, or undefined.
 */
function findBytes(args: readonly unknown[]): Uint8Array | undefined {
  for (const arg of args) {
    if (arg instanceof Uint8Array) return arg;
    if (ArrayBuffer.isView(arg)) {
      return new Uint8Array(arg.buffer, arg.byteOffset, arg.byteLength);
    }
  }
  for (const arg of args) {
    const named = findNamed([arg], ["body", "bytes", "buffer"]);
    if (named instanceof Uint8Array) return named;
    if (ArrayBuffer.isView(named)) {
      return new Uint8Array(named.buffer, named.byteOffset, named.byteLength);
    }
  }
  return undefined;
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
 * @param input File id, name, MIME type, body text, and declared byte size.
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
 * @param options Listing, download error, and export behavior.
 * @returns The port, its recorded calls, and its files.
 */
function createFakeSourcePort(options: {
  readonly listing: readonly unknown[];
  readonly files?: readonly FakeDriveFile[];
  readonly downloadError?: Error;
}): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
} {
  const files = options.files ?? [];
  const { port, calls } = createRecordingPort({
    list: () => options.listing,
    download: () => {
      if (options.downloadError !== undefined) throw options.downloadError;
      const file = files[0];
      return file === undefined ? new Uint8Array() : file.body;
    },
    export: () => {
      const file = files[0];
      return file === undefined ? new Uint8Array() : file.body;
    },
  });
  return { port, calls };
}

/**
 * Builds the fake private evidence store. The store keeps every stored object,
 * records every compare call, and compares the bodies of two references.
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
      const companyId =
        typeof findNamed(args, ["companyId"]) === "string"
          ? String(findNamed(args, ["companyId"]))
          : COMPANY_ID;
      const reference = `private-evidence://${companyId}/submissions/${randomUUID()}/evidence`;
      objects.set(reference, body);
      return { evidenceReference: reference, byteSize: body.byteLength };
    },
    read: (args) => {
      const reference = findNamed(args, ["evidenceReference"]);
      return objects.get(String(reference ?? "")) ?? new Uint8Array();
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
    extraction:
      (rowProperty(value, "extraction", "extraction") as string | null) ?? null,
    failureReason:
      (rowProperty(value, "failureReason", "failure_reason") as string | null) ??
      null,
    failureCount: Number(rowProperty(value, "failureCount", "failure_count") ?? 0),
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
 * Applies one mark call to the stored intake rows of the company of the call.
 * @param rows The stored rows.
 * @param args Arguments of the mark call.
 * @param changes The fields the mark sets.
 * @returns The updated row, or undefined when no row of that scope matches.
 */
function applyMark(
  rows: FakeIntakeRow[],
  args: readonly unknown[],
  changes: Partial<FakeIntakeRow>,
): FakeIntakeRow | undefined {
  const id = findNamed(args, ["id", "intakeDocumentId", "documentId"]);
  const scope = scopeOf(args);
  const uuid = collectStrings(args).find((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(
      value,
    ),
  );
  const target =
    rows.find((row) => row.id === id) ?? rows.find((row) => row.id === uuid);
  if (target === undefined || target.scopeCompanyId !== scope) return undefined;
  Object.assign(target, changes);
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
  if (typeof failureReason === "string") target.failureReason = failureReason;
  const extraction = findNamed(args, ["extraction"]);
  if (typeof extraction === "string") target.extraction = extraction;
  if (changes.status === "failed") target.failureCount += 1;
  if (changes.sightingCount !== undefined) target.sightingCount += 1;
  return target;
}

/**
 * Builds the fake intake document repository. Every read and every mark binds
 * the company scope of the call, so a row of another company stays invisible
 * and unchanged, exactly like the scoped SQL of the real repository.
 * @param seed The rows the repository holds before the poll.
 * @param listSubmissions The submissions that pass 1 reads, newest first.
 * @returns The port, its recorded calls, its rows, and its bound scopes.
 */
function createFakeIntakeRepository(
  seed: readonly FakeIntakeRow[] = [],
  listSubmissions: (companyId: string) => readonly FakeSubmission[] = () => [],
): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
  readonly rows: FakeIntakeRow[];
  readonly scopes: string[];
} {
  const rows: FakeIntakeRow[] = seed.map((row) => ({ ...row }));
  const scopes: string[] = [];
  const record = (args: readonly unknown[]): string => {
    const scope = scopeOf(args);
    scopes.push(scope);
    return scope;
  };
  const { port, calls } = createRecordingPort({
    insert: (args) => {
      const candidate = args.find(
        (arg) =>
          arg !== null &&
          typeof arg === "object" &&
          !Array.isArray(arg) &&
          ("driveFileId" in arg || "drive_file_id" in arg),
      ) as Record<string, unknown> | undefined;
      record(args);
      const row = toIntakeRow(candidate ?? {});
      rows.push(row);
      return row;
    },
    findByDriveFileId: (args) => {
      const scope = record(args);
      const id = findNamed(args, ["driveFileId", "drive_file_id", "fileId"]);
      return rows.find(
        (row) =>
          row.driveFileId === id &&
          row.scopeCompanyId === scope &&
          scope !== "",
      );
    },
    listRecentSubmissionEvidence: (args) => {
      const scope = record(args);
      const limit = collectNumbers(args)[0] ?? 500;
      if (scope === "") return [];
      return listSubmissions(scope)
        .slice(0, limit)
        .filter((submission) => submission.scope.companyId === scope)
        .map((submission) => ({
          submissionId: submission.id,
          evidenceReference: submission.evidenceReference,
        }));
    },
    findByEvidenceByteSize: (args) => {
      const scope = record(args);
      const size = collectNumbers(args)[0];
      if (scope === "") return [];
      return rows.filter(
        (row) => row.evidenceByteSize === size && row.scopeCompanyId === scope,
      );
    },
    markDuplicate: (args) => applyMark(rows, args, { status: "duplicate" }),
    markParsed: (args) => applyMark(rows, args, { status: "parsed" }),
    markFailed: (args) => applyMark(rows, args, { status: "failed" }),
    bumpSighting: (args) => applyMark(rows, args, {}),
  });
  return { port, calls, rows, scopes };
}

/**
 * Builds the fake submission repository. The seeded submissions stay in the
 * repository and the lookups see them. The `stored` list holds only the
 * submissions that the poll wrote.
 * @param seed The submissions the repository holds before the poll.
 * @returns The port, its recorded calls, and the written submissions.
 */
function createFakeSubmissionRepository(
  seed: readonly FakeSubmission[] = [],
): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
  readonly stored: FakeSubmission[];
  readonly keys: Map<string, string>;
} {
  const seeded: FakeSubmission[] = seed.map((row) => ({ ...row }));
  const stored: FakeSubmission[] = [];
  const rows = (): FakeSubmission[] => [...seeded, ...stored];
  const keys = new Map<string, string>();
  const { port, calls } = createRecordingPort({
    insert: (args) => {
      const submission = args[0] as FakeSubmission;
      const idempotencyKey = args[1];
      if (typeof idempotencyKey === "string") {
        keys.set(submission.id, idempotencyKey);
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
  return { port, calls, stored, keys };
}

/**
 * Builds one fake intake row.
 * @param overrides The fields that differ from the default row.
 * @returns The fake row.
 */
function makeIntakeRow(overrides: Partial<FakeIntakeRow> = {}): FakeIntakeRow {
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

/** The fake ports of one adversarial poll run. */
interface PollFakes {
  /** The fake Drive source port. */
  readonly source: ReturnType<typeof createFakeSourcePort>;
  /** The fake private evidence store. */
  readonly evidenceStore: ReturnType<typeof createFakeEvidenceStore>;
  /** The fake intake document repository. */
  readonly intakeRepository: ReturnType<typeof createFakeIntakeRepository>;
  /** The fake submission repository. */
  readonly submissionRepository: ReturnType<typeof createFakeSubmissionRepository>;
  /** The fake local reader. */
  readonly localReader: { readonly port: Record<string, unknown>; readonly calls: RecordedCall[] };
  /** The fake model reader. */
  readonly extraction: { readonly port: Record<string, unknown>; readonly calls: RecordedCall[] };
}

/** The options of one adversarial poll run. */
interface PollOptions {
  /** The fake Drive listing of the run. */
  readonly listing: readonly unknown[];
  /** The fake files the download and the export members return. */
  readonly files?: readonly FakeDriveFile[];
  /** The error the download member throws. */
  readonly downloadError?: Error;
  /** The intake rows the repository holds before the poll. */
  readonly intakeSeed?: readonly FakeIntakeRow[];
  /** The submissions the repository holds before the poll, newest first. */
  readonly submissionSeed?: readonly FakeSubmission[];
  /** The result the local reader returns. */
  readonly localResult?: Record<string, unknown>;
  /** The result the model reader returns. */
  readonly extractionResult?: Record<string, unknown>;
}

/**
 * Builds the fake ports of one adversarial poll run.
 * @param options The listing, the seeds, and the read results of the run.
 * @returns The fake ports.
 */
function createPollFakes(options: PollOptions): PollFakes {
  const submissionRepository = createFakeSubmissionRepository(
    options.submissionSeed ?? [],
  );
  const listSubmissions = (): readonly FakeSubmission[] => [
    ...[...submissionRepository.stored].reverse(),
    ...(options.submissionSeed ?? []),
  ];
  return {
    source: createFakeSourcePort({
      listing: options.listing,
      ...(options.files === undefined ? {} : { files: options.files }),
      ...(options.downloadError === undefined
        ? {}
        : { downloadError: options.downloadError }),
    }),
    evidenceStore: createFakeEvidenceStore(),
    intakeRepository: createFakeIntakeRepository(
      options.intakeSeed ?? [],
      listSubmissions,
    ),
    submissionRepository,
    localReader: createRecordingPort({}, () => options.localResult ?? LOCAL_TEXT_RESULT),
    extraction: createRecordingPort({}, () => options.extractionResult ?? {
      ...FAKE_DRAFT,
      kind: "model",
      outcome: "model",
      draft: FAKE_DRAFT,
    }),
  };
}

/**
 * Loads the intake domain module without a static import.
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
 * Loads the runner module without a static import.
 * @returns The module, or null when the module is missing.
 */
async function loadRunnerModule(): Promise<Record<string, unknown> | null> {
  const href = new URL("../intake-runner.ts", import.meta.url).href;
  try {
    return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolves one function export of one module.
 * @param module The loaded module.
 * @param name The export name.
 * @returns The export as a function, or null when it is missing.
 */
function functionExport(
  module: Record<string, unknown> | null,
  name: string,
): ((...args: never[]) => unknown) | null {
  if (module === null) return null;
  const candidate = module[name];
  return typeof candidate === "function"
    ? (candidate as (...args: never[]) => unknown)
    : null;
}

/**
 * Runs the poll once and captures the log lines that it writes.
 * @param fakes The fake ports.
 * @returns The result, the error, and the captured log lines.
 */
async function runPoll(fakes: PollFakes): Promise<{
  readonly result: unknown;
  readonly error: unknown;
  readonly logs: readonly string[];
}> {
  const module = await loadIntakeModule();
  expect(
    module,
    "The module packages/backend/src/modules/accounting/intake.ts is missing",
  ).not.toBeNull();
  const intakeDriveDocument = functionExport(module, "intakeDriveDocument");
  expect(
    intakeDriveDocument,
    "The intake module does not export intakeDriveDocument",
  ).not.toBeNull();
  const logs: string[] = [];
  const record = (...args: unknown[]): void => {
    logs.push(args.map((arg) => (typeof arg === "string" ? arg : String(arg))).join(" "));
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
      const result = await (
        intakeDriveDocument as (request: Record<string, unknown>) => Promise<unknown>
      )({
        actor: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "ACCOUNTANT" },
        mode: "poll",
        folderId: FAKE_FOLDER_ID,
        source: fakes.source.port,
        evidenceStore: fakes.evidenceStore.port,
        intakeRepository: fakes.intakeRepository.port,
        submissionRepository: fakes.submissionRepository.port,
        localReader: fakes.localReader.port,
        extraction: fakes.extraction.port,
      });
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
 * Captures every console write of one runner entry.
 * @param run The run to capture.
 * @returns The code and the captured lines.
 */
async function captureRunner(
  run: () => Promise<unknown>,
): Promise<{ readonly code: unknown; readonly lines: readonly string[] }> {
  const lines: string[] = [];
  const record = (...args: unknown[]): void => {
    lines.push(args.map((arg) => (typeof arg === "string" ? arg : String(arg))).join(" "));
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
    const code = await run();
    return { code, lines };
  } catch (error) {
    return { code: error, lines };
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  }
}

/**
 * Reads the text of one file of the accounting app.
 * @param relative The path of the file, relative to the test folder.
 * @returns The text, or an empty string when the file is missing.
 */
function readAppFile(relative: string): string {
  const path = new URL(relative, import.meta.url);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/**
 * Reads one Cloud Build step by its id.
 * @param text The text of one build file.
 * @param id The step id.
 * @returns The text of the step, or an empty string when the step is missing.
 */
function readStep(text: string, id: string): string {
  const marker = `id: "${id}"`;
  const start = text.indexOf(marker);
  if (start === -1) return "";
  const next = text.indexOf("\n  - name:", start);
  return next === -1 ? text.slice(start) : text.slice(start, next);
}

/**
 * Reads the shell script of one Cloud Build step.
 * @param step The text of one step.
 * @returns The script text with the block indent removed, or an empty string.
 */
function readStepScript(step: string): string {
  const lines = step.split("\n");
  const open = lines.findIndex((line) => /^\s*-\s*\|\s*$/u.test(line));
  if (open === -1) return "";
  const body: string[] = [];
  let indent = -1;
  for (const line of lines.slice(open + 1)) {
    if (line.trim() === "") {
      body.push("");
      continue;
    }
    const lead = line.length - line.trimStart().length;
    if (indent === -1) indent = lead;
    if (lead < indent) break;
    body.push(line.slice(indent));
  }
  return body.join("\n");
}

/**
 * Turns one Cloud Build step script into a script that bash can run.
 * @param script The script text of one step.
 * @param values The value for each substitution key.
 * @returns The rendered script.
 */
function renderStepScript(
  script: string,
  values: Record<string, string>,
): string {
  let rendered = script;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.split(`\${${key}}`).join(value);
  }
  return rendered.split("$PROJECT_ID").join("fake-project").split("$$").join("$");
}

/**
 * Makes one scratch folder.
 * @param prefix The folder name prefix.
 * @returns The path of the new folder.
 */
function makeScratch(prefix: string): string {
  return mkdtempSync(
    existsSync("/tmp/opencode")
      ? `/tmp/opencode/${prefix}`
      : join(tmpdir(), prefix),
  );
}

const intakeJobFile = readAppFile("../../../cloudbuild-intake-job.yaml");
const guardStep = readStep(intakeJobFile, "guard-intake-values");
const schedulerStep = readStep(intakeJobFile, "schedule-intake-job");

describe("the intake poll under hostile file inputs", () => {
  it("keeps a hostile file name out of every row and every log line", async () => {
    const hostileNames = [
      "2026-11_receipt_../etc/passwd.pdf",
      "../2026-11_receipt_fake-counterparty.pdf",
      "2026-11_receipt_/etc/fake-counterparty.pdf;dropped.pdf",
    ] as const;
    console.log(`hostile_name_cases=${hostileNames.length}`);
    for (const name of hostileNames) {
      const file = makeFile({
        id: "fake-drive-file-0001",
        name,
        mimeType: "application/pdf",
        bodyText: "fake adversarial body one",
      });
      const fakes = createPollFakes({
        listing: [
          {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            byteSize: file.byteSize,
            modifiedTime: file.modifiedTime,
          },
        ],
        files: [file],
      });
      const { logs } = await runPoll(fakes);
      expect(
        fakes.intakeRepository.rows.length,
        `A hostile name must write no intake row: ${JSON.stringify(name)}`,
      ).toBe(0);
      expect(
        fakes.submissionRepository.stored.length,
        `A hostile name must write no submission: ${JSON.stringify(name)}`,
      ).toBe(0);
      // The fixture holds a path marker, so a leak could be found if it existed.
      expect(
        HOSTILE_PATH_MARKERS.some((marker) => name.includes(marker)),
        `The fixture name must carry a path marker: ${JSON.stringify(name)}`,
      );
      for (const marker of HOSTILE_PATH_MARKERS) {
        expect(
          logs.join("\n"),
          `No log line may hold the marker ${marker}`,
        ).not.toContain(marker);
      }
    }
  });

  it("writes no row when one listing entry breaks the listing contract", async () => {
    const file = makeFile({
      id: "fake-drive-file-0002",
      name: "a".repeat(2000),
      mimeType: "application/pdf",
      bodyText: "fake adversarial body two",
    });
    const listing = [
      {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        byteSize: file.byteSize,
        modifiedTime: file.modifiedTime,
      },
    ];
    expect(
      file.name.length,
      "The fixture name must exceed 256 characters",
    ).toBeGreaterThan(256);
    const fakes = createPollFakes({ listing, files: [file] });
    const { error } = await runPoll(fakes);
    expect(error, "A listing entry that breaks the contract must throw").toBeInstanceOf(
      Error,
    );
    expect(
      fakes.intakeRepository.calls.filter((call) => call.method === "insert").length,
      "No intake row may be written for a broken listing",
    ).toBe(0);
    expect(
      fakes.submissionRepository.stored.length,
      "No submission may be written for a broken listing",
    ).toBe(0);
  });

  it("holds the size boundary at the limit and fails the file above it", async () => {
    const cases = [
      { label: "byteSize is the limit", byteSize: SIZE_LIMIT_BYTES, failed: 0 },
      {
        label: "byteSize is one byte above the limit",
        byteSize: SIZE_LIMIT_BYTES + 1,
        failed: 1,
      },
    ] as const;
    for (const item of cases) {
      const file = makeFile({
        id: "fake-drive-file-0003",
        name: "2026-11_receipt_fake-counterparty.pdf",
        mimeType: "application/pdf",
        bodyText: "fake adversarial body three",
        byteSize: item.byteSize,
      });
      const fakes = createPollFakes({
        listing: [
          {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            byteSize: file.byteSize,
            modifiedTime: file.modifiedTime,
          },
        ],
        files: [file],
      });
      await runPoll(fakes);
      const row = fakes.intakeRepository.rows[0];
      expect(row, `${item.label}: one intake row must exist`).toBeDefined();
      if (item.failed === 1) {
        expect(row?.status, `${item.label}: the row must be failed`).toBe("failed");
        expect(
          row?.failureReason,
          `${item.label}: the reason must be the size reason`,
        ).toBe("The file is above the intake size limit");
        expect(
          fakes.evidenceStore.calls.filter((call) => call.method === "put").length,
          `${item.label}: no evidence object may be stored`,
        ).toBe(0);
        expect(
          fakes.source.calls.filter((call) => call.method === "download").length,
          `${item.label}: an oversize file must not be downloaded`,
        ).toBe(0);
        expect(
          fakes.submissionRepository.stored.length,
          `${item.label}: no submission may be written`,
        ).toBe(0);
      } else {
        expect(
          row?.status,
          `${item.label}: a file inside the limit must be read`,
        ).toBe("parsed");
        expect(
          fakes.submissionRepository.stored.length,
          `${item.label}: one submission must be written`,
        ).toBe(1);
      }
    }
  });

  it("downloads nothing for a refused type and writes one failed row", async () => {
    const file = makeFile({
      id: "fake-drive-file-0004",
      name: "2026-11_receipt_fake-counterparty.bin",
      mimeType: REFUSED_MIME_TYPE,
      bodyText: "fake adversarial body four",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
    });
    await runPoll(fakes);
    const row = fakes.intakeRepository.rows[0];
    expect(row, "A refused type must write one intake row").toBeDefined();
    expect(row?.status, "The row of a refused type must be failed").toBe("failed");
    expect(row?.failureReason).toBe("The file type is not an accepted intake type");
    expect(
      fakes.source.calls.filter((call) => call.method === "download").length,
      "A refused type must not be downloaded",
    ).toBe(0);
    expect(
      fakes.evidenceStore.calls.filter((call) => call.method === "put").length,
      "A refused type must store no evidence object",
    ).toBe(0);
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("writes no row for a listing entry with a missing field", async () => {
    const base = {
      id: "fake-drive-file-0005",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      byteSize: 32,
      modifiedTime: "2026-11-12T02:00:00.000Z",
    };
    const cases = [
      { label: "no name", entry: { ...base, name: undefined } },
      { label: "no id", entry: { ...base, id: undefined } },
      { label: "blank mime type", entry: { ...base, mimeType: "" } },
      { label: "negative byte size", entry: { ...base, byteSize: -1 } },
    ];
    console.log(`missing_field_cases=${cases.length}`);
    for (const item of cases) {
      const fakes = createPollFakes({ listing: [item.entry] });
      const { error } = await runPoll(fakes);
      expect(error, `${item.label}: the poll must throw`).toBeInstanceOf(Error);
      expect(
        (error as { readonly reason?: string }).reason,
        `${item.label}: the reason must be invalid-input`,
      ).toBe("invalid-input");
      expect(
        fakes.intakeRepository.calls.filter((call) => call.method === "insert")
          .length,
        `${item.label}: no intake row may be written`,
      ).toBe(0);
      expect(
        fakes.submissionRepository.stored.length,
        `${item.label}: no submission may be written`,
      ).toBe(0);
    }
  });

  it("marks a byte-equal file with a different payee duplicate and writes no submission", async () => {
    const body = Buffer.from("fake adversarial body six", "latin1");
    const earlierReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const earlier = makeSubmission({
      payee: "Fake Other Payee",
      evidenceReference: earlierReference,
      money: { amountMinor: "99999", currency: "THB" },
    });
    const file = makeFile({
      id: "fake-drive-file-0006",
      name: "2026-12_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body six",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      submissionSeed: [earlier],
    });
    fakes.evidenceStore.objects.set(earlierReference, new Uint8Array(body));
    await runPoll(fakes);
    const row = fakes.intakeRepository.rows[0];
    expect(row, "One intake row must exist").toBeDefined();
    expect(row?.status, "A byte-equal file must be a duplicate").toBe("duplicate");
    expect(row?.duplicateOfSubmissionId, "The duplicate must name the earlier submission").toBe(
      earlier.id,
    );
    expect(
      fakes.submissionRepository.stored.length,
      "A duplicate must write no submission",
    ).toBe(0);
    expect(
      row?.failureReason,
      "The duplicate reason is the fixed string of the domain",
    ).toBe("A content duplicate of an earlier submission");
    for (const token of [
      earlier.payee,
      "Fake Other Payee",
      "99999",
      AMOUNT_MINOR,
      file.id,
    ]) {
      const text = `${row?.failureReason ?? ""} ${row?.status ?? ""}`;
      expect(
        text,
        "A duplicate row must hold no payee, amount, or Drive id",
      ).not.toContain(token);
    }
  });
});

describe("the duplicate scan under hostile rows", () => {
  it("gives a third byte-equal copy the origin submission", async () => {
    const body = new Uint8Array(Buffer.from("fake adversarial body seven", "latin1"));
    const originReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const originSubmissionId = "88888888-8888-4888-8888-888888888888";
    const failedRow = makeIntakeRow({
      id: randomUUID(),
      driveFileId: "fake-drive-file-0007",
      status: "failed",
      evidenceReference: null,
      submissionId: null,
      duplicateOfSubmissionId: null,
      evidenceByteSize: body.byteLength,
      failureReason: "review: the document read failed",
    });
    const duplicateRow = makeIntakeRow({
      id: randomUUID(),
      driveFileId: "fake-drive-file-0008",
      status: "duplicate",
      evidenceReference: originReference,
      submissionId: null,
      duplicateOfSubmissionId: originSubmissionId,
      evidenceByteSize: body.byteLength,
    });
    const file = makeFile({
      id: "fake-drive-file-0009",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body seven",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      intakeSeed: [failedRow, duplicateRow],
    });
    fakes.evidenceStore.objects.set(originReference, body);
    await runPoll(fakes);
    const inserted = fakes.intakeRepository.rows.filter(
      (row) => row.id !== failedRow.id && row.id !== duplicateRow.id,
    );
    expect(inserted.length, "The third copy must write exactly one intake row").toBe(1);
    expect(inserted[0]?.status, "The third copy must be a duplicate").toBe("duplicate");
    expect(
      inserted[0]?.duplicateOfSubmissionId,
      "The third copy must name the origin submission and not the duplicate row",
    ).toBe(originSubmissionId);
    expect(
      fakes.submissionRepository.stored.length,
      "The third copy must write no submission",
    ).toBe(0);
  });

  it("runs no byte compare for a row with no evidence reference and keeps scanning", async () => {
    const body = new Uint8Array(Buffer.from("fake adversarial body eight", "latin1"));
    const originReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const failedRow = makeIntakeRow({
      driveFileId: "fake-drive-file-0010",
      status: "failed",
      evidenceReference: null,
      submissionId: null,
      duplicateOfSubmissionId: null,
      evidenceByteSize: body.byteLength,
      failureReason: "review: the document read failed",
    });
    const originRow = makeIntakeRow({
      driveFileId: "fake-drive-file-0011",
      status: "parsed",
      evidenceReference: originReference,
      submissionId: "77777777-7777-4777-8777-777777777777",
      evidenceByteSize: body.byteLength,
    });
    const file = makeFile({
      id: "fake-drive-file-0012",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body eight",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      intakeSeed: [failedRow, originRow],
    });
    fakes.evidenceStore.objects.set(originReference, body);
    await runPoll(fakes);
    const compares = fakes.evidenceStore.calls.filter(
      (call) => call.method === "sameEvidenceBytes",
    );
    expect(compares.length, "The scan must reach the byte compare").toBeGreaterThan(0);
    for (const call of compares) {
      const references = collectStrings(call.args).filter((value) =>
        value.startsWith("private-evidence://"),
      );
      expect(
        references.length,
        "A compare must hold two references, so a row with no evidence is skipped",
      ).toBe(2);
    }
    const inserted = fakes.intakeRepository.rows.filter(
      (row) => row.id !== failedRow.id && row.id !== originRow.id,
    );
    expect(
      inserted[0]?.status,
      "The scan must continue past the failed row and find the duplicate",
    ).toBe("duplicate");
  });

  it("finds a hand-made submission copy in pass 1 and never reads pass 2", async () => {
    const body = new Uint8Array(Buffer.from("fake adversarial body nine", "latin1"));
    const handMadeReference = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const handMade = makeSubmission({ evidenceReference: handMadeReference });
    const file = makeFile({
      id: "fake-drive-file-0013",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body nine",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      submissionSeed: [handMade],
    });
    fakes.evidenceStore.objects.set(handMadeReference, body);
    await runPoll(fakes);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.status, "A hand-made copy must be a duplicate").toBe("duplicate");
    expect(row?.duplicateOfSubmissionId).toBe(handMade.id);
    expect(
      fakes.intakeRepository.calls.filter(
        (call) => call.method === "findByEvidenceByteSize",
      ).length,
      "Pass 1 found the match, so pass 2 must not run",
    ).toBe(0);
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });

  it("never sends an .xlsx to the extraction port when the local reader asks for the model", async () => {
    const file = makeFile({
      id: "fake-drive-file-0014",
      name: "ใบสำคัญจ่าย 2026-11.xlsx",
      mimeType: XLSX_MIME_TYPE,
      bodyText: "fake adversarial body ten",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      localResult: LOCAL_MODEL_RESULT,
    });
    await runPoll(fakes);
    expect(
      fakes.extraction.calls.length,
      "A workbook must never reach the extraction port, even when the reader asks for the model",
    ).toBe(0);
    const row = fakes.intakeRepository.rows[0];
    expect(row?.status, "The workbook row must be failed").toBe("failed");
    expect(row?.failureReason).toBe("review: the workbook needs a manual read");
    expect(fakes.submissionRepository.stored.length).toBe(0);
  });
});

describe("the intake lease and the runner entry", () => {
  it("runs no poll and releases no lease when a second worker holds the lease", async () => {
    const runner = await loadRunnerModule();
    const runIntakePoll = functionExport(runner, "runIntakePoll");
    expect(
      runIntakePoll,
      "The runner module must export runIntakePoll",
    ).not.toBeNull();
    if (runIntakePoll === null) return;
    const file = makeFile({
      id: "fake-drive-file-0015",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body eleven",
    });
    const source = createFakeSourcePort({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
    });
    const leaseCalls: RecordedCall[] = [];
    const leaseRepository = {
      claim: async (request: {
        readonly leaseToken: string;
        readonly now: number;
      }): Promise<undefined> => {
        leaseCalls.push({ method: "claim", args: [request] });
        return undefined;
      },
      release: async (request: { readonly leaseToken: string }): Promise<void> => {
        leaseCalls.push({ method: "release", args: [request] });
      },
    };
    const { code } = await captureRunner(() =>
      Promise.resolve(
        (runIntakePoll as (argv: string[], deps: unknown) => Promise<number>)([], {
          actor: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "ACCOUNTANT" },
          folderId: FAKE_FOLDER_ID,
          source: source.port,
          evidenceStore: createFakeEvidenceStore().port,
          intakeRepository: createFakeIntakeRepository().port,
          submissionRepository: createFakeSubmissionRepository().port,
          localReader: createRecordingPort({}).port,
          extraction: createRecordingPort({}).port,
          leaseRepository,
        }),
      ),
    );
    expect(code, "A refused lease must give the exit code 1").toBe(1);
    expect(
      leaseCalls.filter((call) => call.method === "claim").length,
      "The run must claim the lease once",
    ).toBe(1);
    expect(
      leaseCalls.filter((call) => call.method === "release").length,
      "A refused lease must not release the lease of the other worker",
    ).toBe(0);
    expect(
      source.calls.filter((call) => call.method === "list").length,
      "A refused lease must list no Drive folder",
    ).toBe(0);
  });

  it("keeps a Drive id out of the rows and the logs when the download fails", async () => {
    const file = makeFile({
      id: "fake-drive-file-0016",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body twelve",
    });
    const downloadError = new Error(
      `Drive download failed for file ${file.id}: fake quota error`,
    );
    expect(
      downloadError.message,
      "The fixture error must carry the fake Drive id",
    ).toContain(file.id);
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      downloadError,
    });
    const { error, logs } = await runPoll(fakes);
    expect(error, "A failed download must not be swallowed as a parsed row").toBeInstanceOf(
      Error,
    );
    expect(
      fakes.intakeRepository.rows.length,
      "A failed download must write no intake row",
    ).toBe(0);
    expect(
      logs.join("\n"),
      "No log line may hold the fake Drive id",
    ).not.toContain(file.id);
    expect(logs.join("\n"), "No log line may hold the error text").not.toContain(
      "fake quota error",
    );
  });

  it("keeps a Drive id out of the entry log when the listing fails", async () => {
    const runner = await loadRunnerModule();
    const entry = functionExport(runner, "runIntakePollEntry");
    expect(entry, "The runner module must export runIntakePollEntry").not.toBeNull();
    if (entry === null) return;
    const file = makeFile({
      id: "fake-drive-file-0017",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body thirteen",
    });
    const listError = new Error(
      `Drive list failed for folder ${FAKE_FOLDER_ID} and file ${file.id}`,
    );
    expect(listError.message, "The fixture error must carry the fake Drive id").toContain(
      file.id,
    );
    const source = createRecordingPort({
      list: () => {
        throw listError;
      },
    });
    const leaseRepository = {
      claim: async () => ({
        queueName: QUEUE_NAME,
        leaseToken: LEASE_TOKEN,
        workerId: OTHER_WORKER_ID,
        leaseExpiresAt: new Date(Date.now() + 60_000),
        claimedAt: new Date(),
      }),
      release: async () => undefined,
    };
    const { code, lines } = await captureRunner(() =>
      Promise.resolve(
        (entry as (argv: string[], deps: unknown) => Promise<number>)([], {
          actor: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "ACCOUNTANT" },
          folderId: FAKE_FOLDER_ID,
          source: source.port,
          evidenceStore: createFakeEvidenceStore().port,
          intakeRepository: createFakeIntakeRepository().port,
          submissionRepository: createFakeSubmissionRepository().port,
          localReader: createRecordingPort({}).port,
          extraction: createRecordingPort({}).port,
          leaseRepository,
        }),
      ),
    );
    expect(code, "A failed entry must give the exit code 1").toBe(1);
    const joined = lines.join("\n");
    expect(joined, "The entry must log the failure event").toContain(
      "intake_poll_failed",
    );
    expect(joined, "The entry log must hold no Drive id").not.toContain(file.id);
    expect(joined, "The entry log must hold no folder id").not.toContain(
      FAKE_FOLDER_ID,
    );
    expect(joined, "The entry log must hold no error message text").not.toContain(
      "Drive list failed",
    );
  });
});

describe("the intake build file", () => {
  it("rejects each empty substitution and prints only the key", () => {
    const script = readStepScript(guardStep);
    expect(guardStep, "The guard step must exist in the intake build file").not.toBe(
      "",
    );
    expect(script, "The guard step must hold a script").not.toBe("");
    const scratch = makeScratch("adv-intake-guard-");
    try {
      const runGuard = (values: Record<string, string>) =>
        spawnSync("bash", ["-c", renderStepScript(script, values)], {
          cwd: scratch,
          env: {
            PATH: process.env.PATH ?? "",
            HOME: process.env.HOME ?? "",
          } as unknown as NodeJS.ProcessEnv,
          encoding: "utf8",
        });
      const accepted = runGuard(FAKE_VALUES);
      expect(accepted.status, `All six values set: ${accepted.stderr}`).toBe(0);
      for (const key of SUBSTITUTION_KEYS) {
        const rejected = runGuard({ ...FAKE_VALUES, [key]: "" });
        expect(rejected.status, `Empty ${key} must be rejected`).toBe(1);
        expect(rejected.stderr, `Empty ${key} must name the key`).toContain(
          key.slice(1),
        );
        for (const other of SUBSTITUTION_KEYS) {
          if (other === key) continue;
          expect(
            `${rejected.stdout}${rejected.stderr}`,
            `Empty ${key} must not print the value of ${other}`,
          ).not.toContain(FAKE_VALUES[other]);
        }
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("rejects a malformed scan cap and runs no token of it", () => {
    const script = readStepScript(guardStep);
    expect(script, "The guard step must hold a script").not.toBe("");
    const malformedCaps = ["abc", "0", "007", "-5", "500; printf leaked-marker"];
    console.log(`malformed_cap_cases=${malformedCaps.length}`);
    const scratch = makeScratch("adv-intake-cap-");
    try {
      const runGuard = (values: Record<string, string>) =>
        spawnSync("bash", ["-c", renderStepScript(script, values)], {
          cwd: scratch,
          env: {
            PATH: process.env.PATH ?? "",
            HOME: process.env.HOME ?? "",
          } as unknown as NodeJS.ProcessEnv,
          encoding: "utf8",
        });
      for (const cap of malformedCaps) {
        const rejected = runGuard({
          ...FAKE_VALUES,
          _ACCOUNTING_DUPLICATE_SCAN_CAP: cap,
        });
        expect(rejected.status, `Scan cap ${cap} must be rejected`).toBe(1);
        expect(rejected.stderr, `Scan cap ${cap} must name the key`).toContain(
          "ACCOUNTING_DUPLICATE_SCAN_CAP",
        );
        expect(
          `${rejected.stdout}${rejected.stderr}`,
          `Scan cap ${cap} must run no token of the value`,
        ).not.toContain("leaked-marker");
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("updates an existing scheduler job and creates a missing one", () => {
    const script = readStepScript(schedulerStep);
    expect(schedulerStep, "The scheduler step must exist in the intake build file").not.toBe(
      "",
    );
    expect(script, "The scheduler step must hold a script").not.toBe("");
    const branches = [
      { describeExit: 0, verb: "update" },
      { describeExit: 1, verb: "create" },
    ] as const;
    console.log(`scheduler_branch_cases=${branches.length}`);
    for (const branch of branches) {
      const scratch = makeScratch("adv-intake-scheduler-");
      try {
        const bin = join(scratch, "bin");
        mkdirSync(bin);
        const callLog = join(scratch, "calls.txt");
        const stub = join(bin, "gcloud");
        writeFileSync(
          stub,
          [
            "#!/usr/bin/env bash",
            'printf "%s\\t" "$@" >> "$STUB_CALLS"',
            'printf "\\n" >> "$STUB_CALLS"',
            'if [ "$1" = scheduler ] && [ "$2" = jobs ] && [ "$3" = describe ]; then exit "$STUB_DESCRIBE_EXIT"; fi',
            "exit 0",
            "",
          ].join("\n"),
        );
        chmodSync(stub, 0o755);
        const run = spawnSync("bash", ["-c", renderStepScript(script, FAKE_VALUES)], {
          cwd: scratch,
          env: {
            PATH: `${bin}:${process.env.PATH ?? ""}`,
            HOME: process.env.HOME ?? "",
            STUB_CALLS: callLog,
            STUB_DESCRIBE_EXIT: String(branch.describeExit),
          } as unknown as NodeJS.ProcessEnv,
          encoding: "utf8",
        });
        expect(
          run.status,
          `describe exit ${branch.describeExit}: ${run.stderr}`,
        ).toBe(0);
        const calls = existsSync(callLog)
          ? readFileSync(callLog, "utf8")
              .split("\n")
              .filter((line) => line !== "")
              .map((line) =>
                (line.endsWith("\t") ? line.slice(0, -1) : line).split("\t"),
              )
          : [];
        expect(calls.length, `describe exit ${branch.describeExit}`).toBe(2);
        expect((calls[0] ?? []).slice(0, 4)).toEqual([
          "scheduler",
          "jobs",
          "describe",
          "accounting-intake-poll",
        ]);
        const second = calls[1] ?? [];
        expect(
          second.slice(0, 5),
          `The ${branch.verb} branch must target the admin API`,
        ).toEqual(["scheduler", "jobs", branch.verb, "http", "accounting-intake-poll"]);
        expect(second).toContain("--http-method=POST");
        expect(second).toContain(
          `--uri=${SCHEDULER_URI.split("$PROJECT_ID").join("fake-project")}`,
        );
        expect(second).toContain("--schedule=0 6 * * *");
        expect(second).toContain("--attempt-deadline=1800s");
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    }
  });
});

describe("the company scope of the intake rows", () => {
  it("never replays a foreign intake row of the same Drive file id", async () => {
    const body = new Uint8Array(Buffer.from("fake adversarial body fourteen", "latin1"));
    const foreignRow = makeIntakeRow({
      driveFileId: "fake-drive-file-0018",
      scopeCompanyId: OTHER_COMPANY_ID,
      status: "parsed",
      evidenceReference: `private-evidence://${OTHER_COMPANY_ID}/submissions/${randomUUID()}/evidence`,
      submissionId: "66666666-6666-4666-8666-666666666666",
      evidenceByteSize: body.byteLength,
      sightingCount: 4,
    });
    const file = makeFile({
      id: foreignRow.driveFileId,
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body fourteen",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      intakeSeed: [foreignRow],
    });
    fakes.evidenceStore.objects.set(
      foreignRow.evidenceReference ?? "",
      body,
    );
    await runPoll(fakes);
    const inserted = fakes.intakeRepository.rows.filter(
      (row) => row.id !== foreignRow.id,
    );
    expect(
      inserted.length,
      "A foreign row must not be replayed: the poll must write its own row",
    ).toBe(1);
    expect(
      inserted[0]?.scopeCompanyId,
      "The new row must hold the company of the actor",
    ).toBe(COMPANY_ID);
    const storedForeign = fakes.intakeRepository.rows.find(
      (row) => row.id === foreignRow.id,
    );
    expect(
      storedForeign?.sightingCount,
      "The foreign row must keep its sighting count",
    ).toBe(4);
    expect(
      fakes.intakeRepository.scopes,
      "Every repository call must bind the company of the actor",
    ).not.toContain(OTHER_COMPANY_ID);
    expect(
      fakes.intakeRepository.scopes.filter((scope) => scope === COMPANY_ID).length,
      "At least one repository call must bind the scope",
    ).toBeGreaterThan(0);
  });

  it("never links a foreign submission as a duplicate", async () => {
    const body = new Uint8Array(Buffer.from("fake adversarial body fifteen", "latin1"));
    const foreignReference = `private-evidence://${OTHER_COMPANY_ID}/submissions/${randomUUID()}/evidence`;
    const foreign = makeSubmission({
      scope: { companyId: OTHER_COMPANY_ID },
      evidenceReference: foreignReference,
    });
    const file = makeFile({
      id: "fake-drive-file-0019",
      name: "2026-11_receipt_fake-counterparty.pdf",
      mimeType: "application/pdf",
      bodyText: "fake adversarial body fifteen",
    });
    const fakes = createPollFakes({
      listing: [
        {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
          modifiedTime: file.modifiedTime,
        },
      ],
      files: [file],
      submissionSeed: [foreign],
    });
    fakes.evidenceStore.objects.set(foreignReference, body);
    await runPoll(fakes);
    const row = fakes.intakeRepository.rows[0];
    expect(row, "One intake row must exist").toBeDefined();
    expect(
      row?.status,
      "A foreign submission with equal bytes must not be treated as a duplicate",
    ).toBe("parsed");
    expect(row?.duplicateOfSubmissionId, "No duplicate link may be written").toBeNull();
    expect(
      row?.submissionId,
      "The file of this company becomes its own submission",
    ).not.toBe(foreign.id);
    expect(fakes.submissionRepository.stored.length).toBe(1);
    expect(
      fakes.intakeRepository.scopes,
      "No repository call may bind the foreign company",
    ).not.toContain(OTHER_COMPANY_ID);
  });
});
