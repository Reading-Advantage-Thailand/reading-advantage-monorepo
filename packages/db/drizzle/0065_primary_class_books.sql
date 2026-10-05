CREATE TABLE "primary_book_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"article_id" uuid,
	"legacy_article_id" text,
	"source_file" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"package" jsonb NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_book_lessons_key_unique" UNIQUE("key"),
	CONSTRAINT "primary_book_lessons_book_number_unique" UNIQUE("book_id","number")
);
--> statement-breakpoint
CREATE TABLE "primary_book_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_book_series_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "primary_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"ra_level" integer,
	"cefr_level" text,
	"lesson_count" integer DEFAULT 14 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_books_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "primary_class_book_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_book_id" uuid NOT NULL,
	"lesson_number" integer NOT NULL,
	"taught_at" timestamp,
	"steps_done" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_class_book_lessons_unique" UNIQUE("class_book_id","lesson_number")
);
--> statement-breakpoint
CREATE TABLE "primary_class_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"classroom_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"mode" text DEFAULT 'teacher_led' NOT NULL,
	"start_date" timestamp,
	"current_lesson" integer DEFAULT 1 NOT NULL,
	"assigned_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_class_books_classroom_book_unique" UNIQUE("classroom_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "primary_lesson_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"period" integer NOT NULL,
	"teacher_actions" jsonb NOT NULL,
	"teacher_language" jsonb NOT NULL,
	"student_actions" jsonb NOT NULL,
	"watch_for" jsonb NOT NULL,
	"script_md" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_lesson_guides_step_locale_unique" UNIQUE("step","locale")
);
--> statement-breakpoint
CREATE TABLE "primary_student_lesson_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_book_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"lesson_number" integer NOT NULL,
	"app_step" integer NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"done_at" timestamp,
	"seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_student_lesson_steps_unique" UNIQUE("class_book_id","student_id","lesson_number","app_step")
);
--> statement-breakpoint
ALTER TABLE "primary_book_lessons" ADD CONSTRAINT "primary_book_lessons_book_id_primary_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."primary_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_book_lessons" ADD CONSTRAINT "primary_book_lessons_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_books" ADD CONSTRAINT "primary_books_series_id_primary_book_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."primary_book_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_book_lessons" ADD CONSTRAINT "primary_class_book_lessons_class_book_id_primary_class_books_id_fk" FOREIGN KEY ("class_book_id") REFERENCES "public"."primary_class_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_books" ADD CONSTRAINT "primary_class_books_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_books" ADD CONSTRAINT "primary_class_books_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_books" ADD CONSTRAINT "primary_class_books_book_id_primary_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."primary_books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_books" ADD CONSTRAINT "primary_class_books_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_student_lesson_steps" ADD CONSTRAINT "primary_student_lesson_steps_class_book_id_primary_class_books_id_fk" FOREIGN KEY ("class_book_id") REFERENCES "public"."primary_class_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_student_lesson_steps" ADD CONSTRAINT "primary_student_lesson_steps_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "primary_class_books_school_idx" ON "primary_class_books" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "primary_student_lesson_steps_student_idx" ON "primary_student_lesson_steps" USING btree ("student_id");