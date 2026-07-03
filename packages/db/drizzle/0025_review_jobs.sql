-- Adds the durable review-jobs queue for the webhook reliability track
-- (track_id: webhook_review_reliability_20260605). One row per (PR owner,
-- repo, pull number); idempotency on the natural PR key. Workers claim due
-- rows with FOR UPDATE SKIP LOCKED, settle to succeeded / pending-with-
-- backoff / dead. Admin DLQ requeue mutates a `dead` row back to `pending`.

CREATE TYPE "codecamp_review_job_status" AS ENUM ('pending', 'claimed', 'succeeded', 'failed', 'dead');--> statement-breakpoint
CREATE TABLE "review_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_owner" text NOT NULL,
	"pr_repo" text NOT NULL,
	"pr_pull_number" integer NOT NULL,
	"payload_json" jsonb,
	"delivery_id" text,
	"pr_url" text NOT NULL,
	"status" "codecamp_review_job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"claimed_at" timestamp with time zone,
	"claimed_by" text,
	"review_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_jobs_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "codecamp_pr_reviews"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "review_jobs_pr_key_unique" ON "review_jobs" USING btree ("pr_owner","pr_repo","pr_pull_number");--> statement-breakpoint
CREATE INDEX "review_jobs_claim_idx" ON "review_jobs" USING btree ("status","next_attempt_at");