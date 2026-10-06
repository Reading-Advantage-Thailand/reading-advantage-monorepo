CREATE TABLE "primary_class_login_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"classroom_id" uuid NOT NULL,
	"teacher_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "primary_student_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"picture_hash" text,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"card_token_hash" text,
	"rotated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_student_credentials_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "primary_student_credentials_card_token_hash_unique" UNIQUE("card_token_hash")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "auth_strength" text;--> statement-breakpoint
ALTER TABLE "primary_class_login_sessions" ADD CONSTRAINT "primary_class_login_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_login_sessions" ADD CONSTRAINT "primary_class_login_sessions_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_login_sessions" ADD CONSTRAINT "primary_class_login_sessions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_student_credentials" ADD CONSTRAINT "primary_student_credentials_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_student_credentials" ADD CONSTRAINT "primary_student_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "primary_class_login_sessions_open_class_idx" ON "primary_class_login_sessions" USING btree ("classroom_id") WHERE "primary_class_login_sessions"."closed_at" is null;--> statement-breakpoint
CREATE INDEX "primary_class_login_sessions_code_hash_idx" ON "primary_class_login_sessions" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "primary_student_credentials_school_idx" ON "primary_student_credentials" USING btree ("school_id");