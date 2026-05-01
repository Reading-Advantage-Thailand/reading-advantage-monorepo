-- Step 1: Add the column, but allow NULL temporarily
ALTER TABLE "public"."user_lesson_progress" ADD COLUMN "assignment_id" TEXT;

-- Step 2: Populate existing records with a valid assignment_id
-- !!! IMPORTANT: Replace 'a_valid_assignment_id_from_your_db' with a real ID !!!
UPDATE "public"."user_lesson_progress" SET "assignment_id" = 'cmguzcw5i001ht7l9bsaocswx' WHERE "assignment_id" IS NULL;

-- Step 3: Now that all rows have a value, set the column to NOT NULL
ALTER TABLE "public"."user_lesson_progress" ALTER COLUMN "assignment_id" SET NOT NULL;

-- AddForeignKey (Keep the ForeignKey addition as it was)
ALTER TABLE "public"."user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;