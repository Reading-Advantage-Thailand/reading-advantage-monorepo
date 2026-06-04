-- =====================================================================
-- Backfill schoolId for science_* tables (Track 2: TenantDB Adoption)
-- Idempotent: re-running produces the same result (only updates NULLs).
-- Run AFTER migration 0017.
-- =====================================================================

-- Pre-flight: check for NULL users.school_id
DO $$
DECLARE
  null_count INTEGER;
  default_school_id UUID;
BEGIN
  -- Ensure at least one school exists
  SELECT id INTO default_school_id FROM schools ORDER BY created_at LIMIT 1;
  IF default_school_id IS NULL THEN
    INSERT INTO schools (id, name, district, province, country)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Default School', 'Default District', 'Bangkok', 'Thailand')
    RETURNING id INTO default_school_id;
    RAISE NOTICE 'Created default school: %', default_school_id;
  END IF;

  -- Backfill users with NULL school_id
  SELECT count(*) INTO null_count FROM users WHERE school_id IS NULL;
  IF null_count > 0 THEN
    RAISE WARNING '% users have NULL school_id — assigning to default school', null_count;
    UPDATE users SET school_id = default_school_id WHERE school_id IS NULL;
  END IF;
END $$;

-- 1. Content tables without user FK → assign to first available school
UPDATE science_lessons SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_standards SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;

-- 2. User-scoped tables (direct user FK → users.school_id)
UPDATE gamification_profiles t SET school_id = u.school_id FROM users u WHERE t.user_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE achievements t SET school_id = u.school_id FROM users u WHERE t.user_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE science_classes t SET school_id = u.school_id FROM users u WHERE t.teacher_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE science_standard_mastery t SET school_id = u.school_id FROM users u WHERE t.student_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE science_attempts t SET school_id = u.school_id FROM users u WHERE t.student_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE science_lesson_completions t SET school_id = u.school_id FROM users u WHERE t.student_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE science_mastery_runs t SET school_id = u.school_id FROM users u WHERE t.student_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE science_assignments t SET school_id = u.school_id FROM users u WHERE t.assigned_by = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;
UPDATE science_class_students t SET school_id = u.school_id FROM users u WHERE t.student_id = u.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;

-- 3. Class-scoped tables (classId → scienceClasses.teacherId → users.school_id)
UPDATE science_curriculum_units t SET school_id = u.school_id FROM science_classes c JOIN users u ON c.teacher_id = u.id WHERE t.class_id = c.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;

-- 4. Attempt-scoped tables (attemptId → scienceAttempts.studentId → users.school_id)
UPDATE science_question_responses t SET school_id = u.school_id FROM science_attempts a JOIN users u ON a.student_id = u.id WHERE t.attempt_id = a.id AND t.school_id IS NULL AND u.school_id IS NOT NULL;

-- 5. Lesson-scoped tables (lessonId → scienceLessons.school_id)
UPDATE science_quiz_questions t SET school_id = l.school_id FROM science_lessons l WHERE t.lesson_id = l.id AND t.school_id IS NULL AND l.school_id IS NOT NULL;
UPDATE science_lesson_standards t SET school_id = l.school_id FROM science_lessons l WHERE t.lesson_id = l.id AND t.school_id IS NULL AND l.school_id IS NOT NULL;
UPDATE science_unit_lessons t SET school_id = l.school_id FROM science_lessons l WHERE t.lesson_id = l.id AND t.school_id IS NULL AND l.school_id IS NOT NULL;

-- 6. Question-scoped tables (questionId → scienceQuizQuestions.school_id)
UPDATE science_question_standards t SET school_id = q.school_id FROM science_quiz_questions q WHERE t.question_id = q.id AND t.school_id IS NULL AND q.school_id IS NOT NULL;

-- 7. Fallback: assign any remaining NULLs to default school (orphan data)
UPDATE gamification_profiles SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE achievements SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_classes SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_standards SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_standard_mastery SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_lessons SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_curriculum_units SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_quiz_questions SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_attempts SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_question_responses SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_lesson_completions SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_mastery_runs SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_assignments SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_lesson_standards SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_unit_lessons SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_class_students SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;
UPDATE science_question_standards SET school_id = (SELECT id FROM schools ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;

-- Post-backfill: verify no NULLs remain (except orphan rows)
DO $$
DECLARE
  tbl TEXT;
  null_count INTEGER;
  tables TEXT[] := ARRAY[
    'gamification_profiles', 'achievements', 'science_classes', 'science_standards',
    'science_standard_mastery', 'science_lessons', 'science_curriculum_units',
    'science_quiz_questions', 'science_attempts', 'science_question_responses',
    'science_lesson_completions', 'science_mastery_runs', 'science_assignments',
    'science_lesson_standards', 'science_unit_lessons', 'science_class_students',
    'science_question_standards'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE school_id IS NULL', tbl) INTO null_count;
    IF null_count > 0 THEN
      RAISE WARNING '% has % rows with NULL school_id (orphan data)', tbl, null_count;
    END IF;
  END LOOP;
END $$;

-- Final: make school_id NOT NULL (backfill must be complete first)
ALTER TABLE "gamification_profiles" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "achievements" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_classes" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_standards" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_standard_mastery" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_lessons" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_curriculum_units" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_quiz_questions" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_attempts" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_question_responses" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_lesson_completions" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_mastery_runs" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_assignments" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_lesson_standards" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_unit_lessons" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_class_students" ALTER COLUMN "school_id" SET NOT NULL;
ALTER TABLE "science_question_standards" ALTER COLUMN "school_id" SET NOT NULL;
