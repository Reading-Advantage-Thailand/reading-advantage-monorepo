# Behavior contract — primary_parity_school_management_20261011

Legacy facts are at legacy revision `bfea121` unless a commit is named. Paths of the app are relative
to `apps/primary-advantage`. The spec (section Evidence) holds the full evidence list.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| ADM-03 | Admin gives teachers to a class | Admin manages all users, classes, and licenses of the school (ADM-02 note) | 2026-10-11 |
| ADM-04 | SYSTEM imports into a chosen school | SYSTEM gives white-glove import to schools; the import has a school selector | 2026-10-11 |
| SYS-05 | SYSTEM moves a teacher to another school | Port of legacy commits `b01e5e0`, `1c8ce3d` | 2026-10-11 |
| License view | School license view | View only; the seat holders are the students | 2026-10-11 |
| S5 (regression) | Teacher role change takes effect | Found in this check; legacy sets `User.role` | 2026-10-12 |
| Member questions | Seat rule, owned classes on a move, owner on a class | Spec defaults used (owner decision 2026-10-12: no stop) | 2026-10-12 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Class edit dialog, teacher list | ADMIN, SYSTEM | Checks and unchecks teachers, saves | `PUT /api/classrooms/[id]` with `assignedTeacherIds`; one transaction; diff on `ClassroomTeachers` | `components/admin/classrooms-table.tsx:110-136, 214-227, 593-616`; `server/models/classroomModel.ts:396-467` |
| Class edit, teacher of another school | ADMIN, SYSTEM | Sends the id | 400 `CROSS_SCHOOL_TEACHER`, no change | `server/controllers/classroomController.ts:154-168` |
| Import page, school choice | SYSTEM | Chooses a school; upload is off until then | Form field `schoolId`; rows get that school | `app/[locale]/admin/import-data/page.tsx:79, 103-115, 189-190, 415+, 575-579` (commit `3ee5033`) |
| Upload route | SYSTEM, ADMIN | Uploads a file | SYSTEM without a valid `schoolId` gets 400; other roles ignore the field | `app/api/upload/classes/route.ts:269-298` |
| Teachers list | SYSTEM | Filters by school, reads the school column | School filter, school column | `components/admin/teachers-table.tsx:546, 794` (commits `b01e5e0`, `1c8ce3d`) |
| Teacher edit, school select | SYSTEM | Changes the school, confirms | Confirm step; one transaction: new classes checked, old links deleted, `schoolId` set, new links added | `components/admin/teachers-table.tsx:369-372, 401-408, 983`; `server/models/teacherModel.ts:691-770` |
| Teacher update with `schoolId` | ADMIN | Sends `schoolId` | 403 | `server/controllers/teacherController.ts:337-342` |
| Teacher role change | ADMIN | Changes the role in the dialog | Sets `User.role` | `server/models/teacherModel.ts:718-729` |
| School profile, license card | any user with a school | Opens the page | First license, key, "users / max users" (all roles) | `components/school/school-detail.tsx:316-446`; `app/api/users/me/school/route.ts:43-54` |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| `classrooms`, `classroom_teachers` | table | `teacher_id` (owner), pair `classroom_id`, `teacher_id` | read, write (S1) | `class:teachers:assign` (ADMIN, SYSTEM) plus school check | `packages/db/src/schema/classrooms.ts:11-13, 40-50` |
| `users` | table | `school_id`, `role`, `name` | read (pickers), write (S3 school, S5 role) | `teacher:school:move` (SYSTEM); rank rule `server/utils/auth.ts` | `teacherModel.ts:736-887` |
| `user_roles` | table | role rows | write (S5), same transaction as `users.role` | rank rule | `teacherModel.ts:840-855` |
| Sessions | side effect | `revokeSessionsInTx` for the user | write (S5) | rank rule | `packages/auth/src/session.ts:125` |
| `users`, `classrooms` (import) | table | `school_id` = verified target school | write (S2) | `resolveCreationSchoolId`; SYSTEM only names a school | `server/utils/auth.ts:223-237`; `app/api/upload/{csv,classes}/route.ts` |
| `licenses` | table (FLAT) | `school_id`, `status`, `max_users`, `start_date`, `expiry_date`, `name` | read (S4) | role check plus school admin rule `lib/permissions.ts:65-68` | `server/models/schoolModel.ts:99-143` |
| `classroom_students` | table (REFERENTIAL) | `student_id`, `classroom_id`, `joined_at` | read (S4 classes of a student) | owner-FK join to `users.school_id` | schema `classrooms.ts:27-36` |
| `audit_events` (EXEMPT) | table | actor, target school, counts or roles | write (S2, S3, S5) | none; ids and counts only | `packages/auth/src/audit.ts` |

Side effects: sessions end for a changed role (S5). No XP, no email, no file kept, no AI call. The import keeps no temp file
after any exit (commit `68e85a061`).

## 4. New target

- Drizzle tables: no change; no migration.
- Domain functions (Zod input and output):
  - `setClassroomTeachers` in `packages/domain/src/classes/set-classroom-teachers.ts`.
  - `moveTeacherToSchool` in `packages/domain/src/teachers/move-teacher-school.ts` (errors `CROSS_SCHOOL_CLASSROOM` 400, `OWNS_CLASSES` 409).
  - `changeStaffRole` in `packages/domain/src/teachers/` (S5; the plan keeps the fix in `updateTeacher` for the rank rule and the transaction; the domain function is the target if the rank rule moves).
  - `getSchoolLicenseView`, `listSeatHolders` in `packages/domain/src/licenses/license-view.ts`.
  - Shared, built by the admin dashboard track (lane A): `getSchoolSeatUsage` in `packages/domain/src/licenses/usage.ts`. Rule (FR-7 of that spec): seats = sum of `max_users` of licenses of the school with status `active` and `expiry_date` today or later, or no end date; seats used = STUDENT users of the school. This track reads it and writes no second copy.
- Permission actions for `assertCan`: `class:teachers:assign` (ADMIN, SYSTEM), `teacher:school:move` (SYSTEM), the school admin rule for the license view. Each function also checks the school itself.
- TenantDB class: `classrooms`, `users`, `licenses` FLAT; `classroom_teachers`, `classroom_students` REFERENTIAL (`unscoped("<reason>")` with the classroom FK); `audit_events` EXEMPT.
- AI adapter use: none.
- RPG skin components: `Panel`, `Sign`, `RpgButton`, `Meter`, `Scene` (design captures in `design/captures.md`).
- Routes: `PATCH /api/classroom/[id]` (adds `teacherIds`), `GET /api/teachers?schoolId=` and `GET /api/classrooms?schoolId=` (SYSTEM only), `POST /api/teachers/[id]/move`, `GET /api/users/me/school/seat-holders?page=`, form field `schoolId` on both upload routes; pages `/[locale]/admin/students/classrooms`, `/admin/import-data`, `/admin/teachers`, `/settings/school-profile#license`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| Class owner (`classrooms.teacher_id`) shows "Class owner", is checked, and cannot be unchecked | The monorepo has an owner column; legacy has none | default used (owner decision 2026-10-12: no stop) |
| The move of a teacher who owns classes in the old school returns 409 with the class names | Legacy has no class owner | default used (owner decision 2026-10-12: no stop) |
| Seats used count students only; legacy counts all users of the school | Owner answer: "which students hold a license" | default used (owner decision 2026-10-12: no stop) |
| The license view is view only; the license key stays in the existing card | Owner answer of 2026-10-11 | 2026-10-11 |
| License data and seat holders show to a school admin only (legacy: any user with a school) | Hide the key from students and teachers | spec S4 |
| A school with students and no active license shows "No active license", not "over the limit" | 0 seats is a missing license, not an overrun (design, 2026-10-12) | design default |
| A SYSTEM import stamps the chosen school, never null | Legacy `3ee5033`; the policy file rule 4 changes | 2026-10-11 |
| A role change ends the user's sessions and writes an audit event | Legacy has no audit; the role must apply at next sign-in | spec S5 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| AC-1 | `/admin/students/classrooms` | same | ADMIN | Assign two teachers, remove one; same teachers after reload; kept teacher sees the class | `classroom_teachers` rows of the class | batch capture (orchestrator) |
| AC-2 | `/admin/import-data` | same | SYSTEM | Import 3 files into one school; every new row has that school | reference-sql L5 = 0 | batch capture (orchestrator) |
| AC-3 | `/admin/teachers` | same | SYSTEM | Filter by school; move a teacher without owned classes; owner move refused with names | `users.school_id`, `classroom_teachers` of the teacher | batch capture (orchestrator) |
| AC-4 | `/settings/school-profile` (users / max users) | same, license part | ADMIN | Seats used equal reference SQL L2; difference to legacy recorded | reference-sql L2, L4 | batch capture (orchestrator) |
| AC-5 | `/settings/school-profile` | same | TEACHER, STUDENT | No license key, no seat holders | route returns 403 | batch capture (orchestrator) |
| AC-6 | `/admin/teachers` | same | ADMIN | Change a teacher to admin; new sign-in opens `/admin/dashboard` | `users.role` = `ADMIN` | batch capture (orchestrator) |

Reference SQL: `reference-sql.sql` in this folder (L1 licenses, L2 seats, L3 seat holders page, L4 legacy count, L5 rows without a school).
Run on `primary_parity_20261011`, read only. The query ran with no error on 2026-10-12.

## 7. ETL and runbook changes

None. The import fix changes the upload routes only. No schema change, no backfill. The cutover check can add
L5 (users and classes without a school) as a post-import check; this is optional.
