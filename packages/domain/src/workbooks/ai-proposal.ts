import { z } from "zod";

/** Legal lifecycle states of an AI-generated workbook content proposal. */
export const workbookProposalStatusSchema = z.enum([
  "proposed",
  "approved",
  "rejected",
]);

/** Concrete lifecycle status of an AI-generated workbook content proposal. */
export type WorkbookProposalStatus = z.infer<typeof workbookProposalStatusSchema>;

/**
 * Provenance recording how an AI-generated workbook content proposal was produced.
 *
 * A proposal is never self-authenticating: this record exists so a human
 * publisher who did NOT generate the proposal can verify its origin before
 * approving it.
 */
export const workbookProposalProvenanceSchema = z
  .object({
    /** Name/identifier of the model that generated the proposal. */
    model: z.string().min(1),
    /** Digest of the prompt used to generate the proposal. */
    promptHash: z.string().min(1),
    /** Identifier of the actor that ran the generation. */
    generatedBy: z.string().min(1),
    /** ISO-8601 timestamp at which the proposal was generated. */
    generatedAt: z.string().datetime(),
    /** Content digest the proposal was derived from. */
    sourceContentHash: z.string().min(1),
  })
  .strict();

/**
 * A provenance-rich AI-generated workbook content proposal awaiting human review.
 *
 * AI output is only ever a proposal; it becomes part of the system solely when a
 * human publisher who is NOT the generator approves it.
 */
export const workbookProposalSchema = z
  .object({
    /** Stable identifier of the proposal. */
    proposalId: z.string().min(1),
    /** Identifier of the tenant the proposal belongs to. */
    tenantId: z.string().min(1),
    /** Identifier of the workbook draft the proposal targets. */
    draftId: z.string().min(1),
    /** Current lifecycle status of the proposal. */
    status: workbookProposalStatusSchema,
    /** Human-readable justification for the proposal's content. */
    rationale: z.string().min(1),
    /** Record of how the proposal was generated. */
    provenance: workbookProposalProvenanceSchema,
    /** Identifier of the human publisher who reviewed the proposal, if any. */
    reviewedBy: z.string().min(1).nullable(),
    /** ISO-8601 timestamp of the review, if any. */
    reviewedAt: z.string().datetime().nullable(),
  })
  .strict();

/** An AI-generated workbook content proposal awaiting human review. */
export type WorkbookProposal = z.infer<typeof workbookProposalSchema>;

/** Stable failure codes raised when a workbook proposal is rejected. */
export type WorkbookProposalErrorCode =
  | "VALIDATION_ERROR"
  | "SELF_APPROVAL_FORBIDDEN"
  | "ALREADY_REVIEWED"
  | "MISSING_PROVENANCE"
  | "SOURCE_DRIFTED"
  | "INTERNAL_ERROR";

/** Structured error returned when a workbook proposal is rejected. */
export class WorkbookProposalError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: WorkbookProposalErrorCode;

  /**
   * Creates a structured workbook proposal error.
   * @param code Stable machine-readable failure code.
   * @param message Safe provider-neutral explanation.
   * @param options Internal diagnostic cause retained for server-side logging.
   */
  constructor(
    code: WorkbookProposalErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WorkbookProposalError";
    this.code = code;
  }
}

/**
 * Approves an AI-generated workbook content proposal, enforcing separation of
 * duties between the actor that generated it and the human publisher who
 * approves it.
 *
 * The proposal is validated, must still be in "proposed" status, and must have
 * been produced from the current source content. The approver must be a
 * different actor from the generator; a generator may never approve its own
 * output. On success a NEW approved proposal is returned with the approver and
 * review timestamp recorded; the input proposal is never mutated.
 * @param proposal The proposal to approve, validated against the proposal schema.
 * @param approverId Identifier of the human publisher approving the proposal.
 * @param currentSourceContentHash Current content digest the proposal was derived from.
 * @param reviewedAt ISO-8601 timestamp of the approval.
 * @returns A new proposal with status "approved", the approver recorded, and the
 * review timestamp set; the input proposal is unchanged.
 * @throws WorkbookProposalError with code "VALIDATION_ERROR" for an invalid
 * proposal or an empty approverId, "ALREADY_REVIEWED" when the proposal is not
 * "proposed", "SELF_APPROVAL_FORBIDDEN" when the approver is also the generator,
 * and "SOURCE_DRIFTED" when the current source content differs from the content
 * the proposal was generated from.
 */
export function approveWorkbookProposal(
  proposal: unknown,
  approverId: string,
  currentSourceContentHash: string,
  reviewedAt: string,
): WorkbookProposal {
  const parsed = workbookProposalSchema.safeParse(proposal);
  if (!parsed.success) {
    throw new WorkbookProposalError("VALIDATION_ERROR", "invalid workbook proposal");
  }
  const { status, provenance } = parsed.data;
  if (status !== "proposed") {
    throw new WorkbookProposalError(
      "ALREADY_REVIEWED",
      `Cannot approve a proposal in status "${status}"; only "proposed" proposals may be approved.`,
    );
  }
  if (approverId.trim().length === 0) {
    throw new WorkbookProposalError(
      "VALIDATION_ERROR",
      "approverId must be a non-empty string",
    );
  }
  if (approverId === provenance.generatedBy) {
    throw new WorkbookProposalError(
      "SELF_APPROVAL_FORBIDDEN",
      "A workbook proposal cannot be approved by the actor that generated it; approval requires a separate publisher.",
    );
  }
  if (currentSourceContentHash !== provenance.sourceContentHash) {
    throw new WorkbookProposalError(
      "SOURCE_DRIFTED",
      "The source content changed after generation; the proposal must be regenerated before it can be approved.",
    );
  }
  return {
    ...parsed.data,
    status: "approved",
    reviewedBy: approverId,
    reviewedAt,
  };
}
