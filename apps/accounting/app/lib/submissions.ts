/**
 * Application adapter wiring the `@reading-advantage/backend/accounting`
 * domain functions to a Postgres-backed `AccountingSubmissionRepository`.
 *
 * The database client is created lazily on first use from
 * `ACCOUNTING_DIRECT_DATABASE_URL` through the reviewed accounting
 * direct-client boundary, so importing this module never opens a connection.
 * Domain `invalid-input` rejections are translated here into a route-ready
 * error carrying `fieldErrors`, keeping the API route thin.
 */
import {
  AccountingSubmissionError,
  createPostgresAccountingSubmissionRepository,
  listAccountingSubmissions as listDomainAccountingSubmissions,
  submitAccountingSubmission as submitDomainAccountingSubmission,
  type AccountingActor,
  type AccountingSubmission,
  type AccountingSubmissionInput,
  type AccountingSubmissionRepository,
} from "@reading-advantage/backend/accounting";
import { createAccountingDirectClient } from "@reading-advantage/db/accounting/runtime";
import type { ZodIssue } from "zod";

let repositoryPromise: Promise<AccountingSubmissionRepository> | undefined;

/**
 * Returns the lazily created Postgres-backed submission repository.
 * @returns The shared repository backed by the accounting direct client.
 * @throws When `ACCOUNTING_DIRECT_DATABASE_URL` is not configured.
 */
function getSubmissionRepository(): Promise<AccountingSubmissionRepository> {
  repositoryPromise ??= (async () => {
    const directDatabaseUrl = process.env.ACCOUNTING_DIRECT_DATABASE_URL;
    if (!directDatabaseUrl) {
      throw new Error("ACCOUNTING_DIRECT_DATABASE_URL_REQUIRED");
    }
    const sql = await createAccountingDirectClient({ directDatabaseUrl });
    return createPostgresAccountingSubmissionRepository({ sql });
  })();
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
  if (
    error instanceof AccountingSubmissionError &&
    error.reason === "invalid-input"
  ) {
    throw Object.assign(new Error("Submission validation failed"), {
      name: "AccountingSubmissionError",
      reason: "invalid-input" as const,
      fieldErrors: fieldErrorsFromIssues(error.issues ?? []),
    });
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
}

/**
 * Validates, authorizes, and persists one submission under the actor's
 * company scope via the Postgres-backed repository.
 * @param request Actor, submission input, and optional idempotency key.
 * @returns The stored pending submission, or the original on replay.
 * @throws An `AccountingSubmissionError`-named error with `fieldErrors` when
 *   the domain rejects the input.
 */
export async function submitAccountingSubmission(
  request: SubmitAccountingSubmissionRequest,
): Promise<AccountingSubmission> {
  try {
    const repository = await getSubmissionRepository();
    return await submitDomainAccountingSubmission({
      repository,
      actor: request.actor,
      input: request.input,
      ...(request.idempotencyKey === undefined
        ? {}
        : { idempotencyKey: request.idempotencyKey }),
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
    const repository = await getSubmissionRepository();
    return await listDomainAccountingSubmissions({
      repository,
      actor: request.actor,
    });
  } catch (error) {
    translateDomainError(error);
  }
}
