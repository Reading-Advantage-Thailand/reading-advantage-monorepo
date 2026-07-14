CREATE TABLE IF NOT EXISTS "activity_tutorial_capture_leases" (
  "lease_key" text PRIMARY KEY NOT NULL,
  "window_started_at" timestamp with time zone NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "claim_token" text,
  "lease_until" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "activity_tutorial_capture_leases_attempt_count_check" CHECK ("attempt_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_tutorial_capture_leases_expiry_idx" ON "activity_tutorial_capture_leases" USING btree ("lease_until");
