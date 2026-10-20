-- Data checks for primary_parity_staff_student_view_20261011 (AC-2 and AC-5).
-- READ ONLY. Run on the matched new copy with :uid set to the staff user id (TEACHER, ADMIN, or SYSTEM).
-- Run BEFORE and AFTER the staff browser session (all pages, one MCQ quiz, one game, one lesson step,
-- one rehearsal step). Both result rows must be equal. Output holds counts and one XP number only.
-- docker exec -i reading-advantage-postgres psql -U postgres -d <copy> -v uid=<id> -f <this file>
--
-- AC-2: quiz, activity, XP.
-- AC-5: lesson progress and attempts on the rehearsal page.
-- Preview refuses every write, so each count below stays equal.
select
  (select count(*) from user_activity where user_id = :'uid') as user_activity_rows,
  (select count(*) from xp_logs where user_id = :'uid') as xp_log_rows,
  (select coalesce(xp, 0) from users where id = :'uid') as user_xp,
  (select count(*) from article_activity_logs where user_id = :'uid') as article_activity_rows,
  (select count(*) from lesson_progress where user_id = :'uid') as lesson_progress_rows,
  (select count(*) from primary_lesson_attempts where student_id = :'uid' or closed_by_user_id = :'uid') as lesson_attempt_rows,
  (select count(*) from primary_avatar_profile where user_id = :'uid') as avatar_profile_rows,
  (select count(*) from primary_avatar_inventory where user_id = :'uid') as avatar_inventory_rows,
  (select count(*) from primary_avatar_loadout where user_id = :'uid') as avatar_loadout_rows,
  (select count(*) from primary_gp_ledger where user_id = :'uid') as gp_ledger_rows,
  (select count(*) from flashcard_decks where user_id = :'uid') as flashcard_deck_rows,
  (select count(*) from primary_class_quest_heartbeat where user_id = :'uid') as quest_heartbeat_rows,
  (select count(*) from primary_class_quest_power_up where user_id = :'uid') as quest_power_up_rows,
  (select count(*) from primary_voice_sessions where student_user_id = :'uid') as voice_session_rows;

-- AC-4 control: run the same file with :uid set to the STUDENT user after one quiz.
-- user_activity_rows, xp_log_rows, and user_xp must rise for the student (the student path saves as before).
