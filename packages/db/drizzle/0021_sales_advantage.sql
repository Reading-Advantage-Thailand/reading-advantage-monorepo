CREATE TYPE "public"."app" AS ENUM('reading-advantage', 'primary-advantage', 'storytime', 'math-advantage', 'science-advantage', 'stem-advantage', 'zhongwen-advantage', 'tutor-advantage');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('pending', 'generated', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'voiceover', 'clip');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'in-progress', 'complete', 'archived');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('video', 'infocard');--> statement-breakpoint
CREATE TYPE "public"."video_project_status" AS ENUM('draft', 'in-progress', 'complete');--> statement-breakpoint
CREATE TYPE "public"."sales_lesson_type" AS ENUM('theory', 'roleplay', 'quiz');--> statement-breakpoint
CREATE TYPE "public"."sales_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."sales_review_status" AS ENUM('draft', 'reviewed', 'approved');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'SALES_REP';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'SALES_ADMIN';--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "campaign_type" NOT NULL,
	"app" "app" NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "past_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" "app" NOT NULL,
	"topic" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scene_index" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"url" text,
	"prompt" text,
	"status" "asset_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"script" jsonb,
	"status" "video_project_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" uuid,
	"module_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "sales_lesson_type" NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"order" integer NOT NULL,
	"review_status" "sales_review_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"phase" text DEFAULT 'Foundations' NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_modules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sales_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" "sales_progress_status" DEFAULT 'not_started' NOT NULL,
	"completed_at" timestamp,
	"score" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_progress_user_lesson_unique" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "sales_quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"question" text NOT NULL,
	"options_json" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_roleplay_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"audio_storage_key" text NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"transcript_excerpt" text,
	"llm_score_json" jsonb,
	"overall_score" numeric(5, 2),
	"passed" boolean,
	"llm_feedback" text,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_roleplay_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"persona_name" text NOT NULL,
	"persona_role" text NOT NULL,
	"situation" text NOT NULL,
	"objective" text NOT NULL,
	"prospect_context_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rubric_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_rubrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"criteria_json" jsonb NOT NULL,
	"review_status" "sales_review_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_chat_messages" ADD CONSTRAINT "sales_chat_messages_conversation_id_sales_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."sales_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_conversations" ADD CONSTRAINT "sales_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_conversations" ADD CONSTRAINT "sales_conversations_lesson_id_sales_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."sales_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_conversations" ADD CONSTRAINT "sales_conversations_module_id_sales_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."sales_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lessons" ADD CONSTRAINT "sales_lessons_module_id_sales_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."sales_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_progress" ADD CONSTRAINT "sales_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_progress" ADD CONSTRAINT "sales_progress_lesson_id_sales_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."sales_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_quiz_questions" ADD CONSTRAINT "sales_quiz_questions_lesson_id_sales_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."sales_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_roleplay_attempts" ADD CONSTRAINT "sales_roleplay_attempts_scenario_id_sales_roleplay_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."sales_roleplay_scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_roleplay_attempts" ADD CONSTRAINT "sales_roleplay_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_roleplay_scenarios" ADD CONSTRAINT "sales_roleplay_scenarios_lesson_id_sales_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."sales_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_roleplay_scenarios" ADD CONSTRAINT "sales_roleplay_scenarios_rubric_id_sales_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."sales_rubrics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_app_idx" ON "campaigns" USING btree ("app");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "past_topics_app_idx" ON "past_topics" USING btree ("app");--> statement-breakpoint
CREATE INDEX "video_assets_project_idx" ON "video_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "video_projects_campaign_idx" ON "video_projects" USING btree ("campaign_id");