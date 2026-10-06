ALTER TABLE "sessions" ADD COLUMN "idle_timeout_seconds" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_seen_at" timestamp;