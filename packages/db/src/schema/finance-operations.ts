import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Immutable, company-first operational financial record snapshots.
 *
 * The optional school scope is deliberately nullable: a company-level record
 * and a school-level record use different partial unique identities, while all
 * source and record identities remain bounded by their owning company.
 */
export const financeRecords = pgTable(
  "finance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: text("company_id").notNull(),
    schoolId: text("school_id"),
    recordId: text("record_id").notNull(),
    amountMinor: text("amount_minor").notNull(),
    currency: text("currency").notNull(),
    sourceSystem: text("source_system").notNull(),
    sourceVersion: text("source_version").notNull(),
    sourceRecordId: text("source_record_id").notNull(),
    importBatchId: text("import_batch_id").notNull(),
    payloadDigest: text("payload_digest").notNull(),
    evidenceReference: text("evidence_reference").notNull(),
    supersedesRecordId: text("supersedes_record_id"),
    correctionReason: text("correction_reason"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("finance_records_company_record_company_scope_unique")
      .on(table.companyId, table.recordId)
      .where(sql`${table.schoolId} IS NULL`),
    uniqueIndex("finance_records_company_record_school_scope_unique")
      .on(table.companyId, table.schoolId, table.recordId)
      .where(sql`${table.schoolId} IS NOT NULL`),
    uniqueIndex("finance_records_company_source_company_scope_unique")
      .on(
        table.companyId,
        table.sourceSystem,
        table.sourceVersion,
        table.sourceRecordId,
      )
      .where(sql`${table.schoolId} IS NULL`),
    uniqueIndex("finance_records_company_source_school_scope_unique")
      .on(
        table.companyId,
        table.schoolId,
        table.sourceSystem,
        table.sourceVersion,
        table.sourceRecordId,
      )
      .where(sql`${table.schoolId} IS NOT NULL`),
    check(
      "finance_records_company_id_check",
      sql`${table.companyId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_records_record_id_check",
      sql`${table.recordId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_records_school_id_check",
      sql`${table.schoolId} IS NULL OR ${table.schoolId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_records_source_system_check",
      sql`${table.sourceSystem} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_records_source_version_check",
      sql`${table.sourceVersion} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_records_source_record_id_check",
      sql`${table.sourceRecordId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_records_import_batch_id_check",
      sql`${table.importBatchId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_records_amount_minor_check",
      sql`${table.amountMinor} ~ '^(0|[1-9][0-9]*|-[1-9][0-9]*)$'`,
    ),
    check(
      "finance_records_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "finance_records_payload_digest_check",
      sql`${table.payloadDigest} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "finance_records_evidence_reference_check",
      sql`${table.evidenceReference} ~ '^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[A-Za-z0-9._~-]+)+$' AND ${table.evidenceReference} NOT LIKE '%/../%' AND ${table.evidenceReference} NOT LIKE '%/./%' AND ${table.evidenceReference} NOT LIKE '%/..' AND ${table.evidenceReference} NOT LIKE '%/.'`,
    ),
    check(
      "finance_records_correction_pair_check",
      sql`(${table.supersedesRecordId} IS NULL) = (${table.correctionReason} IS NULL)`,
    ),
    check(
      "finance_records_correction_distinct_check",
      sql`${table.supersedesRecordId} IS NULL OR ${table.supersedesRecordId} <> ${table.recordId}`,
    ),
    check(
      "finance_records_correction_reason_check",
      sql`${table.correctionReason} IS NULL OR ${table.correctionReason} ~ '[^[:space:]]'`,
    ),
  ],
);

/** Immutable local success-audit event awaiting projection to the external audit port. */
export const financeRecordSuccessAuditOutbox = pgTable(
  "finance_record_success_audit_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    companyId: text("company_id").notNull(),
    schoolId: text("school_id"),
    actorSubjectId: text("actor_subject_id").notNull(),
    operation: text("operation").notNull(),
    objectId: text("object_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    requestId: text("request_id").notNull(),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("finance_record_success_audit_outbox_event_unique").on(
      table.eventId,
    ),
    check(
      "finance_record_success_audit_outbox_event_id_check",
      sql`${table.eventId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_record_success_audit_outbox_company_id_check",
      sql`${table.companyId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_record_success_audit_outbox_school_id_check",
      sql`${table.schoolId} IS NULL OR ${table.schoolId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_record_success_audit_outbox_actor_subject_id_check",
      sql`${table.actorSubjectId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_record_success_audit_outbox_operation_check",
      sql`${table.operation} IN ('financial-record:import', 'financial-record:append-correction')`,
    ),
    check(
      "finance_record_success_audit_outbox_object_id_check",
      sql`${table.objectId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_record_success_audit_outbox_request_id_check",
      sql`${table.requestId} ~ '[^[:space:]]'`,
    ),
    check(
      "finance_record_success_audit_outbox_correlation_id_check",
      sql`${table.correlationId} ~ '[^[:space:]]'`,
    ),
  ],
);
