WITH renumbered AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "user_id", "scenario_id"
      ORDER BY "created_at", "id"
    )::integer AS "attempt_number"
  FROM "sales_roleplay_attempts"
)
UPDATE "sales_roleplay_attempts" AS attempt
SET "attempt_number" = renumbered."attempt_number"
FROM renumbered
WHERE attempt."id" = renumbered."id";
--> statement-breakpoint
ALTER TABLE "sales_roleplay_attempts"
  ADD CONSTRAINT "sales_roleplay_attempts_user_scenario_number_unique"
  UNIQUE ("user_id", "scenario_id", "attempt_number");
