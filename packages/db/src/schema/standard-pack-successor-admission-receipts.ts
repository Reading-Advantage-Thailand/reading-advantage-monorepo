import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { standardPackSuccessorCommitments } from "./standard-pack-successor-commitments.js";

/**
 * Global append-only audit receipts for successful standard-pack successor
 * reservation attempts; they record evidence infrastructure activity only.
 */
export const standardPackSuccessorAdmissionReceipts = pgTable(
  "standard_pack_successor_admission_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schemaVersion: smallint("schema_version").notNull().default(1),
    commitmentDigest: text("commitment_digest")
      .notNull()
      .references(() => standardPackSuccessorCommitments.commitmentDigest, {
        onDelete: "restrict",
      }),
    candidateDigest: text("candidate_digest").notNull(),
    actorId: text("actor_id").notNull(),
    policyId: text("policy_id").notNull(),
    idempotencyKeyFingerprint: text("idempotency_key_fingerprint").notNull(),
    requestInputDigest: text("request_input_digest").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    outcome: text("outcome").notNull(),
    safeAuditJson: jsonb("safe_audit_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    observabilityJson: jsonb("observability_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    receiptJson: jsonb("receipt_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("standard_pack_successor_admission_receipts_actor_idempotency_unique").on(
      table.actorId,
      table.policyId,
      table.idempotencyKeyFingerprint,
    ),
    check(
      "standard_pack_successor_admission_receipts_schema_version_check",
      sql`${table.schemaVersion} = 1`,
    ),
    check(
      "standard_pack_successor_admission_receipts_digest_format_check",
      sql`${table.commitmentDigest} ~ '^[a-f0-9]{64}$' AND ${table.candidateDigest} ~ '^[a-f0-9]{64}$' AND ${table.idempotencyKeyFingerprint} ~ '^[a-f0-9]{64}$' AND ${table.requestInputDigest} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "standard_pack_successor_admission_receipts_identity_format_check",
      sql`${table.actorId} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$' AND char_length(${table.actorId}) <= 160 AND ${table.policyId} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$' AND char_length(${table.policyId}) <= 160`,
    ),
    check(
      "standard_pack_successor_admission_receipts_outcome_check",
      sql`${table.outcome} IN ('reserved', 'replayed')`,
    ),
    check(
      "standard_pack_successor_admission_receipts_json_object_check",
      sql`jsonb_typeof(${table.safeAuditJson}) = 'object' AND jsonb_typeof(${table.observabilityJson}) = 'object' AND jsonb_typeof(${table.receiptJson}) = 'object' AND octet_length(${table.safeAuditJson}::text) <= 16384 AND octet_length(${table.observabilityJson}::text) <= 16384 AND octet_length(${table.receiptJson}::text) <= 32768`,
    ),
    check(
      "standard_pack_successor_admission_receipts_receipt_projection_check",
      sql`jsonb_typeof(${table.receiptJson} -> 'safeAudit') = 'object' AND jsonb_typeof(${table.receiptJson} -> 'observability') = 'object' AND (${table.receiptJson} ->> 'id') IS NOT DISTINCT FROM ${table.id}::text AND (${table.receiptJson} ->> 'schemaVersion') IS NOT DISTINCT FROM ${table.schemaVersion}::text AND (${table.receiptJson} ->> 'commitmentDigest') IS NOT DISTINCT FROM ${table.commitmentDigest} AND (${table.receiptJson} ->> 'candidateDigest') IS NOT DISTINCT FROM ${table.candidateDigest} AND (${table.receiptJson} ->> 'actorId') IS NOT DISTINCT FROM ${table.actorId} AND (${table.receiptJson} ->> 'policyId') IS NOT DISTINCT FROM ${table.policyId} AND (${table.receiptJson} ->> 'idempotencyKeyFingerprint') IS NOT DISTINCT FROM ${table.idempotencyKeyFingerprint} AND (${table.receiptJson} ->> 'requestInputDigest') IS NOT DISTINCT FROM ${table.requestInputDigest} AND (${table.receiptJson} ->> 'correlationId') IS NOT DISTINCT FROM ${table.correlationId}::text AND (${table.receiptJson} ->> 'outcome') IS NOT DISTINCT FROM ${table.outcome} AND (${table.receiptJson} ->> 'recordedAt')::timestamptz IS NOT DISTINCT FROM ${table.recordedAt} AND (${table.receiptJson} -> 'safeAudit') IS NOT DISTINCT FROM ${table.safeAuditJson} AND (${table.receiptJson} -> 'observability') IS NOT DISTINCT FROM ${table.observabilityJson}`,
    ),
  ],
);
