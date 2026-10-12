-- Data checks of primary_parity_lesson_repeat_20261011 (acceptance checks A1 to A5).
-- READ ONLY. Run on the rehearsal copy after the browser check.
-- Output holds counts and keys only. No name, no username, and no class code.

-- A1, A2: closed attempts by reason. After one student restart: student_restart = 1.
SELECT close_reason, count(*) AS attempts, max(attempt_number) AS max_attempt
FROM primary_lesson_attempts GROUP BY close_reason ORDER BY close_reason;

-- A1: no student has two closed attempts with the same number (the unique key holds).
SELECT count(*) AS duplicate_attempts FROM (
  SELECT student_id, article_id, attempt_number FROM primary_lesson_attempts
  GROUP BY 1, 2, 3 HAVING count(*) > 1) d;   -- expect 0

-- A1: a closed attempt keeps its moved rows, and the XP logs still find them.
SELECT a.attempt_number, jsonb_array_length(a.activities) AS moved_rows,
       a.xp_earned,
       (SELECT coalesce(sum(x.xp_earned), 0) FROM xp_logs x
         WHERE x.user_id = a.student_id
           AND x.activity_id IN (SELECT e->>'id' FROM jsonb_array_elements(a.activities) e)) AS xp_logs_of_moved_rows
FROM primary_lesson_attempts a ORDER BY a.closed_at DESC LIMIT 10;   -- expect xp_earned = xp_logs_of_moved_rows

-- A2: the current attempt has new rows only: no moved id is also in user_activity.
SELECT count(*) AS rows_in_both FROM primary_lesson_attempts a, jsonb_array_elements(a.activities) e
WHERE EXISTS (SELECT 1 FROM user_activity u WHERE u.id = e->>'id');   -- expect 0

-- A3: the grid reads attempts of the class book (class_book_id and lesson_number set).
SELECT count(*) AS linked_attempts, count(*) FILTER (WHERE class_book_id IS NULL) AS unlinked_attempts
FROM primary_lesson_attempts WHERE close_reason <> 'legacy_import';

-- A4: the class runs after "Teach again". run_number 2 and one earlier run.
SELECT lesson_number, run_number, jsonb_array_length(earlier_runs) AS earlier_runs,
       taught_at IS NOT NULL AS taught, jsonb_array_length(steps_done) AS steps_done
FROM primary_class_book_lessons WHERE run_number > 1 ORDER BY lesson_number;

-- A4: one audit event per "Teach again", with counts and keys only.
SELECT count(*) AS teach_again_events FROM audit_events WHERE action = 'class_book:teach_again';

-- A5: after "Teach again", the students of the class have no step rows of the lesson.
SELECT cb.id IS NOT NULL AS class_book, count(s.id) AS step_rows
FROM primary_class_books cb
JOIN primary_class_book_lessons l ON l.class_book_id = cb.id AND l.run_number > 1
LEFT JOIN primary_student_lesson_steps s ON s.class_book_id = cb.id AND s.lesson_number = l.lesson_number
GROUP BY cb.id;   -- expect step_rows 0 until a student opens the lesson again

-- Evidence fallback: every moved quiz row id is readable by the evidence loader from the history.
SELECT count(*) AS moved_quiz_rows FROM primary_lesson_attempts a, jsonb_array_elements(a.activities) e
WHERE e->>'activityType' IN ('MC_QUESTION', 'SA_QUESTION', 'LA_QUESTION');
