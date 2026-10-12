CREATE TABLE "primary_lesson_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"article_id" uuid NOT NULL,
	"assignment_id" uuid,
	"class_book_id" uuid,
	"lesson_number" integer,
	"attempt_number" integer NOT NULL,
	"started_at" timestamp,
	"closed_at" timestamp DEFAULT now() NOT NULL,
	"closed_by_user_id" text,
	"close_reason" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"score" integer,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "primary_lesson_attempts_student_article_attempt_unique" UNIQUE("student_id","article_id","attempt_number")
);
--> statement-breakpoint
ALTER TABLE "primary_class_book_lessons" ADD COLUMN "run_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "primary_class_book_lessons" ADD COLUMN "earlier_runs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "primary_lesson_attempts" ADD CONSTRAINT "primary_lesson_attempts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_lesson_attempts" ADD CONSTRAINT "primary_lesson_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_lesson_attempts" ADD CONSTRAINT "primary_lesson_attempts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_lesson_attempts" ADD CONSTRAINT "primary_lesson_attempts_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_lesson_attempts" ADD CONSTRAINT "primary_lesson_attempts_class_book_id_primary_class_books_id_fk" FOREIGN KEY ("class_book_id") REFERENCES "public"."primary_class_books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_lesson_attempts" ADD CONSTRAINT "primary_lesson_attempts_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "primary_lesson_attempts_school_article_idx" ON "primary_lesson_attempts" USING btree ("school_id","article_id");