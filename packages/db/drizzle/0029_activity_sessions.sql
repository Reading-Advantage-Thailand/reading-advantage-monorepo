INSERT INTO "schools" ("id", "name", "country") VALUES ('c0deca00-0000-4000-8000-000000000001', 'Codecamp Platform', 'Thailand') ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "mastery_principals" (
	"school_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"source_tenant_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_principals_school_student_unique" UNIQUE("school_id", "student_id")
);
--> statement-breakpoint
ALTER TABLE "mastery_principals" ADD CONSTRAINT "mastery_principals_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "mastery_principals_source_tenant_idx" ON "mastery_principals" USING btree ("source_tenant_key");
--> statement-breakpoint
INSERT INTO "mastery_principals" ("school_id", "student_id", "source_tenant_key") SELECT "school_id", "id", "school_id"::text FROM "users" WHERE "school_id" IS NOT NULL ON CONFLICT ("school_id", "student_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "mastery_cards" DROP CONSTRAINT IF EXISTS "mastery_cards_school_student_fk";
ALTER TABLE "mastery_cards" ADD CONSTRAINT "mastery_cards_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."mastery_principals"("school_id", "student_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mastery_reviews" DROP CONSTRAINT IF EXISTS "mastery_reviews_school_student_fk";
ALTER TABLE "mastery_reviews" ADD CONSTRAINT "mastery_reviews_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."mastery_principals"("school_id", "student_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mastery_evidence" DROP CONSTRAINT IF EXISTS "mastery_evidence_school_student_fk";
ALTER TABLE "mastery_evidence" ADD CONSTRAINT "mastery_evidence_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."mastery_principals"("school_id", "student_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mastery_states" DROP CONSTRAINT IF EXISTS "mastery_states_school_student_fk";
ALTER TABLE "mastery_states" ADD CONSTRAINT "mastery_states_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."mastery_principals"("school_id", "student_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mastery_placements" DROP CONSTRAINT IF EXISTS "mastery_placements_school_student_fk";
ALTER TABLE "mastery_placements" ADD CONSTRAINT "mastery_placements_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."mastery_principals"("school_id", "student_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mastery_commits" DROP CONSTRAINT IF EXISTS "mastery_commits_school_student_fk";
ALTER TABLE "mastery_commits" ADD CONSTRAINT "mastery_commits_school_student_fk" FOREIGN KEY ("school_id", "student_id") REFERENCES "public"."mastery_principals"("school_id", "student_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "activity_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid,
	"tenant_key" text NOT NULL,
	"learner_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"activity_version" text NOT NULL,
	"state_json" jsonb NOT NULL,
	"processed_batch_ids_json" jsonb NOT NULL,
	"device_high_watermarks_json" jsonb NOT NULL,
	"last_event_sequence" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"retain_until" timestamp with time zone NOT NULL,
	CONSTRAINT "activity_sessions_tenant_id_learner_unique" UNIQUE("tenant_key", "id", "learner_id"),
	CONSTRAINT "activity_sessions_sequence_check" CHECK ("activity_sessions"."last_event_sequence" >= 0),
	CONSTRAINT "activity_sessions_tenant_check" CHECK (("activity_sessions"."school_id" IS NOT NULL AND "activity_sessions"."tenant_key" = "activity_sessions"."school_id"::text) OR ("activity_sessions"."school_id" IS NULL AND length("activity_sessions"."tenant_key") > 0))
);
--> statement-breakpoint
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_learner_id_users_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_sessions_tenant_learner_updated_idx" ON "activity_sessions" USING btree ("tenant_key", "learner_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "activity_sessions_retention_idx" ON "activity_sessions" USING btree ("retain_until");
--> statement-breakpoint
CREATE TABLE "activity_session_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_key" text NOT NULL,
	"learner_id" text NOT NULL,
	"event_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"device_id" text NOT NULL,
	"client_sequence" integer NOT NULL,
	"server_sequence" integer NOT NULL,
	"event_kind" text NOT NULL,
	"is_assessed" boolean DEFAULT false NOT NULL,
	"submission_id" text,
	"submission_json" jsonb,
	"mastery_projection_status" text,
	"mastery_projection_attempts" integer DEFAULT 0 NOT NULL,
	"mastery_projection_error" text,
	"mastery_commit_id" uuid,
	"mastery_projected_at" timestamp with time zone,
	"event_json" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_session_events_session_event_unique" UNIQUE("session_id", "event_id"),
	CONSTRAINT "activity_session_events_session_server_sequence_unique" UNIQUE("session_id", "server_sequence"),
	CONSTRAINT "activity_session_events_session_device_client_unique" UNIQUE("session_id", "device_id", "client_sequence"),
	CONSTRAINT "activity_session_events_session_submission_unique" UNIQUE("session_id", "submission_id"),
	CONSTRAINT "activity_session_events_client_sequence_check" CHECK ("activity_session_events"."client_sequence" > 0),
	CONSTRAINT "activity_session_events_server_sequence_check" CHECK ("activity_session_events"."server_sequence" > 0),
	CONSTRAINT "activity_session_events_assessment_check" CHECK (("activity_session_events"."is_assessed" = false AND "activity_session_events"."submission_id" IS NULL AND "activity_session_events"."submission_json" IS NULL) OR ("activity_session_events"."is_assessed" = true AND "activity_session_events"."submission_id" IS NOT NULL AND "activity_session_events"."submission_json" IS NOT NULL)),
	CONSTRAINT "activity_session_events_projection_check" CHECK (("activity_session_events"."is_assessed" = false AND "activity_session_events"."mastery_projection_status" IS NULL) OR ("activity_session_events"."is_assessed" = true AND "activity_session_events"."mastery_projection_status" IN ('pending', 'projected', 'failed')))
);
--> statement-breakpoint
ALTER TABLE "activity_session_events" ADD CONSTRAINT "activity_session_events_owner_fk" FOREIGN KEY ("tenant_key", "session_id", "learner_id") REFERENCES "public"."activity_sessions"("tenant_key", "id", "learner_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_session_events_tenant_learner_occurred_idx" ON "activity_session_events" USING btree ("tenant_key", "learner_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX "activity_session_events_session_received_idx" ON "activity_session_events" USING btree ("session_id", "received_at");
