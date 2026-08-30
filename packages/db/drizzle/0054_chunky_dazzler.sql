CREATE TABLE "accounting_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"payee" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount_minor" text NOT NULL,
	"currency" char(3) NOT NULL,
	"settled_thb_amount_minor" text,
	"evidence_reference" text NOT NULL,
	"scope_company_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by_account_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounting_submissions_kind_check" CHECK ("accounting_submissions"."kind" IN ('expense', 'bill')),
	CONSTRAINT "accounting_submissions_payee_check" CHECK (char_length("accounting_submissions"."payee") between 1 and 256 AND "accounting_submissions"."payee" ~ '[^[:space:]]'),
	CONSTRAINT "accounting_submissions_category_check" CHECK (char_length("accounting_submissions"."category") between 1 and 128 AND "accounting_submissions"."category" ~ '[^[:space:]]'),
	CONSTRAINT "accounting_submissions_description_check" CHECK ("accounting_submissions"."description" IS NULL OR (char_length("accounting_submissions"."description") between 1 and 1024 AND "accounting_submissions"."description" ~ '[^[:space:]]')),
	CONSTRAINT "accounting_submissions_amount_minor_check" CHECK ("accounting_submissions"."amount_minor" ~ '^[0-9]+$'),
	CONSTRAINT "accounting_submissions_currency_check" CHECK ("accounting_submissions"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "accounting_submissions_settled_thb_amount_minor_check" CHECK ("accounting_submissions"."settled_thb_amount_minor" IS NULL OR "accounting_submissions"."settled_thb_amount_minor" ~ '^[1-9][0-9]*$'),
	CONSTRAINT "accounting_submissions_settled_thb_currency_check" CHECK (("accounting_submissions"."currency" = 'THB' AND "accounting_submissions"."settled_thb_amount_minor" IS NULL) OR ("accounting_submissions"."currency" <> 'THB' AND "accounting_submissions"."settled_thb_amount_minor" IS NOT NULL)),
	CONSTRAINT "accounting_submissions_evidence_reference_check" CHECK ("accounting_submissions"."evidence_reference" ~ '^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[A-Za-z0-9._~-]+)+$' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/../%' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/./%' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/..' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/.'),
	CONSTRAINT "accounting_submissions_status_check" CHECK ("accounting_submissions"."status" = 'pending')
);
--> statement-breakpoint
SET ROLE durable_job_audit_owner;--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" DROP CONSTRAINT "durable_job_audit_events_actor_check";--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" DROP CONSTRAINT "durable_job_audit_events_authorization_decision_check";--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" DROP CONSTRAINT "durable_job_audit_events_reason_check";--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" DROP CONSTRAINT "durable_job_audit_events_correlation_check";--> statement-breakpoint
RESET ROLE;--> statement-breakpoint
ALTER TABLE "durable_jobs" DROP CONSTRAINT "durable_jobs_job_name_check";--> statement-breakpoint
ALTER TABLE "durable_jobs" DROP CONSTRAINT "durable_jobs_queue_name_check";--> statement-breakpoint
ALTER TABLE "durable_jobs" DROP CONSTRAINT "durable_jobs_rerun_tuple_check";--> statement-breakpoint
ALTER TABLE "durable_jobs" DROP CONSTRAINT "durable_jobs_redelivery_state_check";--> statement-breakpoint
ALTER TABLE "durable_jobs" DROP CONSTRAINT "durable_jobs_state_truth_table_check";--> statement-breakpoint
SET ROLE durable_job_audit_owner;--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" DROP CONSTRAINT "review_job_adoption_audit_events_actor_check";--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" DROP CONSTRAINT "review_job_adoption_audit_events_authorization_decision_check";--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" DROP CONSTRAINT "review_job_adoption_audit_events_reason_check";--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" DROP CONSTRAINT "review_job_adoption_audit_events_correlation_check";--> statement-breakpoint
RESET ROLE;--> statement-breakpoint
ALTER TABLE "review_job_durable_adoption" DROP CONSTRAINT "review_job_durable_adoption_updated_by_check";--> statement-breakpoint
ALTER TABLE "review_job_durable_bindings" DROP CONSTRAINT "review_job_durable_bindings_created_by_check";--> statement-breakpoint
ALTER TABLE "review_job_durable_bindings" DROP CONSTRAINT "review_job_durable_bindings_correlation_check";--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" DROP CONSTRAINT "review_job_migration_issues_code_check";--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" DROP CONSTRAINT "review_job_migration_issues_field_group_check";--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" DROP CONSTRAINT "review_job_migration_issues_resolution_code_check";--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" DROP CONSTRAINT "review_job_migration_issues_resolver_subject_check";--> statement-breakpoint
CREATE INDEX "accounting_submissions_scope_company_status_idx" ON "accounting_submissions" USING btree ("scope_company_id","status");--> statement-breakpoint
CREATE INDEX "accounting_submissions_submitted_by_idx" ON "accounting_submissions" USING btree ("submitted_by_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_submissions_idempotency_key_idx" ON "accounting_submissions" USING btree ("scope_company_id","submitted_by_account_id","idempotency_key");--> statement-breakpoint
SET ROLE durable_job_audit_owner;--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" ADD CONSTRAINT "durable_job_audit_events_actor_check" CHECK ("durable_job_audit_events"."actor" IS NOT NULL AND char_length("durable_job_audit_events"."actor") BETWEEN 1 AND 200 AND "durable_job_audit_events"."actor" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" ADD CONSTRAINT "durable_job_audit_events_authorization_decision_check" CHECK ("durable_job_audit_events"."authorization_decision_id" IS NOT NULL AND char_length("durable_job_audit_events"."authorization_decision_id") BETWEEN 1 AND 200 AND "durable_job_audit_events"."authorization_decision_id" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" ADD CONSTRAINT "durable_job_audit_events_reason_check" CHECK ("durable_job_audit_events"."reason" IS NOT NULL AND char_length("durable_job_audit_events"."reason") BETWEEN 1 AND 500 AND "durable_job_audit_events"."reason" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "durable_job_audit_events" ADD CONSTRAINT "durable_job_audit_events_correlation_check" CHECK ("durable_job_audit_events"."correlation_id" IS NOT NULL AND char_length("durable_job_audit_events"."correlation_id") BETWEEN 1 AND 200 AND "durable_job_audit_events"."correlation_id" ~ '[^[:space:]]');--> statement-breakpoint
RESET ROLE;--> statement-breakpoint
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_job_name_check" CHECK ((char_length("job_name") BETWEEN 3 AND 160 AND char_length(btrim("job_name")) BETWEEN 3 AND 160 AND "job_name" = btrim("job_name") AND "job_name" ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$'));--> statement-breakpoint
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_queue_name_check" CHECK ((char_length("queue_name") BETWEEN 1 AND 100 AND char_length(btrim("queue_name")) BETWEEN 1 AND 100 AND "queue_name" = btrim("queue_name") AND "queue_name" ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'));--> statement-breakpoint
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_rerun_tuple_check" CHECK ((("rerun_queue_name" IS NULL AND "rerun_payload_json" IS NULL AND "rerun_payload_fingerprint" IS NULL AND "rerun_max_attempts" IS NULL AND "rerun_available_at" IS NULL) OR ("rerun_queue_name" IS NOT NULL AND "rerun_payload_json" IS NOT NULL AND "rerun_payload_fingerprint" IS NOT NULL AND "rerun_max_attempts" BETWEEN 1 AND 1000 AND "rerun_available_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_redelivery_state_check" CHECK ((("redeliver_current_attempt" = true AND "state" = 'pending' AND "attempt" >= 1 AND "attempt" <= "max_attempts") OR ("redeliver_current_attempt" = false AND ("state" <> 'pending' OR "attempt" < "max_attempts"))));--> statement-breakpoint
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_state_truth_table_check" CHECK ((("state" = 'pending' AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NULL AND "completed_at" IS NULL) OR ("state" = 'running' AND "attempt" >= 1 AND "lease_token_hash" IS NOT NULL AND "lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL AND "result_json" IS NULL AND "completed_at" IS NULL AND "redeliver_current_attempt" = false) OR ("state" = 'succeeded' AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NOT NULL AND "completed_at" IS NOT NULL AND "last_error_code" IS NULL AND "last_error_summary" IS NULL) OR ("state" = 'dead' AND "attempt" >= 1 AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NULL AND "completed_at" IS NOT NULL AND "last_error_code" IS NOT NULL AND "last_error_summary" IS NOT NULL) OR ("state" = 'legacy-failed' AND "lease_token_hash" IS NULL AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL AND "result_json" IS NULL AND "completed_at" IS NOT NULL AND "last_error_code" IS NOT NULL AND "last_error_summary" IS NOT NULL)));--> statement-breakpoint
SET ROLE durable_job_audit_owner;--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" ADD CONSTRAINT "review_job_adoption_audit_events_actor_check" CHECK ("review_job_adoption_audit_events"."actor" IS NOT NULL AND char_length("review_job_adoption_audit_events"."actor") BETWEEN 1 AND 200 AND "review_job_adoption_audit_events"."actor" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" ADD CONSTRAINT "review_job_adoption_audit_events_authorization_decision_check" CHECK ("review_job_adoption_audit_events"."authorization_decision_id" IS NOT NULL AND char_length("review_job_adoption_audit_events"."authorization_decision_id") BETWEEN 1 AND 200 AND "review_job_adoption_audit_events"."authorization_decision_id" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" ADD CONSTRAINT "review_job_adoption_audit_events_reason_check" CHECK ("review_job_adoption_audit_events"."reason" IS NOT NULL AND char_length("review_job_adoption_audit_events"."reason") BETWEEN 1 AND 500 AND "review_job_adoption_audit_events"."reason" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_adoption_audit_events" ADD CONSTRAINT "review_job_adoption_audit_events_correlation_check" CHECK ("review_job_adoption_audit_events"."correlation_id" IS NOT NULL AND char_length("review_job_adoption_audit_events"."correlation_id") BETWEEN 1 AND 200 AND "review_job_adoption_audit_events"."correlation_id" ~ '[^[:space:]]');--> statement-breakpoint
RESET ROLE;--> statement-breakpoint
ALTER TABLE "review_job_durable_adoption" ADD CONSTRAINT "review_job_durable_adoption_updated_by_check" CHECK ("review_job_durable_adoption"."updated_by" IS NOT NULL AND char_length("review_job_durable_adoption"."updated_by") BETWEEN 1 AND 200 AND "review_job_durable_adoption"."updated_by" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_durable_bindings" ADD CONSTRAINT "review_job_durable_bindings_created_by_check" CHECK ("review_job_durable_bindings"."created_by" IS NOT NULL AND char_length("review_job_durable_bindings"."created_by") BETWEEN 1 AND 200 AND "review_job_durable_bindings"."created_by" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_durable_bindings" ADD CONSTRAINT "review_job_durable_bindings_correlation_check" CHECK ("review_job_durable_bindings"."correlation_id" IS NOT NULL AND char_length("review_job_durable_bindings"."correlation_id") BETWEEN 1 AND 200 AND "review_job_durable_bindings"."correlation_id" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" ADD CONSTRAINT "review_job_migration_issues_code_check" CHECK ("review_job_migration_issues"."code" IS NOT NULL AND char_length("review_job_migration_issues"."code") BETWEEN 1 AND 200 AND "review_job_migration_issues"."code" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" ADD CONSTRAINT "review_job_migration_issues_field_group_check" CHECK ("review_job_migration_issues"."field_group" IS NOT NULL AND char_length("review_job_migration_issues"."field_group") BETWEEN 1 AND 200 AND "review_job_migration_issues"."field_group" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" ADD CONSTRAINT "review_job_migration_issues_resolution_code_check" CHECK ("review_job_migration_issues"."resolution_code" IS NULL OR (char_length("review_job_migration_issues"."resolution_code") BETWEEN 1 AND 200 AND "review_job_migration_issues"."resolution_code" ~ '[^[:space:]]'));--> statement-breakpoint
ALTER TABLE "review_job_migration_issues" ADD CONSTRAINT "review_job_migration_issues_resolver_subject_check" CHECK ("review_job_migration_issues"."resolver_subject" IS NULL OR (char_length("review_job_migration_issues"."resolver_subject") BETWEEN 1 AND 200 AND "review_job_migration_issues"."resolver_subject" ~ '[^[:space:]]'));
