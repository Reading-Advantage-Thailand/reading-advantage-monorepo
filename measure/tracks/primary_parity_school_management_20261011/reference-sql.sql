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
