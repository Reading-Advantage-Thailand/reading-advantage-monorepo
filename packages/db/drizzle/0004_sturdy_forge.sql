-- Backfill username and display_username for existing rows where NULL
-- Strategy: use email local part (before @) as fallback, or 'user_' + id prefix
UPDATE "users"
SET "username" = COALESCE(
  "username",
  CASE
    WHEN "email" IS NOT NULL THEN split_part("email", '@', 1)
    ELSE 'user_' || "id"
  END
)
WHERE "username" IS NULL;

UPDATE "users"
SET "display_username" = COALESCE(
  "display_username",
  "username"
)
WHERE "display_username" IS NULL;

-- Enforce NOT NULL constraints to match Drizzle schema contract
-- (schema/users.ts requires username/displayUsername to be non-null)
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "display_username" SET NOT NULL;
