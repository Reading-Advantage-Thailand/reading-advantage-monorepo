/**
 * Application adapter for the Accounting monthly close domain module.
 *
 * Thin wiring only: the domain functions of
 * `@reading-advantage/backend/accounting` hold the business rules, and this
 * file connects them to the Accounting runtime database and to the private
 * evidence storage. The adapter adds no role test of its own.
 */
import {
  AccountingSubmissionError,
  createPostgresAccountingMonthlyCloseRepository,
  listMonthlyCloses as listDomainMonthlyCloses,
  openMonthlyClose as openDomainMonthlyClose,
  signMonthlyClose as signDomainMonthlyClose,
  type AccountingActor,
  type AccountingEvidenceStore,
  type AccountingMonthlyClose,
} from "@reading-advantage/backend/accounting";
import { createAccountingRuntimeClient } from "@reading-advantage/db/accounting/runtime";
import type { ZodIssue } from "zod";

import { haveSameBytes } from "./accounting-evidence-store";
import {
  putPrivateEvidence,
  readPrivateEvidence,
} from "@/app/lib/private-evidence-storage";

/** Repository implementation behind the domain close port. */
type AccountingMonthlyCloseRepository = ReturnType<
  typeof createPostgresAccountingMonthlyCloseRepository
>;

let repositoryPromise: Promise<AccountingMonthlyCloseRepository> | undefined;

/**
 * Creates the process-local repository against the dedicated Accounting database.
 * @returns A repository backed by the validated Accounting runtime connection.
 * @throws When the runtime URL or connection target is invalid.
 */
async function createRepository(): Promise<AccountingMonthlyCloseRepository> {
  const sql = await createAccountingRuntimeClient({
    databaseUrl: process.env.ACCOUNTING_DATABASE_URL ?? "",
  });
  return createPostgresAccountingMonthlyCloseRepository({ sql });
}

/**
 * Returns the process-local Accounting close repository.
 * @returns The shared repository promise for this process.
 */
function getRepository(): Promise<AccountingMonthlyCloseRepository> {
  repositoryPromise ??= createRepository();
  return repositoryPromise;
}

/**
 * Stores the close report as private evidence. The reference stays opaque and
 * company scoped, and the report object is never updated.
 */
const evidenceStore: AccountingEvidenceStore = {
  async put(input) {
    const stored = await putPrivateEvidence({
      companyId: input.companyId,
      contentType: input.contentType,
      body: input.body,
    });
    return {
      evidenceReference: stored.evidenceReference,
      byteSize: input.body.byteLength,
    };
  },

  async read(input) {
    return readPrivateEvidence({
      companyId: input.companyId,
      evidenceReference: input.evidenceReference,
    });
  },

  async sameEvidenceBytes(input) {
    const [left, right] = await Promise.all([
      readPrivateEvidence({
        companyId: input.companyId,
        evidenceReference: input.leftEvidenceReference,
      }),
      readPrivateEvidence({
        companyId: input.companyId,
        evidenceReference: input.rightEvidenceReference,
      }),
    ]);
    return haveSameBytes(left, right);
  },
};

/**
 * Converts the domain Zod issues into field paths for a 400 response.
 * @param issues Zod issues carried by the rejection.
 * @returns Field errors keyed by dot-joined issue path.
 */
function fieldErrorsFromIssues(
  issues: readonly ZodIssue[] | undefined,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues ?? []) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "close";
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * Rethrows a domain rejection as a route-ready error. An `invalid-input`
 * rejection carries the field errors of the response body.
 * @param error The error thrown by the domain call.
 * @returns Never returns; always throws.
 */
function translateDomainError(error: unknown): never {
  try {
    if (
      error instanceof AccountingSubmissionError &&
      error.reason === "invalid-input"
    ) {
      error.message = "Monthly close validation failed";
      Object.assign(error, {
        fieldErrors: fieldErrorsFromIssues(error.issues),
      });
    }
  } catch {
    // Preserve the original provider value when the translation fails.
  }
  throw error;
}

/**
 * Lists the monthly closes visible to the actor.
 * @param request Session-derived actor.
 * @returns The closes visible to the actor.
 * @throws An AccountingSubmissionError-named error for a forbidden or an invalid call.
 */
export async function listMonthlyCloses(request: {
  readonly actor: AccountingActor;
}): Promise<readonly AccountingMonthlyClose[]> {
  try {
    return await listDomainMonthlyCloses({
      repository: await getRepository(),
      actor: request.actor,
    });
  } catch (error) {
    translateDomainError(error);
  }
}

/**
 * Opens the monthly close of one period month.
 * @param request Session-derived actor and the period month.
 * @returns The stored open close.
 * @throws An AccountingSubmissionError-named error for a forbidden, an invalid, or a conflicting call.
 */
export async function openMonthlyClose(request: {
  readonly actor: AccountingActor;
  readonly periodMonth: string;
}): Promise<AccountingMonthlyClose> {
  try {
    return await openDomainMonthlyClose({
      repository: await getRepository(),
      evidenceStore,
      actor: request.actor,
      periodMonth: request.periodMonth,
    });
  } catch (error) {
    translateDomainError(error);
  }
}

/**
 * Signs the monthly close and locks it in the same call.
 * @param request Session-derived actor and the close identifier.
 * @returns The locked close.
 * @throws An AccountingSubmissionError-named error for a forbidden, an invalid, or an unknown close.
 */
export async function signMonthlyClose(request: {
  readonly actor: AccountingActor;
  readonly closeId: string;
}): Promise<AccountingMonthlyClose> {
  try {
    return await signDomainMonthlyClose({
      repository: await getRepository(),
      actor: request.actor,
      closeId: request.closeId,
    });
  } catch (error) {
    translateDomainError(error);
  }
}
