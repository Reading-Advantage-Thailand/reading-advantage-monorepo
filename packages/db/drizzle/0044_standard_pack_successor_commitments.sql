CREATE TABLE "standard_pack_successor_commitments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schema_version" smallint DEFAULT 1 NOT NULL,
  "predecessor_index_digest" text NOT NULL,
  "predecessor_version" text NOT NULL,
  "predecessor_catalog_digest" text NOT NULL,
  "predecessor_source_receipt_digest" text NOT NULL,
  "successor_batch_id" text NOT NULL,
  "successor_batch_digest" text NOT NULL,
  "successor_version" text NOT NULL,
  "successor_catalog_digest" text NOT NULL,
  "successor_source_receipt_digest" text NOT NULL,
  "candidate_repository_id" text NOT NULL,
  "candidate_revision" text NOT NULL,
  "candidate_tree_digest" text NOT NULL,
  "descriptor_digest" text NOT NULL,
  "source_packet_digest" text NOT NULL,
  "candidate_digest" text NOT NULL,
  "commitment_digest" text NOT NULL,
  "candidate_json" jsonb NOT NULL,
  "commitment_json" jsonb NOT NULL,
  "reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "standard_pack_successor_commitments_predecessor_index_unique" UNIQUE("predecessor_index_digest"),
  CONSTRAINT "standard_pack_successor_commitments_successor_batch_digest_unique" UNIQUE("successor_batch_digest"),
  CONSTRAINT "standard_pack_successor_commitments_commitment_digest_unique" UNIQUE("commitment_digest"),
  CONSTRAINT "standard_pack_successor_commitments_schema_version_check" CHECK ("schema_version" = 1),
  CONSTRAINT "standard_pack_successor_commitments_digest_format_check" CHECK (
    "predecessor_index_digest" ~ '^[a-f0-9]{64}$'
    AND "predecessor_catalog_digest" ~ '^[a-f0-9]{64}$'
    AND "predecessor_source_receipt_digest" ~ '^[a-f0-9]{64}$'
    AND "successor_batch_digest" ~ '^[a-f0-9]{64}$'
    AND "successor_catalog_digest" ~ '^[a-f0-9]{64}$'
    AND "successor_source_receipt_digest" ~ '^[a-f0-9]{64}$'
    AND "candidate_tree_digest" ~ '^[a-f0-9]{64}$'
    AND "descriptor_digest" ~ '^[a-f0-9]{64}$'
    AND "source_packet_digest" ~ '^[a-f0-9]{64}$'
    AND "candidate_digest" ~ '^[a-f0-9]{64}$'
    AND "commitment_digest" ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT "standard_pack_successor_commitments_identity_format_check" CHECK (
    "candidate_repository_id" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'
    AND "successor_batch_id" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'
    AND "predecessor_version" ~ '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}(-[a-z0-9][a-z0-9.-]{0,63})?$'
    AND "successor_version" ~ '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}(-[a-z0-9][a-z0-9.-]{0,63})?$'
  ),
  CONSTRAINT "standard_pack_successor_commitments_candidate_revision_format_check" CHECK (
    "candidate_revision" ~ '^([a-f0-9]{40}|[a-f0-9]{64})$'
  ),
  CONSTRAINT "standard_pack_successor_commitments_json_object_check" CHECK (
    jsonb_typeof("candidate_json") = 'object'
    AND jsonb_typeof("commitment_json") = 'object'
  ),
  CONSTRAINT "standard_pack_successor_commitments_candidate_projection_check" CHECK (
    jsonb_typeof("candidate_json" -> 'gitCandidate') = 'object'
    AND jsonb_typeof("candidate_json" -> 'predecessorRelease') = 'object'
    AND jsonb_typeof("candidate_json" -> 'successorRelease') = 'object'
    AND ("candidate_json" ->> 'schemaVersion') IS NOT DISTINCT FROM "schema_version"::text
    AND ("candidate_json" ->> 'predecessorIndexDigest') IS NOT DISTINCT FROM "predecessor_index_digest"
    AND (("candidate_json" -> 'predecessorRelease') ->> 'version') IS NOT DISTINCT FROM "predecessor_version"
    AND (("candidate_json" -> 'predecessorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM "predecessor_catalog_digest"
    AND (("candidate_json" -> 'predecessorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM "predecessor_source_receipt_digest"
    AND ("candidate_json" ->> 'successorBatchId') IS NOT DISTINCT FROM "successor_batch_id"
    AND ("candidate_json" ->> 'successorBatchDigest') IS NOT DISTINCT FROM "successor_batch_digest"
    AND (("candidate_json" -> 'successorRelease') ->> 'version') IS NOT DISTINCT FROM "successor_version"
    AND (("candidate_json" -> 'successorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM "successor_catalog_digest"
    AND (("candidate_json" -> 'successorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM "successor_source_receipt_digest"
    AND (("candidate_json" -> 'gitCandidate') ->> 'repositoryId') IS NOT DISTINCT FROM "candidate_repository_id"
    AND (("candidate_json" -> 'gitCandidate') ->> 'revision') IS NOT DISTINCT FROM "candidate_revision"
    AND (("candidate_json" -> 'gitCandidate') ->> 'treeDigest') IS NOT DISTINCT FROM "candidate_tree_digest"
    AND ("candidate_json" ->> 'descriptorDigest') IS NOT DISTINCT FROM "descriptor_digest"
    AND ("candidate_json" ->> 'sourcePacketDigest') IS NOT DISTINCT FROM "source_packet_digest"
    AND ("candidate_json" ->> 'candidateDigest') IS NOT DISTINCT FROM "candidate_digest"
    AND ("candidate_json" ->> 'commitmentDigest') IS NOT DISTINCT FROM "commitment_digest"
  ),
  CONSTRAINT "standard_pack_successor_commitments_commitment_projection_check" CHECK (
    jsonb_typeof("commitment_json" -> 'predecessorRelease') = 'object'
    AND jsonb_typeof("commitment_json" -> 'successorRelease') = 'object'
    AND ("commitment_json" ->> 'schemaVersion') IS NOT DISTINCT FROM "schema_version"::text
    AND ("commitment_json" ->> 'predecessorIndexDigest') IS NOT DISTINCT FROM "predecessor_index_digest"
    AND (("commitment_json" -> 'predecessorRelease') ->> 'version') IS NOT DISTINCT FROM "predecessor_version"
    AND (("commitment_json" -> 'predecessorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM "predecessor_catalog_digest"
    AND (("commitment_json" -> 'predecessorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM "predecessor_source_receipt_digest"
    AND ("commitment_json" ->> 'successorBatchId') IS NOT DISTINCT FROM "successor_batch_id"
    AND ("commitment_json" ->> 'successorBatchDigest') IS NOT DISTINCT FROM "successor_batch_digest"
    AND (("commitment_json" -> 'successorRelease') ->> 'version') IS NOT DISTINCT FROM "successor_version"
    AND (("commitment_json" -> 'successorRelease') ->> 'catalogDigest') IS NOT DISTINCT FROM "successor_catalog_digest"
    AND (("commitment_json" -> 'successorRelease') ->> 'sourceReceiptDigest') IS NOT DISTINCT FROM "successor_source_receipt_digest"
    AND ("commitment_json" ->> 'commitmentDigest') IS NOT DISTINCT FROM "commitment_digest"
  ),
  CONSTRAINT "standard_pack_successor_commitments_successor_release_progress_check" CHECK (
    "predecessor_version" <> "successor_version"
    AND "predecessor_catalog_digest" <> "successor_catalog_digest"
    AND "predecessor_source_receipt_digest" <> "successor_source_receipt_digest"
  )
);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.standard_pack_successor_commitments_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'standard_pack_successor_commitments is append-only';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER "standard_pack_successor_commitments_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "standard_pack_successor_commitments"
FOR EACH STATEMENT
EXECUTE FUNCTION public.standard_pack_successor_commitments_reject_mutation();
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.standard_pack_successor_commitments_reject_mutation() FROM PUBLIC;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.standard_pack_successor_commitments FROM app_user;
  END IF;
END $$;
