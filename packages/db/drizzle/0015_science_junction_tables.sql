-- =====================================================================
-- Migration 0015: Science M:N Junction Tables (Track 3 schema gap fix)
-- Adds the 4 explicit junction tables that Prisma created implicitly:
--   _LessonToStandard         → science_lesson_standards
--   _CurriculumUnitToLesson   → science_unit_lessons
--   _ClassToStudent           → science_class_students
--   _QuizQuestionToStandard   → science_question_standards
-- These were missed in Track 1's schema unification (0013).
-- See: measure/tracks/prisma_drizzle_science_controllers_20260505/plan.md
-- =====================================================================

CREATE TABLE IF NOT EXISTS "science_lesson_standards" (
  "lesson_id"   uuid NOT NULL REFERENCES "science_lessons"("id")   ON DELETE CASCADE,
  "standard_id" uuid NOT NULL REFERENCES "science_standards"("id") ON DELETE CASCADE,
  PRIMARY KEY ("lesson_id", "standard_id")
);

CREATE TABLE IF NOT EXISTS "science_unit_lessons" (
  "unit_id"   uuid NOT NULL REFERENCES "science_curriculum_units"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "science_lessons"("id")          ON DELETE CASCADE,
  PRIMARY KEY ("unit_id", "lesson_id")
);

CREATE TABLE IF NOT EXISTS "science_class_students" (
  "class_id"   uuid NOT NULL REFERENCES "science_classes"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "users"("id")           ON DELETE CASCADE,
  PRIMARY KEY ("class_id", "student_id")
);

CREATE TABLE IF NOT EXISTS "science_question_standards" (
  "question_id" uuid NOT NULL REFERENCES "science_quiz_questions"("id") ON DELETE CASCADE,
  "standard_id" uuid NOT NULL REFERENCES "science_standards"("id")      ON DELETE CASCADE,
  PRIMARY KEY ("question_id", "standard_id")
);
