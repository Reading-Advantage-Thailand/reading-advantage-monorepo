CREATE TABLE "accounting_submission_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_account_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounting_submission_audit_events_action_check" CHECK ("accounting_submission_audit_events"."action" IN ('submit', 'approve', 'reject')),
	CONSTRAINT "accounting_submission_audit_events_reason_check" CHECK ("accounting_submission_audit_events"."reason" IS NULL OR "accounting_submission_audit_events"."reason" ~ '[^[:space:]]')
);
--> statement-breakpoint
ALTER TABLE "accounting_submissions" DROP CONSTRAINT "accounting_submissions_status_check";--> statement-breakpoint
CREATE INDEX "accounting_submission_audit_events_submission_idx" ON "accounting_submission_audit_events" USING btree ("submission_id","created_at");--> statement-breakpoint
ALTER TABLE "accounting_submissions" ADD CONSTRAINT "accounting_submissions_status_check" CHECK ("accounting_submissions"."status" IN ('pending', 'approved', 'rejected'));
--> statement-breakpoint

-- Append-only enforcement: REVOKE UPDATE, DELETE.
-- In local dev (postgres superuser), this is a no-op but documents intent.
-- In production, replace <app_role> with the actual application database role.
-- The superuser can still DELETE for test cleanup; the app role cannot.
-- ADR: append-only audit log; see AGENTS.md §9.5
DO $$
BEGIN
  -- Only revoke if a non-superuser app role exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON accounting_submission_audit_events FROM app_user';
  END IF;
END $$;
--> statement-breakpoint
