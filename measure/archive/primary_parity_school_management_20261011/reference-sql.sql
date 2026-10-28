-- Reference SQL of the school license view (primary_parity_school_management_20261011, S4).
-- Run read only on a copy of the rehearsal database:
--   psql -v school=<school uuid> -v page=1 -f reference-sql.sql
-- Seats follow FR-7 of primary_parity_admin_dashboard_20261011: status 'active' and
-- (expiry_date is null or expiry_date >= today). Seats used = STUDENT users of the school.

-- L1: licenses of the school (one row for each license)
select id, coalesce(name, school_name) as name, status, start_date, expiry_date, max_users,
       (status = 'active' and (expiry_date is null or expiry_date >= now())) as counts_for_seats
from licenses where school_id = :'school'::uuid order by start_date nulls last, created_at;

-- L2: seats, seats used, seats free, over the limit
with seats as (
  select coalesce(sum(max_users), 0)::int as seats from licenses
  where school_id = :'school'::uuid and status = 'active' and (expiry_date is null or expiry_date >= now())),
used as (select count(*)::int as used from users where school_id = :'school'::uuid and role = 'STUDENT')
select seats, used, greatest(seats - used, 0) as free, greatest(used - seats, 0) as over from seats, used;

-- L3: seat holders, page :page of 50 (name, username, classes, join date)
select u.name, u.username,
       coalesce(string_agg(distinct c.name, ', ' order by c.name), '') as classes,
       u.created_at as joined
from users u
left join classroom_students cs on cs.student_id = u.id
left join classrooms c on c.id = cs.classroom_id and c.school_id = u.school_id
where u.school_id = :'school'::uuid and u.role = 'STUDENT'
group by u.id order by u.name, u.id
limit 50 offset (:page::int - 1) * 50;

-- L4: legacy figure for the difference (all users of the school, any role)
select count(*) as legacy_users from users where school_id = :'school'::uuid;

-- L5: rows written without a school by an import (must be 0 after a SYSTEM import into school X)
select (select count(*) from users where school_id is null and role in ('STUDENT','TEACHER')) as users_without_school,
       (select count(*) from classrooms where school_id is null) as classes_without_school;

-- ---------------------------------------------------------------------------------------------
-- Acceptance data checks (Phase A). Run read only after each browser step, on the capture clone.
-- psql -v school=<school uuid> -v class=<class uuid> -v teacher=<user id> -f reference-sql.sql
-- ---------------------------------------------------------------------------------------------

-- A1 (AC-1): teacher pairs of a class; the owner row must stay
select ct.teacher_id, (ct.teacher_id = c.teacher_id) as is_owner
from classrooms c left join classroom_teachers ct on ct.classroom_id = c.id
where c.id = :'class'::uuid order by 1;

-- A2 (AC-1): teacher pairs whose user is not a TEACHER of the class school. Baseline of the copy on
-- 2026-10-12: 2 rows (one ADMIN user is a co-teacher of 2 classes of its own school, from the import).
-- A run must not add a row.
select ct.classroom_id, ct.teacher_id
from classroom_teachers ct join classrooms c on c.id = ct.classroom_id
left join users u on u.id = ct.teacher_id
where u.id is null or u.school_id is distinct from c.school_id or u.role <> 'TEACHER';

-- A3 (AC-3): school, role, classes of a moved teacher; the links must be in the new school
select u.id, u.school_id, u.role,
       (select count(*) from classroom_teachers ct join classrooms c on c.id = ct.classroom_id
         where ct.teacher_id = u.id and c.school_id is distinct from u.school_id) as links_in_other_school,
       (select count(*) from classrooms c where c.teacher_id = u.id and c.school_id is distinct from u.school_id) as owned_in_other_school
from users u where u.id = :'teacher';

-- A4 (AC-6): role and sessions of a changed user (role ADMIN, sessions 0 right after the change)
select u.role, (select count(*) from sessions s where s.user_id = u.id) as sessions,
       (select count(*) from user_roles ur where ur.user_id = u.id) as user_roles
from users u where u.id = :'teacher';

-- A5 (AC-6): audit events of role changes and school moves (ids and roles only)
select action, target_id, created_at from audit_events
where action in ('user:role_changed') or action ilike '%school%move%' order by created_at desc limit 10;

-- A6 (AC-2): rows without a school after the run (same as L5; users_without_school may keep the
-- baseline of the copy, 1 TEACHER row on 2026-10-12; classes_without_school must be 0)
select (select count(*) from users where school_id is null and role in ('STUDENT','TEACHER')) as users_without_school,
       (select count(*) from classrooms where school_id is null) as classes_without_school;

-- A7 (AC-3): teachers list for a school on the migrated shape (TEACHER and ADMIN rows)
select role, count(*) from users where school_id = :'school'::uuid and role in ('TEACHER','ADMIN') group by role order by role;
