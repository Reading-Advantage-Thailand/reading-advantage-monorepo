-- Repair the audited Codecamp exercise/quiz identity drift before enforcing
-- module-local lesson ordering. The entire repair and constraint admission run
-- in one PostgreSQL statement so an unexpected shape rolls back atomically.
DO $codecamp_exercise_quiz_repair$
DECLARE
  target_slug text;
  target_module_id uuid;
  corruption_count integer;
  repaired_count integer;
  suspicious_count integer;
  constraint_named boolean;
  constraint_matches boolean;
  deleted_redundant_exercise_count integer;
  corruption record;
BEGIN
  FOREACH target_slug IN ARRAY ARRAY[
    'html-css',
    'javascript',
    'typescript',
    'vitest',
    'react',
    'api-fundamentals',
    'nextjs-basics',
    'nextjs-advanced',
    'databases-orms',
    'trpc-server-actions',
    'authentication',
    'internationalization',
    'ai-integration',
    'cloud-docker'
  ]::text[] LOOP
    SELECT id
      INTO target_module_id
      FROM codecamp_modules
     WHERE slug = target_slug;

    -- Fresh databases have no curriculum rows yet; there is nothing to
    -- reconcile for a missing audited module.
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*)::integer
      INTO suspicious_count
      FROM codecamp_lessons
     WHERE module_id = target_module_id
       AND right(title, char_length(' Exercise + Quiz')) = ' Exercise + Quiz';

    SELECT COUNT(*)::integer
      INTO corruption_count
      FROM (
        SELECT first_lesson.id AS exercise_lesson_id,
               retained_quiz.id AS quiz_lesson_id
          FROM codecamp_lessons AS first_lesson
          JOIN codecamp_lessons AS retained_quiz
            ON retained_quiz.module_id = first_lesson.module_id
           AND retained_quiz."order" = first_lesson."order" + 1
           AND retained_quiz.title = first_lesson.title
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS exercise_count
              FROM codecamp_exercises
             WHERE lesson_id = first_lesson.id
          ) AS first_exercises ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS question_count
              FROM codecamp_quiz_questions
             WHERE lesson_id = first_lesson.id
          ) AS first_questions ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS exercise_count
              FROM codecamp_exercises
             WHERE lesson_id = retained_quiz.id
          ) AS retained_exercises ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS question_count
              FROM codecamp_quiz_questions
             WHERE lesson_id = retained_quiz.id
          ) AS retained_questions ON true
         WHERE first_lesson.module_id = target_module_id
           AND first_lesson.type = 'quiz'::codecamp_lesson_type
           AND retained_quiz.type = 'quiz'::codecamp_lesson_type
           AND right(first_lesson.title, char_length(' Exercise + Quiz')) = ' Exercise + Quiz'
           AND first_exercises.exercise_count = 1
           AND first_questions.question_count = 0
           AND retained_exercises.exercise_count = 1
           AND retained_questions.question_count = 5
      ) AS candidates;

    IF corruption_count > 1 THEN
      RAISE EXCEPTION
        '0047 refused ambiguous Codecamp corruption for module slug %',
        target_slug;
    END IF;

    IF corruption_count = 1 THEN
      IF suspicious_count <> 2 THEN
        RAISE EXCEPTION
          '0047 refused unexpected Codecamp lesson shape for module slug %',
          target_slug;
      END IF;

      SELECT candidate.*
        INTO corruption
        FROM (
          SELECT first_lesson.id AS exercise_lesson_id,
                 retained_quiz.id AS quiz_lesson_id
            FROM codecamp_lessons AS first_lesson
            JOIN codecamp_lessons AS retained_quiz
              ON retained_quiz.module_id = first_lesson.module_id
             AND retained_quiz."order" = first_lesson."order" + 1
             AND retained_quiz.title = first_lesson.title
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::integer AS exercise_count
                FROM codecamp_exercises
               WHERE lesson_id = first_lesson.id
            ) AS first_exercises ON true
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::integer AS question_count
                FROM codecamp_quiz_questions
               WHERE lesson_id = first_lesson.id
            ) AS first_questions ON true
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::integer AS exercise_count
                FROM codecamp_exercises
               WHERE lesson_id = retained_quiz.id
            ) AS retained_exercises ON true
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::integer AS question_count
                FROM codecamp_quiz_questions
               WHERE lesson_id = retained_quiz.id
            ) AS retained_questions ON true
           WHERE first_lesson.module_id = target_module_id
             AND first_lesson.type = 'quiz'::codecamp_lesson_type
             AND retained_quiz.type = 'quiz'::codecamp_lesson_type
             AND right(first_lesson.title, char_length(' Exercise + Quiz')) = ' Exercise + Quiz'
             AND first_exercises.exercise_count = 1
             AND first_questions.question_count = 0
             AND retained_exercises.exercise_count = 1
             AND retained_questions.question_count = 5
        ) AS candidate;

      -- Keep both lesson IDs in place. Only the redundant exercise children
      -- attached to the retained quiz are removed; questions and progress are
      -- intentionally untouched.
      DELETE FROM codecamp_exercises
       WHERE lesson_id = corruption.quiz_lesson_id;
      GET DIAGNOSTICS deleted_redundant_exercise_count = ROW_COUNT;
      IF deleted_redundant_exercise_count <> 1 THEN
        RAISE EXCEPTION
          '0047 refused unexpected redundant exercise count for module slug %',
          target_slug;
      END IF;

      UPDATE codecamp_lessons
         SET title = regexp_replace(title, ' Exercise \+ Quiz$', ' Exercise'),
             type = 'exercise'::codecamp_lesson_type
       WHERE id = corruption.exercise_lesson_id;

      UPDATE codecamp_lessons
         SET title = regexp_replace(title, ' Exercise \+ Quiz$', ' Quiz'),
             type = 'quiz'::codecamp_lesson_type
       WHERE id = corruption.quiz_lesson_id;

      IF NOT EXISTS (
        SELECT 1
          FROM codecamp_lessons AS exercise_lesson
          JOIN codecamp_lessons AS quiz_lesson
            ON quiz_lesson.id = corruption.quiz_lesson_id
         WHERE exercise_lesson.id = corruption.exercise_lesson_id
           AND exercise_lesson.module_id = target_module_id
           AND quiz_lesson.module_id = target_module_id
           AND exercise_lesson."order" + 1 = quiz_lesson."order"
           AND exercise_lesson.type = 'exercise'::codecamp_lesson_type
           AND quiz_lesson.type = 'quiz'::codecamp_lesson_type
           AND exercise_lesson.title = regexp_replace(quiz_lesson.title, ' Quiz$', ' Exercise')
           AND (SELECT COUNT(*) FROM codecamp_exercises WHERE lesson_id = exercise_lesson.id) = 1
           AND (SELECT COUNT(*) FROM codecamp_quiz_questions WHERE lesson_id = exercise_lesson.id) = 0
           AND (SELECT COUNT(*) FROM codecamp_exercises WHERE lesson_id = quiz_lesson.id) = 0
           AND (SELECT COUNT(*) FROM codecamp_quiz_questions WHERE lesson_id = quiz_lesson.id) = 5
      ) THEN
        RAISE EXCEPTION
          '0047 post-repair assertion failed for module slug %',
          target_slug;
      END IF;

      CONTINUE;
    END IF;

    -- A second run sees the already repaired exercise/quiz pair. Treat any
    -- leftover combined title as an unexpected partial repair and fail closed.
    SELECT COUNT(*)::integer
      INTO repaired_count
      FROM (
        SELECT first_lesson.id AS exercise_lesson_id,
               retained_quiz.id AS quiz_lesson_id
          FROM codecamp_lessons AS first_lesson
          JOIN codecamp_lessons AS retained_quiz
            ON retained_quiz.module_id = first_lesson.module_id
           AND retained_quiz."order" = first_lesson."order" + 1
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS exercise_count
              FROM codecamp_exercises
             WHERE lesson_id = first_lesson.id
          ) AS first_exercises ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS question_count
              FROM codecamp_quiz_questions
             WHERE lesson_id = first_lesson.id
          ) AS first_questions ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS exercise_count
              FROM codecamp_exercises
             WHERE lesson_id = retained_quiz.id
          ) AS retained_exercises ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::integer AS question_count
              FROM codecamp_quiz_questions
             WHERE lesson_id = retained_quiz.id
          ) AS retained_questions ON true
         WHERE first_lesson.module_id = target_module_id
           AND first_lesson.type = 'exercise'::codecamp_lesson_type
           AND retained_quiz.type = 'quiz'::codecamp_lesson_type
           AND first_lesson.title = regexp_replace(retained_quiz.title, ' Quiz$', ' Exercise')
           AND first_lesson.title <> retained_quiz.title
           AND first_exercises.exercise_count = 1
           AND first_questions.question_count = 0
           AND retained_exercises.exercise_count = 0
           AND retained_questions.question_count = 5
      ) AS repaired_candidates;

    IF repaired_count > 1 THEN
      RAISE EXCEPTION
        '0047 refused ambiguous repaired Codecamp shape for module slug %',
        target_slug;
    END IF;

    IF repaired_count = 0 AND suspicious_count > 0 THEN
      RAISE EXCEPTION
        '0047 refused unexpected Codecamp lesson shape for module slug %',
        target_slug;
    END IF;
  END LOOP;

  -- The unique constraint must be admitted only after every module-local
  -- duplicate position has been reconciled. This global check also prevents
  -- an unrelated duplicate from being hidden by a late DDL error.
  IF EXISTS (
    SELECT 1
      FROM codecamp_lessons
     GROUP BY module_id, "order"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      '0047 refused to add codecamp lesson order uniqueness while duplicate positions remain';
  END IF;

  -- Admit the schema invariant idempotently, while refusing a same-named
  -- constraint with a different shape.
  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint AS constraint_record
      JOIN pg_class AS relation
        ON relation.oid = constraint_record.conrelid
      JOIN pg_namespace AS namespace
        ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname = 'codecamp_lessons'
       AND constraint_record.conname = 'codecamp_lessons_module_order_unique'
  )
    INTO constraint_named;

  IF constraint_named THEN
    SELECT EXISTS (
      SELECT 1
        FROM pg_constraint AS constraint_record
        JOIN pg_class AS relation
          ON relation.oid = constraint_record.conrelid
        JOIN pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
       WHERE namespace.nspname = 'public'
         AND relation.relname = 'codecamp_lessons'
         AND constraint_record.conname = 'codecamp_lessons_module_order_unique'
         AND constraint_record.contype = 'u'
         AND constraint_record.conkey = ARRAY[
           (SELECT attnum
              FROM pg_attribute
             WHERE attrelid = relation.oid
               AND attname = 'module_id'),
           (SELECT attnum
              FROM pg_attribute
             WHERE attrelid = relation.oid
               AND attname = 'order')
         ]::smallint[]
    )
      INTO constraint_matches;

    IF NOT constraint_matches THEN
      RAISE EXCEPTION
        '0047 refused existing codecamp_lessons_module_order_unique with an unexpected shape';
    END IF;
  ELSE
    ALTER TABLE "codecamp_lessons"
      ADD CONSTRAINT "codecamp_lessons_module_order_unique"
      UNIQUE ("module_id", "order");
  END IF;
END
$codecamp_exercise_quiz_repair$;
