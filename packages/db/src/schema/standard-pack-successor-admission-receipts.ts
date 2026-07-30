import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
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
    foreignKey({
      name: "standard_pack_successor_admission_receipts_commitment_candidate_registry_fk",
      columns: [table.commitmentDigest, table.candidateDigest],
      foreignColumns: [
        standardPackSuccessorCommitments.commitmentDigest,
        standardPackSuccessorCommitments.candidateDigest,
      ],
    }).onDelete("restrict"),
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
    check(
      "standard_pack_successor_admission_receipts_receipt_contract_check",
      sql`${table.receiptJson} ?& ARRAY['id', 'schemaVersion', 'commitmentDigest', 'candidateDigest', 'actorId', 'policyId', 'idempotencyKeyFingerprint', 'requestInputDigest', 'correlationId', 'outcome', 'safeAudit', 'observability', 'recordedAt']::text[] AND ${table.receiptJson} - ARRAY['id', 'schemaVersion', 'commitmentDigest', 'candidateDigest', 'actorId', 'policyId', 'idempotencyKeyFingerprint', 'requestInputDigest', 'correlationId', 'outcome', 'safeAudit', 'observability', 'recordedAt']::text[] = '{}'::jsonb AND jsonb_typeof(${table.receiptJson} -> 'id') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'schemaVersion') = 'number' AND jsonb_typeof(${table.receiptJson} -> 'commitmentDigest') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'candidateDigest') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'actorId') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'policyId') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'idempotencyKeyFingerprint') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'requestInputDigest') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'correlationId') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'outcome') = 'string' AND jsonb_typeof(${table.receiptJson} -> 'safeAudit') = 'object' AND jsonb_typeof(${table.receiptJson} -> 'observability') = 'object' AND jsonb_typeof(${table.receiptJson} -> 'recordedAt') = 'string' AND ${table.safeAuditJson} ?& ARRAY['eventType', 'outcome', 'actorId', 'policyId', 'correlationId', 'predecessorIndexDigest', 'successorBatchDigest', 'candidateDigest', 'commitmentDigest', 'idempotencyKeyFingerprint', 'requestInputDigest', 'recordedAt']::text[] AND ${table.safeAuditJson} - ARRAY['eventType', 'outcome', 'actorId', 'policyId', 'correlationId', 'predecessorIndexDigest', 'successorBatchDigest', 'candidateDigest', 'commitmentDigest', 'idempotencyKeyFingerprint', 'requestInputDigest', 'recordedAt']::text[] = '{}'::jsonb AND jsonb_typeof(${table.safeAuditJson} -> 'eventType') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'outcome') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'actorId') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'policyId') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'correlationId') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'predecessorIndexDigest') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'successorBatchDigest') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'candidateDigest') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'commitmentDigest') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'idempotencyKeyFingerprint') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'requestInputDigest') = 'string' AND jsonb_typeof(${table.safeAuditJson} -> 'recordedAt') = 'string' AND ${table.observabilityJson} ?& ARRAY['operation', 'outcome', 'actorId', 'policyId', 'correlationId', 'predecessorIndexDigest', 'successorBatchDigest', 'candidateDigest', 'commitmentDigest', 'idempotencyKeyFingerprint', 'requestInputDigest']::text[] AND ${table.observabilityJson} - ARRAY['operation', 'outcome', 'actorId', 'policyId', 'correlationId', 'predecessorIndexDigest', 'successorBatchDigest', 'candidateDigest', 'commitmentDigest', 'idempotencyKeyFingerprint', 'requestInputDigest']::text[] = '{}'::jsonb AND jsonb_typeof(${table.observabilityJson} -> 'operation') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'outcome') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'actorId') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'policyId') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'correlationId') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'predecessorIndexDigest') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'successorBatchDigest') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'candidateDigest') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'commitmentDigest') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'idempotencyKeyFingerprint') = 'string' AND jsonb_typeof(${table.observabilityJson} -> 'requestInputDigest') = 'string' AND (${table.safeAuditJson} ->> 'eventType') IS NOT DISTINCT FROM 'standard-pack.successor-admission' AND (${table.observabilityJson} ->> 'operation') IS NOT DISTINCT FROM 'standard-pack.successor-admission' AND (${table.receiptJson} ->> 'id') IS NOT DISTINCT FROM ${table.id}::text AND (${table.receiptJson} ->> 'schemaVersion') IS NOT DISTINCT FROM ${table.schemaVersion}::text AND (${table.receiptJson} ->> 'commitmentDigest') IS NOT DISTINCT FROM ${table.commitmentDigest} AND (${table.receiptJson} ->> 'candidateDigest') IS NOT DISTINCT FROM ${table.candidateDigest} AND (${table.receiptJson} ->> 'actorId') IS NOT DISTINCT FROM ${table.actorId} AND (${table.receiptJson} ->> 'policyId') IS NOT DISTINCT FROM ${table.policyId} AND (${table.receiptJson} ->> 'idempotencyKeyFingerprint') IS NOT DISTINCT FROM ${table.idempotencyKeyFingerprint} AND (${table.receiptJson} ->> 'requestInputDigest') IS NOT DISTINCT FROM ${table.requestInputDigest} AND (${table.receiptJson} ->> 'correlationId') IS NOT DISTINCT FROM ${table.correlationId}::text AND (${table.receiptJson} ->> 'outcome') IS NOT DISTINCT FROM ${table.outcome} AND (${table.receiptJson} ->> 'recordedAt')::timestamptz IS NOT DISTINCT FROM ${table.recordedAt} AND (${table.receiptJson} -> 'safeAudit') IS NOT DISTINCT FROM ${table.safeAuditJson} AND (${table.receiptJson} -> 'observability') IS NOT DISTINCT FROM ${table.observabilityJson} AND (${table.safeAuditJson} ->> 'outcome') IS NOT DISTINCT FROM ${table.outcome} AND (${table.safeAuditJson} ->> 'actorId') IS NOT DISTINCT FROM ${table.actorId} AND (${table.safeAuditJson} ->> 'policyId') IS NOT DISTINCT FROM ${table.policyId} AND (${table.safeAuditJson} ->> 'correlationId') IS NOT DISTINCT FROM ${table.correlationId}::text AND (${table.safeAuditJson} ->> 'candidateDigest') IS NOT DISTINCT FROM ${table.candidateDigest} AND (${table.safeAuditJson} ->> 'commitmentDigest') IS NOT DISTINCT FROM ${table.commitmentDigest} AND (${table.safeAuditJson} ->> 'idempotencyKeyFingerprint') IS NOT DISTINCT FROM ${table.idempotencyKeyFingerprint} AND (${table.safeAuditJson} ->> 'requestInputDigest') IS NOT DISTINCT FROM ${table.requestInputDigest} AND (${table.observabilityJson} ->> 'outcome') IS NOT DISTINCT FROM ${table.outcome} AND (${table.observabilityJson} ->> 'actorId') IS NOT DISTINCT FROM ${table.actorId} AND (${table.observabilityJson} ->> 'policyId') IS NOT DISTINCT FROM ${table.policyId} AND (${table.observabilityJson} ->> 'correlationId') IS NOT DISTINCT FROM ${table.correlationId}::text AND (${table.observabilityJson} ->> 'candidateDigest') IS NOT DISTINCT FROM ${table.candidateDigest} AND (${table.observabilityJson} ->> 'commitmentDigest') IS NOT DISTINCT FROM ${table.commitmentDigest} AND (${table.observabilityJson} ->> 'idempotencyKeyFingerprint') IS NOT DISTINCT FROM ${table.idempotencyKeyFingerprint} AND (${table.observabilityJson} ->> 'requestInputDigest') IS NOT DISTINCT FROM ${table.requestInputDigest} AND (${table.safeAuditJson} ->> 'predecessorIndexDigest') IS NOT DISTINCT FROM (${table.observabilityJson} ->> 'predecessorIndexDigest') AND (${table.safeAuditJson} ->> 'successorBatchDigest') IS NOT DISTINCT FROM (${table.observabilityJson} ->> 'successorBatchDigest') AND (${table.safeAuditJson} ->> 'predecessorIndexDigest') ~ '^[a-f0-9]{64}$' AND (${table.safeAuditJson} ->> 'successorBatchDigest') ~ '^[a-f0-9]{64}$' AND (${table.observabilityJson} ->> 'predecessorIndexDigest') ~ '^[a-f0-9]{64}$' AND (${table.observabilityJson} ->> 'successorBatchDigest') ~ '^[a-f0-9]{64}$' AND (${table.safeAuditJson} ->> 'recordedAt')::timestamptz IS NOT DISTINCT FROM ${table.recordedAt}`,
    ),
  ],
);
