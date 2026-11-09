import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
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

/**
 * One row per Drive file read by the intake poll (FR-3).
 *
 * The row is company-scoped by `scope_company_id`, a plain uuid without a
 * foreign key: the owning company account lives in the separate
 * company_identity database. `evidence_byte_size` stores the byte length of the
 * stored object; it is an integer column and never a hash or a checksum
 * (AGENTS.md hashing policy, D-28). The history columns `is_history` and
 * `history_source` carry the January to October 2026 import of section 9a.
 */
export const accountingIntakeDocuments = pgTable(
  "accounting_intake_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driveFileId: text("drive_file_id").notNull(),
    driveFolderId: text("drive_folder_id").notNull(),
    sourceMonth: text("source_month").notNull(),
    documentType: text("document_type").notNull(),
    status: text("status").default("pending").notNull(),
    submissionId: uuid("submission_id"),
    duplicateOfSubmissionId: uuid("duplicate_of_submission_id"),
    evidenceReference: text("evidence_reference"),
    extraction: text("extraction"),
    failureReason: text("failure_reason"),
    failureCount: integer("failure_count").default(0).notNull(),
    sightingCount: integer("sighting_count").default(1).notNull(),
    evidenceByteSize: integer("evidence_byte_size"),
    isHistory: boolean("is_history").default(false).notNull(),
    historySource: text("history_source"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    scopeCompanyId: uuid("scope_company_id").notNull(),
  },
  (table) => [
    check(
      "accounting_intake_documents_document_type_check",
      sql`${table.documentType} IN ('receipt', 'tax-invoice', 'bank-statement', 'payroll-sheet', 'withholding-certificate', 'payment-voucher-sheet', 'cloud-invoice', 'openai-invoice')`,
    ),
    check(
      "accounting_intake_documents_status_check",
      sql`${table.status} IN ('pending', 'parsed', 'failed', 'duplicate')`,
    ),
    check(
      "accounting_intake_documents_extraction_check",
      sql`${table.extraction} IS NULL OR ${table.extraction} IN ('human', 'local-text', 'model')`,
    ),
    check(
      "accounting_intake_documents_source_month_check",
      sql`${table.sourceMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    check(
      "accounting_intake_documents_history_source_check",
      sql`(${table.isHistory} = false AND ${table.historySource} IS NULL) OR (${table.isHistory} = true AND ${table.historySource} IN ('drive-folder', 'drive-modified-date'))`,
    ),
    check(
      "accounting_intake_documents_evidence_byte_size_check",
      sql`${table.evidenceByteSize} IS NULL OR ${table.evidenceByteSize} > 0`,
    ),
    index("accounting_intake_documents_scope_company_status_idx").on(
      table.scopeCompanyId,
      table.status,
    ),
    index("accounting_intake_documents_evidence_byte_size_idx").on(
      table.scopeCompanyId,
      table.evidenceByteSize,
    ),
    uniqueIndex("accounting_intake_documents_scope_company_file_idx").on(
      table.scopeCompanyId,
      table.driveFileId,
    ),
  ],
);

/**
 * One monthly close row per company and period month (FR-4).
 *
 * The CEO sign locks the close in the same call, so `signed_at` and
 * `locked_at` move together on the locked row (spec section 7).
 */
export const accountingMonthlyCloses = pgTable(
  "accounting_monthly_closes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodMonth: text("period_month").notNull(),
    status: text("status").default("open").notNull(),
    reportEvidenceReference: text("report_evidence_reference"),
    openedByAccountId: uuid("opened_by_account_id").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    signedByAccountId: uuid("signed_by_account_id"),
    signedByRole: text("signed_by_role"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    scopeCompanyId: uuid("scope_company_id").notNull(),
  },
  (table) => [
    check(
      "accounting_monthly_closes_status_check",
      sql`${table.status} IN ('open', 'signed', 'locked')`,
    ),
    check(
      "accounting_monthly_closes_period_month_check",
      sql`${table.periodMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    check(
      "accounting_monthly_closes_locked_at_check",
      sql`${table.status} <> 'locked' OR ${table.lockedAt} IS NOT NULL`,
    ),
    uniqueIndex("accounting_monthly_closes_scope_company_month_idx").on(
      table.scopeCompanyId,
      table.periodMonth,
    ),
  ],
);

/**
 * Append-only audit trail for the monthly close lifecycle (FR-5).
 *
 * Enforced at the DB level by the runtime grants (SELECT, INSERT only on this
 * table); the migration role owns the objects, the runtime role cannot UPDATE
 * or DELETE. See `apps/accounting/scripts/accounting-runtime-grants.sql`. The
 * table holds no `scope_company_id`: the trail is reached through `close_id`.
 */
export const accountingMonthlyCloseAuditEvents = pgTable(
  "accounting_monthly_close_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    closeId: uuid("close_id").notNull(),
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
      "accounting_monthly_close_audit_events_action_check",
      sql`${table.action} IN ('monthly-close-open', 'monthly-close-sign', 'monthly-close-lock')`,
    ),
    index("accounting_monthly_close_audit_events_close_created_idx").on(
      table.closeId,
      table.createdAt,
    ),
  ],
);

/**
 * One lease row per intake queue (FR-6).
 *
 * The Cloud Run job claims the row with a compare-and-swap on
 * `lease_token`, so two runs never read the same file. The table carries no job
 * payload; the durable job tables of the main product database are not reused.
 */
export const accountingIntakeLeases = pgTable(
  "accounting_intake_leases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueName: text("queue_name").notNull(),
    leaseToken: text("lease_token").notNull(),
    workerId: text("worker_id").notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true })
      .notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    scopeCompanyId: uuid("scope_company_id").notNull(),
  },
  (table) => [
    check(
      "accounting_intake_leases_queue_name_check",
      sql`char_length(${table.queueName}) between 1 and 128 AND ${table.queueName} ~ '[^[:space:]]'`,
    ),
    check(
      "accounting_intake_leases_expiry_check",
      sql`${table.leaseExpiresAt} > ${table.claimedAt}`,
    ),
    uniqueIndex("accounting_intake_leases_scope_company_queue_idx").on(
      table.scopeCompanyId,
      table.queueName,
    ),
  ],
);
