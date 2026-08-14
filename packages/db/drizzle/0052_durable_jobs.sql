CREATE TYPE "public"."durable_job_adoption_mode" AS ENUM('legacy', 'shadow', 'paused', 'generic');--> statement-breakpoint
CREATE TYPE "public"."durable_job_state" AS ENUM('pending', 'running', 'succeeded', 'dead', 'legacy-failed');--> statement-breakpoint
CREATE TYPE "public"."durable_job_tenant_mode" AS ENUM('global', 'tenant');--> statement-breakpoint
CREATE TABLE "durable_job_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_job_id" uuid NOT NULL,
	"tenant_mode" "durable_job_tenant_mode" NOT NULL,
	"tenant_id" text,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"prior_state" "durable_job_state",
	"actor" text NOT NULL,
	"authorization_decision_id" text NOT NULL,
	"authorization_decided_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "durable_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"queue_name" text NOT NULL,
	"tenant_mode" "durable_job_tenant_mode" NOT NULL,
	"tenant_id" text,
	"idempotency_key" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"payload_fingerprint" text NOT NULL,
	"state" "durable_job_state" DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"lease_token_hash" text,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"redeliver_current_attempt" boolean DEFAULT false NOT NULL,
	"rerun_requested" boolean DEFAULT false NOT NULL,
	"rerun_queue_name" text,
	"rerun_payload_json" jsonb,
	"rerun_payload_fingerprint" text,
	"rerun_max_attempts" integer,
	"rerun_available_at" timestamp with time zone,
	"result_json" jsonb,
	"last_error_code" text,
	"last_error_summary" text,
	"completed_at" timestamp with time zone,
	"generation" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "durable_jobs_tenant_scope_check" CHECK ((("tenant_mode" = 'global' AND "tenant_id" IS NULL) OR ("tenant_mode" = 'tenant' AND "tenant_id" IS NOT NULL AND char_length(btrim("tenant_id")) BETWEEN 1 AND 200))),
	CONSTRAINT "durable_jobs_attempt_bounds_check" CHECK (("attempt" >= 0 AND "max_attempts" BETWEEN 1 AND 1000 AND "attempt" <= "max_attempts")),
	CONSTRAINT "durable_jobs_generation_check" CHECK ("generation" >= 1),
	CONSTRAINT "durable_jobs_hash_format_check" CHECK (("payload_fingerprint" ~ '^[0-9a-f]{64}$' AND ("lease_token_hash" IS NULL OR "lease_token_hash" ~ '^[0-9a-f]{64}$') AND ("rerun_payload_fingerprint" IS NULL OR "rerun_payload_fingerprint" ~ '^[0-9a-f]{64}$'))),
	CONSTRAINT "durable_jobs_idempotency_key_check" CHECK (char_length(btrim("idempotency_key")) BETWEEN 1 AND 500),
	CONSTRAINT "durable_jobs_job_name_check" CHECK ("job_name" ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$'),
	CONSTRAINT "durable_jobs_queue_name_check" CHECK ("queue_name" ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'),
	CONSTRAINT "durable_jobs_worker_id_check" CHECK (("lease_owner" IS NULL OR char_length(btrim("lease_owner")) BETWEEN 1 AND 200)),
	CONSTRAINT "durable_jobs_lease_tuple_check" CHECK ((("lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL) OR ("lease_token_hash" IS NOT NULL AND "lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL))),
	CONSTRAINT "durable_jobs_safe_error_tuple_check" CHECK ((("last_error_code" IS NULL AND "last_error_summary" IS NULL) OR ("last_error_code" IS NOT NULL AND "last_error_summary" IS NOT NULL))),
	CONSTRAINT "durable_jobs_safe_error_check" CHECK ((("last_error_code" IS NULL OR "last_error_code" ~ '^[A-Z][A-Z0-9_]+$') AND ("last_error_summary" IS NULL OR char_length("last_error_summary") BETWEEN 1 AND 1000))),
	CONSTRAINT "durable_jobs_rerun_tuple_check" CHECK ((("rerun_queue_name" IS NULL AND "rerun_payload_json" IS NULL AND "rerun_payload_fingerprint" IS NULL AND "rerun_max_attempts" IS NULL AND "rerun_available_at" IS NULL) OR ("rerun_queue_name" IS NOT NULL AND "rerun_payload_json" IS NOT NULL AND "rerun_payload_fingerprint" IS NOT NULL AND "rerun_max_attempts" IS NOT NULL AND "rerun_available_at" IS NOT NULL))),
	CONSTRAINT "durable_jobs_rerun_state_check" CHECK ((("rerun_requested" = false AND "rerun_queue_name" IS NULL AND "rerun_payload_json" IS NULL AND "rerun_payload_fingerprint" IS NULL AND "rerun_max_attempts" IS NULL AND "rerun_available_at" IS NULL) OR ("rerun_requested" = true AND "state" = 'running' AND "rerun_queue_name" IS NOT NULL AND "rerun_payload_json" IS NOT NULL AND "rerun_payload_fingerprint" IS NOT NULL AND "rerun_max_attempts" IS NOT NULL AND "rerun_available_at" IS NOT NULL))),
	CONSTRAINT "durable_jobs_redelivery_state_check" CHECK (("redeliver_current_attempt" = false OR ("state" = 'pending' AND "attempt" >= 1 AND "attempt" <= "max_attempts"))),
	CONSTRAINT "durable_jobs_state_truth_table_check" CHECK ((("state" = 'pending' AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NULL AND "completed_at" IS NULL) OR ("state" = 'running' AND "lease_token_hash" IS NOT NULL AND "lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL AND "result_json" IS NULL AND "completed_at" IS NULL AND "redeliver_current_attempt" = false) OR ("state" = 'succeeded' AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NOT NULL AND "completed_at" IS NOT NULL AND "last_error_code" IS NULL AND "last_error_summary" IS NULL) OR ("state" IN ('dead', 'legacy-failed') AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NULL AND "completed_at" IS NOT NULL AND "last_error_code" IS NOT NULL AND "last_error_summary" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "review_job_adoption_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_mode" "durable_job_adoption_mode" NOT NULL,
	"to_mode" "durable_job_adoption_mode" NOT NULL,
	"prior_generation" integer NOT NULL,
	"new_generation" integer NOT NULL,
	"actor" text NOT NULL,
	"authorization_decision_id" text NOT NULL,
	"authorization_decided_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_job_adoption_generation_check" CHECK ("review_job_adoption_audit_events"."prior_generation" >= 1 AND "review_job_adoption_audit_events"."new_generation" = "review_job_adoption_audit_events"."prior_generation" + 1),
	CONSTRAINT "review_job_adoption_edge_check" CHECK (("review_job_adoption_audit_events"."from_mode"::text || ':' || "review_job_adoption_audit_events"."to_mode"::text) IN ('legacy:shadow', 'shadow:legacy', 'shadow:paused', 'paused:shadow', 'paused:generic', 'generic:paused', 'paused:legacy'))
);
--> statement-breakpoint
CREATE TABLE "review_job_durable_adoption" (
	"control_key" text PRIMARY KEY NOT NULL,
	"mode" "durable_job_adoption_mode" NOT NULL,
	"generation" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
    CONSTRAINT "review_job_durable_adoption_control_key_check" CHECK ("review_job_durable_adoption"."control_key" = 'review_jobs' AND 'singleton' = 'singleton'),
	CONSTRAINT "review_job_durable_adoption_generation_check" CHECK ("review_job_durable_adoption"."generation" >= 1)
);
--> statement-breakpoint
CREATE TABLE "review_job_durable_bindings" (
	"review_job_id" uuid PRIMARY KEY NOT NULL,
	"durable_job_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"correlation_id" text NOT NULL,
	CONSTRAINT "review_job_durable_bindings_durable_job_id_unique" UNIQUE("durable_job_id")
);
--> statement-breakpoint
CREATE TABLE "review_job_migration_issues" (
	"review_job_id" uuid NOT NULL,
	"preflight_run_id" uuid NOT NULL,
	"code" text NOT NULL,
	"field_group" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolution_status" text NOT NULL,
	"resolution_code" text,
	"resolver_subject" text,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "review_job_migration_issues_review_job_code_unique" UNIQUE("review_job_id","code")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "durable_jobs_global_identity_unique" ON "durable_jobs" USING btree ("job_name","idempotency_key") WHERE "durable_jobs"."tenant_mode" = 'global';--> statement-breakpoint
CREATE UNIQUE INDEX "durable_jobs_tenant_identity_unique" ON "durable_jobs" USING btree ("job_name","tenant_id","idempotency_key") WHERE "durable_jobs"."tenant_mode" = 'tenant';--> statement-breakpoint
CREATE INDEX "durable_jobs_global_due_claim_idx" ON "durable_jobs" USING btree ("queue_name","available_at","id") WHERE "durable_jobs"."state" = 'pending' AND "durable_jobs"."tenant_mode" = 'global';--> statement-breakpoint
CREATE INDEX "durable_jobs_tenant_due_claim_idx" ON "durable_jobs" USING btree ("tenant_id","queue_name","available_at","id") WHERE "durable_jobs"."state" = 'pending' AND "durable_jobs"."tenant_mode" = 'tenant';--> statement-breakpoint
CREATE INDEX "durable_jobs_global_reclaim_queue_idx" ON "durable_jobs" USING btree ("queue_name","lease_expires_at","id") WHERE "durable_jobs"."state" = 'running' AND "durable_jobs"."tenant_mode" = 'global';--> statement-breakpoint
CREATE INDEX "durable_jobs_global_reclaim_idx" ON "durable_jobs" USING btree ("lease_expires_at","id") WHERE "durable_jobs"."state" = 'running' AND "durable_jobs"."tenant_mode" = 'global';--> statement-breakpoint
CREATE INDEX "durable_jobs_tenant_reclaim_queue_idx" ON "durable_jobs" USING btree ("tenant_id","queue_name","lease_expires_at","id") WHERE "durable_jobs"."state" = 'running' AND "durable_jobs"."tenant_mode" = 'tenant';--> statement-breakpoint
CREATE INDEX "durable_jobs_tenant_reclaim_idx" ON "durable_jobs" USING btree ("tenant_id","lease_expires_at","id") WHERE "durable_jobs"."state" = 'running' AND "durable_jobs"."tenant_mode" = 'tenant';--> statement-breakpoint
CREATE INDEX "durable_jobs_global_dead_list_idx" ON "durable_jobs" USING btree ("queue_name","updated_at","id") WHERE "durable_jobs"."state" = 'dead' AND "durable_jobs"."tenant_mode" = 'global';--> statement-breakpoint
CREATE INDEX "durable_jobs_tenant_dead_list_idx" ON "durable_jobs" USING btree ("tenant_id","queue_name","updated_at","id") WHERE "durable_jobs"."state" = 'dead' AND "durable_jobs"."tenant_mode" = 'tenant';
--> statement-breakpoint
ALTER TABLE "review_job_durable_bindings"
  ADD CONSTRAINT "review_job_durable_bindings_review_job_id_fk"
  FOREIGN KEY ("review_job_id") REFERENCES "review_jobs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "review_job_durable_bindings"
  ADD CONSTRAINT "review_job_durable_bindings_durable_job_id_fk"
  FOREIGN KEY ("durable_job_id") REFERENCES "durable_jobs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "review_job_migration_issues"
  ADD CONSTRAINT "review_job_migration_issues_review_job_id_fk"
  FOREIGN KEY ("review_job_id") REFERENCES "review_jobs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "durable_job_audit_events"
  ADD CONSTRAINT "durable_job_audit_events_actor_check"
  CHECK ("actor" IS NOT NULL AND char_length(btrim("actor")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "durable_job_audit_events_authorization_decision_check"
  CHECK ("authorization_decision_id" IS NOT NULL AND char_length(btrim("authorization_decision_id")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "durable_job_audit_events_reason_check"
  CHECK ("reason" IS NOT NULL AND char_length("reason") BETWEEN 1 AND 500),
  ADD CONSTRAINT "durable_job_audit_events_correlation_check"
  CHECK ("correlation_id" IS NOT NULL AND char_length(btrim("correlation_id")) BETWEEN 1 AND 200);
ALTER TABLE "review_job_adoption_audit_events"
  ADD CONSTRAINT "review_job_adoption_audit_events_actor_check"
  CHECK ("actor" IS NOT NULL AND char_length(btrim("actor")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "review_job_adoption_audit_events_authorization_decision_check"
  CHECK ("authorization_decision_id" IS NOT NULL AND char_length(btrim("authorization_decision_id")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "review_job_adoption_audit_events_reason_check"
  CHECK ("reason" IS NOT NULL AND char_length("reason") BETWEEN 1 AND 500),
  ADD CONSTRAINT "review_job_adoption_audit_events_correlation_check"
  CHECK ("correlation_id" IS NOT NULL AND char_length(btrim("correlation_id")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "review_job_adoption_audit_events_new_generation_positive_check"
  CHECK ("new_generation" >= 1);
ALTER TABLE "review_job_durable_bindings"
  ADD CONSTRAINT "review_job_durable_bindings_created_by_check"
  CHECK ("created_by" IS NOT NULL AND char_length(btrim("created_by")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "review_job_durable_bindings_correlation_check"
  CHECK ("correlation_id" IS NOT NULL AND char_length(btrim("correlation_id")) BETWEEN 1 AND 200);
ALTER TABLE "review_job_durable_adoption"
  ADD CONSTRAINT "review_job_durable_adoption_updated_by_check"
  CHECK ("updated_by" IS NOT NULL AND char_length(btrim("updated_by")) BETWEEN 1 AND 200);
ALTER TABLE "review_job_migration_issues"
  ADD CONSTRAINT "review_job_migration_issues_code_check"
  CHECK ("code" IS NOT NULL AND char_length(btrim("code")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "review_job_migration_issues_field_group_check"
  CHECK ("field_group" IS NOT NULL AND char_length(btrim("field_group")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "review_job_migration_issues_resolution_code_check"
  CHECK ("resolution_code" IS NULL OR char_length(btrim("resolution_code")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "review_job_migration_issues_resolver_subject_check"
  CHECK ("resolver_subject" IS NULL OR char_length(btrim("resolver_subject")) BETWEEN 1 AND 200);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'durable_job_audit_owner') THEN
    CREATE ROLE durable_job_audit_owner NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'durable_job_queue_runtime') THEN
    CREATE ROLE durable_job_queue_runtime NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" OWNER TO durable_job_audit_owner;
ALTER TABLE "review_job_adoption_audit_events" OWNER TO durable_job_audit_owner;
REVOKE ALL PRIVILEGES ON TABLE "durable_job_audit_events" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "review_job_adoption_audit_events" FROM PUBLIC;
GRANT INSERT, SELECT ON TABLE "durable_job_audit_events" TO durable_job_queue_runtime;
GRANT INSERT, SELECT ON TABLE "review_job_adoption_audit_events" TO durable_job_queue_runtime;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION durable_job_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Durable-job audit tables are append-only';
END;
$$;
--> statement-breakpoint
ALTER FUNCTION durable_job_reject_audit_mutation() OWNER TO durable_job_audit_owner;
REVOKE EXECUTE ON FUNCTION durable_job_reject_audit_mutation() FROM PUBLIC;
CREATE TRIGGER "durable_job_audit_events_reject_update_delete"
BEFORE UPDATE OR DELETE ON "durable_job_audit_events"
FOR EACH ROW EXECUTE FUNCTION durable_job_reject_audit_mutation();
CREATE TRIGGER "durable_job_audit_events_reject_truncate"
BEFORE TRUNCATE ON "durable_job_audit_events"
FOR EACH STATEMENT EXECUTE FUNCTION durable_job_reject_audit_mutation();
CREATE TRIGGER "review_job_adoption_audit_events_reject_update_delete"
BEFORE UPDATE OR DELETE ON "review_job_adoption_audit_events"
FOR EACH ROW EXECUTE FUNCTION durable_job_reject_audit_mutation();
CREATE TRIGGER "review_job_adoption_audit_events_reject_truncate"
BEFORE TRUNCATE ON "review_job_adoption_audit_events"
FOR EACH STATEMENT EXECUTE FUNCTION durable_job_reject_audit_mutation();
