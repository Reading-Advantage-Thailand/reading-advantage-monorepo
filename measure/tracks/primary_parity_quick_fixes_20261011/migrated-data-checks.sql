-- Migrated data checks of primary_parity_quick_fixes_20261011.
-- READ ONLY. Run on primary_parity_20261011 (or on a clone with _run_ in its name).
-- Output holds counts only. No name, no username, and no class code.

-- FR-1: classes that the admin edit can rename (name + grade).
SELECT count(*) AS classes, count(*) FILTER (WHERE grade IS NULL) AS no_grade,
       count(*) FILTER (WHERE archived) AS archived FROM classrooms;

-- FR-3: students with activity in the last 7 days (the fourth tile). Compare with the tile per teacher.
SELECT count(DISTINCT u.id) AS active_students_7d
FROM users u
WHERE u.role = 'STUDENT' AND (
  EXISTS (SELECT 1 FROM user_activity a WHERE a.user_id = u.id AND a.created_at >= now() - interval '7 days')
  OR EXISTS (SELECT 1 FROM xp_logs x WHERE x.user_id = u.id AND x.created_at >= now() - interval '7 days'));
-- Newest activity of the copy (the copy has old dates when this is far in the past; make one activity in both apps first).
SELECT greatest((SELECT max(created_at) FROM user_activity), (SELECT max(created_at) FROM xp_logs)) AS newest_activity;

-- FR-5: legacy progress values of lessons in progress. The reader maps each value to a task.
SELECT progress, count(*) AS rows FROM lesson_progress
WHERE progress > 0 AND NOT is_completed GROUP BY progress ORDER BY progress;

-- FR-6: migrated quiz rows with completed = false (the case the old finish refused).
SELECT activity_type, count(*) AS rows FROM user_activity
WHERE completed = false AND activity_type IN ('MC_QUESTION','SA_QUESTION','LA_QUESTION') GROUP BY activity_type ORDER BY 1;
-- Duplicate rows per (user, activity type, target): the unique key must hold after the finish.
SELECT count(*) AS duplicate_groups FROM (
  SELECT user_id, activity_type, target_id FROM user_activity
  WHERE target_id IS NOT NULL GROUP BY 1,2,3 HAVING count(*) > 1) d;

-- FR-7: finished SAQ rows with a details object (task 8 shows the saved answer).
SELECT count(*) AS sa_rows, count(*) FILTER (WHERE details IS NOT NULL) AS with_details
FROM user_activity WHERE activity_type = 'SA_QUESTION' AND completed = true;

-- FR-9: articles with sentences. The page shows each sentence one time, in order, in 3 blocks.
SELECT count(*) AS articles, count(*) FILTER (WHERE jsonb_typeof(sentences::jsonb) = 'array') AS with_sentences,
       min(jsonb_array_length(sentences::jsonb)) FILTER (WHERE jsonb_typeof(sentences::jsonb) = 'array') AS min_sentences
FROM articles;
-- Three articles for the pair check (ids only):
SELECT id FROM articles WHERE jsonb_typeof(sentences::jsonb) = 'array' AND jsonb_array_length(sentences::jsonb) >= 7 ORDER BY id LIMIT 3;

-- FR-10: XP total before a game. The orchestrator reads this for the matched student, then after the game.
SELECT count(*) AS students, min(xp) AS min_xp, max(xp) AS max_xp FROM users WHERE role = 'STUDENT';

-- FR-11: log states of articles (saved flag) and the deck cards that exist for them.
SELECT is_sentence_and_words_saved AS saved, count(*) AS logs FROM article_activity_logs GROUP BY 1 ORDER BY 1;
SELECT count(*) AS logs_all_three_quizzes_not_saved FROM article_activity_logs
WHERE is_multiple_choice_question_completed AND is_short_answer_question_completed
  AND is_long_answer_question_completed AND NOT is_sentence_and_words_saved;
SELECT type, count(*) AS decks FROM flashcard_decks GROUP BY 1 ORDER BY 1;

-- FR-13: migrated classes by code length. The old link needs a class with an 8-character code.
SELECT length(password_students) AS len, count(*) AS classes FROM classrooms
WHERE password_students IS NOT NULL GROUP BY 1 ORDER BY 1;
-- The class id for the old-link check (the id only; read the code from the handout in the private folder):
SELECT id FROM classrooms WHERE length(password_students) = 8 ORDER BY id LIMIT 1;
