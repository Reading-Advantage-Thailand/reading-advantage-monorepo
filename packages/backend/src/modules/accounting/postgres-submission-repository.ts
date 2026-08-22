import type postgres from "postgres";

import type { FinanceOperationScope } from "../finance-operations/contracts.js";
import {
  accountingSubmissionSchema,
  type AccountingSubmission,
  type AccountingSubmissionAuditEvent,
} from "./contracts.js";
import type {
  AccountingSubmissionIdempotencyIdentity,
  AccountingSubmissionRepository,
} from "./submissions.js";

/**
 * Raw `accounting_submissions` row as returned by postgres.js: snake_case
 * columns, nullable optional fields, and a timestamptz instant the driver
 * surfaces as a `Date` (a string is tolerated for defensive normalization).
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
  readonly idempotency_key: string | null;
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
 * Maps and validates one raw store row before it crosses the repository
 * boundary into the domain.
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
 * Creates the PostgreSQL-backed accounting submission repository over the
 * reviewed accounting database client. Rows are mapped snake↔camel at the
 * boundary and revalidated against the domain schema on every read, so a
 * drifted stored row can never reach the domain unvalidated.
 * @param input The direct accounting `postgres.Sql` client.
 * @returns The domain `AccountingSubmissionRepository` port implementation.
 */
export function createPostgresAccountingSubmissionRepository(input: {
  readonly sql: postgres.Sql;
}): AccountingSubmissionRepository {
  const { sql } = input;

  return {
    async insert(
      submission: AccountingSubmission,
      idempotencyKey?: string,
      auditEvent?: AccountingSubmissionAuditEvent,
    ): Promise<AccountingSubmission> {
      const hasBegin = typeof (sql as unknown as { begin?: unknown }).begin === "function";
      if (hasBegin) {
        return (sql as unknown as { begin: (cb: (tx: postgres.Sql) => Promise<AccountingSubmission>) => Promise<AccountingSubmission> }).begin(
          async (tx) => {
            const [row] = await tx<AccountingSubmissionRow[]>`
              insert into accounting_submissions (
                id, kind, payee, category, description, amount_minor, currency,
                settled_thb_amount_minor, evidence_reference, scope_company_id,
                status, submitted_by_account_id, submitted_at, idempotency_key
              ) values (
                ${submission.id},
                ${submission.kind},
                ${submission.payee},
                ${submission.category},
                ${submission.description ?? null},
                ${submission.money.amountMinor},
                ${submission.money.currency},
                ${submission.settledThbAmount ?? null},
                ${submission.evidenceReference},
                ${submission.scope.companyId},
                ${submission.status},
                ${submission.submittedByAccountId},
                ${submission.submittedAt},
                ${idempotencyKey ?? null}
              )
              returning
                id, kind, payee, category, description, amount_minor, currency,
                settled_thb_amount_minor, evidence_reference, scope_company_id,
                status, submitted_by_account_id, submitted_at, idempotency_key
            `;
            if (auditEvent) {
              await tx`
                insert into accounting_submission_audit_events (
                  id, submission_id, action, actor_account_id, actor_role, reason, created_at
                ) values (
                  ${auditEvent.id},
                  ${auditEvent.submissionId},
                  ${auditEvent.action},
                  ${auditEvent.actorAccountId},
                  ${auditEvent.actorRole},
                  ${auditEvent.reason ?? null},
                  ${auditEvent.createdAt}
                )
              `;
            }
            return toAccountingSubmission(row as AccountingSubmissionRow);
          },
        );
      }
      const [row] = await sql<AccountingSubmissionRow[]>`
        insert into accounting_submissions (
          id, kind, payee, category, description, amount_minor, currency,
          settled_thb_amount_minor, evidence_reference, scope_company_id,
          status, submitted_by_account_id, submitted_at, idempotency_key
        ) values (
          ${submission.id},
          ${submission.kind},
          ${submission.payee},
          ${submission.category},
          ${submission.description ?? null},
          ${submission.money.amountMinor},
          ${submission.money.currency},
          ${submission.settledThbAmount ?? null},
          ${submission.evidenceReference},
          ${submission.scope.companyId},
          ${submission.status},
          ${submission.submittedByAccountId},
          ${submission.submittedAt},
          ${idempotencyKey ?? null}
        )
        returning
          id, kind, payee, category, description, amount_minor, currency,
          settled_thb_amount_minor, evidence_reference, scope_company_id,
          status, submitted_by_account_id, submitted_at, idempotency_key
      `;
      if (auditEvent) {
        await sql`
          insert into accounting_submission_audit_events (
            id, submission_id, action, actor_account_id, actor_role, reason, created_at
          ) values (
            ${auditEvent.id},
            ${auditEvent.submissionId},
            ${auditEvent.action},
            ${auditEvent.actorAccountId},
            ${auditEvent.actorRole},
            ${auditEvent.reason ?? null},
            ${auditEvent.createdAt}
          )
        `;
      }
      return toAccountingSubmission(row as AccountingSubmissionRow);
    },

    async findByIdempotencyKey(
      identity: AccountingSubmissionIdempotencyIdentity,
    ): Promise<AccountingSubmission | undefined> {
      const rows = await sql<AccountingSubmissionRow[]>`
        select
          id, kind, payee, category, description, amount_minor, currency,
          settled_thb_amount_minor, evidence_reference, scope_company_id,
          status, submitted_by_account_id, submitted_at, idempotency_key
        from accounting_submissions
        where scope_company_id = ${identity.scope.companyId}
          and submitted_by_account_id = ${identity.submittedByAccountId}
          and idempotency_key = ${identity.idempotencyKey}
        limit 1
      `;
      const [row] = rows;
      return row === undefined ? undefined : toAccountingSubmission(row);
    },

    async listByScope(
      scope: Readonly<FinanceOperationScope>,
    ): Promise<readonly AccountingSubmission[]> {
      const rows = await sql<AccountingSubmissionRow[]>`
        select
          id, kind, payee, category, description, amount_minor, currency,
          settled_thb_amount_minor, evidence_reference, scope_company_id,
          status, submitted_by_account_id, submitted_at, idempotency_key
        from accounting_submissions
        where scope_company_id = ${scope.companyId}
        order by submitted_at asc, id asc
      `;
      return rows.map(toAccountingSubmission);
    },

    async findById(input: {
      readonly scope: Readonly<FinanceOperationScope>;
      readonly submissionId: string;
    }): Promise<AccountingSubmission | undefined> {
      const rows = await sql<AccountingSubmissionRow[]>`
        select
          id, kind, payee, category, description, amount_minor, currency,
          settled_thb_amount_minor, evidence_reference, scope_company_id,
          status, submitted_by_account_id, submitted_at, idempotency_key
        from accounting_submissions
        where scope_company_id = ${input.scope.companyId}
          and id = ${input.submissionId}
        limit 1
      `;
      const [row] = rows;
      return row === undefined ? undefined : toAccountingSubmission(row);
    },

    async transition(input: {
      readonly scope: Readonly<FinanceOperationScope>;
      readonly submissionId: string;
      readonly status: "approved" | "rejected";
      readonly auditEvent: AccountingSubmissionAuditEvent;
    }): Promise<AccountingSubmission | undefined> {
      const hasBegin = typeof (sql as unknown as { begin?: unknown }).begin === "function";
      if (!hasBegin) {
        const rows = await sql<AccountingSubmissionRow[]>`
          update accounting_submissions
          set status = ${input.status}
          where id = ${input.submissionId}
            and scope_company_id = ${input.scope.companyId}
            and status = ${"pending"}
          returning
            id, kind, payee, category, description, amount_minor, currency,
            settled_thb_amount_minor, evidence_reference, scope_company_id,
            status, submitted_by_account_id, submitted_at, idempotency_key
        `;
        const [row] = rows;
        if (row === undefined) return undefined;
        await sql`
          insert into accounting_submission_audit_events (
            id, submission_id, action, actor_account_id, actor_role, reason, created_at
          ) values (
            ${input.auditEvent.id},
            ${input.auditEvent.submissionId},
            ${input.auditEvent.action},
            ${input.auditEvent.actorAccountId},
            ${input.auditEvent.actorRole},
            ${input.auditEvent.reason ?? null},
            ${input.auditEvent.createdAt}
          )
        `;
        return toAccountingSubmission(row as AccountingSubmissionRow);
      }
      return (sql as unknown as { begin: (cb: (tx: postgres.Sql) => Promise<AccountingSubmission | undefined>) => Promise<AccountingSubmission | undefined> }).begin(
        async (tx) => {
          const rows = await tx<AccountingSubmissionRow[]>`
            update accounting_submissions
            set status = ${input.status}
            where id = ${input.submissionId}
              and scope_company_id = ${input.scope.companyId}
              and status = ${"pending"}
            returning
              id, kind, payee, category, description, amount_minor, currency,
              settled_thb_amount_minor, evidence_reference, scope_company_id,
              status, submitted_by_account_id, submitted_at, idempotency_key
          `;
          const [row] = rows;
          if (row === undefined) return undefined;
          await tx`
            insert into accounting_submission_audit_events (
              id, submission_id, action, actor_account_id, actor_role, reason, created_at
            ) values (
              ${input.auditEvent.id},
              ${input.auditEvent.submissionId},
              ${input.auditEvent.action},
              ${input.auditEvent.actorAccountId},
              ${input.auditEvent.actorRole},
              ${input.auditEvent.reason ?? null},
              ${input.auditEvent.createdAt}
            )
          `;
          return toAccountingSubmission(row as AccountingSubmissionRow);
        },
      );
    },
  };
}
