import { randomUUID } from "node:crypto";

import { z } from "zod";

import type {
  FinanceMoneyInput,
  FinanceOperationScope,
} from "../finance-operations/contracts.js";
import {
  accountingDriveFileIdSchema,
  accountingIntakeDocumentSchema,
  type AccountingEvidenceStore,
  type AccountingIntakeDocument,
  type AccountingIntakeDocumentType,
} from "./intake-contracts.js";
import {
  AccountingSubmissionError,
  submitAccountingSubmissionWithOutcome,
  type AccountingActor,
  type AccountingSubmissionRepository,
} from "./submissions.js";
import type { AccountingSubmissionInput } from "./contracts.js";

/** Size limit of one intake file: 20 MB. */
export const ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;

/** Default cap of the first duplicate scan pass. */
export const ACCOUNTING_DUPLICATE_SCAN_CAP_DEFAULT = 500;

/** Queue name of the intake poll lease (FR-6). */
export const ACCOUNTING_INTAKE_QUEUE_NAME = "accounting-intake-poll";

/** MIME type of a native Google Sheet. */
const GOOGLE_SHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

/** MIME type of an `.xlsx` workbook. */
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** MIME types the intake accepts (spec section 6). */
const ACCEPTED_INTAKE_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  GOOGLE_SHEET_MIME_TYPE,
  XLSX_MIME_TYPE,
]);

/** Name rule `YYYY-MM_<document-type>_<counterparty>.<ext>` (spec section 5.7). */
const NAMED_FILE_PATTERN =
  /^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])_(?<documentType>[A-Za-z0-9-]+)_(?<counterparty>[^/\\]+)\.(?<extension>[A-Za-z0-9]+)$/u;

/** Voucher name rule `ใบสำคัญจ่าย YYYY-MM.xlsx` (PM-16). */
const VOUCHER_FILE_PATTERN =
  /^ใบสำคัญจ่าย (?<year>\d{4})-(?<month>0[1-9]|1[0-2])\.xlsx$/u;

/** Name segments that map to an intake document type key. */
const NAME_DOCUMENT_TYPES: ReadonlyMap<string, AccountingIntakeDocumentType> =
  new Map<string, AccountingIntakeDocumentType>([
    ["receipt", "receipt"],
    ["tax-invoice", "tax-invoice"],
    ["bank-statement", "bank-statement"],
    ["payroll-sheet", "payroll-sheet"],
    ["withholding-certificate", "withholding-certificate"],
    ["payment-voucher-sheet", "payment-voucher-sheet"],
    ["payment-voucher", "payment-voucher-sheet"],
    ["cloud-invoice", "cloud-invoice"],
    ["openai-invoice", "openai-invoice"],
  ]);

/** One file of the Drive intake listing. */
export interface AccountingDriveFile {
  /** Drive file id; it is the idempotency key. */
  readonly id: string;
  /** Drive file name. */
  readonly name: string;
  /** Declared MIME type of the file. */
  readonly mimeType: string;
  /** Declared byte size of the file, when the listing gives one. */
  readonly byteSize?: number;
  /** Drive modified time of the file, when the listing gives one. */
  readonly modifiedTime?: string;
}

/** Read-only Drive port of the intake poll (FR-11, spec section 5). */
export interface AccountingDocumentSourcePort {
  /**
   * Lists the intake folder and, from 2027, the current-year subfolder.
   * @param input Trusted folder id of the intake folder.
   * @returns The files of the listing.
   */
  list(input: {
    readonly folderId: string;
  }): Promise<readonly AccountingDriveFile[]>;

  /**
   * Downloads the bytes of one binary Drive file.
   * @param input Drive file id of the file.
   * @returns The file bytes.
   */
  download(input: { readonly fileId: string }): Promise<Uint8Array>;

  /**
   * Exports one native Google Sheet as an `.xlsx` workbook.
   * @param input Drive file id of the sheet.
   * @returns The exported workbook bytes.
   */
  export(input: {
    readonly fileId: string;
  }): Promise<Uint8Array>;
}

/** One extracted draft value the readers return. */
export interface AccountingIntakeDraft {
  /** Submission kind: an expense or a bill. */
  readonly kind?: string;
  /** Payee of the document. */
  readonly payee?: string;
  /** Alternate payee name some readers return. */
  readonly payeeName?: string;
  /** Submission category. */
  readonly category?: string;
  /** Free description of the document. */
  readonly description?: string;
  /** Amount in minor units, when the reader returns it flat. */
  readonly amountMinor?: string;
  /** Currency, when the reader returns it flat. */
  readonly currency?: FinanceMoneyInput["currency"];
  /** Money pair in minor units. */
  readonly money?: Readonly<FinanceMoneyInput>;
}

/** Result of one local document read (spec section 5.3). */
export interface AccountingDocumentReadResult {
  /** `text` for a readable file and `needs-model` for a file with no text layer. */
  readonly kind: "text" | "needs-model";
  /** Draft the local reader produced, for a readable file. */
  readonly draft?: AccountingIntakeDraft;
}

/** Local text and workbook reader port of the intake poll. */
export interface AccountingDocumentLocalReaderPort {
  /**
   * Reads one document on this machine.
   * @param input Company scope, MIME type, and file bytes.
   * @returns The local read result.
   */
  read(input: {
    readonly companyId: string;
    readonly mimeType: string;
    readonly body: Uint8Array;
  }): Promise<AccountingDocumentReadResult>;
}

/** Result of one model read on Vertex AI (spec section 5.3). */
export interface AccountingDocumentExtractionResult {
  /** Draft the model produced. */
  readonly draft?: AccountingIntakeDraft;
}

/** Model reader port of the intake poll; the app adapter names the provider. */
export interface AccountingDocumentExtractionPort {
  /**
   * Reads one document through the model route.
   * @param input Company scope, MIME type, and file bytes.
   * @returns The model read result.
   */
  extract(input: {
    readonly companyId: string;
    readonly mimeType: string;
    readonly body: Uint8Array;
  }): Promise<AccountingDocumentExtractionResult>;
}

/**
 * New intake row before its first write. The row carries no `status`: the
 * table default makes it `pending`, and the domain then moves it to `parsed`,
 * `failed`, or `duplicate`. A row never moves back to `pending` (F53).
 */
export type AccountingIntakeDocumentDraft = Omit<
  AccountingIntakeDocument,
  "status"
>;

/**
 * Persistence boundary of the intake document rows (spec section 5.8). The
 * `insert` member writes one intake row only: the submit audit row is written
 * by `submitAccountingSubmissionWithOutcome`, so one submit request gives one
 * audit row (F61).
 */
export interface AccountingIntakeDocumentRepository {
  /**
   * Persists one intake document row.
   * @param document New intake row generated by the domain, without a status.
   * @returns The stored row.
   */
  insert(
    document: AccountingIntakeDocumentDraft,
  ): Promise<AccountingIntakeDocument>;

  /**
   * Finds one intake row by its Drive file id inside the company scope.
   * @param input Company scope and Drive file id.
   * @returns The row, or undefined when the file id is new.
   */
  findByDriveFileId(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly driveFileId: string;
  }): Promise<AccountingIntakeDocument | undefined>;

  /**
   * Lists the newest submissions that hold evidence, for the first duplicate
   * pass. The rows carry the submission id and its evidence reference, newest
   * first, so the pass compares bytes against submissions and not against
   * intake rows (Review A F303, PM-22).
   * @param input Company scope and the pass cap.
   * @returns The newest submission evidence rows, at most `limit` rows.
   */
  listRecentSubmissionEvidence(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly limit: number;
  }): Promise<
    readonly {
      readonly submissionId: string;
      readonly evidenceReference: string;
    }[]
  >;

  /**
   * Lists every row whose stored evidence byte size equals one size.
   * @param input Company scope and the candidate byte length.
   * @returns The rows of that size, history rows included.
   */
  findByEvidenceByteSize(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly evidenceByteSize: number;
  }): Promise<readonly AccountingIntakeDocument[]>;

  /**
   * Lists every intake row of one company scope.
   * @param scope Company scope of the listing.
   * @returns The intake rows of the scope.
   */
  listByScope(
    scope: Readonly<FinanceOperationScope>,
  ): Promise<readonly AccountingIntakeDocument[]>;

  /**
   * Marks one row a content duplicate of an earlier submission.
   * @param input Company scope, row id, earlier submission id, and the reason.
   * @returns The updated row, or undefined when no row matched.
   */
  markDuplicate(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly id: string;
    readonly duplicateOfSubmissionId: string;
    readonly failureReason: string;
  }): Promise<AccountingIntakeDocument | undefined>;

  /**
   * Marks one row parsed after a successful read.
   * @param input Company scope, row id, submission id, and the extraction
   *   marker.
   * @returns The updated row, or undefined when no row matched.
   */
  markParsed(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly id: string;
    readonly submissionId: string;
    readonly extraction: "human" | "local-text" | "model";
  }): Promise<AccountingIntakeDocument | undefined>;

  /**
   * Marks one row failed and increases its failure count.
   * @param input Company scope, row id, and the safe failure reason.
   * @returns The updated row, or undefined when no row matched.
   */
  markFailed(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly id: string;
    readonly failureReason: string;
  }): Promise<AccountingIntakeDocument | undefined>;

  /**
   * Increases the sighting count of a repeated file id.
   * @param input Company scope, row id, the new count, and the new instant.
   * @returns The updated row, or undefined when no row matched.
   */
  bumpSighting(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly id: string;
    readonly sightingCount: number;
    readonly lastSeenAt: string;
  }): Promise<AccountingIntakeDocument | undefined>;
}

/** Counts of one intake poll run. */
export interface AccountingIntakePollResult {
  /** Number of files the poll read and processed. */
  readonly processed: number;
  /** Number of submissions the poll wrote. */
  readonly submissions: number;
  /** Number of content-duplicate rows the poll wrote. */
  readonly duplicates: number;
  /** Number of failed rows the poll wrote. */
  readonly failed: number;
  /** Number of files skipped by the name rule. */
  readonly skipped: number;
}

/** Request of one intake poll run. */
export interface AccountingIntakeDriveDocumentRequest {
  /** Session actor of the poll; the company scope comes from it. */
  readonly actor: AccountingActor;
  /** Poll mode; the history mode arrives in task 8.2. */
  readonly mode: "poll";
  /** Drive folder id of the intake folder. */
  readonly folderId: string;
  /** Read-only Drive port. */
  readonly source: AccountingDocumentSourcePort;
  /** Evidence store port of spec section 5.4. */
  readonly evidenceStore: AccountingEvidenceStore;
  /** Intake row repository port of spec section 5.8. */
  readonly intakeRepository: AccountingIntakeDocumentRepository;
  /** Submission repository of the accounting module. */
  readonly submissionRepository: AccountingSubmissionRepository;
  /** Local text and workbook reader. */
  readonly localReader: AccountingDocumentLocalReaderPort;
  /** Model reader on Vertex AI. */
  readonly extraction: AccountingDocumentExtractionPort;
  /** Optional cap override of the first duplicate pass. */
  readonly duplicateScanCap?: number;
}

/** One lease row of `accounting_intake_leases` (FR-6). */
export interface AccountingIntakeLease {
  /** Queue name of the lease. */
  readonly queueName: string;
  /** Token of the worker that holds the lease. */
  readonly leaseToken: string;
  /** Worker id that holds the lease. */
  readonly workerId: string;
  /** Instant the lease expires. */
  readonly leaseExpiresAt: Date | string | number;
  /** Instant the lease was claimed. */
  readonly claimedAt: Date | string | number;
}

/** Persistence boundary of the intake lease rows (FR-6). */
export interface AccountingIntakeLeaseRepository {
  /**
   * Claims the queue when no live lease of another token exists. The store
   * performs a compare-and-swap on `lease_token`.
   * @param input Company scope, queue, worker, token, and expiry.
   * @returns The claimed lease, or undefined when a live lease holds it.
   */
  claim(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly queueName: string;
    readonly workerId: string;
    readonly leaseToken: string;
    readonly leaseExpiresAt: Date | number;
    readonly now?: number;
  }): Promise<AccountingIntakeLease | undefined>;

  /**
   * Releases one lease so the next run may claim the queue.
   * @param input Company scope, queue name, and the held token.
   * @returns The released lease, or undefined when no row matched.
   */
  release(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly queueName: string;
    readonly leaseToken: string;
  }): Promise<AccountingIntakeLease | undefined>;

  /**
   * Finds the lease row of one queue inside the company scope.
   * @param input Company scope and queue name.
   * @returns The lease row, or undefined when the queue is absent.
   */
  findByQueue(input: {
    readonly scope: Readonly<FinanceOperationScope>;
    readonly queueName: string;
  }): Promise<AccountingIntakeLease | undefined>;
}

/** Listing contract the poll validates before it touches one file. */
const driveFileListingSchema = z.array(
  z.object({
    id: accountingDriveFileIdSchema,
    name: z.string().min(1).max(1024),
    mimeType: z.string().min(1).max(256),
    byteSize: z.number().int().nonnegative().optional(),
    modifiedTime: z.string().min(1).max(64).optional(),
  }),
);

/**
 * Parses one Drive file name through the two accepted name rules.
 * @param name Drive file name.
 * @returns The month and the name document type, or null when no rule matches.
 */
export function parseIntakeFileName(name: string): {
  readonly sourceMonth: string;
  readonly documentType: AccountingIntakeDocumentType | null;
} | null {
  const voucher = VOUCHER_FILE_PATTERN.exec(name);
  if (voucher?.groups !== undefined) {
    return {
      sourceMonth: `${voucher.groups.year}-${voucher.groups.month}`,
      documentType: null,
    };
  }
  const named = NAMED_FILE_PATTERN.exec(name);
  if (named?.groups === undefined) return null;
  const nameType = named.groups.documentType ?? "";
  return {
    sourceMonth: `${named.groups.year}-${named.groups.month}`,
    documentType: NAME_DOCUMENT_TYPES.get(nameType) ?? null,
  };
}

/**
 * Resolves the document type of one accepted file. The name decides when it
 * holds a known type key; otherwise the MIME type decides, because the
 * voucher name sets no type (PM-16).
 * @param nameType Document type the name rule resolved, or null.
 * @param mimeType Declared MIME type of the file.
 * @returns The intake document type key.
 */
function resolveDocumentType(
  nameType: AccountingIntakeDocumentType | null,
  mimeType: string,
): AccountingIntakeDocumentType {
  if (nameType !== null) return nameType;
  const normalized = mimeType.toLowerCase();
  if (
    normalized === XLSX_MIME_TYPE ||
    normalized === GOOGLE_SHEET_MIME_TYPE
  ) {
    return "payment-voucher-sheet";
  }
  if (normalized.startsWith("image/")) return "receipt";
  return "cloud-invoice";
}

/** Resolves the duplicate-scan cap from the request and the environment. */
function resolveDuplicateScanCap(request: {
  readonly duplicateScanCap?: number;
}): number {
  if (
    request.duplicateScanCap !== undefined &&
    Number.isInteger(request.duplicateScanCap) &&
    request.duplicateScanCap > 0
  ) {
    return request.duplicateScanCap;
  }
  const raw = process.env.ACCOUNTING_DUPLICATE_SCAN_CAP;
  if (raw !== undefined) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return ACCOUNTING_DUPLICATE_SCAN_CAP_DEFAULT;
}

/**
 * Downloads one file from the Drive port. A native Google Sheet is exported
 * as an `.xlsx` workbook first (spec section 6).
 * @param source Drive port of the poll.
 * @param file One file of the listing.
 * @returns The file bytes.
 */
async function fetchDocumentBytes(
  source: AccountingDocumentSourcePort,
  file: AccountingDriveFile,
): Promise<Uint8Array> {
  if (file.mimeType.toLowerCase() === GOOGLE_SHEET_MIME_TYPE) {
    return source.export({ fileId: file.id });
  }
  return source.download({ fileId: file.id });
}

/**
 * Returns the content type under which one file's bytes are stored. A native
 * Google Sheet is exported as an `.xlsx` workbook, so its bytes are stored
 * with the `.xlsx` MIME type and never with the Google Sheet type (F312).
 * @param fileMimeType Declared MIME type of the Drive file.
 * @returns The storage content type.
 */
function intakeContentType(fileMimeType: string): string {
  return fileMimeType.toLowerCase() === GOOGLE_SHEET_MIME_TYPE
    ? XLSX_MIME_TYPE
    : fileMimeType;
}

/**
 * Converts one reader draft into a validated submission input. The domain
 * submission schema remains the validation authority.
 * @param draft Draft the reader returned.
 * @param evidenceReference Stored evidence reference of the file.
 * @returns The submission input.
 * @throws AccountingSubmissionError when the draft lacks a required value.
 */
function toSubmissionInput(
  draft: AccountingIntakeDraft,
  evidenceReference: string,
): AccountingSubmissionInput {
  const payee = draft.payee ?? draft.payeeName;
  const money =
    draft.money ??
    (draft.amountMinor !== undefined && draft.currency !== undefined
      ? { amountMinor: draft.amountMinor, currency: draft.currency }
      : undefined);
  if (payee === undefined || money === undefined) {
    throw new AccountingSubmissionError("invalid-input");
  }
  return {
    kind: draft.kind === "expense" ? "expense" : "bill",
    payee,
    category: draft.category ?? "uncategorized",
    ...(draft.description === undefined
      ? {}
      : { description: draft.description }),
    money,
    evidenceReference,
  };
}

/**
 * Builds the new intake document row of one polled file. The row carries no
 * status: the table default makes it `pending` and the caller marks it after
 * the read (F53).
 * @param input Company scope, file, month, type, and stored evidence.
 * @returns The immutable intake row draft.
 */
function buildIntakeRow(input: {
  readonly companyId: string;
  readonly file: AccountingDriveFile;
  readonly folderId: string;
  readonly sourceMonth: string;
  readonly documentType: AccountingIntakeDocumentType;
  readonly evidenceReference: string | null;
  readonly evidenceByteSize: number | null;
  readonly submissionId: string | null;
  readonly extraction: "human" | "local-text" | "model" | null;
}): AccountingIntakeDocumentDraft {
  const now = new Date().toISOString();
  const draft = {
    id: randomUUID(),
    driveFileId: input.file.id,
    driveFolderId: input.folderId,
    sourceMonth: input.sourceMonth,
    documentType: input.documentType,
    submissionId: input.submissionId,
    duplicateOfSubmissionId: null,
    evidenceReference: input.evidenceReference,
    extraction: input.extraction,
    failureReason: null,
    failureCount: 0,
    sightingCount: 1,
    evidenceByteSize: input.evidenceByteSize,
    isHistory: false,
    historySource: null,
    firstSeenAt: now,
    lastSeenAt: now,
    scopeCompanyId: input.companyId,
  } satisfies AccountingIntakeDocumentDraft;
  accountingIntakeDocumentSchema.parse({ ...draft, status: "pending" });
  return draft;
}

/**
 * Finds the submission id of the first byte-equal submission in the pass 1
 * list. The comparison calls `sameEvidenceBytes` alone and never reads a
 * parsed scalar field (F48).
 * @param input Evidence store, company scope, candidate reference, and the
 *   newest submission evidence rows.
 * @returns The submission id of the first byte match, or undefined when none
 *   matches.
 */
async function findPassOneDuplicate(input: {
  readonly evidenceStore: AccountingEvidenceStore;
  readonly companyId: string;
  readonly candidateEvidenceReference: string;
  readonly rows: readonly {
    readonly submissionId: string;
    readonly evidenceReference: string;
  }[];
}): Promise<string | undefined> {
  for (const row of input.rows) {
    const same = await input.evidenceStore.sameEvidenceBytes({
      companyId: input.companyId,
      leftEvidenceReference: input.candidateEvidenceReference,
      rightEvidenceReference: row.evidenceReference,
    });
    if (same) return row.submissionId;
  }
  return undefined;
}

/**
 * Finds the submission id of the first byte-equal intake row in the pass 2
 * list. The row target is `submissionId ?? duplicateOfSubmissionId`; a row
 * that holds neither id is skipped before the byte compare (F302). The
 * comparison calls `sameEvidenceBytes` alone (F48).
 * @param input Evidence store, company scope, candidate reference, and the
 *   rows of the candidate byte size.
 * @returns The submission id of the first byte match, or undefined when none
 *   matches.
 */
async function findPassTwoDuplicate(input: {
  readonly evidenceStore: AccountingEvidenceStore;
  readonly companyId: string;
  readonly candidateEvidenceReference: string;
  readonly rows: readonly AccountingIntakeDocument[];
}): Promise<string | undefined> {
  for (const row of input.rows) {
    const submissionId = row.submissionId ?? row.duplicateOfSubmissionId;
    if (submissionId === null || row.evidenceReference === null) continue;
    const same = await input.evidenceStore.sameEvidenceBytes({
      companyId: input.companyId,
      leftEvidenceReference: input.candidateEvidenceReference,
      rightEvidenceReference: row.evidenceReference,
    });
    if (same) return submissionId;
  }
  return undefined;
}

/** Emits one safe structured log line. */
function logIntakeLine(record: Record<string, string | number>): void {
  try {
    console.log(JSON.stringify(record));
  } catch {
    // Logging must not replace the poll result.
  }
}

/** Returns a safe failure reason for one failed file read. */
function safeFailureReason(): string {
  return "review: the document read failed";
}

/**
 * Polls the Drive intake folder once and writes the intake rows and the
 * submissions of the new files. The Drive file id is the idempotency key. A
 * content duplicate writes one intake row and no submission. A file that fails
 * keeps one failed row. The content-duplicate lookup is a byte-only scan in
 * two passes (spec sections 5.5 and 5.8).
 * @param request Poll request with the actor, the ports, and the folder id.
 * @returns The counts of the run.
 * @throws AccountingSubmissionError when the actor may not poll, the listing
 *   is invalid, or a file id changed its bytes.
 */
export async function intakeDriveDocument(
  request: AccountingIntakeDriveDocumentRequest,
): Promise<AccountingIntakePollResult> {
  const scope: Readonly<FinanceOperationScope> = {
    companyId: request.actor.companyId,
  };
  const parsedListing = driveFileListingSchema.safeParse(
    await request.source.list({ folderId: request.folderId }),
  );
  if (!parsedListing.success) {
    throw new AccountingSubmissionError(
      "invalid-input",
      parsedListing.error.issues,
    );
  }

  const cap = resolveDuplicateScanCap(request);
  const errors: unknown[] = [];
  let processed = 0;
  let submissions = 0;
  let duplicates = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of parsedListing.data) {
    const parsedName = parseIntakeFileName(file.name);
    if (parsedName === null) {
      skipped += 1;
      continue;
    }
    const documentType = resolveDocumentType(
      parsedName.documentType,
      file.mimeType,
    );
    try {
      const outcome = await processFile({
        request,
        scope,
        file,
        sourceMonth: parsedName.sourceMonth,
        documentType,
        cap,
      });
      processed += 1;
      if (outcome === "parsed") submissions += 1;
      if (outcome === "duplicate") duplicates += 1;
      if (outcome === "failed") failed += 1;
      logIntakeLine({
        event: "intake_document",
        documentType,
        status: outcome,
        month: parsedName.sourceMonth,
      });
    } catch (error) {
      errors.push(error);
    }
  }

  logIntakeLine({ event: "intake_poll", skipped_count: skipped });

  if (errors.length > 0) throw errors[0];
  return { processed, submissions, duplicates, failed, skipped };
}

/**
 * Processes one accepted file of the listing.
 * @param input The poll request, scope, file, month, type, and scan cap.
 * @returns The final status of the file.
 */
async function processFile(input: {
  readonly request: AccountingIntakeDriveDocumentRequest;
  readonly scope: Readonly<FinanceOperationScope>;
  readonly file: AccountingDriveFile;
  readonly sourceMonth: string;
  readonly documentType: AccountingIntakeDocumentType;
  readonly cap: number;
}): Promise<"parsed" | "duplicate" | "failed" | "replayed"> {
  const { request, scope, file, sourceMonth, documentType } = input;
  const companyId = request.actor.companyId;
  const existing = await request.intakeRepository.findByDriveFileId({
    scope,
    driveFileId: file.id,
  });

  if (existing !== undefined) {
    const body = await fetchDocumentBytes(request.source, file);
    if (existing.evidenceReference === null) {
      await request.intakeRepository.bumpSighting({
        scope,
        id: existing.id,
        sightingCount: existing.sightingCount + 1,
        lastSeenAt: new Date().toISOString(),
      });
      return "replayed";
    }
    const stored = await request.evidenceStore.put({
      companyId,
      contentType: intakeContentType(file.mimeType),
      body,
    });
    const same = await request.evidenceStore.sameEvidenceBytes({
      companyId,
      leftEvidenceReference: stored.evidenceReference,
      rightEvidenceReference: existing.evidenceReference,
    });
    if (!same) throw new AccountingSubmissionError("conflict");
    await request.intakeRepository.bumpSighting({
      scope,
      id: existing.id,
      sightingCount: existing.sightingCount + 1,
      lastSeenAt: new Date().toISOString(),
    });
    return "replayed";
  }

  if (
    file.byteSize !== undefined &&
    file.byteSize > ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES
  ) {
    return failFile({
      request,
      file,
      folderId: request.folderId,
      sourceMonth,
      documentType,
      failureReason: "The file is above the intake size limit",
    });
  }
  if (!ACCEPTED_INTAKE_MIME_TYPES.has(file.mimeType.toLowerCase())) {
    return failFile({
      request,
      file,
      folderId: request.folderId,
      sourceMonth,
      documentType,
      failureReason: "The file type is not an accepted intake type",
    });
  }

  const body = await fetchDocumentBytes(request.source, file);
  if (body.byteLength > ACCOUNTING_INTAKE_SIZE_LIMIT_BYTES) {
    return failFile({
      request,
      file,
      folderId: request.folderId,
      sourceMonth,
      documentType,
      failureReason: "The file is above the intake size limit",
    });
  }

  const stored = await request.evidenceStore.put({
    companyId,
    contentType: intakeContentType(file.mimeType),
    body,
  });

  // Pass 1 reads the newest submissions that hold evidence, at most the cap
  // count (spec section 5.5). Pass 2 runs only when pass 1 finds no match.
  const passOneRows = await request.intakeRepository.listRecentSubmissionEvidence(
    {
      scope,
      limit: input.cap,
    },
  );
  let duplicateSubmissionId = await findPassOneDuplicate({
    evidenceStore: request.evidenceStore,
    companyId,
    candidateEvidenceReference: stored.evidenceReference,
    rows: passOneRows,
  });
  if (duplicateSubmissionId === undefined) {
    const passTwoRows = await request.intakeRepository.findByEvidenceByteSize({
      scope,
      evidenceByteSize: body.byteLength,
    });
    duplicateSubmissionId = await findPassTwoDuplicate({
      evidenceStore: request.evidenceStore,
      companyId,
      candidateEvidenceReference: stored.evidenceReference,
      rows: passTwoRows,
    });
  }

  if (duplicateSubmissionId !== undefined) {
    const row = buildIntakeRow({
      companyId,
      file,
      folderId: request.folderId,
      sourceMonth,
      documentType,
      evidenceReference: stored.evidenceReference,
      evidenceByteSize: body.byteLength,
      submissionId: null,
      extraction: null,
    });
    const inserted = await request.intakeRepository.insert(row);
    await request.intakeRepository.markDuplicate({
      scope,
      id: inserted.id,
      duplicateOfSubmissionId: duplicateSubmissionId,
      failureReason: "A content duplicate of an earlier submission",
    });
    return "duplicate";
  }

  let extraction: "local-text" | "model";
  try {
    const read = await readDocument({
      request,
      companyId,
      file,
      body,
    });
    extraction = read.extraction;
    const submission = await submitAccountingSubmissionWithOutcome({
      repository: request.submissionRepository,
      actor: request.actor,
      input: toSubmissionInput(read.draft, stored.evidenceReference),
      idempotencyKey: file.id,
      compareEvidence: async (compare) => {
        if (compare.candidateEvidenceReference !== stored.evidenceReference) {
          return false;
        }
        return request.evidenceStore.sameEvidenceBytes({
          companyId,
          leftEvidenceReference: compare.candidateEvidenceReference,
          rightEvidenceReference: compare.storedEvidenceReference,
        });
      },
    });
    const row = buildIntakeRow({
      companyId,
      file,
      folderId: request.folderId,
      sourceMonth,
      documentType,
      evidenceReference: stored.evidenceReference,
      evidenceByteSize: body.byteLength,
      submissionId: submission.submission.id,
      extraction,
    });
    const inserted = await request.intakeRepository.insert(row);
    await request.intakeRepository.markParsed({
      scope,
      id: inserted.id,
      submissionId: submission.submission.id,
      extraction,
    });
    return "parsed";
  } catch (error) {
    if (
      error instanceof AccountingSubmissionError &&
      error.reason === "conflict"
    ) {
      throw error;
    }
    const row = buildIntakeRow({
      companyId,
      file,
      folderId: request.folderId,
      sourceMonth,
      documentType,
      evidenceReference: stored.evidenceReference,
      evidenceByteSize: body.byteLength,
      submissionId: null,
      extraction: null,
    });
    const inserted = await request.intakeRepository.insert(row);
    await request.intakeRepository.markFailed({
      scope,
      id: inserted.id,
      failureReason: safeFailureReason(),
    });
    return "failed";
  }
}

/**
 * Writes one failed intake row for a file that fails the type or size check.
 * @param input Poll request, file, month, type, and safe failure reason.
 * @returns The `failed` status.
 */
async function failFile(input: {
  readonly request: AccountingIntakeDriveDocumentRequest;
  readonly file: AccountingDriveFile;
  readonly folderId: string;
  readonly sourceMonth: string;
  readonly documentType: AccountingIntakeDocumentType;
  readonly failureReason: string;
}): Promise<"failed"> {
  const row = buildIntakeRow({
    companyId: input.request.actor.companyId,
    file: input.file,
    folderId: input.folderId,
    sourceMonth: input.sourceMonth,
    documentType: input.documentType,
    evidenceReference: null,
    evidenceByteSize: null,
    submissionId: null,
    extraction: null,
  });
  const inserted = await input.request.intakeRepository.insert(row);
  await input.request.intakeRepository.markFailed({
    scope: { companyId: input.request.actor.companyId },
    id: inserted.id,
    failureReason: input.failureReason,
  });
  return "failed";
}

/**
 * Reads one document through the local reader or the model reader. A text PDF
 * stays local; a non-text PDF, a JPEG, and a PNG go to the model (spec
 * section 6). A `needs-model` result goes to the extraction port only for
 * `application/pdf`; an `.xlsx` workbook and a native Google Sheet fail with
 * a `review:` reason (spec section 5.2). A read result with no draft field
 * fails with a `review:` reason (F307, F310).
 * @param input Poll request, company scope, file, and bytes.
 * @returns The draft and its extraction marker.
 * @throws When the file type may not reach the model or the read result holds
 *   no draft field.
 */
async function readDocument(input: {
  readonly request: AccountingIntakeDriveDocumentRequest;
  readonly companyId: string;
  readonly file: AccountingDriveFile;
  readonly body: Uint8Array;
}): Promise<{
  readonly draft: AccountingIntakeDraft;
  readonly extraction: "local-text" | "model";
}> {
  const mimeType = input.file.mimeType.toLowerCase();
  if (!mimeType.startsWith("image/")) {
    const local = await input.request.localReader.read({
      companyId: input.companyId,
      mimeType: input.file.mimeType,
      body: input.body,
    });
    if (local.kind === "text") {
      if (local.draft === undefined) {
        throw new Error("review: the local read returned no draft");
      }
      return { draft: local.draft, extraction: "local-text" };
    }
    if (mimeType !== "application/pdf") {
      throw new Error("review: the workbook needs a manual read");
    }
  }
  const model = await input.request.extraction.extract({
    companyId: input.companyId,
    mimeType: input.file.mimeType,
    body: input.body,
  });
  if (model.draft === undefined) {
    throw new Error("review: the model read returned no draft");
  }
  return { draft: model.draft, extraction: "model" };
}

/**
 * Claims the intake poll lease of one queue with a compare-and-swap on the
 * lease token. A live lease of another worker is not taken. The request takes
 * the one member `repository` and a required company scope; the alias names
 * and the blank company fallback are gone (F310, PM-21).
 * @param request Lease repository port, company scope, queue, worker, token,
 *   and expiry.
 * @returns The claimed lease, or undefined when a live lease holds it.
 * @throws AccountingSubmissionError when the repository or the scope is
 *   absent.
 */
export async function claimIntakeLease(request: {
  readonly repository: AccountingIntakeLeaseRepository;
  readonly scope: Readonly<FinanceOperationScope>;
  readonly queueName: string;
  readonly workerId: string;
  readonly leaseToken: string;
  readonly leaseExpiresAt: Date | number;
}): Promise<AccountingIntakeLease | undefined> {
  if (request.repository === undefined || request.scope === undefined) {
    throw new AccountingSubmissionError("invalid-input");
  }
  return request.repository.claim({
    scope: request.scope,
    queueName: request.queueName,
    workerId: request.workerId,
    leaseToken: request.leaseToken,
    leaseExpiresAt: request.leaseExpiresAt,
    now: Date.now(),
  });
}
