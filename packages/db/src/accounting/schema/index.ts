import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Immutable, company-first staff accounting submissions.
 *
 * This table lives in the dedicated `accounting` database on the shared Cloud
 * SQL instance, following the company-identity package layout. Each row is one
 * expense or bill submitted by staff for approval. The record is append-only:
 * approval workflows in later phases append new records rather than mutating
 * submissions, so no `updated_at` column exists. Money is stored in exact minor
 * units as digit text — never as a float. `scope_company_id` is deliberately a
 * plain uuid without a foreign key: the owning company account lives in the
 * separate company_identity database, which cross-database constraints cannot
 * reach.
 */
export const accountingSubmissions = pgTable(
  "accounting_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    payee: text("payee").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    amountMinor: text("amount_minor").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    settledThbAmountMinor: text("settled_thb_amount_minor"),
    evidenceReference: text("evidence_reference").notNull(),
    scopeCompanyId: uuid("scope_company_id").notNull(),
    status: text("status").default("pending").notNull(),
    submittedByAccountId: uuid("submitted_by_account_id").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /**
     * Caller-supplied request identity retained for idempotent replay. NULL
     * for submissions made without a key; the partial uniqueness boundary
     * below deliberately allows any number of NULL keys per actor.
     */
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "accounting_submissions_kind_check",
      sql`${table.kind} IN ('expense', 'bill')`,
    ),
    check(
      "accounting_submissions_payee_check",
      sql`char_length(${table.payee}) between 1 and 256 AND ${table.payee} ~ '[^[:space:]]'`,
    ),
    check(
      "accounting_submissions_category_check",
      sql`char_length(${table.category}) between 1 and 128 AND ${table.category} ~ '[^[:space:]]'`,
    ),
    check(
      "accounting_submissions_description_check",
      sql`${table.description} IS NULL OR (char_length(${table.description}) between 1 and 1024 AND ${table.description} ~ '[^[:space:]]')`,
    ),
    check(
      "accounting_submissions_amount_minor_check",
      sql`${table.amountMinor} ~ '^[0-9]+$'`,
    ),
    check(
      "accounting_submissions_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "accounting_submissions_settled_thb_amount_minor_check",
      sql`${table.settledThbAmountMinor} IS NULL OR ${table.settledThbAmountMinor} ~ '^[1-9][0-9]*$'`,
    ),
    check(
      "accounting_submissions_settled_thb_currency_check",
      sql`(${table.currency} = 'THB' AND ${table.settledThbAmountMinor} IS NULL) OR (${table.currency} <> 'THB' AND ${table.settledThbAmountMinor} IS NOT NULL)`,
    ),
    check(
      "accounting_submissions_evidence_reference_check",
      sql`${table.evidenceReference} ~ '^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[A-Za-z0-9._~-]+)+$' AND ${table.evidenceReference} NOT LIKE '%/../%' AND ${table.evidenceReference} NOT LIKE '%/./%' AND ${table.evidenceReference} NOT LIKE '%/..' AND ${table.evidenceReference} NOT LIKE '%/.'`,
    ),
    check(
      "accounting_submissions_status_check",
      sql`${table.status} IN ('pending', 'approved', 'rejected')`,
    ),
    index("accounting_submissions_scope_company_status_idx").on(
      table.scopeCompanyId,
      table.status,
    ),
    index("accounting_submissions_submitted_by_idx").on(
      table.submittedByAccountId,
    ),
    uniqueIndex("accounting_submissions_idempotency_key_idx").on(
      table.scopeCompanyId,
      table.submittedByAccountId,
      table.idempotencyKey,
    ),
  ],
);

/**
 * Append-only audit trail for the accounting submission lifecycle.
 * Enforced at the DB level by the runtime grants (SELECT, INSERT only on this
 * table); the migration role owns the objects, the runtime role cannot UPDATE
 * or DELETE. See `apps/accounting/scripts/accounting-runtime-grants.sql`.
 */
export const accountingSubmissionAuditEvents = pgTable(
  "accounting_submission_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").notNull(),
    action: text("action").notNull(),
    actorAccountId: uuid("actor_account_id").notNull(),
    actorRole: text("actor_role").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "accounting_submission_audit_events_action_check",
      sql`${table.action} IN ('submit', 'approve', 'reject')`,
    ),
    check(
      "accounting_submission_audit_events_reason_check",
      sql`${table.reason} IS NULL OR ${table.reason} ~ '[^[:space:]]'`,
    ),
    index("accounting_submission_audit_events_submission_idx").on(
      table.submissionId,
      table.createdAt,
    ),
  ],
);
