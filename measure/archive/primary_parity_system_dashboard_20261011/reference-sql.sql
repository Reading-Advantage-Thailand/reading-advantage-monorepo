-- Reference SQL of the system dashboard (primary_parity_system_dashboard_20261011). Read only.
-- Run with psql on a copy of the rehearsal database:
--   psql -v as_of= -f reference-sql.sql
-- as_of is an instant ('' means now). "This week" is the last 7 Bangkok calendar days, today included: [t0, t1).
-- audit_events is not used. The activity tables store UTC timestamps without a zone.
-- Q-A returns the totals (FR-2). Q-B returns one row for each school (FR-3, FR-4). Q-C returns the students without a school.

-- Q-A platform totals (FR-2): schools, students, teachers, active students, articles opened, seats used, seats
with p as (select (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
wu as (select (((today - 6)::timestamp) at time zone 'Asia/Bangkok') at time zone 'UTC' as t0,
               (((today + 1)::timestamp) at time zone 'Asia/Bangkok') at time zone 'UTC' as t1, today from p),
stu as (select id, school_id from users where role = 'STUDENT' and school_id is not null),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select l.student_id, l.done_at from primary_student_lesson_steps l join stu on stu.id = l.student_id
            where l.status = 'done' and l.done_at is not null),
act as (select distinct ev.sid from ev, wu where ev.ts >= wu.t0 and ev.ts < wu.t1),
lic as (
  select l.school_id, sum(l.max_users) as seats from licenses l, wu
  where l.status = 'active' and (l.expiry_date is null or (l.expiry_date at time zone 'UTC' at time zone 'Asia/Bangkok')::date >= wu.today)
  group by l.school_id)
select (select count(*) from schools) as schools,
       (select count(*) from stu) as students,
       (select count(*) from users where role = 'TEACHER' and school_id is not null) as teachers,
       (select count(*) from act) as active_students,
       (select count(*) from user_activity ua join stu on stu.id = ua.user_id, wu
         where ua.activity_type = 'ARTICLE_READ' and ua.created_at >= wu.t0 and ua.created_at < wu.t1) as articles_opened,
       -- seats used counts the students of the schools that have a license with seats
       (select count(*) from stu join lic on lic.school_id = stu.school_id where lic.seats > 0) as seats_used,
       (select coalesce(sum(seats), 0) from lic where seats > 0) as seats;

-- Q-B schools table (FR-3, FR-4): one row for each school; the quiet flag is computed here the same way as in the domain
with p as (select (coalesce(nullif(:'as_of','')::timestamptz, now()) at time zone 'Asia/Bangkok')::date as today),
wu as (select (((today - 6)::timestamp) at time zone 'Asia/Bangkok') at time zone 'UTC' as t0,
               (((today + 1)::timestamp) at time zone 'Asia/Bangkok') at time zone 'UTC' as t1, today from p),
stu as (select id, school_id from users where role = 'STUDENT' and school_id is not null),
ev as (
  select ua.user_id as sid, ua.created_at as ts from user_activity ua join stu on stu.id = ua.user_id
  union all select x.user_id, x.created_at from xp_logs x join stu on stu.id = x.user_id
  union all select l.student_id, l.done_at from primary_student_lesson_steps l join stu on stu.id = l.student_id
            where l.status = 'done' and l.done_at is not null),
last_by_school as (select stu.school_id, max(ev.ts) as last_ts from ev join stu on stu.id = ev.sid group by stu.school_id),
active_by_school as (select stu.school_id, count(distinct ev.sid) as active from ev join stu on stu.id = ev.sid, wu
                      where ev.ts >= wu.t0 and ev.ts < wu.t1 group by stu.school_id),
articles_by_school as (select stu.school_id, count(*) as n from user_activity ua join stu on stu.id = ua.user_id, wu
                        where ua.activity_type = 'ARTICLE_READ' and ua.created_at >= wu.t0 and ua.created_at < wu.t1 group by stu.school_id),
students_by_school as (select school_id, count(*) as n from stu group by school_id),
lic as (
  select l.school_id, sum(l.max_users) as seats from licenses l, wu
  where l.status = 'active' and (l.expiry_date is null or (l.expiry_date at time zone 'UTC' at time zone 'Asia/Bangkok')::date >= wu.today)
  group by l.school_id)
select s.id, s.name,
       coalesce(sb.n, 0) as students,
       coalesce(a.active, 0) as active_students,
       case when coalesce(sb.n, 0) = 0 then null else round(100.0 * coalesce(a.active, 0) / sb.n) end as active_percent,
       coalesce(ar.n, 0) as articles_opened,
       coalesce(sb.n, 0) as seats_used,
       case when coalesce(lic.seats, 0) > 0 then lic.seats end as seats,   -- null means "No license"
       to_char(lb.last_ts at time zone 'UTC' at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as last_activity_day,
       case when coalesce(sb.n, 0) = 0 then 'No students'
            when lb.last_ts is null or lb.last_ts < wu.t0 then 'Quiet'
            else 'Active' end as status
from schools s
cross join wu
left join students_by_school sb on sb.school_id = s.id
left join active_by_school a on a.school_id = s.id
left join articles_by_school ar on ar.school_id = s.id
left join last_by_school lb on lb.school_id = s.id
left join lic on lic.school_id = s.id
order by (case when coalesce(sb.n, 0) > 0 and (lb.last_ts is null or lb.last_ts < wu.t0) then 0 when coalesce(sb.n, 0) > 0 then 1 else 2 end), s.name;

-- Q-C students without a school (FR-2)
select count(*) as students_without_school from users where role = 'STUDENT' and school_id is null;
