CREATE TABLE "standard_pack_successor_admission_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_version" smallint DEFAULT 1 NOT NULL,
	"commitment_digest" text NOT NULL,
	"candidate_digest" text NOT NULL,
	"actor_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"idempotency_key_fingerprint" text NOT NULL,
	"request_input_digest" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"safe_audit_json" jsonb NOT NULL,
	"observability_json" jsonb NOT NULL,
	"receipt_json" jsonb NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "standard_pack_successor_admission_receipts_actor_idempotency_unique" UNIQUE("actor_id","policy_id","idempotency_key_fingerprint"),
	CONSTRAINT "standard_pack_successor_admission_receipts_schema_version_check" CHECK ("standard_pack_successor_admission_receipts"."schema_version" = 1),
	CONSTRAINT "standard_pack_successor_admission_receipts_digest_format_check" CHECK ("standard_pack_successor_admission_receipts"."commitment_digest" ~ '^[a-f0-9]{64}$' AND "standard_pack_successor_admission_receipts"."candidate_digest" ~ '^[a-f0-9]{64}$' AND "standard_pack_successor_admission_receipts"."idempotency_key_fingerprint" ~ '^[a-f0-9]{64}$' AND "standard_pack_successor_admission_receipts"."request_input_digest" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "standard_pack_successor_admission_receipts_identity_format_check" CHECK ("standard_pack_successor_admission_receipts"."actor_id" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$' AND char_length("standard_pack_successor_admission_receipts"."actor_id") <= 160 AND "standard_pack_successor_admission_receipts"."policy_id" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$' AND char_length("standard_pack_successor_admission_receipts"."policy_id") <= 160),
	CONSTRAINT "standard_pack_successor_admission_receipts_outcome_check" CHECK ("standard_pack_successor_admission_receipts"."outcome" IN ('reserved', 'replayed')),
	CONSTRAINT "standard_pack_successor_admission_receipts_json_object_check" CHECK (jsonb_typeof("standard_pack_successor_admission_receipts"."safe_audit_json") = 'object' AND jsonb_typeof("standard_pack_successor_admission_receipts"."observability_json") = 'object' AND jsonb_typeof("standard_pack_successor_admission_receipts"."receipt_json") = 'object' AND octet_length("standard_pack_successor_admission_receipts"."safe_audit_json"::text) <= 16384 AND octet_length("standard_pack_successor_admission_receipts"."observability_json"::text) <= 16384 AND octet_length("standard_pack_successor_admission_receipts"."receipt_json"::text) <= 32768),
	CONSTRAINT "standard_pack_successor_admission_receipts_receipt_projection_check" CHECK (jsonb_typeof("standard_pack_successor_admission_receipts"."receipt_json" -> 'safeAudit') = 'object' AND jsonb_typeof("standard_pack_successor_admission_receipts"."receipt_json" -> 'observability') = 'object' AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'id') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."id"::text AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'schemaVersion') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."schema_version"::text AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'commitmentDigest') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."commitment_digest" AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'candidateDigest') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."candidate_digest" AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'actorId') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."actor_id" AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'policyId') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."policy_id" AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'idempotencyKeyFingerprint') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."idempotency_key_fingerprint" AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'requestInputDigest') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."request_input_digest" AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'correlationId') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."correlation_id"::text AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'outcome') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."outcome" AND ("standard_pack_successor_admission_receipts"."receipt_json" ->> 'recordedAt')::timestamptz IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."recorded_at" AND ("standard_pack_successor_admission_receipts"."receipt_json" -> 'safeAudit') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."safe_audit_json" AND ("standard_pack_successor_admission_receipts"."receipt_json" -> 'observability') IS NOT DISTINCT FROM "standard_pack_successor_admission_receipts"."observability_json")
);
--> statement-breakpoint
ALTER TABLE "standard_pack_successor_admission_receipts" ADD CONSTRAINT "standard_pack_successor_admission_receipts_commitment_digest_standard_pack_successor_commitments_commitment_digest_fk" FOREIGN KEY ("commitment_digest") REFERENCES "public"."standard_pack_successor_commitments"("commitment_digest") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.standard_pack_successor_admission_receipts_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'standard_pack_successor_admission_receipts is append-only';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER "standard_pack_successor_admission_receipts_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "standard_pack_successor_admission_receipts"
FOR EACH STATEMENT
EXECUTE FUNCTION public.standard_pack_successor_admission_receipts_reject_mutation();
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.standard_pack_successor_admission_receipts_reject_mutation() FROM PUBLIC;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.standard_pack_successor_admission_receipts FROM app_user;
  END IF;
END $$;
