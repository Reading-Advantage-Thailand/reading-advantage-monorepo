CREATE TABLE IF NOT EXISTS "codecamp_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "delivery_id" text,
  "event" text NOT NULL,
  "action" text,
  "repo_url" text,
  "pr_url" text,
  "github_username" text,
  "outcome" text NOT NULL,
  "reason" text NOT NULL,
  "payload_json" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
