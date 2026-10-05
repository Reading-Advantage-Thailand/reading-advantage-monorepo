CREATE TABLE "primary_active_voice_sessions" (
	"student_user_id" text PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"voice_session_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "primary_active_voice_sessions_voice_session_id_unique" UNIQUE("voice_session_id")
);
--> statement-breakpoint
CREATE TABLE "primary_voice_monthly_usage" (
	"school_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"month" text NOT NULL,
	"seconds_used" integer DEFAULT 0 NOT NULL,
	"session_count" integer DEFAULT 0 NOT NULL,
	"cost_thb" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_voice_monthly_usage_student_user_id_month_pk" PRIMARY KEY("student_user_id","month")
);
--> statement-breakpoint
CREATE TABLE "primary_voice_school_settings" (
	"school_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "primary_voice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"article_id" uuid,
	"month" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"provider_call_id" text,
	"reserved_seconds" integer NOT NULL,
	"consumed_seconds" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"end_reason" text,
	"summary" jsonb,
	"scores" jsonb,
	"provider_usage" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "primary_active_voice_sessions" ADD CONSTRAINT "primary_active_voice_sessions_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_active_voice_sessions" ADD CONSTRAINT "primary_active_voice_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_active_voice_sessions" ADD CONSTRAINT "primary_active_voice_sessions_voice_session_id_primary_voice_sessions_id_fk" FOREIGN KEY ("voice_session_id") REFERENCES "public"."primary_voice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_voice_monthly_usage" ADD CONSTRAINT "primary_voice_monthly_usage_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_voice_monthly_usage" ADD CONSTRAINT "primary_voice_monthly_usage_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_voice_school_settings" ADD CONSTRAINT "primary_voice_school_settings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_voice_sessions" ADD CONSTRAINT "primary_voice_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_voice_sessions" ADD CONSTRAINT "primary_voice_sessions_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_voice_sessions" ADD CONSTRAINT "primary_voice_sessions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "primary_voice_monthly_usage_school_month_idx" ON "primary_voice_monthly_usage" USING btree ("school_id","month");--> statement-breakpoint
CREATE INDEX "primary_voice_sessions_student_month_idx" ON "primary_voice_sessions" USING btree ("student_user_id","month");--> statement-breakpoint
CREATE INDEX "primary_voice_sessions_school_idx" ON "primary_voice_sessions" USING btree ("school_id","created_at");