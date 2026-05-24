-- Add `grade_level` to `users`. The legacy Prisma `user` model (science-
-- advantage) had a nullable `gradeLevel` Int that several reads still depend
-- on (recommendation pipeline, mastery profile, intervention alerts, schema
-- tests). The reading-advantage Prisma migrations also created this column
-- in production, so ADD COLUMN IF NOT EXISTS is idempotent.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grade_level" integer;
