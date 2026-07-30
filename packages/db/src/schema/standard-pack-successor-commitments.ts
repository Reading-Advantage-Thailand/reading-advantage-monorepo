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

/**
 * Global append-only reservations that bind one predecessor index to one
 * hash-bound standard-pack successor candidate.
 */
export const standardPackSuccessorCommitments = pgTable(
  "standard_pack_successor_commitments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schemaVersion: smallint("schema_version").notNull().default(1),
    predecessorIndexDigest: text("predecessor_index_digest").notNull(),
    predecessorVersion: text("predecessor_version").notNull(),
    predecessorCatalogDigest: text("predecessor_catalog_digest").notNull(),
    predecessorSourceReceiptDigest: text(
      "predecessor_source_receipt_digest",
    ).notNull(),
    successorBatchId: text("successor_batch_id").notNull(),
    successorBatchDigest: text("successor_batch_digest").notNull(),
    successorVersion: text("successor_version").notNull(),
    successorCatalogDigest: text("successor_catalog_digest").notNull(),
    successorSourceReceiptDigest: text(
      "successor_source_receipt_digest",
    ).notNull(),
    candidateRepositoryId: text("candidate_repository_id").notNull(),
    candidateRevision: text("candidate_revision").notNull(),
    candidateTreeDigest: text("candidate_tree_digest").notNull(),
    descriptorDigest: text("descriptor_digest").notNull(),
    sourcePacketDigest: text("source_packet_digest").notNull(),
    candidateDigest: text("candidate_digest").notNull(),
    commitmentDigest: text("commitment_digest").notNull(),
    candidateJson: jsonb("candidate_json").$type<Record<string, unknown>>().notNull(),
    commitmentJson: jsonb("commitment_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    reservedAt: timestamp("reserved_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("standard_pack_successor_commitments_predecessor_index_unique").on(
      table.predecessorIndexDigest,
    ),
    unique("standard_pack_successor_commitments_successor_batch_digest_unique").on(
      table.successorBatchDigest,
    ),
    unique("standard_pack_successor_commitments_commitment_digest_unique").on(
      table.commitmentDigest,
    ),
    unique("standard_pack_successor_commitments_commitment_candidate_unique").on(
      table.commitmentDigest,
      table.candidateDigest,
    ),
    check(
      "standard_pack_successor_commitments_schema_version_check",
      sql`${table.schemaVersion} = 1`,
    ),
    check(
      "standard_pack_successor_commitments_digest_format_check",
      sql`${table.predecessorIndexDigest} ~ '^[a-f0-9]{64}$' AND ${table.predecessorCatalogDigest} ~ '^[a-f0-9]{64}$' AND ${table.predecessorSourceReceiptDigest} ~ '^[a-f0-9]{64}$' AND ${table.successorBatchDigest} ~ '^[a-f0-9]{64}$' AND ${table.successorCatalogDigest} ~ '^[a-f0-9]{64}$' AND ${table.successorSourceReceiptDigest} ~ '^[a-f0-9]{64}$' AND ${table.candidateTreeDigest} ~ '^[a-f0-9]{64}$' AND ${table.descriptorDigest} ~ '^[a-f0-9]{64}$' AND ${table.sourcePacketDigest} ~ '^[a-f0-9]{64}$' AND ${table.candidateDigest} ~ '^[a-f0-9]{64}$' AND ${table.commitmentDigest} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "standard_pack_successor_commitments_identity_format_check",
      sql`${table.candidateRepositoryId} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$' AND ${table.successorBatchId} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$' AND ${table.predecessorVersion} ~ '^[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}(-[a-z0-9][a-z0-9.-]{0,63})?$' AND ${table.successorVersion} ~ '^[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}(-[a-z0-9][a-z0-9.-]{0,63})?$'`,
    ),
    check(
      "standard_pack_successor_commitments_candidate_revision_format_check",
      sql`${table.candidateRevision} ~ '^([a-f0-9]{40}|[a-f0-9]{64})$'`,
    ),
    check(
      "standard_pack_successor_commitments_json_object_check",
      sql`jsonb_typeof(${table.candidateJson}) = 'object' AND jsonb_typeof(${table.commitmentJson}) = 'object'`,
    ),
    check(
      "standard_pack_successor_commitments_candidate_projection_check",
      sql`jsonb_typeof(${table.candidateJson} -> 'gitCandidate') = 'object' AND jsonb_typeof(${table.candidateJson} -> 'predecessorRelease') = 'object' AND jsonb_typeof(${table.candidateJson} -> 'successorRelease') = 'object' AND (${table.candidateJson} ->> 'schemaVersion') IS NOT DISTINCT FROM ${table.schemaVersion}::text AND (${table.candidateJson} ->> 'predecessorIndexDigest') IS NOT DISTINCT FROM ${table.predecessorIndexDigest} AND ((${table.candidateJson} -> 'predecessorRelease') ->> 'version') IS NOT DISTINCT FROM ${table.predecessorVersion} AND ((${table.candidateJson} -> 'predecessorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM ${table.predecessorCatalogDigest} AND ((${table.candidateJson} -> 'predecessorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM ${table.predecessorSourceReceiptDigest} AND (${table.candidateJson} ->> 'successorBatchId') IS NOT DISTINCT FROM ${table.successorBatchId} AND (${table.candidateJson} ->> 'successorBatchDigest') IS NOT DISTINCT FROM ${table.successorBatchDigest} AND ((${table.candidateJson} -> 'successorRelease') ->> 'version') IS NOT DISTINCT FROM ${table.successorVersion} AND ((${table.candidateJson} -> 'successorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM ${table.successorCatalogDigest} AND ((${table.candidateJson} -> 'successorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM ${table.successorSourceReceiptDigest} AND ((${table.candidateJson} -> 'gitCandidate') ->> 'repositoryId') IS NOT DISTINCT FROM ${table.candidateRepositoryId} AND ((${table.candidateJson} -> 'gitCandidate') ->> 'revision') IS NOT DISTINCT FROM ${table.candidateRevision} AND ((${table.candidateJson} -> 'gitCandidate') ->> 'treeDigest') IS NOT DISTINCT FROM ${table.candidateTreeDigest} AND (${table.candidateJson} ->> 'descriptorDigest') IS NOT DISTINCT FROM ${table.descriptorDigest} AND (${table.candidateJson} ->> 'sourcePacketDigest') IS NOT DISTINCT FROM ${table.sourcePacketDigest} AND (${table.candidateJson} ->> 'candidateDigest') IS NOT DISTINCT FROM ${table.candidateDigest} AND (${table.candidateJson} ->> 'commitmentDigest') IS NOT DISTINCT FROM ${table.commitmentDigest}`,
    ),
    check(
      "standard_pack_successor_commitments_commitment_projection_check",
      sql`jsonb_typeof(${table.commitmentJson} -> 'predecessorRelease') = 'object' AND jsonb_typeof(${table.commitmentJson} -> 'successorRelease') = 'object' AND (${table.commitmentJson} ->> 'schemaVersion') IS NOT DISTINCT FROM ${table.schemaVersion}::text AND (${table.commitmentJson} ->> 'predecessorIndexDigest') IS NOT DISTINCT FROM ${table.predecessorIndexDigest} AND ((${table.commitmentJson} -> 'predecessorRelease') ->> 'version') IS NOT DISTINCT FROM ${table.predecessorVersion} AND ((${table.commitmentJson} -> 'predecessorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM ${table.predecessorCatalogDigest} AND ((${table.commitmentJson} -> 'predecessorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM ${table.predecessorSourceReceiptDigest} AND (${table.commitmentJson} ->> 'successorBatchId') IS NOT DISTINCT FROM ${table.successorBatchId} AND (${table.commitmentJson} ->> 'successorBatchDigest') IS NOT DISTINCT FROM ${table.successorBatchDigest} AND ((${table.commitmentJson} -> 'successorRelease') ->> 'version') IS NOT DISTINCT FROM ${table.successorVersion} AND ((${table.commitmentJson} -> 'successorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM ${table.successorCatalogDigest} AND ((${table.commitmentJson} -> 'successorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM ${table.successorSourceReceiptDigest} AND (${table.commitmentJson} ->> 'commitmentDigest') IS NOT DISTINCT FROM ${table.commitmentDigest}`,
    ),
    check(
      "standard_pack_successor_commitments_successor_release_progress_check",
      sql`${table.predecessorVersion} <> ${table.successorVersion} AND ${table.predecessorCatalogDigest} <> ${table.successorCatalogDigest} AND ${table.predecessorSourceReceiptDigest} <> ${table.successorSourceReceiptDigest}`,
    ),
  ],
);
