-- Phase 4 — Tenant-Safe Persistence and Leaderboards (wave3_product_alignment_20260628).
-- Three coordinated changes that close D-04 (leaderboard tenant-safety) and
-- D-06 Tier 1 (host-mutation Zod hardening at the DB layer):
--
--   1. New `game_completions` FLAT table (schoolId notNull, unique on
--      (schoolId, userId, activityId)). Tenant-safe leaderboard record;
--      TenantDB auto-injects eq(schoolId, tenant.schoolId) on every read/write.
--   2. Unique constraint on `xp_logs(user_id, activity_id)` — race-safe
--      fire-once for the dual-write path (Phase 3 SELECT-before-INSERT was
--      racy under concurrent completion calls; the constraint closes the gap).
--   3. `leaderboards.school_id` is now NOT NULL (B46-027 closure). The
--      migration drops and re-adds the FK constraint because the column is
--      also tightened; rows with NULL schoolId are deleted (Tier 1 contract:
--      notNull after migration; the operational backfill choice is
--      `[b] deferred:infra` for the deploy engineer).

CREATE TABLE "game_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"game_type" text NOT NULL,
	"difficulty" text NOT NULL,
	"score" integer NOT NULL,
	"accuracy" real NOT NULL,
	"correct_answers" integer NOT NULL,
	"total_attempts" integer NOT NULL,
	"duration" integer NOT NULL,
	"victory" boolean NOT NULL,
	"xp_earned" integer NOT NULL,
	"activity_id" text NOT NULL,
	"client_timestamp" bigint,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_completions" ADD CONSTRAINT "game_completions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_completions" ADD CONSTRAINT "game_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_completions_school_user_activity_unique" ON "game_completions" USING btree ("school_id","user_id","activity_id");--> statement-breakpoint
CREATE INDEX "game_completions_school_game_difficulty_idx" ON "game_completions" USING btree ("school_id","game_type","difficulty");--> statement-breakpoint
ALTER TABLE "leaderboards" DROP CONSTRAINT "leaderboards_school_id_schools_id_fk";--> statement-breakpoint
DELETE FROM "leaderboards" WHERE "school_id" IS NULL;--> statement-breakpoint
ALTER TABLE "leaderboards" ALTER COLUMN "school_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "xp_logs_user_activity_unique" ON "xp_logs" USING btree ("user_id","activity_id");