import { z } from "zod";

import { privateEvidenceReferenceSchema } from "../finance-operations/contracts.js";

/**
 * Returns true when a value holds no C0 control character and no DEL.
 * @param value Text to inspect.
 * @returns True when every character is printable.
 */
function hasNoControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return false;
    }
  }
  return true;
}

/**
 * Returns true when a Drive file id is safe to use as an idempotency key.
 * @param value Candidate Drive file id.
 * @returns True when the id holds no path or control content.
 */
function isSafeDriveFileId(value: string): boolean {
  if (!hasNoControlCharacters(value)) return false;
  if (value.includes("/") || value.includes("\\")) return false;
  return value !== "." && value !== "..";
}

/** Calendar month in `YYYY-MM` form used by the intake and the close. */
const accountingPeriodMonthSchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/u);

/** Drive file id used as the intake idempotency key; at most 256 characters. */
export const accountingDriveFileIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine(isSafeDriveFileId, "A Drive file id holds no path or control content");

/** Validated Drive file id of one intake document. */
export type AccountingDriveFileId = z.infer<typeof accountingDriveFileIdSchema>;

/** Document type of one intake file (spec section 6). */
export const accountingIntakeDocumentTypeSchema = z.enum([
  "receipt",
  "tax-invoice",
  "bank-statement",
  "payroll-sheet",
  "withholding-certificate",
  "payment-voucher-sheet",
  "cloud-invoice",
  "openai-invoice",
]);

/** Validated intake document type. */
export type AccountingIntakeDocumentType = z.infer<
  typeof accountingIntakeDocumentTypeSchema
>;

/** Lifecycle status of one intake document row. */
export const accountingIntakeStatusSchema = z.enum([
  "pending",
  "parsed",
  "failed",
  "duplicate",
]);

/** Validated intake document status. */
export type AccountingIntakeStatus = z.infer<
  typeof accountingIntakeStatusSchema
>;

/** Marker of the read path that produced an extracted value (spec section 5.3). */
export const accountingExtractionSchema = z.enum([
  "human",
  "local-text",
  "model",
]);

/** Validated extraction marker. */
export type AccountingExtraction = z.infer<typeof accountingExtractionSchema>;

/** Source of the month of one history import row (spec section 9a). */
export const accountingIntakeHistorySourceSchema = z.enum([
  "drive-folder",
  "drive-modified-date",
]);

/** Validated history source marker. */
export type AccountingIntakeHistorySource = z.infer<
  typeof accountingIntakeHistorySourceSchema
>;

/** Stored evidence byte length: an integer column and never a hash. */
export const accountingEvidenceByteSizeSchema = z.number().int().positive();

/** Validated evidence byte size. */
export type AccountingEvidenceByteSize = z.infer<
  typeof accountingEvidenceByteSizeSchema
>;

/** Lifecycle status of one monthly close (spec section 7). */
export const accountingMonthlyCloseStatusSchema = z.enum([
  "open",
  "signed",
  "locked",
]);

/** Validated monthly close status. */
export type AccountingMonthlyCloseStatus = z.infer<
  typeof accountingMonthlyCloseStatusSchema
>;

/** Action recorded in the append-only monthly close audit trail (FR-5). */
export const accountingMonthlyCloseAuditActionSchema = z.enum([
  "monthly-close-open",
  "monthly-close-sign",
  "monthly-close-lock",
]);

/** Validated monthly close audit action. */
export type AccountingMonthlyCloseAuditAction = z.infer<
  typeof accountingMonthlyCloseAuditActionSchema
>;

/**
 * Stored evidence record the evidence port holds: the opaque company-scoped
 * reference plus the byte length of the stored object. The byte length is the
 * integer of `accounting_intake_documents.evidence_byte_size`; no hash and no
 * checksum column exists (AGENTS.md hashing policy, D-28).
 */
export const accountingEvidenceStoreSchema = z.strictObject({
  evidenceReference: privateEvidenceReferenceSchema,
  byteSize: accountingEvidenceByteSizeSchema,
});

/** Immutable stored-evidence record the evidence port holds. */
export type AccountingEvidenceRecord = z.infer<
  typeof accountingEvidenceStoreSchema
>;

/**
 * Evidence port boundary of spec section 5.4. The backend domain function
 * never imports an app module; the app adapter implements this interface and
 * the poll runner passes the implementation in.
 */
export interface AccountingEvidenceStore {
  /**
   * Stores one evidence object inside the company scope.
   * @param input Trusted company scope, declared content type, and file bytes.
   * @returns The opaque company-scoped evidence reference.
   */
  put(input: {
    readonly companyId: string;
    readonly contentType: string;
    readonly body: Uint8Array;
  }): Promise<AccountingEvidenceRecord>;

  /**
   * Reads one stored evidence object inside the company scope.
   * @param input Trusted company scope and evidence reference.
   * @returns The stored evidence bytes.
   */
  read(input: {
    readonly companyId: string;
    readonly evidenceReference: string;
  }): Promise<Uint8Array>;

  /**
   * Compares two evidence references byte by byte inside one company scope.
   * @param input Trusted company scope and the two references to compare.
   * @returns True when both objects hold equal bytes.
   */
  sameEvidenceBytes(input: {
    readonly companyId: string;
    readonly leftEvidenceReference: string;
    readonly rightEvidenceReference: string;
  }): Promise<boolean>;
}

const accountingIntakeDocumentShape = {
  id: z.string().uuid(),
  driveFileId: accountingDriveFileIdSchema,
  driveFolderId: z.string().min(1).max(256),
  sourceMonth: accountingPeriodMonthSchema,
  documentType: accountingIntakeDocumentTypeSchema,
  status: accountingIntakeStatusSchema,
  submissionId: z.string().uuid().nullable(),
  duplicateOfSubmissionId: z.string().uuid().nullable(),
  evidenceReference: privateEvidenceReferenceSchema.nullable(),
  extraction: accountingExtractionSchema.nullable(),
  failureReason: z.string().min(1).max(1024).nullable(),
  failureCount: z.number().int().nonnegative(),
  sightingCount: z.number().int().positive(),
  evidenceByteSize: accountingEvidenceByteSizeSchema.nullable(),
  isHistory: z.boolean(),
  historySource: accountingIntakeHistorySourceSchema.nullable(),
  firstSeenAt: z.string().datetime({ offset: true }),
  lastSeenAt: z.string().datetime({ offset: true }),
  scopeCompanyId: z.string().uuid(),
} satisfies z.ZodRawShape;

/**
 * Applies the cross-field rules of FR-3: a duplicate names the submission it
 * duplicates, a failed row carries its reason, and the history marker and its
 * source are present or absent together.
 * @param document Candidate intake document.
 * @param context Zod refinement context that collects the issues.
 */
function addIntakeDocumentIssues(
  document: {
    readonly status: string;
    readonly duplicateOfSubmissionId: string | null;
    readonly failureReason: string | null;
    readonly isHistory: boolean;
    readonly historySource: string | null;
  },
  context: z.RefinementCtx,
): void {
  if (document.status === "duplicate" && document.duplicateOfSubmissionId === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["duplicateOfSubmissionId"],
      message: "A duplicate intake row names the submission it duplicates",
    });
  }
  if (document.status === "failed" && document.failureReason === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["failureReason"],
      message: "A failed intake row carries its failure reason",
    });
  }
  if (document.isHistory && document.historySource === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["historySource"],
      message: "A history intake row names its history source",
    });
  }
  if (!document.isHistory && document.historySource !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["historySource"],
      message: "Only a history intake row carries a history source",
    });
  }
}

/**
 * Runtime contract for one row of `accounting_intake_documents` (FR-3). The
 * row is company-scoped by `scopeCompanyId`; the domain derives that scope from
 * the actor and never accepts a caller-supplied company.
 */
export const accountingIntakeDocumentSchema = z
  .strictObject(accountingIntakeDocumentShape)
  .superRefine(addIntakeDocumentIssues);

/** Immutable, company-scoped intake document row. */
export type AccountingIntakeDocument = z.infer<
  typeof accountingIntakeDocumentSchema
>;

const accountingMonthlyCloseShape = {
  id: z.string().uuid(),
  periodMonth: accountingPeriodMonthSchema,
  status: accountingMonthlyCloseStatusSchema,
  reportEvidenceReference: privateEvidenceReferenceSchema.nullable(),
  openedByAccountId: z.string().uuid(),
  openedAt: z.string().datetime({ offset: true }),
  signedByAccountId: z.string().uuid().nullable(),
  signedByRole: z.string().min(1).nullable(),
  signedAt: z.string().datetime({ offset: true }).nullable(),
  lockedAt: z.string().datetime({ offset: true }).nullable(),
  scopeCompanyId: z.string().uuid(),
} satisfies z.ZodRawShape;

/**
 * Applies the rule of FR-4: a locked close carries its lock instant.
 * @param close Candidate monthly close.
 * @param context Zod refinement context that collects the issues.
 */
function addMonthlyCloseIssues(
  close: {
    readonly status: string;
    readonly lockedAt: string | null;
  },
  context: z.RefinementCtx,
): void {
  if (close.status === "locked" && close.lockedAt === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lockedAt"],
      message: "A locked monthly close carries its lock instant",
    });
  }
}

/**
 * Runtime contract for one row of `accounting_monthly_closes` (FR-4). One row
 * exists per company and period month.
 */
export const accountingMonthlyCloseSchema = z
  .strictObject(accountingMonthlyCloseShape)
  .superRefine(addMonthlyCloseIssues);

/** Immutable, company-scoped monthly close row. */
export type AccountingMonthlyClose = z.infer<
  typeof accountingMonthlyCloseSchema
>;

/**
 * Runtime contract for one row of `accounting_monthly_close_audit_events`
 * (FR-5). The trail is append-only: the runtime role holds no UPDATE and no
 * DELETE on the table (FR-12a).
 */
export const accountingMonthlyCloseAuditEventSchema = z.strictObject({
  id: z.string().uuid(),
  closeId: z.string().uuid(),
  action: accountingMonthlyCloseAuditActionSchema,
  actorAccountId: z.string().uuid(),
  actorRole: z.string().min(1),
  reason: z.string().min(1).max(1024).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

/** Immutable, append-only monthly close audit event. */
export type AccountingMonthlyCloseAuditEvent = z.infer<
  typeof accountingMonthlyCloseAuditEventSchema
>;
