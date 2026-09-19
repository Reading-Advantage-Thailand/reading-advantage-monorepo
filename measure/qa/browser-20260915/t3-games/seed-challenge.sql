-- QA test data for T3 browser games sweep (qa_browser_sweep_20260915).
-- Seeds one active, supported class challenge for QA Class A so the student
-- challenge catalog flow and the challengeId launch path can be exercised.
-- Test data only; not application code. Idempotent.
INSERT INTO game_challenge_definitions
  (id, school_id, class_id, created_by_user_id, creation_key, title,
   game_id, game_version, content_mode, content_locale, content_json,
   seed, difficulty, modality_json, starts_at, expires_at, target,
   teacher_participation_enabled)
SELECT gen_random_uuid(), s.id, c.id, u.id, gen_random_uuid(),
   'QA Wizard Sprint', 'wizard-vs-zombie', '2026-09-09.1', 'vocabulary', 'th',
   '{"mode":"vocabulary","items":[{"term":"bridge","translation":"สะพาน"},{"term":"forest","translation":"ป่า"},{"term":"castle","translation":"ปราสาท"},{"term":"wizard","translation":"พ่อมด"}]}'::jsonb,
   29, 'medium',
   '{"modality":"reading","promptLocale":"th-TH","answerLocale":"en-US","promptField":"translation","answerField":"term","scored":true}'::jsonb,
   now() - interval '1 day', now() + interval '7 days', 10, false
FROM users u
JOIN schools s ON s.name = 'QA School A'
JOIN classrooms c ON c.school_id = s.id AND c.name = 'QA Class A'
WHERE u.username = 'qa-teacher-a'
  AND NOT EXISTS (
    SELECT 1 FROM game_challenge_definitions d
    WHERE d.title = 'QA Wizard Sprint' AND d.class_id = c.id
  );

SELECT d.title, d.game_id, d.game_version, d.difficulty, d.starts_at, d.expires_at, c.name AS class
FROM game_challenge_definitions d JOIN classrooms c ON c.id = d.class_id;
