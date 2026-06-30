-- Adds durable login-attempt tracking for the production rate limiter.
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"kind" text NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "login_attempts_identifier_kind_idx" ON "login_attempts" USING btree ("identifier","kind");--> statement-breakpoint
CREATE INDEX "login_attempts_window_start_idx" ON "login_attempts" USING btree ("window_start");
