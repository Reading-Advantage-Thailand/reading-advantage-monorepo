-- =====================================================================
-- Migration 0013: Prisma → Drizzle Schema Unification
-- Ports/reshapes all non-auth Prisma models into the shared Drizzle schema.
-- See: measure/tracks/prisma_drizzle_schema_unification_20260505/audit.md
-- =====================================================================

-- ─── 1. New parent tables (must exist before child FKs) ──────────────────────

CREATE TABLE IF NOT EXISTS "licenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "used_licenses" integer,
  "license_type" text DEFAULT 'BASIC' NOT NULL,
  "max_users" integer DEFAULT 1 NOT NULL,
  "owner_user_id" text REFERENCES "users"("id"),
  "school_name" text NOT NULL,
  "school_id" uuid REFERENCES "schools"("id"),
  "feature_flags" jsonb DEFAULT '{}' NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "licenses_key_unique" UNIQUE ("key")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "license_on_users" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "license_id" uuid NOT NULL REFERENCES "licenses"("id") ON DELETE CASCADE,
  "activate_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "license_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "stories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "type" text,
  "genre" text,
  "subgenre" text,
  "ra_level" integer,
  "cefr_level" text,
  "rating" real,
  "average_rating" real,
  "author_id" text,
  "image_description" text,
  "story_bible" jsonb,
  "is_public" boolean DEFAULT false NOT NULL,
  "translated_summary" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ra_cefr_mappings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ra_level" integer NOT NULL,
  "cefr_level" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ra_cefr_mappings_ra_level_unique" UNIQUE ("ra_level")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "genre_adjacencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "primary_genre" text NOT NULL,
  "adjacent_genre" text NOT NULL,
  "weight" real DEFAULT 1.0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "genre_adjacencies_primary_adjacent_unique" UNIQUE ("primary_genre", "adjacent_genre")
);
--> statement-breakpoint

-- ─── 2. Schools: add province + country ──────────────────────────────────────

ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "province" text;
--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'Thailand' NOT NULL;
--> statement-breakpoint

-- ─── 3. Classrooms: add Prisma fields ────────────────────────────────────────

ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "class_code" text;
--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "code_expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "grade" integer;
--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "users"("id");
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'classrooms_class_code_unique' AND conrelid = 'classrooms'::regclass
  ) THEN
    ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_class_code_unique" UNIQUE ("class_code");
--> statement-breakpoint
  END IF;
--> statement-breakpoint
END $$;
--> statement-breakpoint

-- ─── 4. Articles: add Prisma-ported columns ───────────────────────────────────

ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "type" text;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "genre" text;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "sub_genre" text;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "passage" text;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "translated_summary" jsonb;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "translated_passage" jsonb;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "image_description" text;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "ra_level" integer;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "rating" real;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "audio_url" text;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "audio_word_url" text;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "sentences" jsonb;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "words" jsonb;
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "author_id" text REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

-- ─── 5. Lessons: content column type text → jsonb ────────────────────────────

ALTER TABLE "lessons" ALTER COLUMN "content" TYPE jsonb USING
  CASE WHEN content IS NULL THEN NULL ELSE content::jsonb END;
--> statement-breakpoint

-- ─── 6. Assignments: make nullable cols + add description ────────────────────

ALTER TABLE "assignments" ALTER COLUMN "title" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "teacher_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "type" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint

-- ─── 7. Student Assignments: add status + started_at ─────────────────────────

ALTER TABLE "student_assignments" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "student_assignments" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_assignments_unique' AND conrelid = 'student_assignments'::regclass
  ) THEN
    ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_unique" UNIQUE ("assignment_id", "student_id");
--> statement-breakpoint
  END IF;
--> statement-breakpoint
END $$;
--> statement-breakpoint

-- ─── 8. User Activity: add Prisma fields + unique constraint ─────────────────

ALTER TABLE "user_activity" ADD COLUMN IF NOT EXISTS "target_id" text;
--> statement-breakpoint
ALTER TABLE "user_activity" ADD COLUMN IF NOT EXISTS "timer" integer;
--> statement-breakpoint
ALTER TABLE "user_activity" ADD COLUMN IF NOT EXISTS "details" jsonb;
--> statement-breakpoint
ALTER TABLE "user_activity" ADD COLUMN IF NOT EXISTS "completed" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "user_activity" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_activity_type_target_unique' AND conrelid = 'user_activity'::regclass
  ) THEN
    ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_type_target_unique" UNIQUE ("user_id", "activity_type", "target_id");
--> statement-breakpoint
  END IF;
--> statement-breakpoint
END $$;
--> statement-breakpoint

-- ─── 9. XP Logs: rename amount→xp_earned, source→activity_type, source_id→activity_id ───

ALTER TABLE "xp_logs" RENAME COLUMN "amount" TO "xp_earned";
--> statement-breakpoint
ALTER TABLE "xp_logs" RENAME COLUMN "source" TO "activity_type";
--> statement-breakpoint
ALTER TABLE "xp_logs" RENAME COLUMN "source_id" TO "activity_id";
--> statement-breakpoint
ALTER TABLE "xp_logs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint

-- ─── 10. Game Rankings: reshape (drop old cols, add new) ──────────────────────

ALTER TABLE "game_rankings" DROP COLUMN IF EXISTS "score";
--> statement-breakpoint
ALTER TABLE "game_rankings" DROP COLUMN IF EXISTS "level";
--> statement-breakpoint
ALTER TABLE "game_rankings" DROP COLUMN IF EXISTS "completed_at";
--> statement-breakpoint
ALTER TABLE "game_rankings" ADD COLUMN IF NOT EXISTS "difficulty" text DEFAULT 'NORMAL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_rankings" ADD COLUMN IF NOT EXISTS "total_xp" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_rankings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'game_rankings_user_game_difficulty_unique' AND conrelid = 'game_rankings'::regclass
  ) THEN
    ALTER TABLE "game_rankings" ADD CONSTRAINT "game_rankings_user_game_difficulty_unique" UNIQUE ("user_id", "game_type", "difficulty");
--> statement-breakpoint
  END IF;
--> statement-breakpoint
END $$;
--> statement-breakpoint

-- ─── 11. AI Insights: reshape (drop old cols, add new Prisma fields) ─────────
-- Old: id, user_id (NOT NULL), type, content, created_at
-- New: id, insight_type, scope, priority, title, description, confidence, data,
--      user_id (nullable), classroom_id, license_id, generated_by, model_version,
--      dismissed, dismissed_at, action_taken, valid_until, created_at, updated_at

ALTER TABLE "ai_insights" DROP COLUMN IF EXISTS "type";
--> statement-breakpoint
ALTER TABLE "ai_insights" DROP COLUMN IF EXISTS "content";
--> statement-breakpoint
ALTER TABLE "ai_insights" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "insight_type" text DEFAULT 'GENERAL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "scope" text DEFAULT 'USER' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'MEDIUM' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "title" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "confidence" real DEFAULT 0.0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "data" jsonb;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "classroom_id" text;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "license_id" text;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "generated_by" text DEFAULT 'ai' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "model_version" text;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "dismissed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "dismissed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "action_taken" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "valid_until" timestamp;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint

-- ─── 12. Learning Goals: reshape ─────────────────────────────────────────────
-- Old: id, user_id, title, target_value, current_value, unit, completed, deadline, created_at, updated_at
-- New: keeps title, target_value, current_value, unit; renames deadline→target_date;
--      drops completed; adds goal_type, description, start_date, completed_at, status,
--      priority, is_recurring, recurring_period, metadata

ALTER TABLE "learning_goals" RENAME COLUMN "deadline" TO "target_date";
--> statement-breakpoint
ALTER TABLE "learning_goals" DROP COLUMN IF EXISTS "completed";
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "goal_type" text DEFAULT 'CUSTOM' NOT NULL;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "start_date" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'MEDIUM' NOT NULL;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "is_recurring" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "recurring_period" text;
--> statement-breakpoint
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint

-- ─── 13. Story Records: complete reshape ──────────────────────────────────────
-- Old: id, user_id, article_id (NOT NULL FK), current_chapter, total_chapters, completed, started_at, completed_at
-- New: id, user_id, story_id (FK stories), title, level, rated, score, status, created_at, updated_at

ALTER TABLE "story_records" DROP CONSTRAINT IF EXISTS "story_records_article_id_articles_id_fk";
--> statement-breakpoint
ALTER TABLE "story_records" DROP COLUMN IF EXISTS "article_id";
--> statement-breakpoint
ALTER TABLE "story_records" DROP COLUMN IF EXISTS "current_chapter";
--> statement-breakpoint
ALTER TABLE "story_records" DROP COLUMN IF EXISTS "total_chapters";
--> statement-breakpoint
ALTER TABLE "story_records" DROP COLUMN IF EXISTS "completed";
--> statement-breakpoint
ALTER TABLE "story_records" DROP COLUMN IF EXISTS "started_at";
--> statement-breakpoint
ALTER TABLE "story_records" DROP COLUMN IF EXISTS "completed_at";
--> statement-breakpoint
-- story_id FK references stories (created above)
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "story_id" uuid REFERENCES "stories"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "title" text;
--> statement-breakpoint
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "level" integer;
--> statement-breakpoint
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "rated" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "score" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'READ' NOT NULL;
--> statement-breakpoint
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "story_records" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_records_user_story_unique' AND conrelid = 'story_records'::regclass
  ) THEN
    ALTER TABLE "story_records" ADD CONSTRAINT "story_records_user_story_unique" UNIQUE ("user_id", "story_id");
--> statement-breakpoint
  END IF;
--> statement-breakpoint
END $$;
--> statement-breakpoint

-- ─── 14. Chapter Tracking → Chapter Trackings: rename + reshape ──────────────
-- Old: chapter_tracking, id, story_record_id FK→story_records, chapter_number, completed, score, completed_at, created_at
-- New: chapter_trackings, id, user_id FK→users, story_id FK→stories, chapter_number, title, level, rated, scores, status, created_at, updated_at

ALTER TABLE "chapter_tracking" DROP CONSTRAINT IF EXISTS "chapter_tracking_story_record_id_story_records_id_fk";
--> statement-breakpoint
ALTER TABLE "chapter_tracking" RENAME TO "chapter_trackings";
--> statement-breakpoint
ALTER TABLE "chapter_trackings" DROP COLUMN IF EXISTS "story_record_id";
--> statement-breakpoint
ALTER TABLE "chapter_trackings" DROP COLUMN IF EXISTS "completed";
--> statement-breakpoint
ALTER TABLE "chapter_trackings" DROP COLUMN IF EXISTS "score";
--> statement-breakpoint
ALTER TABLE "chapter_trackings" DROP COLUMN IF EXISTS "completed_at";
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "story_id" uuid REFERENCES "stories"("id");
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "title" text;
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "level" integer;
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "rated" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "scores" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'READ' NOT NULL;
--> statement-breakpoint
ALTER TABLE "chapter_trackings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chapter_trackings_user_story_chapter_unique' AND conrelid = 'chapter_trackings'::regclass
  ) THEN
    ALTER TABLE "chapter_trackings" ADD CONSTRAINT "chapter_trackings_user_story_chapter_unique" UNIQUE ("user_id", "story_id", "chapter_number");
--> statement-breakpoint
  END IF;
--> statement-breakpoint
END $$;
--> statement-breakpoint

-- ─── 15. User Word Records: complete reshape (text→jsonb word, add FSRS) ──────
-- Old: id, user_id, word (text), correct_count, incorrect_count, last_reviewed_at, created_at, updated_at
-- New: id, user_id, word (jsonb NOT NULL), article_id, story_id, chapter_number, FSRS fields

ALTER TABLE "user_word_records" DROP COLUMN IF EXISTS "word";
--> statement-breakpoint
ALTER TABLE "user_word_records" DROP COLUMN IF EXISTS "correct_count";
--> statement-breakpoint
ALTER TABLE "user_word_records" DROP COLUMN IF EXISTS "incorrect_count";
--> statement-breakpoint
ALTER TABLE "user_word_records" DROP COLUMN IF EXISTS "last_reviewed_at";
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "word" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "article_id" uuid;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "story_id" text;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "chapter_number" integer;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "save_to_flashcard" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "difficulty" real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "due" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "elapsed_days" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "lapses" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "reps" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "scheduled_days" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "stability" real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_word_records" ADD COLUMN IF NOT EXISTS "state" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- word is stored as JSON in new schema; remove temporary default
ALTER TABLE "user_word_records" ALTER COLUMN "word" DROP DEFAULT;
--> statement-breakpoint

-- ─── 16. User Sentence Records: complete reshape (add FSRS + audio fields) ────
-- Old: id, user_id, sentence_id, correct, incorrect, last_reviewed_at, created_at, updated_at
-- New: id, user_id, sentence (text), translation (jsonb), sn, timepoint, end_timepoint, audio_url, FSRS fields

ALTER TABLE "user_sentence_records" DROP COLUMN IF EXISTS "sentence_id";
--> statement-breakpoint
ALTER TABLE "user_sentence_records" DROP COLUMN IF EXISTS "correct";
--> statement-breakpoint
ALTER TABLE "user_sentence_records" DROP COLUMN IF EXISTS "incorrect";
--> statement-breakpoint
ALTER TABLE "user_sentence_records" DROP COLUMN IF EXISTS "last_reviewed_at";
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "article_id" uuid;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "story_id" text;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "chapter_number" integer;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "sentence" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "translation" jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "sn" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "timepoint" real NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "end_timepoint" real NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "audio_url" text;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "save_to_flashcard" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "difficulty" real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "due" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "elapsed_days" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "lapses" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "reps" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "scheduled_days" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "stability" real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "state" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ADD COLUMN IF NOT EXISTS "update_score" boolean DEFAULT false;
--> statement-breakpoint
-- Remove temporary defaults (new rows must supply these)
ALTER TABLE "user_sentence_records" ALTER COLUMN "sentence" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ALTER COLUMN "translation" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ALTER COLUMN "sn" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ALTER COLUMN "timepoint" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user_sentence_records" ALTER COLUMN "end_timepoint" DROP DEFAULT;
--> statement-breakpoint

-- ─── 17. MCQ + Short Answer: make article_id nullable, add Prisma fields ─────

ALTER TABLE "multiple_choice_questions" ALTER COLUMN "article_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ADD COLUMN IF NOT EXISTS "answer" text;
--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ADD COLUMN IF NOT EXISTS "textual_evidence" text;
--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ADD COLUMN IF NOT EXISTS "chapter_id" text;
--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint

ALTER TABLE "short_answer_questions" ALTER COLUMN "article_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "short_answer_questions" ADD COLUMN IF NOT EXISTS "answer" text;
--> statement-breakpoint
ALTER TABLE "short_answer_questions" ADD COLUMN IF NOT EXISTS "chapter_id" text;
--> statement-breakpoint
ALTER TABLE "short_answer_questions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint

-- ─── 18. New child tables (depend on stories / articles / classrooms) ─────────

CREATE TABLE IF NOT EXISTS "chapters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "chapter_number" integer NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "audio_url" text,
  "rating" real,
  "user_rating_count" integer,
  "word_count" integer,
  "sentences" jsonb,
  "words" jsonb,
  "image_description" text,
  "audio_word_url" text,
  "author_id" text,
  "cefr_level" text,
  "genre" text,
  "is_public" boolean DEFAULT false NOT NULL,
  "passage" text,
  "ra_level" integer,
  "sub_genre" text,
  "translated_passage" jsonb,
  "translated_summary" jsonb,
  "type" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chapters_story_chapter_unique" UNIQUE ("story_id", "chapter_number")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "story_timepoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "chapter_number" integer NOT NULL,
  "timepoints" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "story_timepoints_story_chapter_unique" UNIQUE ("story_id", "chapter_number")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "story_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "classroom_id" uuid NOT NULL REFERENCES "classrooms"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users"("id"),
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "article_id" uuid REFERENCES "articles"("id"),
  "status" text DEFAULT 'NOT_STARTED' NOT NULL,
  "title" text,
  "description" text,
  "due_date" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lesson_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "article_id" uuid NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "phase1" jsonb DEFAULT '{"status": 2, "elapsedTime": 0}' NOT NULL,
  "phase2" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase3" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase4" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase5" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase6" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase7" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase8" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase9" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase10" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase11" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase12" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase13" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "phase14" jsonb DEFAULT '{"status": 0, "elapsedTime": 0}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "lesson_records_user_article_unique" UNIQUE ("user_id", "article_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "assignment_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assignment_id" uuid NOT NULL REFERENCES "assignments"("id") ON DELETE CASCADE,
  "is_noticed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "assignment_notifications_unique" UNIQUE ("assignment_id", "student_id", "teacher_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "long_answer_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "article_id" uuid REFERENCES "articles"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "chapter_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ─── 19. Analytics: new tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ai_insight_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cache_key" text NOT NULL,
  "scope" text NOT NULL,
  "insights" jsonb NOT NULL,
  "metrics" jsonb,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ai_insight_cache_cache_key_unique" UNIQUE ("cache_key")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "goal_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL REFERENCES "learning_goals"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "target_value" real NOT NULL,
  "order" integer NOT NULL,
  "achieved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "goal_progress_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL REFERENCES "learning_goals"("id") ON DELETE CASCADE,
  "value" real NOT NULL,
  "previous_value" real NOT NULL,
  "new_value" real NOT NULL,
  "note" text,
  "activity_id" text,
  "activity_type" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ─── 20. Science tables (PORT-AS-IS from science-advantage) ──────────────────

CREATE TABLE IF NOT EXISTS "gamification_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "xp" integer DEFAULT 0 NOT NULL,
  "level" integer DEFAULT 1 NOT NULL,
  "streak" integer DEFAULT 0 NOT NULL,
  "last_active_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "achievements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "badge_type" text NOT NULL,
  "unlocked_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "achievements_user_badge_unique" UNIQUE ("user_id", "badge_type")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_classes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "grade_level" integer NOT NULL,
  "standards_alignment" text NOT NULL,
  "join_code" text NOT NULL,
  "teacher_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_classes_join_code_unique" UNIQUE ("join_code")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_standards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "framework" text NOT NULL,
  "code" text NOT NULL,
  "description" text NOT NULL,
  "grade_level" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_standards_framework_code_unique" UNIQUE ("framework", "code")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_standard_mastery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "standard_id" uuid NOT NULL REFERENCES "science_standards"("id") ON DELETE CASCADE,
  "mastery_level" decimal(3, 2) NOT NULL,
  "evidence_count" integer DEFAULT 0 NOT NULL,
  "last_assessed_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_standard_mastery_student_standard_unique" UNIQUE ("student_id", "standard_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_lessons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "title_thai" text,
  "description" text,
  "description_thai" text,
  "content" text,
  "structured_content" jsonb,
  "lesson_type" text DEFAULT 'LESSON' NOT NULL,
  "grade_level" integer NOT NULL,
  "order" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_lessons_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_curriculum_units" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "framework" text NOT NULL,
  "grade_level" integer NOT NULL,
  "order" integer NOT NULL,
  "class_id" uuid NOT NULL REFERENCES "science_classes"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_curriculum_units_slug_unique" UNIQUE ("slug"),
  CONSTRAINT "science_curriculum_units_class_framework_order_unique" UNIQUE ("class_id", "framework", "order")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_quiz_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "lesson_id" uuid NOT NULL REFERENCES "science_lessons"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "text" text NOT NULL,
  "options" jsonb,
  "correct_answer" jsonb NOT NULL,
  "points" integer DEFAULT 1 NOT NULL,
  "order" integer NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_quiz_questions_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "science_lessons"("id") ON DELETE CASCADE,
  "score" real DEFAULT 0 NOT NULL,
  "max_score" real NOT NULL,
  "attempt_number" integer NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_attempts_student_lesson_attempt_unique" UNIQUE ("student_id", "lesson_id", "attempt_number")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_question_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL REFERENCES "science_attempts"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "science_quiz_questions"("id") ON DELETE CASCADE,
  "student_answer" jsonb NOT NULL,
  "is_correct" boolean NOT NULL,
  "time_spent_seconds" integer DEFAULT 0 NOT NULL,
  "answered_at" timestamp DEFAULT now() NOT NULL,
  "order" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_lesson_completions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "science_lessons"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'NOT_STARTED' NOT NULL,
  "completed_at" timestamp,
  "attempts_count" integer DEFAULT 0 NOT NULL,
  "best_score" real,
  "best_score_percentage" real,
  "most_recent_score" real,
  "most_recent_score_percentage" real,
  "total_time_spent_seconds" integer DEFAULT 0 NOT NULL,
  "last_attempt_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_lesson_completions_student_lesson_unique" UNIQUE ("student_id", "lesson_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_mastery_runs" (
  "attempt_id" uuid PRIMARY KEY REFERENCES "science_attempts"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "updated_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "science_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id" uuid NOT NULL REFERENCES "science_classes"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "science_lessons"("id") ON DELETE CASCADE,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  "due_at" timestamp,
  "assigned_by" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "science_assignments_class_lesson_unique" UNIQUE ("class_id", "lesson_id")
);
--> statement-breakpoint
