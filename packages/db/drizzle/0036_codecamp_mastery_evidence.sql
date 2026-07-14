CREATE TABLE "codecamp_tutor_interventions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_key" text NOT NULL,
  "user_id" text NOT NULL,
  "conversation_id" uuid,
  "activity_session_id" uuid,
  "activity_id" text NOT NULL,
  "activity_version" text NOT NULL,
  "graph_version" text NOT NULL,
  "objective_id" text NOT NULL,
  "step_id" text,
  "request_id" uuid NOT NULL,
  "intervention_level" integer NOT NULL,
  "message" text NOT NULL,
  "diagnostic_question" text,
  "misconception_tags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "recommended_resource_id" text,
  "model_alias" text NOT NULL,
  "resolved_model" text NOT NULL,
  "prompt_policy_version" text NOT NULL,
  "response_schema_version" text NOT NULL,
  "resource_registry_version" text NOT NULL,
  "model_provenance_json" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "codecamp_tutor_interventions_request_unique" UNIQUE("request_id"),
  CONSTRAINT "codecamp_tutor_interventions_level_check" CHECK ("intervention_level" >= 0 AND "intervention_level" <= 4)
);
--> statement-breakpoint
CREATE TABLE "codecamp_tutor_resource_uses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "intervention_id" uuid NOT NULL,
  "resource_id" text NOT NULL,
  "action_type" text NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "codecamp_tutor_resource_uses_intervention_resource_action_unique" UNIQUE("intervention_id", "resource_id", "action_type"),
  CONSTRAINT "codecamp_tutor_resource_uses_action_check" CHECK ("action_type" IN ('open', 'seek', 'highlight'))
);
--> statement-breakpoint
CREATE TABLE "codecamp_tutor_evidence_joins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "intervention_id" uuid NOT NULL,
  "activity_session_id" uuid NOT NULL,
  "verified_event_id" text NOT NULL,
  "verified_submission_id" text NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "codecamp_tutor_evidence_joins_intervention_event_unique" UNIQUE("intervention_id", "verified_event_id")
);
--> statement-breakpoint
CREATE TABLE "codecamp_pr_review_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "review_id" uuid NOT NULL,
  "tenant_key" text NOT NULL,
  "user_id" text NOT NULL,
  "head_sha" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "attempt_status" text NOT NULL,
  "evidence_authority" text NOT NULL,
  "model_alias" text,
  "resolved_model" text,
  "provider_request_id" text,
  "provider_response_id" text,
  "prompt_version" text NOT NULL,
  "response_schema_version" text NOT NULL,
  "rubric_version" text NOT NULL,
  "graph_version" text NOT NULL,
  "usage_json" jsonb,
  "latency_ms" integer,
  "trusted_context_json" jsonb NOT NULL,
  "evidence_json" jsonb,
  "error_diagnostics_json" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "codecamp_pr_review_attempts_review_head_unique" UNIQUE("review_id", "head_sha"),
  CONSTRAINT "codecamp_pr_review_attempts_idempotency_unique" UNIQUE("idempotency_key"),
  CONSTRAINT "codecamp_pr_review_attempts_status_check" CHECK ("attempt_status" IN ('advisory', 'validated', 'failed')),
  CONSTRAINT "codecamp_pr_review_attempts_authority_check" CHECK ("evidence_authority" IN ('advisory_model', 'trusted_deterministic')),
  CONSTRAINT "codecamp_pr_review_attempts_latency_check" CHECK ("latency_ms" IS NULL OR "latency_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "codecamp_pr_review_objective_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL,
  "objective_id" text NOT NULL,
  "variant_key" text NOT NULL,
  "score" integer NOT NULL,
  "confidence" integer NOT NULL,
  "rubric_dimensions_json" jsonb NOT NULL,
  "misconception_tags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "evidence_references_json" jsonb NOT NULL,
  "support_history_json" jsonb NOT NULL,
  "evidence_state" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "codecamp_pr_review_objective_evidence_attempt_objective_variant_unique" UNIQUE("attempt_id", "objective_id", "variant_key"),
  CONSTRAINT "codecamp_pr_review_objective_evidence_score_check" CHECK ("score" >= 0 AND "score" <= 100),
  CONSTRAINT "codecamp_pr_review_objective_evidence_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 100),
  CONSTRAINT "codecamp_pr_review_objective_evidence_state_check" CHECK ("evidence_state" IN ('advisory', 'validated', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "codecamp_tutor_interventions" ADD CONSTRAINT "codecamp_tutor_interventions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "codecamp_tutor_interventions" ADD CONSTRAINT "codecamp_tutor_interventions_conversation_id_codecamp_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."codecamp_chat_conversations"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "codecamp_tutor_resource_uses" ADD CONSTRAINT "codecamp_tutor_resource_uses_intervention_id_codecamp_tutor_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."codecamp_tutor_interventions"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "codecamp_tutor_evidence_joins" ADD CONSTRAINT "codecamp_tutor_evidence_joins_intervention_id_codecamp_tutor_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."codecamp_tutor_interventions"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "codecamp_pr_review_attempts" ADD CONSTRAINT "codecamp_pr_review_attempts_review_id_codecamp_pr_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."codecamp_pr_reviews"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "codecamp_pr_review_attempts" ADD CONSTRAINT "codecamp_pr_review_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "codecamp_pr_review_objective_evidence" ADD CONSTRAINT "codecamp_pr_review_objective_evidence_attempt_id_codecamp_pr_review_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."codecamp_pr_review_attempts"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "codecamp_tutor_interventions_owner_session_created_idx" ON "codecamp_tutor_interventions" USING btree ("tenant_key", "user_id", "activity_session_id", "created_at");
--> statement-breakpoint
CREATE INDEX "codecamp_tutor_evidence_joins_session_idx" ON "codecamp_tutor_evidence_joins" USING btree ("activity_session_id");
--> statement-breakpoint
CREATE INDEX "codecamp_pr_review_attempts_owner_created_idx" ON "codecamp_pr_review_attempts" USING btree ("tenant_key", "user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "codecamp_pr_review_objective_evidence_objective_idx" ON "codecamp_pr_review_objective_evidence" USING btree ("objective_id", "variant_key");
