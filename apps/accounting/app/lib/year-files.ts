/**
 * Application adapter for the year-end view domain module (FR-31).
 *
 * Thin wiring only: the domain function `listYearFileFacts` of
 * `@reading-advantage/backend/accounting` holds the role check and the
 * grouping rules, and this file connects it to the Accounting runtime
 * database through the intake repository port. The adapter adds no role
 * test of its own and writes nothing.
 */
import {
  listYearFileFacts as listDomainYearFileFacts,
  type AccountingActor,
  type AccountingYearFileIntakeRepository,
  type YearFileFactsGroup,
} from "@reading-advantage/backend/accounting";

import { createAccountingIntakeRuntimeRepository } from "./accounting-intake-document-repository";

let repositoryPromise: Promise<AccountingYearFileIntakeRepository> | undefined;

/**
 * Returns the process-local intake repository.
 * @returns The shared repository promise for this process.
 * @throws When the runtime URL or connection target is invalid.
 */
function getRepository(): Promise<AccountingYearFileIntakeRepository> {
  repositoryPromise ??= createAccountingIntakeRuntimeRepository();
  return repositoryPromise;
}

/**
 * Lists the year-file rows of the company, grouped by tax year and form
 * type. The domain function refuses an actor that may not read the year
 * files; this adapter forwards the rejection.
 * @param request Session-derived actor.
 * @returns One group per tax year and form type, read only.
 * @throws AccountingSubmissionError when the actor may not read the year files.
 */
export async function listYearFileFacts(request: {
  readonly actor: AccountingActor;
}): Promise<readonly YearFileFactsGroup[]> {
  return await listDomainYearFileFacts({
    repository: await getRepository(),
    actor: request.actor,
  });
}
