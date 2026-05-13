-- Manual migration: codecamp exercise repos and PR reviews tables
-- Created for codecamp-advantage track (Phase 1)

CREATE TYPE "codecamp_review_status" AS ENUM ('pending', 'reviewed', 'needs_changes', 'approved');

CREATE TABLE IF NOT EXISTS "codecamp_exercise_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"repo_url" text NOT NULL,
	"description" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "codecamp_pr_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_repo_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"pr_url" text NOT NULL,
	"review_status" "codecamp_review_status" DEFAULT 'pending' NOT NULL,
	"llm_review_summary" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "codecamp_exercise_repos" ADD CONSTRAINT "codecamp_exercise_repos_module_id_codecamp_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."codecamp_modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_pr_reviews" ADD CONSTRAINT "codecamp_pr_reviews_exercise_repo_id_codecamp_exercise_repos_id_fk" FOREIGN KEY ("exercise_repo_id") REFERENCES "public"."codecamp_exercise_repos"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_pr_reviews" ADD CONSTRAINT "codecamp_pr_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
