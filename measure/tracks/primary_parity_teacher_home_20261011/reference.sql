-- Reference SQL for the teacher home (FR-1, FR-2). SELECT only.
-- Run: psql -v teacher_id=<users.id of a TEACHER> -f reference.sql
-- To fix the clock, replace now() in "base" with a timestamptz literal.
with base as (
  select (now() at time zone 'Asia/Bangkok')::date as today
), t as (
  select id, school_id from users where id = :'teacher_id'
), cls as (
  select c.id, c.name, c.grade from classrooms c join t on c.school_id = t.school_id
  where c.archived = false
    and (c.teacher_id = t.id or c.id in (select classroom_id from classroom_teachers where teacher_id = t.id))
), roster as (
  select distinct cs.classroom_id, cs.student_id as sid
  from classroom_students cs join cls on cls.id = cs.classroom_id
  join users u on u.id = cs.student_id and u.role = 'STUDENT' and u.school_id = (select school_id from t)
), students as (
  select distinct sid from roster
), ev as (
  select ua.user_id as sid, ((ua.created_at at time zone 'UTC') at time zone 'Asia/Bangkok')::date as d
    from user_activity ua join students s on s.sid = ua.user_id
  union all select x.user_id, ((x.created_at at time zone 'UTC') at time zone 'Asia/Bangkok')::date
    from xp_logs x join students s on s.sid = x.user_id
  union all select l.student_id, ((l.done_at at time zone 'UTC') at time zone 'Asia/Bangkok')::date
    from primary_student_lesson_steps l join students s on s.sid = l.student_id
    where l.status = 'done' and l.done_at is not null
), xp as (
  select x.user_id as sid, ((x.created_at at time zone 'UTC') at time zone 'Asia/Bangkok')::date as d, x.xp_earned
    from xp_logs x join students s on s.sid = x.user_id
), summary as (
  select
    (select count(*) from cls) as classes,
    (select count(*) from students) as students,
    (select count(distinct e.sid) from ev e, base b where e.d between b.today - 29 and b.today) as active_students_30d,
    (select count(distinct e.sid) from ev e, base b where e.d = b.today) as active_today,
    (select round(avg(u.level)::numeric, 1) from users u join students s on s.sid = u.id) as average_level,
    (select count(*) from student_assignments sa join assignments a on a.id = sa.assignment_id
       join cls on cls.id = a.classroom_id, base b
      where (sa.completed = true or sa.status = 'COMPLETED') and sa.completed_at is not null
        and ((sa.completed_at at time zone 'UTC') at time zone 'Asia/Bangkok')::date = b.today) as completed_today
), rows as (
  select cls.id, cls.name, cls.grade,
    (select count(*) from roster r where r.classroom_id = cls.id) as students,
    (select count(distinct e.sid) from ev e, base b join roster r on true
      where r.classroom_id = cls.id and e.sid = r.sid and e.d between b.today - 6 and b.today) as active_7d,
    (select round(avg(u.level)::numeric, 1) from roster r join users u on u.id = r.sid where r.classroom_id = cls.id) as average_level,
    (select coalesce(sum(x.xp_earned), 0) from xp x, base b join roster r on true
      where r.classroom_id = cls.id and x.sid = r.sid and x.d between b.today - 6 and b.today) as xp_7d,
    (select coalesce(sum(x.xp_earned), 0) from xp x, base b join roster r on true
      where r.classroom_id = cls.id and x.sid = r.sid and x.d between b.today - 13 and b.today - 7) as xp_previous_7d
  from cls
)
select 'summary' as part, row_to_json(summary)::text as value from summary
union all
select 'class', row_to_json(z)::text from (
  select name, grade, students, active_7d,
    case when students = 0 then 0 else round(100.0 * active_7d / students) end as active_rate_7d,
    average_level, xp_7d, xp_previous_7d,
    case when xp_previous_7d = 0 and xp_7d > 0 then 'up'
         when xp_previous_7d > 0 and (xp_7d - xp_previous_7d)::numeric / xp_previous_7d > 0.05 then 'up'
         when xp_previous_7d > 0 and (xp_7d - xp_previous_7d)::numeric / xp_previous_7d < -0.05 then 'down'
         else 'flat' end as trend,
    case when students = 0 then 'noStudents'
         when round(100.0 * active_7d / students) >= 70 then 'onTrack'
         when round(100.0 * active_7d / students) >= 40 then 'someQuiet'
         else 'needsAttention' end as status
  from rows order by name) z;
