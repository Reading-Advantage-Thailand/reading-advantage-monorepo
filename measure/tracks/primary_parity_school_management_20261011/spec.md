# Spec — Primary parity: school management for admins and SYSTEM

Track ID: `primary_parity_school_management_20261011`
Type: feature (Story-shaped spec)
Triage rows: ADM-03, ADM-04, SYS-05, the school license view (new item of 2026-10-11), and one
regression found in this check (Story S5)

## Overview

**Sprint goal:** School admins and SYSTEM staff can set up and manage the teachers, classes,
imports, and license seats of a school in the app, with every write in the right school.

Owner notes: "Admin should be able to manage all users, classes, and licenses in the school"
(ADM-02). "System should be able to give white-glove service to our schools to set up students,
teachers, and classes for them" (ADM-04). The school license view is view only (owner answer of
2026-10-11). Today an admin cannot give a class to a teacher, a SYSTEM import writes users and
classes with no school, a SYSTEM user cannot move a teacher to another school, no page shows
which students hold the school's seats, and a role change in the teacher edit dialog has no
effect on access.

## Track Set

This track is member 5 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_quick_fixes_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Evidence

Legacy paths are relative to `~/Desktop/primary-advantage` (`bfea121`). Monorepo paths are
relative to `apps/primary-advantage` unless they start with `packages/` or `measure/`.

- ADM-03, legacy: the classroom edit dialog has a teacher checkbox list
  (`components/admin/classrooms-table.tsx:110-136, 593-616`) and sends `assignedTeacherIds` with
  `PUT /api/classrooms/[id]` (`:214-227`). The model runs in one transaction, checks that each
  teacher is in the classroom's school, and applies a diff to `ClassroomTeachers`
  (`server/models/classroomModel.ts:396-467`). A teacher of another school gives 400
  `CROSS_SCHOOL_TEACHER` (`server/controllers/classroomController.ts:154-168`).
- ADM-03, monorepo: the dialog has no teacher picker, only a teacher count
  (`components/admin/classrooms-table.tsx:448`). It sends `PATCH /api/classroom/[id]`
  (`:183-187`); the controller reads `classroomName` and returns 400 for the admin dialog
  (`server/controllers/classroomController.ts:159-166`). `primary_parity_quick_fixes_20261011`
  fixes that 400 and the class password (ADM-02); this track starts after it. Teachers are in
  two places: the owner `classrooms.teacher_id` (NOT NULL) and `classroom_teachers` rows
  (`packages/db/src/schema/classrooms.ts:11-13, 40-50`; no unique key on the pair). No domain
  function writes `classroom_teachers`.
- ADM-04, legacy commit `3ee5033`: SYSTEM chooses a school on the import page
  (`app/[locale]/admin/import-data/page.tsx:79, 103-115, 415+`), the upload is disabled until a
  school is chosen (`:575-579`), and the form field `schoolId` goes to the server (`:189-190`).
  The server refuses a SYSTEM upload without `schoolId` or with an unknown school (400), and
  ignores the field for other roles (`app/api/upload/classes/route.ts:269-298`).
- ADM-04, monorepo: the import page has no school choice (`app/[locale]/admin/import-data/page.tsx:113-128`).
  Both routes stamp `authUser.schoolId ?? null` (`app/api/upload/classes/route.ts:576, 691, 759`;
  `app/api/upload/csv/route.ts:327, 494, 547`), so a SYSTEM account with no school writes
  `school_id` = null ("system user - data imported without school assignment",
  `classes/route.ts:1058`). A SYSTEM upload also uses the global handle (`csv/route.ts:84`,
  `classes/route.ts:192`), so the class lookup by name can match a class of another school
  (`csv/route.ts:478-482`).
- Session-school policy: FR-2.1 of `primary_test_hygiene_upload_fixes_20260914` ("Derive the
  `schoolId` for every write in both routes exclusively from the verified session") is in the code
  (`classes/route.ts:574-576`). Its policy file says "SYSTEM sessions carry no school. Their
  imports stamp `schoolId: null` by design"
  (`measure/tracks/primary_test_hygiene_upload_fixes_20260914/session-school-policy.md`, rule 4).
- Tech-debt row of 2026-09-14 "Upload routes: school guard keys off stored row not session; temp
  file leaks on validation-error 400": the guards still read the stored row `currentUser.schoolId`
  (`csv/route.ts:105-115`, `classes/route.ts:214-224`). The row says `csv/route.ts:97`; line 97
  is the school lookup, and the guard is at 105-115. The temp file part is already fixed: the
  `finally` block deletes the file on every exit (`csv/route.ts:611-618`, commit `68e85a061`).
- SYS-05, legacy commits `b01e5e0`, `1c8ce3d`: a SYSTEM school filter, a school column, and a
  school select in the teacher edit dialog (`components/admin/teachers-table.tsx:546, 794, 983`),
  with a confirm step (`:369-372, 401-408`). The move runs in one transaction: it checks that the
  new classes are in the new school (`CROSS_SCHOOL_CLASSROOM`), deletes all old class links, sets
  `schoolId`, and adds the new links (`server/models/teacherModel.ts:691-770`). A non-SYSTEM
  caller that sends `schoolId` gets 403 (`server/controllers/teacherController.ts:337-342`).
- SYS-05, monorepo: `getTeachersController` reads no `schoolId` (`server/controllers/teacherController.ts:44-58`);
  `UpdateTeacherInput` has no `schoolId` (`types/index.d.ts:462-469`); `updateTeacher` never
  writes `users.school_id` (`server/models/teacherModel.ts:736-887`). SYSTEM sees the teachers of
  all schools with no school column (`server/utils/auth.ts:207-214`). `/api/classrooms` ignores
  `?schoolId`.
- License, legacy: a license belongs to a school (no per-user license,
  `prisma/schema.prisma:386-402`). The school profile shows the first license and "users /
  max users", where users = all users of the school of any role
  (`components/school/school-detail.tsx:316-446`, `app/api/users/me/school/route.ts:43-54`).
- License, monorepo: the same card exists (`components/school/school-detail.tsx:299-429`,
  `server/models/schoolModel.ts:99-143`). No Primary code writes `license_on_users` or
  `users.license_id`; the ETL imports `licenses` only
  (`packages/db/src/migrations-data/primary-legacy-import.ts:534-546`). The `/api/licenses`
  routes are school-scoped with `licenseDbFor` (`lib/license-db.ts:13-20`). The Reading tech-debt
  row "License/user-list scope gaps" (2026-09-12) is about Reading's `activateLicense` and
  `getAllUsers`; Primary does not call them. The domain functions `listUserLicenses` (no school
  filter, `packages/domain/src/licenses/queries.ts:16-36`) and `attachUserToLicense` (no tenant
  check, `mutations.ts:53-76`) have no caller; this track must not use them.
- `/settings/school-profile` is open to every role (`lib/route-policies.ts:19`), and the server
  page renders `getSchoolDetail(user.schoolId)` with the license key for any user with a school
  (`app/[locale]/(student)/settings/school-profile/page.tsx:18-20`). Only the nav hides it
  (`configs/settings-page-config.ts:12-17`).
- Regression found (S5): the teacher edit dialog sends a role (`components/admin/teachers-table.tsx:262`),
  and `updateTeacher` writes only `user_roles` (`server/models/teacherModel.ts:840-855`). The
  session role comes from `users.role` (`packages/auth/src/session.ts:125`), so the change has no
  effect: a teacher made admin gets no admin access, and an admin made teacher keeps admin
  access. Legacy sets `User.role` (`server/models/teacherModel.ts:718-729`).

## Stories

### Story S1: Admin assigns teachers to a class
**As a** school admin
**I want** to choose the teachers of a class in the class edit dialog
**So that** each teacher sees and teaches the right classes

**Acceptance Criteria:**
- Given a class of my school and two teachers of my school, When I check both teachers and save, Then the class has these two teachers in `classroom_teachers`, and both teachers see the class on the teacher home.
- Given a class with the teachers A and B, When I uncheck B and save, Then B loses the class and A keeps it, and the change is one transaction.
- Given a request with a teacher of another school, When the server gets it, Then it returns 400 and no row changes.
- Given the class owner (`classrooms.teacher_id`) is a teacher, When the dialog opens, Then the owner shows as checked with the label "Class owner" and cannot be unchecked.
- Given a SYSTEM user, When the SYSTEM user edits a class, Then the picker lists the teachers of the class's school only.

**Estimate:** M
**Priority:** Must

### Story S2: SYSTEM imports into a chosen school
**As a** SYSTEM user
**I want** to choose the target school before I import students, teachers, and classes
**So that** I can set up a school for its staff and every imported row belongs to that school

**Acceptance Criteria:**
- Given I am SYSTEM on `/admin/import-data`, When the page opens, Then I see a school selector, and the upload is disabled until I choose a school.
- Given I chose school X, When I upload `teachers.csv`, the classes file, or `students.csv`, Then every new user and class has `school_id` = X, a class name matches only classes of school X, and the result names school X.
- Given a SYSTEM upload without `schoolId`, with a value that is not a UUID, or with an unknown school, When the route gets it, Then it returns 400, writes no row, and deletes the temp file.
- Given a school ADMIN sends the `schoolId` of another school, When the upload runs, Then the rows get the admin's session school.
- Given a non-SYSTEM session without a school, When it uploads, Then the route returns 400 "School association required", and the check reads the session, not the stored user row.
- Given a SYSTEM import into school X, When it ends, Then an audit event records the actor, the target school, and the row counts.

**Estimate:** M
**Priority:** Must

### Story S3: SYSTEM manages the school of a teacher
**As a** SYSTEM user
**I want** to filter teachers by school, see the school of each teacher, and move a teacher to another school
**So that** I can correct the staff of a school without a database change

**Acceptance Criteria:**
- Given I am SYSTEM on `/admin/teachers`, When the list loads, Then each row shows the teacher's school, and a school filter lists only the teachers of the chosen school.
- Given teacher T of school A, When I choose school B and classes of school B in the edit dialog and confirm, Then one transaction sets T's `school_id` to B, deletes T's `classroom_teachers` rows of school A, adds the rows for the chosen classes, and records an audit event.
- Given a chosen class that is not in school B, When I save, Then the server returns 400 and nothing changes.
- Given T is the owner (`classrooms.teacher_id`) of a class in school A, When I try the move, Then the server returns 409 with the names of those classes and nothing changes.
- Given a school ADMIN sends a `schoolId` in a teacher update, When the server gets it, Then it returns 403 and nothing changes.
- Given I change the school in the edit dialog, When the class list reloads, Then it shows the classes of the new school (`/api/classrooms?schoolId=` for SYSTEM only).

**Estimate:** L
**Priority:** Must

### Story S4: Admin sees the school license (view only)
**As a** school admin
**I want** to see the seats used and free, the end date, and the students who hold the school's seats
**So that** I know when the school needs more seats or a renewal

**Acceptance Criteria:**
- Given I am an admin of school X, When I open the license part of `/settings/school-profile`, Then I see each license of school X with its name, status, start date, end date, and seats, and the totals "seats used" and "seats free" (the shared seat usage of `packages/domain/src/licenses/usage.ts`).
- Given school X has more students than seats, When I open the view, Then a warning shows the count over the limit.
- Given I open "Seat holders", When the list loads, Then it shows the students of school X (name, username, classes, join date), 50 for each page, and no student of another school.
- Given I am a TEACHER without a school admin row, or a STUDENT, When I open `/settings/school-profile`, Then the license part and the license key do not show, and the server refuses the seat holder data.
- Given the view, When I look for a button that changes a license, Then there is none (view only).

**Estimate:** M
**Priority:** Must

### Story S5: A teacher role change takes effect
**As a** school admin
**I want** a role change in the teacher edit dialog to change the user's access
**So that** a teacher I make admin can manage the school, and an admin I make teacher loses admin access

**Acceptance Criteria:**
- Given teacher T of my school, When I change T's role to admin and save, Then `users.role` of T is `ADMIN`, `user_roles` matches, T's sessions end, and T has admin access at the next sign-in.
- Given admin U of my school (not me), When I change U's role to teacher and save, Then `users.role` of U is `TEACHER`, U's sessions end, and U has no admin access at the next sign-in.
- Given a role change, When it is saved, Then an audit event records the actor, the user, the old role, and the new role.
- Given a user of another school, or a user of a higher rank, When I send a role change, Then the server refuses it with the current rank rule (`server/utils/auth.ts`) and nothing changes.

**Estimate:** S
**Priority:** Must

## Non-Functional Requirements

- Port the behavior: each write is a domain function in `packages/domain` with Zod input and
  output contracts and tests: `setClassroomTeachers` (`classes/`), `moveTeacherToSchool` and
  `changeStaffRole` (`teachers/`), `getSchoolLicenseView` (`licenses/`). Route handlers stay thin.
- Permissions: `assertCan` checks the role only (lessons-learned 2026-05-02). Each function
  checks the school itself. New keys register in the module `permissions.ts` files with
  `registerDomainModulePermissions` (for example `teacher:school:move` for SYSTEM only).
- Transactions: S1, S3, and S5 write in one `db.transaction`. A failed check writes nothing.
- Tenant scope: `createTenantDB(db, { schoolId })`; `classroom_teachers` and `classroom_students`
  are REFERENTIAL and use `unscoped("<reason>")` with the classroom FK join.
- Audit: S2, S3, and S5 write audit events with `recordAuditEvent` (`packages/auth/src/audit.ts`),
  with ids and counts only (no names, no passwords).
- Logging: new server code logs with `lib/observability/logger.ts`, never `console.error`.
- UI: the Design phase covers the changed and new parts (the teacher picker, the import school
  selector, the teacher school column, filter, and move confirm, the license view) in the RPG
  skin. The rest of each admin page keeps its current look.
- i18n: all new strings in en, th, cn, tw, and vi.
- Schema: no change, no migration. ETL and cutover runbook: no change.
- Tests: Vitest in `packages/domain` (mock DB of `packages/domain/src/__tests__/mock-db.ts`, PGlite
  for the transactions) and in `apps/primary-advantage` (route tests of the upload, classroom,
  and teacher routes).

## Acceptance Criteria

The side-by-side kit (`primary_parity_acceptance_20261011`) runs these checks on rehearsal copies
of legacy `bfea121` and the new build with the same school data.

- AC-1 (S1): Legacy and new `/admin/students/classrooms`, as the same school ADMIN: assign two
  teachers to a class and remove one. Both builds show the same teachers on the class after a
  reload, and the kept teacher sees the class on the teacher home.
- AC-2 (S2): Legacy and new `/admin/import-data`, as SYSTEM: import the same three files into one
  school. In both builds every new user and class has that school; the new build writes no row
  with `school_id` null.
- AC-3 (S3): Legacy and new `/admin/teachers`, as SYSTEM: filter by school, then move a teacher
  without owned classes to another school with one class of the new school. Both builds show the
  teacher in the new school with that class only. The new build refuses the move of a class owner
  with the class names.
- AC-4 (S4): New `/settings/school-profile` as a school ADMIN: the seats used equal the reference
  SQL of the behavior contract; legacy shows "users / max users" for the same school, and the
  behavior contract records the difference (students only against all users).
- AC-5 (S4): New `/settings/school-profile` as a TEACHER and as a STUDENT of the same school: no
  license key and no seat holders.
- AC-6 (S5): Legacy and new `/admin/teachers`, as a school ADMIN: change a teacher to admin. After
  a new sign-in, that user opens `/admin/dashboard` in both builds.
- AC-7: Captures of the changed parts at 375 px and 1280 px, day and night, pass the owner's look
  check.
- AC-8: `pnpm --filter @reading-advantage/domain test` and `pnpm --filter primary-advantage test`
  exit 0; tsc and ESLint on the changed files report 0 errors. The tech-debt row of 2026-09-14
  moves to "Resolved" with the commit, and `session-school-policy.md` rule 4 names the SYSTEM
  target school.

## Out of Scope

- Admin capabilities with no legacy regression (checked for the owner note on ADM-02):
  - Move a student to another class, and an admin password reset for one student: the API takes
    the fields in both builds, and no admin page sends them in either build. Teachers reset the
    passwords of a class on the class sheet in the new build.
  - Archive a class: neither build has it (the monorepo has the `classrooms.archived` column and
    no admin control).
  - License redeem: the form sends `PATCH /api/licenses/<userId>`, and neither build has that
    handler (STU-19, after the cutover).
  - License create, edit, and delete stay SYSTEM pages (`/system/licenses`) in both builds.
- A change of the class owner (`classrooms.teacher_id`). Legacy has no owner; see the member
  question below.
- The import classroom conflict choice and the auto-create of classes in `teachers.csv` (ADM-05,
  after the cutover).
- A unique key on `classroom_teachers (classroom_id, teacher_id)`. The domain functions prevent a
  duplicate pair; a migration needs a check of the existing rows first.
- Seat rules for access (a student over the limit keeps access).
- Member questions for the owner:
  - Does a teacher or an admin take a seat? This spec counts students only (owner answer: "which
    students hold a license"); legacy counts all users of the school.
  - When SYSTEM moves a teacher who owns classes in the old school, the server refuses the move (S3).
    Must the classes get a new owner in the old school instead? Legacy has no class owner.
  - May an admin remove the class owner from a class (S1)? This spec keeps the owner.
