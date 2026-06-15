-- =====================================================================
-- Migration 0017: Science Tables schoolId (Track 2 TenantDB Adoption)
-- Adds school_id UUID (nullable) to all 17 science_* tables + junction
-- tables + gamification_profiles + achievements. Indexes added inline.
--
-- Zero-downtime path: add nullable → backfill (Phase 3) → set NOT NULL.
-- For dev/test: column added as nullable; backfill script sets NOT NULL.
-- See: measure/tracks/tenant_db_school_id_20260603/spec.md
-- =====================================================================

-- 1. gamification_profiles
ALTER TABLE "gamification_profiles" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "gamification_profiles_school_id_idx" ON "gamification_profiles" ("school_id");
--> statement-breakpoint

-- 2. achievements
ALTER TABLE "achievements" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "achievements_school_id_idx" ON "achievements" ("school_id");
--> statement-breakpoint

-- 3. science_classes
ALTER TABLE "science_classes" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_classes_school_teacher_idx" ON "science_classes" ("school_id", "teacher_id");
--> statement-breakpoint

-- 4. science_standards
ALTER TABLE "science_standards" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_standards_school_id_idx" ON "science_standards" ("school_id");
--> statement-breakpoint

-- 5. science_standard_mastery
ALTER TABLE "science_standard_mastery" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_standard_mastery_school_student_idx" ON "science_standard_mastery" ("school_id", "student_id");
--> statement-breakpoint

-- 6. science_lessons
ALTER TABLE "science_lessons" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_lessons_school_grade_idx" ON "science_lessons" ("school_id", "grade_level");
--> statement-breakpoint

-- 7. science_curriculum_units
ALTER TABLE "science_curriculum_units" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_curriculum_units_school_class_idx" ON "science_curriculum_units" ("school_id", "class_id");
--> statement-breakpoint

-- 8. science_quiz_questions
ALTER TABLE "science_quiz_questions" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_quiz_questions_school_lesson_idx" ON "science_quiz_questions" ("school_id", "lesson_id");
--> statement-breakpoint

-- 9. science_attempts
ALTER TABLE "science_attempts" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_attempts_school_student_idx" ON "science_attempts" ("school_id", "student_id");
--> statement-breakpoint

-- 10. science_question_responses
ALTER TABLE "science_question_responses" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_question_responses_school_attempt_idx" ON "science_question_responses" ("school_id", "attempt_id");
--> statement-breakpoint

-- 11. science_lesson_completions
ALTER TABLE "science_lesson_completions" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_lesson_completions_school_student_idx" ON "science_lesson_completions" ("school_id", "student_id");
--> statement-breakpoint

-- 12. science_mastery_runs
ALTER TABLE "science_mastery_runs" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_mastery_runs_school_student_idx" ON "science_mastery_runs" ("school_id", "student_id");
--> statement-breakpoint

-- 13. science_assignments
ALTER TABLE "science_assignments" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_assignments_school_class_idx" ON "science_assignments" ("school_id", "class_id");
--> statement-breakpoint

-- 14. science_lesson_standards (junction)
ALTER TABLE "science_lesson_standards" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_lesson_standards_school_id_idx" ON "science_lesson_standards" ("school_id");
--> statement-breakpoint

-- 15. science_unit_lessons (junction)
ALTER TABLE "science_unit_lessons" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_unit_lessons_school_id_idx" ON "science_unit_lessons" ("school_id");
--> statement-breakpoint

-- 16. science_class_students (junction)
ALTER TABLE "science_class_students" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_class_students_school_student_idx" ON "science_class_students" ("school_id", "student_id");
--> statement-breakpoint

-- 17. science_question_standards (junction)
ALTER TABLE "science_question_standards" ADD COLUMN "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "science_question_standards_school_id_idx" ON "science_question_standards" ("school_id");
--> statement-breakpoint
