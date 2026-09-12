import { z } from "zod";
import type { WorkbookEdition } from "./edition-contracts.js";

/**
 * Persisted shape of a teacher-recorded classroom coverage of a workbook edition.
 *
 * This is the first classroom signal: a teacher stating that a class covered a
 * published workbook edition. Deliberately carries NO student identifiers and
 * NO answer data; OCR, bubble-sheet grading, and paper-answer capture are out of
 * scope for this contract.
 */
export const workbookCoverageRecordSchema = z
  .object({
    /** Stable identifier of the coverage record. */
    coverageId: z.string().min(1),
    /** Identifier of the tenant the coverage record belongs to. */
    tenantId: z.string().min(1),
    /** Identifier of the published workbook edition that was covered. */
    editionId: z.string().min(1),
    /** Identifier of the class that covered the edition. */
    classId: z.string().min(1),
    /** Identifier of the teacher who recorded the coverage. */
    recordedBy: z.string().min(1),
    /** ISO-8601 timestamp at which the coverage was recorded. */
    recordedAt: z.string().datetime(),
    /** Non-empty list of workbook units covered by the class. */
    unitsCovered: z.array(z.string().min(1)).min(1),
    /** Optional free-form note attached to the coverage record. */
    note: z.string().nullable(),
  })
  .strict();

/** A teacher-recorded classroom coverage of a published workbook edition. */
export type WorkbookCoverageRecord = z.infer<typeof workbookCoverageRecordSchema>;

/** Stable failure codes raised when a workbook coverage record is rejected. */
export type WorkbookCoverageErrorCode =
  | "VALIDATION_ERROR"
  | "EDITION_NOT_PUBLISHED"
  | "EDITION_REVOKED"
  | "DUPLICATE_COVERAGE"
  | "INTERNAL_ERROR";

/** Structured error returned when a workbook coverage record is rejected. */
export class WorkbookCoverageError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: WorkbookCoverageErrorCode;

  /**
   * Creates a structured workbook coverage error.
   * @param code Stable machine-readable failure code.
   * @param message Safe provider-neutral explanation.
   * @param options Internal diagnostic cause retained for server-side logging.
   */
  constructor(
    code: WorkbookCoverageErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WorkbookCoverageError";
    this.code = code;
  }
}

/**
 * Records that a class covered a published workbook edition, enforcing that the
 * coverage is well-formed, targets the expected edition within the same tenant,
 * and has not already been recorded.
 *
 * The input record is validated, must reference the same editionId and tenantId
 * as the supplied edition, must not target a revoked edition, and must not
 * duplicate an existing coverage by coverageId (recording is idempotent by
 * coverageId). On success the validated record is returned unchanged.
 * @param input Raw coverage record payload to validate against the coverage schema.
 * @param edition Published workbook edition the record claims to cover.
 * @param existingCoverageIds Identifiers of coverage records already recorded for the class.
 * @returns The validated coverage record unchanged.
 * @throws WorkbookCoverageError with code "VALIDATION_ERROR" for an invalid
 * record or when the record's editionId or tenantId does not match the edition,
 * "EDITION_REVOKED" when the edition has been revoked, and
 * "DUPLICATE_COVERAGE" when the coverageId has already been recorded.
 */
export function recordWorkbookCoverage(
  input: unknown,
  edition: WorkbookEdition,
  existingCoverageIds: readonly string[],
): WorkbookCoverageRecord {
  const parsed = workbookCoverageRecordSchema.safeParse(input);
  if (!parsed.success) {
    throw new WorkbookCoverageError(
      "VALIDATION_ERROR",
      "invalid workbook coverage record",
    );
  }
  const record = parsed.data;
  if (record.editionId !== edition.editionId) {
    throw new WorkbookCoverageError(
      "VALIDATION_ERROR",
      `Coverage editionId "${record.editionId}" does not match edition "${edition.editionId}".`,
    );
  }
  if (record.tenantId !== edition.tenantId) {
    throw new WorkbookCoverageError(
      "VALIDATION_ERROR",
      `Coverage tenantId "${record.tenantId}" does not match edition tenant "${edition.tenantId}"; coverage may never cross a tenant boundary.`,
    );
  }
  if (edition.revokedAt !== null) {
    throw new WorkbookCoverageError(
      "EDITION_REVOKED",
      `Cannot record coverage for edition "${edition.editionId}"; the edition has been revoked.`,
    );
  }
  if (existingCoverageIds.includes(record.coverageId)) {
    throw new WorkbookCoverageError(
      "DUPLICATE_COVERAGE",
      `Coverage "${record.coverageId}" has already been recorded; recording is idempotent by coverageId.`,
    );
  }
  return record;
}
