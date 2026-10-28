-- Reference SQL of the admin dashboard (primary_parity_admin_dashboard_20261011).
-- Run with psql on a copy of the rehearsal database (read only; no write, no temp table):
--   psql -v school=<school uuid> -v n=30 -v as_of="''" -f reference-sql.sql
-- n is 7, 30, or 90. as_of is an instant ('' means now). Every window is [t0, t1) in Asia/Bangkok.
-- audit_events.created_at is timestamptz; the other tables store UTC timestamps without a zone.
-- The Q9a peak day and daily average come from the Q9a rows (max and sum / n).

-- Q3a active students (FR-3)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select (select count(*) from act) as active, (select count(*) from stu) as total, case when (select count(*) from stu) = 0 then null else round(100.0 * (select count(*) from act) / (select count(*) from stu)) end as pct;

-- Q3b active teachers (FR-3)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select count(*) filter (where
    exists (select 1 from audit_events a, wu where a.actor_user_id = t.id and a.action = 'auth:login' and a.created_at >= wu.t0z and a.created_at < wu.t1z)
    or exists (select 1 from primary_class_login_sessions l, wu where l.teacher_id = t.id and l.created_at >= wu.t0 and l.created_at < wu.t1)) as active,
  count(*) as total
from tch t;

-- Q3c classes with activity (FR-3)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select (select count(*) from cls c where exists (select 1 from classroom_students cs join act on act.sid = cs.student_id where cs.classroom_id = c.id)) as active,
  (select count(*) from cls) as total;

-- Q3d articles opened (FR-3)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select count(*) as articles_opened from user_activity ua join stu on stu.id = ua.user_id, wu where ua.activity_type = 'ARTICLE_READ' and ua.created_at >= wu.t0 and ua.created_at < wu.t1;

-- Q3e XP earned (FR-3)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select coalesce(sum(x.xp_earned), 0) as xp_earned from xp_logs x join stu on stu.id = x.user_id, wu where x.created_at >= wu.t0 and x.created_at < wu.t1;

-- Q3f new students (FR-3)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select count(*) as new_students from stu, wu where stu.created_at >= wu.t0 and stu.created_at < wu.t1;

-- Q4 adoption by CEFR main level (FR-4)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER'), lv as (select id, coalesce(substring(cefr_level from '^[ABC][0-9]'), 'A0') as main from stu),
xpw as (select x.user_id as sid, sum(x.xp_earned) as xp from xp_logs x join stu on stu.id = x.user_id, wu where x.created_at >= wu.t0 and x.created_at < wu.t1 group by 1)
select lv.main as level, count(*) as students, count(*) filter (where act.sid is not null) as active,
       round(100.0 * count(*) filter (where act.sid is not null) / count(*)) as pct,
       round(coalesce(sum(xpw.xp), 0)::numeric / count(*)) as avg_xp
from lv left join act on act.sid = lv.id left join xpw on xpw.sid = lv.id
group by 1 order by 1;

-- Q5 adoption by class grade (FR-5)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER'), xpw as (select x.user_id as sid, sum(x.xp_earned) as xp from xp_logs x join stu on stu.id = x.user_id, wu where x.created_at >= wu.t0 and x.created_at < wu.t1 group by 1),
sg as (select distinct cs.student_id as sid, c.grade::text as grade from classroom_students cs join cls c on c.id = cs.classroom_id join stu on stu.id = cs.student_id
       union select stu.id, null from stu where not exists (select 1 from classroom_students cs join cls c on c.id = cs.classroom_id where cs.student_id = stu.id))
select coalesce(sg.grade, 'No grade') as grade, count(*) as students, count(*) filter (where act.sid is not null) as active,
       round(100.0 * count(*) filter (where act.sid is not null) / count(*)) as pct,
       round(coalesce(sum(xpw.xp), 0)::numeric / count(*)) as avg_xp
from sg left join act on act.sid = sg.sid left join xpw on xpw.sid = sg.sid
group by 1 order by min(sg.grade::int) nulls last;

-- Q6a seats (FR-7) and license alerts (FR-6)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER'), lic as (select id, max_users, status, (expiry_date at time zone 'UTC' at time zone 'Asia/Bangkok')::date as ends from licenses where school_id = :'school'::uuid)
select (select coalesce(sum(max_users), 0) from lic, wu where status = 'active' and (ends is null or ends >= wu.today)) as seats,
       (select count(*) from stu) as seats_used,
       (select min(ends - wu.today) from lic, wu where status = 'active' and ends between wu.today and wu.today + 30) as days_to_end_soon,
       (exists (select 1 from lic, wu where ends < wu.today)
        and not exists (select 1 from lic, wu where status = 'active' and (ends is null or ends >= wu.today))) as license_ended;

-- Q6b low activity alert (run with n=30, FR-6)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select (select count(*) from stu) as total, (select count(*) from act) as active_30d, case when (select count(*) from stu) = 0 then 'no alert' when 100.0 * (select count(*) from act) / (select count(*) from stu) < 10 then 'high' when 100.0 * (select count(*) from act) / (select count(*) from stu) < 30 then 'medium' else 'no alert' end as severity;

-- Q8 teachers table (FR-8)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER'), tc as (select teacher_id as tid, id as cid from classrooms where school_id = :'school'::uuid and not coalesce(archived, false) and teacher_id is not null
       union select ct.teacher_id, ct.classroom_id from classroom_teachers ct join cls on cls.id = ct.classroom_id),
ts as (select distinct tc.tid, cs.student_id as sid from tc join classroom_students cs on cs.classroom_id = tc.cid join stu on stu.id = cs.student_id)
select t.id as teacher_id, (select count(distinct cid) from tc where tc.tid = t.id) as classes,
       count(ts.sid) as students, count(act.sid) as active,
       case when count(ts.sid) = 0 then null else round(100.0 * count(act.sid) / count(ts.sid)) end as engagement
from tch t left join ts on ts.tid = t.id left join act on act.sid = ts.sid
group by t.id order by engagement desc nulls last, t.id;

-- Q9a activity by day (FR-9)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER'), d as (select generate_series(wu.today - (wu.n - 1), wu.today, interval '1 day')::date as day from wu)
select d.day, count(distinct e.sid) as active_students
from d left join (select sid, ((ts at time zone 'UTC') at time zone 'Asia/Bangkok')::date as day from evw) e on e.day = d.day
group by d.day order by d.day;

-- Q9b activity totals (FR-9)
with p as (select :n::int as n, (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
w as (
  select n, today,
         (((today - (n - 1))::timestamp) at time zone 'Asia/Bangkok') as t0z,
         (((today + 1)::timestamp) at time zone 'Asia/Bangkok') as t1z
  from p),
wu as (select n, today, t0z, t1z, (t0z at time zone 'UTC') as t0, (t1z at time zone 'UTC') as t1 from w),
stu as (select id, cefr_level, created_at from users where school_id = :'school'::uuid and role = 'STUDENT'),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select s.student_id, s.done_at from primary_student_lesson_steps s join stu on stu.id = s.student_id
            where s.status = 'done' and s.done_at is not null),
evw as (select ev.sid, ev.ts from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
act as (select distinct sid from evw),
cls as (select id, grade from classrooms where school_id = :'school'::uuid and not coalesce(archived, false)),
tch as (select id, name from users where school_id = :'school'::uuid and role = 'TEACHER')
select (select count(*) from evw) as events;
