import { z } from "zod";

/** Legal lifecycle states of a workbook draft/edition. */
export const workbookDraftStatusSchema = z.enum([
  "draft",
  "in_review",
  "published",
  "superseded",
  "revoked",
]);

/** Concrete lifecycle status of a workbook draft/edition. */
export type WorkbookDraftStatus = z.infer<typeof workbookDraftStatusSchema>;

/** Legal transitions between workbook draft/edition lifecycle states. */
export const WORKBOOK_DRAFT_TRANSITIONS: Readonly<
  Record<WorkbookDraftStatus, readonly WorkbookDraftStatus[]>
> = {
  draft: ["in_review"],
  in_review: ["draft", "published"],
  published: ["superseded", "revoked"],
  superseded: [],
  revoked: [],
};

/**
 * Reports whether a lifecycle transition is permitted.
 * @param from Current lifecycle state of the workbook.
 * @param to Desired next lifecycle state.
 * @returns True when the transition is legal, false otherwise.
 */
export function canTransitionWorkbookDraft(
  from: WorkbookDraftStatus,
  to: WorkbookDraftStatus,
): boolean {
  return WORKBOOK_DRAFT_TRANSITIONS[from].includes(to);
}

/** Stable failure codes raised when a publication or transition is rejected. */
export type WorkbookPublicationErrorCode =
  | "VALIDATION_ERROR"
  | "ILLEGAL_STATE_TRANSITION"
  | "REVISION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "EDITION_IMMUTABLE"
  | "INCOMPLETE_SNAPSHOT"
  | "ASSET_UNAVAILABLE"
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "PERSISTENCE_UNAVAILABLE"
  | "INTERNAL_ERROR";

/** Construction metadata for a workbook publication error. */
export interface WorkbookPublicationErrorOptions {
  /** Whether callers may safely retry the rejected publication. */
  retryable?: boolean;
  /** Provider or internal error retained for server-side diagnostics. */
  cause?: unknown;
  /** Additional context describing why the publication was rejected. */
  detail?: string;
}

const DEFAULT_RETRYABILITY: Readonly<
  Record<WorkbookPublicationErrorCode, boolean>
> = {
  VALIDATION_ERROR: false,
  ILLEGAL_STATE_TRANSITION: false,
  REVISION_CONFLICT: false,
  IDEMPOTENCY_CONFLICT: false,
  EDITION_IMMUTABLE: false,
  INCOMPLETE_SNAPSHOT: false,
  ASSET_UNAVAILABLE: false,
  NOT_AUTHORIZED: false,
  NOT_FOUND: false,
  PERSISTENCE_UNAVAILABLE: true,
  INTERNAL_ERROR: false,
};

/** Structured error returned when a workbook transition or publication is rejected. */
export class WorkbookPublicationError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: WorkbookPublicationErrorCode;

  /** Whether callers may safely retry the rejected publication. */
  readonly retryable: boolean;

  /** Additional context describing why the publication was rejected. */
  readonly detail: string;

  /**
   * Creates a structured workbook publication error.
   * @param code Stable machine-readable failure code.
   * @param message Safe provider-neutral explanation.
   * @param options Retryability, internal diagnostic cause, and extra context.
   */
  constructor(
    code: WorkbookPublicationErrorCode,
    message: string,
    options: WorkbookPublicationErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WorkbookPublicationError";
    this.code = code;
    this.retryable = options.retryable ?? DEFAULT_RETRYABILITY[code];
    this.detail = options.detail ?? "";
  }
}

/**
 * Asserts that a lifecycle transition is permitted.
 * @param from Current lifecycle state of the workbook.
 * @param to Desired next lifecycle state.
 * @throws WorkbookPublicationError when the transition is not permitted; released
 * states ("published", "superseded", "revoked") raise "EDITION_IMMUTABLE".
 */
export function assertWorkbookDraftTransition(
  from: WorkbookDraftStatus,
  to: WorkbookDraftStatus,
): void {
  if (canTransitionWorkbookDraft(from, to)) {
    return;
  }
  const code: WorkbookPublicationErrorCode =
    from === "published" || from === "superseded" || from === "revoked"
      ? "EDITION_IMMUTABLE"
      : "ILLEGAL_STATE_TRANSITION";
  throw new WorkbookPublicationError(
    code,
    `Cannot transition workbook from "${from}" to "${to}".`,
  );
}
