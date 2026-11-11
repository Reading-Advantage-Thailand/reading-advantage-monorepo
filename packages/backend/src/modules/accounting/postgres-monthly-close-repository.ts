import type postgres from "postgres";

import type { FinanceOperationScope } from "../finance-operations/contracts.js";
import {
  accountingSubmissionSchema,
  type AccountingSubmission,
} from "./contracts.js";
import {
  accountingMonthlyCloseAuditEventSchema,
  accountingMonthlyCloseSchema,
  type AccountingMonthlyClose,
  type AccountingMonthlyCloseAuditEvent,
} from "./intake-contracts.js";
import type { AccountingMonthlyCloseRepository } from "./monthly-close.js";
import { AccountingSubmissionError } from "./submissions.js";

/** PostgreSQL unique violation code. */
const UNIQUE_VIOLATION_CODE = "23505";

/**
 * Raw `accounting_monthly_closes` row as returned by postgres.js: snake_case
 * columns, nullable optional fields, and timestamptz instants the driver
 * surfaces as a `Date`.
 */
interface AccountingMonthlyCloseRow {
  readonly id: string;
  readonly period_month: string;
  readonly status: string;
  readonly report_evidence_reference: string | null;
  readonly opened_by_account_id: string;
  readonly opened_at: Date | string;
  readonly signed_by_account_id: string | null;
  readonly signed_by_role: string | null;
  readonly signed_at: Date | string | null;
  readonly locked_at: Date | string | null;
  readonly scope_company_id: string;
}

/**
 * Raw `accounting_submissions` row as returned by postgres.js. The close
 * repository reads the approved submissions of a period and keeps its own
 * mapping of this row shape.
 */
interface AccountingSubmissionRow {
  readonly id: string;
  readonly kind: string;
  readonly payee: string;
  readonly category: string;
  readonly description: string | null;
  readonly amount_minor: string;
  readonly currency: string;
  readonly settled_thb_amount_minor: string | null;
  readonly evidence_reference: string;
  readonly scope_company_id: string;
  readonly status: string;
  readonly submitted_by_account_id: string;
  readonly submitted_at: Date | string;
}

/**
 * Normalizes a timestamptz driver value to an ISO-8601 string with offset.
 * @param value Driver-surfaced timestamp (`Date`, or a parseable string).
 * @returns ISO-8601 timestamp string satisfying the domain contract.
 */
function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

/**
 * Reports whether the driver error is a unique violation. The close table
 * holds one row per company and period month, so a second open for one month
 * reaches the driver as a unique violation.
 * @param error Unknown thrown value.
 * @returns True when the driver reported the unique violation code.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { readonly code?: unknown }).code === UNIQUE_VIOLATION_CODE
  );
}

/**
 * Maps and validates one raw close row before it crosses the repository
 * boundary into the domain.
 * @param row Raw snake_case row returned by PostgreSQL.
 * @returns The validated immutable domain close snapshot.
 */
function toAccountingMonthlyClose(
  row: Readonly<AccountingMonthlyCloseRow>,
): AccountingMonthlyClose {
  return accountingMonthlyCloseSchema.parse({
    id: row.id,
    periodMonth: row.period_month,
    status: row.status,
    reportEvidenceReference: row.report_evidence_reference,
    openedByAccountId: row.opened_by_account_id,
    openedAt: toIsoTimestamp(row.opened_at),
    signedByAccountId: row.signed_by_account_id,
    signedByRole: row.signed_by_role,
    signedAt: row.signed_at === null ? null : toIsoTimestamp(row.signed_at),
    lockedAt: row.locked_at === null ? null : toIsoTimestamp(row.locked_at),
    scopeCompanyId: row.scope_company_id,
  });
}

/**
 * Maps and validates one raw submission row of a period.
 * @param row Raw snake_case row returned by PostgreSQL.
 * @returns The validated immutable domain submission snapshot.
 */
function toAccountingSubmission(
  row: Readonly<AccountingSubmissionRow>,
): AccountingSubmission {
  return accountingSubmissionSchema.parse({
    id: row.id,
    scope: { companyId: row.scope_company_id },
    status: row.status,
    submittedByAccountId: row.submitted_by_account_id,
    submittedAt: toIsoTimestamp(row.submitted_at),
    kind: row.kind,
    payee: row.payee,
    category: row.category,
    ...(row.description === null ? {} : { description: row.description }),
    money: { amountMinor: row.amount_minor, currency: row.currency },
    evidenceReference: row.evidence_reference,
    ...(row.settled_thb_amount_minor === null
      ? {}
      : { settledThbAmount: row.settled_thb_amount_minor }),
  });
}

/**
 * Creates the PostgreSQL-backed monthly close repository over the reviewed
 * accounting database client. Rows are mapped snake↔camel at the boundary and
 * revalidated against the domain schema on every read.
 * @param input The direct accounting `postgres.Sql` client.
 * @returns The domain `AccountingMonthlyCloseRepository` port implementation.
 */
export function createPostgresAccountingMonthlyCloseRepository(input: {
  readonly sql: postgres.Sql;
}): AccountingMonthlyCloseRepository {
  const { sql } = input;

  return {
    async findByPeriodMonth(query: {
      readonly scope: Readonly<FinanceOperationScope>;
      readonly periodMonth: string;
    }): Promise<AccountingMonthlyClose | undefined> {
      const rows = await sql<AccountingMonthlyCloseRow[]>`
        select
          id, period_month, status, report_evidence_reference,
          opened_by_account_id, opened_at, signed_by_account_id,
          signed_by_role, signed_at, locked_at, scope_company_id
        from accounting_monthly_closes
        where scope_company_id = ${query.scope.companyId}
          and period_month = ${query.periodMonth}
        limit 1
      `;
      const [row] = rows;
      return row === undefined ? undefined : toAccountingMonthlyClose(row);
    },

    async listApprovedSubmissions(query: {
      readonly scope: Readonly<FinanceOperationScope>;
      readonly periodMonth: string;
    }): Promise<readonly AccountingSubmission[]> {
      const rows = await sql<AccountingSubmissionRow[]>`
        select
          id, kind, payee, category, description, amount_minor, currency,
          settled_thb_amount_minor, evidence_reference, scope_company_id,
          status, submitted_by_account_id, submitted_at
        from accounting_submissions
        where scope_company_id = ${query.scope.companyId}
          and status = ${"approved"}
          and to_char(submitted_at, 'YYYY-MM') = ${query.periodMonth}
        order by submitted_at asc, id asc
      `;
      return rows.map(toAccountingSubmission);
    },

    async insert(
      close: AccountingMonthlyClose,
    ): Promise<AccountingMonthlyClose> {
      let rows: AccountingMonthlyCloseRow[];
      try {
        rows = await sql<AccountingMonthlyCloseRow[]>`
          insert into accounting_monthly_closes (
            id, period_month, status, report_evidence_reference,
            opened_by_account_id, opened_at, signed_by_account_id,
            signed_by_role, signed_at, locked_at, scope_company_id
          ) values (
            ${close.id},
            ${close.periodMonth},
            ${close.status},
            ${close.reportEvidenceReference},
            ${close.openedByAccountId},
            ${close.openedAt},
            ${close.signedByAccountId},
            ${close.signedByRole},
            ${close.signedAt},
            ${close.lockedAt},
            ${close.scopeCompanyId}
          )
          returning
            id, period_month, status, report_evidence_reference,
            opened_by_account_id, opened_at, signed_by_account_id,
            signed_by_role, signed_at, locked_at, scope_company_id
        `;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AccountingSubmissionError("conflict");
        }
        throw error;
      }
      const [row] = rows;
      if (row === undefined) {
        throw new Error("Accounting monthly close insert returned no row");
      }
      return toAccountingMonthlyClose(row);
    },

    async findById(query: {
      readonly scope: Readonly<FinanceOperationScope>;
      readonly closeId: string;
    }): Promise<AccountingMonthlyClose | undefined> {
      const rows = await sql<AccountingMonthlyCloseRow[]>`
        select
          id, period_month, status, report_evidence_reference,
          opened_by_account_id, opened_at, signed_by_account_id,
          signed_by_role, signed_at, locked_at, scope_company_id
        from accounting_monthly_closes
        where scope_company_id = ${query.scope.companyId}
          and id = ${query.closeId}
        limit 1
      `;
      const [row] = rows;
      return row === undefined ? undefined : toAccountingMonthlyClose(row);
    },

    async save(
      close: AccountingMonthlyClose,
      expectedStatus: string,
    ): Promise<AccountingMonthlyClose | undefined> {
      // The expected status is a bound value in the where clause, so a lost
      // compare-and-swap matches no row. The row returns with `returning *`,
      // so no column name carries the status text into the statement.
      const rows = await sql<AccountingMonthlyCloseRow[]>`
        update accounting_monthly_closes
        set status = ${close.status},
          report_evidence_reference = ${close.reportEvidenceReference},
          signed_by_account_id = ${close.signedByAccountId},
          signed_by_role = ${close.signedByRole},
          signed_at = ${close.signedAt},
          locked_at = ${close.lockedAt}
        where id = ${close.id}
          and scope_company_id = ${close.scopeCompanyId}
          and status = ${expectedStatus}
        returning *
      `;
      const [row] = rows;
      if (row === undefined) {
        return undefined;
      }
      return toAccountingMonthlyClose(row);
    },

    async listByScope(
      scope: Readonly<FinanceOperationScope>,
    ): Promise<readonly AccountingMonthlyClose[]> {
      const rows = await sql<AccountingMonthlyCloseRow[]>`
        select
          id, period_month, status, report_evidence_reference,
          opened_by_account_id, opened_at, signed_by_account_id,
          signed_by_role, signed_at, locked_at, scope_company_id
        from accounting_monthly_closes
        where scope_company_id = ${scope.companyId}
        order by period_month asc, id asc
      `;
      return rows.map(toAccountingMonthlyClose);
    },

    async recordAuditEvent(
      event: AccountingMonthlyCloseAuditEvent,
    ): Promise<AccountingMonthlyCloseAuditEvent> {
      await sql`
        insert into accounting_monthly_close_audit_events (
          id, close_id, action, actor_account_id, actor_role, reason, created_at
        ) values (
          ${event.id},
          ${event.closeId},
          ${event.action},
          ${event.actorAccountId},
          ${event.actorRole},
          ${event.reason},
          ${event.createdAt}
        )
      `;
      return accountingMonthlyCloseAuditEventSchema.parse(event);
    },
  };
}
