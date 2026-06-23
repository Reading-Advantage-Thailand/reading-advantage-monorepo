CREATE TYPE "public"."activity_type" AS ENUM('ARTICLE_RATING', 'ARTICLE_READ', 'STORIES_RATING', 'STORIES_READ', 'CHAPTER_RATING', 'CHAPTER_READ', 'LEVEL_TEST', 'MC_QUESTION', 'SA_QUESTION', 'LA_QUESTION', 'SENTENCE_FLASHCARDS', 'SENTENCE_MATCHING', 'SENTENCE_ORDERING', 'SENTENCE_WORD_ORDERING', 'SENTENCE_CLOZE_TEST', 'VOCABULARY_FLASHCARDS', 'VOCABULARY_MATCHING');--> statement-breakpoint
CREATE TYPE "public"."card_state" AS ENUM('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');--> statement-breakpoint
CREATE TYPE "public"."flashcard_type" AS ENUM('VOCABULARY', 'SENTENCE');--> statement-breakpoint
CREATE TYPE "public"."subscription_type" AS ENUM('BASIC', 'PREMIUM', 'ENTERPRISE');--> statement-breakpoint
CREATE TABLE "article_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_multiple_choice_question_completed" boolean DEFAULT false NOT NULL,
	"is_short_answer_question_completed" boolean DEFAULT false NOT NULL,
	"is_long_answer_question_completed" boolean DEFAULT false NOT NULL,
	"is_rated" boolean DEFAULT false NOT NULL,
	"is_sentence_and_words_saved" boolean DEFAULT false NOT NULL,
	"is_sentence_matching_completed" boolean DEFAULT false NOT NULL,
	"is_sentence_ordering_completed" boolean DEFAULT false NOT NULL,
	"is_sentence_word_ordering_completed" boolean DEFAULT false NOT NULL,
	"is_sentence_cloze_test_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"time_spent" integer,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloze_test_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flashcard_card_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentencs_and_words_for_flashcard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"sentence" jsonb,
	"audio_sentences_url" text,
	"words" jsonb,
	"words_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_unique" UNIQUE("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_unique" UNIQUE("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "password_students" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "is_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "is_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "brainstorming" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "planning" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "teacher_name" text;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD COLUMN "article_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD COLUMN "assignment_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD COLUMN "time_spent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD COLUMN "is_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard_decks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "subscription" "subscription_type" DEFAULT 'BASIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "article_activity_logs" ADD CONSTRAINT "article_activity_logs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_activity_logs" ADD CONSTRAINT "article_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_card_id_flashcard_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."flashcard_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloze_test_games" ADD CONSTRAINT "cloze_test_games_flashcard_card_id_flashcard_cards_id_fk" FOREIGN KEY ("flashcard_card_id") REFERENCES "public"."flashcard_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_admins" ADD CONSTRAINT "school_admins_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_admins" ADD CONSTRAINT "school_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentencs_and_words_for_flashcard" ADD CONSTRAINT "sentencs_and_words_for_flashcard_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;