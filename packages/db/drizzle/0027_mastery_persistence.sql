-- Mastery Engine Phase S3: additive, tenant-flat persistence tables.

CREATE TABLE "mastery_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"objective_id" text NOT NULL,
	"variant_key" text NOT NULL,
	"stability" real NOT NULL,
	"difficulty" real NOT NULL,
	"state" text NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"elapsed_days" real NOT NULL,
	"scheduled_days" real NOT NULL,
	"reps" integer NOT NULL,
	"lapses" integer NOT NULL,
	"last_review" timestamp with time zone,
	"params_version" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_cards_school_id_unique" UNIQUE("school_id", "id"),
	CONSTRAINT "mastery_cards_school_student_objective_variant_unique" UNIQUE("school_id", "student_id", "objective_id", "variant_key"),
	CONSTRAINT "mastery_cards_numeric_bounds_check" CHECK ("stability" >= 0 AND "difficulty" >= 0 AND "difficulty" <= 10 AND "elapsed_days" >= 0 AND "scheduled_days" >= 0 AND "reps" >= 0 AND "lapses" >= 0 AND "revision" >= 0 AND "state" IN ('new', 'learning', 'review', 'relearning')),
	CONSTRAINT "mastery_cards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_cards_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "mastery_cards_school_student_due_idx" ON "mastery_cards" USING btree ("school_id", "student_id", "due_date");
--> statement-breakpoint
CREATE INDEX "mastery_cards_school_objective_idx" ON "mastery_cards" USING btree ("school_id", "objective_id");
--> statement-breakpoint

CREATE TABLE "mastery_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"rating" text NOT NULL,
	"evidence_json" jsonb NOT NULL,
	"state_before_json" jsonb NOT NULL,
	"state_after_json" jsonb NOT NULL,
	"params_version" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_reviews_school_id_unique" UNIQUE("school_id", "id"),
	CONSTRAINT "mastery_reviews_school_card_submission_unique" UNIQUE("school_id", "card_id", "submission_id"),
	CONSTRAINT "mastery_reviews_rating_check" CHECK ("rating" IN ('again', 'hard', 'good', 'easy')),
	CONSTRAINT "mastery_reviews_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_reviews_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_reviews_school_card_fk" FOREIGN KEY ("school_id", "card_id") REFERENCES "mastery_cards"("school_id", "id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "mastery_reviews_school_student_reviewed_idx" ON "mastery_reviews" USING btree ("school_id", "student_id", "reviewed_at");
--> statement-breakpoint
CREATE INDEX "mastery_reviews_school_card_reviewed_idx" ON "mastery_reviews" USING btree ("school_id", "card_id", "reviewed_at");
--> statement-breakpoint

CREATE TABLE "mastery_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"objective_id" text NOT NULL,
	"variant_key" text NOT NULL,
	"source_id" text NOT NULL,
	"evidence_ordinal" integer NOT NULL,
	"evidence_type" text NOT NULL,
	"retention_strength" real NOT NULL,
	"practice_coverage" real NOT NULL,
	"evidence_confidence" real NOT NULL,
	"attempt_count" integer NOT NULL,
	"provenance_json" jsonb NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_evidence_school_source_ordinal_unique" UNIQUE("school_id", "source_id", "evidence_ordinal"),
	CONSTRAINT "mastery_evidence_bounds_check" CHECK ("evidence_ordinal" >= 0 AND "retention_strength" >= 0 AND "retention_strength" <= 1 AND "practice_coverage" >= 0 AND "practice_coverage" <= 1 AND "evidence_confidence" >= 0 AND "evidence_confidence" <= 1 AND "attempt_count" >= 0),
	CONSTRAINT "mastery_evidence_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_evidence_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_evidence_school_review_fk" FOREIGN KEY ("school_id", "review_id") REFERENCES "mastery_reviews"("school_id", "id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "mastery_evidence_school_student_objective_observed_idx" ON "mastery_evidence" USING btree ("school_id", "student_id", "objective_id", "observed_at");
--> statement-breakpoint
CREATE INDEX "mastery_evidence_school_source_idx" ON "mastery_evidence" USING btree ("school_id", "source_id");
--> statement-breakpoint

CREATE TABLE "mastery_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"objective_id" text NOT NULL,
	"mastery_state" text NOT NULL,
	"mastery_level" real NOT NULL,
	"live_retention" real NOT NULL,
	"evidence_confidence" real NOT NULL,
	"graph_release" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_states_school_student_objective_unique" UNIQUE("school_id", "student_id", "objective_id"),
	CONSTRAINT "mastery_states_bounds_check" CHECK ("mastery_level" >= 0 AND "mastery_level" <= 1 AND "live_retention" >= 0 AND "live_retention" <= 1 AND "evidence_confidence" >= 0 AND "evidence_confidence" <= 1 AND "revision" >= 0 AND "mastery_state" IN ('unseen', 'introduced', 'practicing', 'proficient', 'mastered')),
	CONSTRAINT "mastery_states_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_states_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "mastery_states_school_student_idx" ON "mastery_states" USING btree ("school_id", "student_id");
--> statement-breakpoint
CREATE INDEX "mastery_states_school_objective_idx" ON "mastery_states" USING btree ("school_id", "objective_id");
--> statement-breakpoint

CREATE TABLE "mastery_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"objective_id" text NOT NULL,
	"mastery_estimate" real NOT NULL,
	"confidence" text NOT NULL,
	"evidence_type" text NOT NULL,
	"graph_release" text NOT NULL,
	"source_id" text NOT NULL,
	"seed_provenance_json" jsonb NOT NULL,
	"replaced_by_direct_at" timestamp with time zone,
	"placed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_placements_bounds_check" CHECK ("mastery_estimate" >= 0 AND "mastery_estimate" <= 1 AND "confidence" IN ('low', 'medium', 'high')),
	CONSTRAINT "mastery_placements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_placements_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "mastery_placements_school_student_objective_idx" ON "mastery_placements" USING btree ("school_id", "student_id", "objective_id");
--> statement-breakpoint
CREATE INDEX "mastery_placements_school_graph_release_idx" ON "mastery_placements" USING btree ("school_id", "graph_release");
--> statement-breakpoint

CREATE TABLE "mastery_calibrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"age_band" text NOT NULL,
	"params_version" text NOT NULL,
	"optimizer_version" text NOT NULL,
	"incumbent_params_version" text NOT NULL,
	"fsrs_parameters_json" jsonb NOT NULL,
	"review_count" integer NOT NULL,
	"student_count" integer NOT NULL,
	"volume_gate_passed" boolean NOT NULL,
	"improves_incumbent" boolean NOT NULL,
	"human_release_approved" boolean NOT NULL,
	"release_eligible" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_calibrations_release_governance_check" CHECK ("review_count" >= 0 AND "student_count" >= 0 AND (NOT "release_eligible" OR ("volume_gate_passed" AND "improves_incumbent" AND "human_release_approved"))),
	CONSTRAINT "mastery_calibrations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "mastery_calibrations_school_population_idx" ON "mastery_calibrations" USING btree ("school_id", "domain", "age_band");
--> statement-breakpoint

CREATE TABLE "mastery_commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"contract_version" text NOT NULL,
	"graph_release" text NOT NULL,
	"params_version" text NOT NULL,
	"status" text NOT NULL,
	"result_digest" text NOT NULL,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mastery_commits_school_idempotency_unique" UNIQUE("school_id", "idempotency_key"),
	CONSTRAINT "mastery_commits_status_check" CHECK ("status" = 'applied'),
	CONSTRAINT "mastery_commits_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
	CONSTRAINT "mastery_commits_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "mastery_commits_school_student_created_idx" ON "mastery_commits" USING btree ("school_id", "student_id", "created_at");
--> statement-breakpoint
CREATE INDEX "mastery_commits_school_request_idx" ON "mastery_commits" USING btree ("school_id", "request_id");
