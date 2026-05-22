-- Add legacy Prisma-origin columns to users table so Drizzle controllers can
-- read/write them. The database may already have these columns from the
-- reading-advantage Prisma migrations; ADD COLUMN IF NOT EXISTS is idempotent.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "license_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "expired_date" timestamp;
