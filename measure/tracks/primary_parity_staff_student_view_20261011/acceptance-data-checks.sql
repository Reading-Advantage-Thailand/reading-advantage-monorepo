-- Data checks for primary_parity_staff_student_view_20261011 (AC-2 and AC-5).
-- Run on the matched new copy with :uid set to the TEACHER user id. Run BEFORE and AFTER the
-- browser step. Both result rows must match. Read only.
-- docker exec -i reading-advantage-postgres psql -U postgres -d <copy> -v uid=<id> -f <this file>
select
  (select count(*) from user_activity where user_id = :'uid') as user_activity_rows,
  (select count(*) from xp_logs where user_id = :'uid') as xp_log_rows,
  (select coalesce(xp, 0) from users where id = :'uid') as user_xp,
  (select count(*) from lesson_progress where user_id = :'uid') as lesson_progress_rows,
  (select count(*) from article_activity_logs where user_id = :'uid') as article_activity_rows;
