/**
 * Read surface of the year-end view (FR-31, spec section 9b). The module
 * reads the stored year-file facts rows through the intake repository port
 * and groups them for the read-only page. It writes nothing.
 */
import { AccountingSubmissionError } from "./submissions.js";
import type { AccountingActor } from "./submissions.js";
import type { AccountingYearFileFactsRecord } from "./intake.js";
import type { AccountingYearFileIntakeRepository } from "./intake.js";
import { canReadYearFiles } from "./permissions.js";

/** One year-file row of the grouped list (FR-31). */
export interface YearFileFactRow {
  /** Intake row of the year file. */
  readonly intakeDocumentId: string;
  /** Year-file type key of the file. */
  readonly formType: string;
  /** Filing kind of the file. */
  readonly filingKind: string;
  /** Period kind of the filing. */
  readonly periodKind: string;
  /** First day of the period in `YYYY-MM-DD` form. */
  readonly periodStart: string;
  /** Last day of the period in `YYYY-MM-DD` form. */
  readonly periodEnd: string;
  /** Facts that the parser read from the text; the page shows the names only. */
  readonly facts: AccountingYearFileFactsRecord["facts"];
  /** History marker of the intake row. */
  readonly isHistory: boolean;
  /** History source of the intake row. */
  readonly historySource: string;
  /** Private evidence reference of the intake row. */
  readonly evidenceReference: string;
}

/** One group of the year-file list: one tax year and one form type. */
export interface YearFileFactsGroup {
  /** Tax year in CE. */
  readonly taxYear: number;
  /** Year-file type key of the group. */
  readonly formType: string;
  /** The year-file rows of the group. */
  readonly rows: readonly YearFileFactRow[];
}

/**
 * Lists the year-file rows of the company, grouped by tax year and form type.
 * The function checks `canReadYearFiles` first, reads the facts rows and the
 * intake rows through the repository port, and calls no write member.
 * @param request The repository port and the session-derived actor.
 * @returns One group per tax year and form type, with the history marker and
 *   the evidence link of every row.
 * @throws AccountingSubmissionError when the actor may not read the year
 *   files.
 */
export async function listYearFileFacts(request: {
  readonly repository: AccountingYearFileIntakeRepository;
  readonly actor: AccountingActor;
}): Promise<readonly YearFileFactsGroup[]> {
  if (!canReadYearFiles(request.actor)) {
    throw new AccountingSubmissionError("forbidden");
  }
  const scope = { companyId: request.actor.companyId };
  const [factsRows, intakeRows] = await Promise.all([
    request.repository.listYearFileFactsByScope(scope),
    request.repository.listByScope(scope),
  ]);
  const intakeById = new Map(intakeRows.map((row) => [row.id, row]));
  const groups = new Map<
    string,
    { taxYear: number; formType: string; rows: YearFileFactRow[] }
  >();
  for (const factsRow of factsRows) {
    const intake = intakeById.get(factsRow.intakeDocumentId);
    const row: YearFileFactRow = {
      intakeDocumentId: factsRow.intakeDocumentId,
      formType: factsRow.formType,
      filingKind: factsRow.filingKind,
      periodKind: factsRow.periodKind,
      periodStart: factsRow.periodStart,
      periodEnd: factsRow.periodEnd,
      facts: factsRow.facts,
      isHistory: intake?.isHistory ?? false,
      historySource: intake?.historySource ?? "",
      evidenceReference: intake?.evidenceReference ?? "",
    };
    const key = `${factsRow.taxYear}\n${factsRow.formType}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, {
        taxYear: factsRow.taxYear,
        formType: factsRow.formType,
        rows: [row],
      });
    } else {
      group.rows.push(row);
    }
  }
  return [...groups.values()];
}
