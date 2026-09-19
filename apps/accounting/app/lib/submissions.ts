/**
 * Application adapter wiring the `@reading-advantage/backend/accounting`
 * domain functions to a Postgres-backed `AccountingSubmissionRepository`.
 *
 * The repository uses the dedicated Accounting runtime client. Domain
 * `invalid-input` rejections are translated here into a route-ready error
 * carrying `fieldErrors`, keeping the API route thin.
 */
import {
  AccountingSubmissionError,
  approveAccountingSubmission as approveDomainAccountingSubmission,
  createPostgresAccountingSubmissionRepository,
  listAccountingSubmissions as listDomainAccountingSubmissions,
  rejectAccountingSubmission as rejectDomainAccountingSubmission,
  submitAccountingSubmission as submitDomainAccountingSubmission,
  submitAccountingSubmissionWithOutcome as submitDomainAccountingSubmissionWithOutcome,
  type AccountingActor,
  type AccountingSubmission,
  type AccountingSubmissionInput,
  type AccountingSubmissionResult,
} from "@reading-advantage/backend/accounting";
import { createAccountingRuntimeClient } from "@reading-advantage/db/accounting/runtime";
import type { ZodIssue } from "zod";

type AccountingRepository = ReturnType<
  typeof createPostgresAccountingSubmissionRepository
>;

let repositoryPromise: Promise<AccountingRepository> | undefined;

/**
 * Creates the process-local repository against the dedicated Accounting database.
 * @returns A repository backed by the validated Accounting runtime connection.
 * @throws When the runtime URL or connection target is invalid.
 */
async function createRepository(): Promise<AccountingRepository> {
  const sql = await createAccountingRuntimeClient({
    databaseUrl: process.env.ACCOUNTING_DATABASE_URL ?? "",
  });
  return createPostgresAccountingSubmissionRepository({ sql });
}

/**
 * Returns the process-local Accounting repository.
 * @returns The shared repository promise for this process.
 */
function getRepository(): Promise<AccountingRepository> {
  repositoryPromise ??= createRepository();
  return repositoryPromise;
}

/**
 * Groups Zod issues into a field-path → messages map for 400 responses.
 * @param issues Zod issues carried by a domain `invalid-input` rejection.
 * @returns Field errors keyed by dot-joined issue path.
 */
function fieldErrorsFromIssues(
  issues: readonly ZodIssue[],
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "submission";
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * Rethrows a domain rejection as a route-ready error. An `invalid-input`
 * `AccountingSubmissionError` is converted into an error carrying
 * `fieldErrors`; every other error passes through unchanged.
 * @param error The error thrown by the domain call.
 * @returns Never returns; always throws.
 */
function translateDomainError(error: unknown): never {
  try {
    if (
      error instanceof AccountingSubmissionError &&
      error.reason === "invalid-input"
    ) {
      error.message = "Submission validation failed";
      Object.assign(error, {
        fieldErrors: fieldErrorsFromIssues(error.issues ?? []),
      });
    }
  } catch {
    // Preserve the original provider value when classification or enrichment traps.
  }
  throw error;
}

/** Request for submitting one expense or bill through the domain. */
export interface SubmitAccountingSubmissionRequest {
  /** Session-derived actor carrying the company scope. */
  readonly actor: AccountingActor;
  /** Unvalidated submission payload; the domain schema is the authority. */
  readonly input: AccountingSubmissionInput;
  /** Optional caller request identity for idempotent replay. */
  readonly idempotencyKey?: string;
  /** Compares candidate evidence bytes with stored evidence when references differ. */
  readonly compareEvidence?: (input: {
    readonly candidateEvidenceReference: string;
    readonly storedEvidenceReference: string;
  }) => Promise<boolean>;
}

/**
 * Validates, authorizes, and persists one submission under the actor's
 * company scope via the Postgres-backed repository.
 * @param request Actor, submission input, idempotency key, and evidence comparator.
 * @returns The stored pending submission, or the original on replay.
 * @throws An `AccountingSubmissionError`-named error with `fieldErrors` when
 *   the domain rejects the input.
 */
export async function submitAccountingSubmission(
  request: SubmitAccountingSubmissionRequest,
): Promise<AccountingSubmission> {
  try {
    return await submitDomainAccountingSubmission({
      repository: await getRepository(),
      actor: request.actor,
      input: request.input,
      ...(request.idempotencyKey === undefined
        ? {}
        : { idempotencyKey: request.idempotencyKey }),
      ...(request.compareEvidence === undefined
        ? {}
        : { compareEvidence: request.compareEvidence }),
    });
  } catch (error) {
    translateDomainError(error);
  }
}

/**
 * Submits one record and returns whether the operation created or replayed it.
 * @param request Actor, submission input, idempotency key, and evidence comparator.
 * @returns The stored submission and its creation or replay outcome.
 * @throws An `AccountingSubmissionError`-named error with `fieldErrors` when
 *   the domain rejects the input.
 */
export async function submitAccountingSubmissionWithOutcome(
  request: SubmitAccountingSubmissionRequest,
): Promise<AccountingSubmissionResult> {
  try {
    return await submitDomainAccountingSubmissionWithOutcome({
      repository: await getRepository(),
      actor: request.actor,
      input: request.input,
      ...(request.idempotencyKey === undefined
        ? {}
        : { idempotencyKey: request.idempotencyKey }),
      ...(request.compareEvidence === undefined
        ? {}
        : { compareEvidence: request.compareEvidence }),
    });
  } catch (error) {
    translateDomainError(error);
  }
}

/** Request for listing the submissions visible to one actor. */
export interface ListAccountingSubmissionsRequest {
  /** Session-derived actor carrying the company scope. */
  readonly actor: AccountingActor;
}

/**
 * Lists the submissions visible to the actor; the domain enforces the
 * STAFF/OWNER/ACCOUNTANT visibility rule.
 * @param request Session-derived actor.
 * @returns The submissions visible to the actor.
 */
export async function listAccountingSubmissions(
  request: ListAccountingSubmissionsRequest,
): Promise<readonly AccountingSubmission[]> {
  try {
    return await listDomainAccountingSubmissions({
      repository: await getRepository(),
      actor: request.actor,
    });
  } catch (error) {
    translateDomainError(error);
  }
}

/** Request for approving a pending submission. */
export interface ApproveAccountingSubmissionRequest {
  /** Session-derived actor carrying the company scope. */
  readonly actor: AccountingActor;
  /** Identifier of the submission to approve. */
  readonly submissionId: string;
}

/**
 * Approves a pending submission via the Postgres-backed repository.
 * @param request Actor and submission identifier.
 * @returns The approved submission.
 * @throws An AccountingSubmissionError-named error for invalid input, forbidden, or not-found.
 */
export async function approveAccountingSubmission(
  request: ApproveAccountingSubmissionRequest,
): Promise<AccountingSubmission> {
  try {
    return await approveDomainAccountingSubmission({
      repository: await getRepository(),
      actor: request.actor,
      submissionId: request.submissionId,
    });
  } catch (error) {
    translateDomainError(error);
  }
}

/** Request for rejecting a pending submission. */
export interface RejectAccountingSubmissionRequest {
  /** Session-derived actor carrying the company scope. */
  readonly actor: AccountingActor;
  /** Identifier of the submission to reject. */
  readonly submissionId: string;
  /** Reason for the rejection. */
  readonly reason: string | undefined;
}

/**
 * Rejects a pending submission via the Postgres-backed repository.
 * @param request Actor, submission identifier, and rejection reason.
 * @returns The rejected submission.
 * @throws An AccountingSubmissionError-named error for invalid input, forbidden, or not-found.
 */
export async function rejectAccountingSubmission(
  request: RejectAccountingSubmissionRequest,
): Promise<AccountingSubmission> {
  try {
    return await rejectDomainAccountingSubmission({
      repository: await getRepository(),
      actor: request.actor,
      submissionId: request.submissionId,
      reason: request.reason,
    });
  } catch (error) {
    translateDomainError(error);
  }
}
