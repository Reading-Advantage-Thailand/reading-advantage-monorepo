CREATE TABLE "activity_tutorial_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "tenant_key" text NOT NULL, "learner_id" text NOT NULL, "session_id" uuid NOT NULL,
	"submission_id" text NOT NULL, "nonce" text NOT NULL, "request_digest" text NOT NULL, "status" text NOT NULL,
	"lease_until" timestamp with time zone, "retry_at" timestamp with time zone, "result_json" jsonb, "error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_tutorial_reports_scope_submission_unique" UNIQUE("tenant_key", "learner_id", "session_id", "submission_id"),
	CONSTRAINT "activity_tutorial_reports_tenant_nonce_unique" UNIQUE("tenant_key", "nonce"),
	CONSTRAINT "activity_tutorial_reports_status_check" CHECK ("activity_tutorial_reports"."status" IN ('processing', 'failed', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "activity_tutorial_reports" ADD CONSTRAINT "activity_tutorial_reports_owner_fk" FOREIGN KEY ("tenant_key", "session_id", "learner_id") REFERENCES "public"."activity_sessions"("tenant_key", "id", "learner_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_tutorial_reports_retry_idx" ON "activity_tutorial_reports" USING btree ("status", "retry_at");
--> statement-breakpoint
CREATE TABLE "activity_tutorial_repository_states" (
	"id" text PRIMARY KEY NOT NULL, "tenant_key" text NOT NULL, "learner_id" text NOT NULL, "session_id" uuid NOT NULL, "repository_id" text NOT NULL,
	"files_json" jsonb NOT NULL, "git_status" text NOT NULL, "captured_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_tutorial_repository_states" ADD CONSTRAINT "activity_tutorial_repository_states_owner_fk" FOREIGN KEY ("tenant_key", "session_id", "learner_id") REFERENCES "public"."activity_sessions"("tenant_key", "id", "learner_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_tutorial_repository_states_owner_idx" ON "activity_tutorial_repository_states" USING btree ("tenant_key", "learner_id", "session_id");
