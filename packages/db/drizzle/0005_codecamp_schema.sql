-- Create codecamp enums
CREATE TYPE "codecamp_lesson_type" AS ENUM ('theory', 'exercise', 'quiz');
CREATE TYPE "codecamp_progress_status" AS ENUM ('not_started', 'in_progress', 'completed');

-- Create codecamp modules table
CREATE TABLE IF NOT EXISTS "codecamp_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"slug" text NOT NULL,
	"order" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "codecamp_modules_slug_unique" UNIQUE("slug")
);

-- Create codecamp lessons table
CREATE TABLE IF NOT EXISTS "codecamp_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"order" integer NOT NULL,
	"type" "codecamp_lesson_type" NOT NULL,
	"content_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create codecamp exercises table
CREATE TABLE IF NOT EXISTS "codecamp_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"starter_code" text,
	"expected_output" text,
	"hints_json" jsonb DEFAULT '[]' NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create codecamp quiz questions table
CREATE TABLE IF NOT EXISTS "codecamp_quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"question" text NOT NULL,
	"options_json" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create codecamp user progress table
CREATE TABLE IF NOT EXISTS "codecamp_user_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"module_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" "codecamp_progress_status" DEFAULT 'not_started' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "codecamp_user_progress_user_lesson_unique" UNIQUE("user_id","lesson_id")
);

-- Create codecamp chat conversations table
CREATE TABLE IF NOT EXISTS "codecamp_chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"module_id" uuid,
	"lesson_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create codecamp chat messages table
CREATE TABLE IF NOT EXISTS "codecamp_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "codecamp_lessons" ADD CONSTRAINT "codecamp_lessons_module_id_codecamp_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."codecamp_modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_exercises" ADD CONSTRAINT "codecamp_exercises_lesson_id_codecamp_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."codecamp_lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_quiz_questions" ADD CONSTRAINT "codecamp_quiz_questions_lesson_id_codecamp_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."codecamp_lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_user_progress" ADD CONSTRAINT "codecamp_user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_user_progress" ADD CONSTRAINT "codecamp_user_progress_module_id_codecamp_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."codecamp_modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_user_progress" ADD CONSTRAINT "codecamp_user_progress_lesson_id_codecamp_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."codecamp_lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_chat_conversations" ADD CONSTRAINT "codecamp_chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "codecamp_chat_conversations" ADD CONSTRAINT "codecamp_chat_conversations_module_id_codecamp_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."codecamp_modules"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "codecamp_chat_conversations" ADD CONSTRAINT "codecamp_chat_conversations_lesson_id_codecamp_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."codecamp_lessons"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "codecamp_chat_messages" ADD CONSTRAINT "codecamp_chat_messages_conversation_id_codecamp_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."codecamp_chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
