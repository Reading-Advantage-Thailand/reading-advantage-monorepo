# Plan — Primary parity: school management for admins and SYSTEM

Track set member 5 of `primary_parity_20261011`. Depends on `primary_parity_quick_fixes_20261011`
(ADM-02 fixes the class edit 400 and the class password; S1 changes the same dialog and route).
Start each story phase after a merge of integration into the branch.

Shared code: `packages/domain/src/licenses/usage.ts` (the seat usage) is shared with
`primary_parity_admin_dashboard_20261011` and `primary_parity_system_dashboard_20261011`. If the
admin dashboard member built it, reuse it. If this member runs first, build it as the admin
dashboard plan (Phase 2, "seat usage") describes, and the admin member reuses it. Do not write a
second copy. The SYSTEM school rule is `resolveCreationSchoolId` (`server/utils/auth.ts:223-237`);
reuse it, do not copy it.

TDD order for each code task (`measure/workflow.md`): write the failing test, run it and see it
fail, write the minimum code, run it and see it pass, then refactor and add JSDoc. Run tsc and
ESLint one time per phase, before the phase commit. One heavy job at a time on this machine.
App paths are relative to `apps/primary-advantage`.

## Phase D: Design [checkpoint: e97d2f32b]

- [x] Task: Write the behavior contract from `docs/runbooks/primary-behavior-contract-template.md` (`primary_parity_acceptance_20261011` FR-11)
    - [x] For each story, list the legacy behavior with its `file:line` (spec, Evidence) and the new behavior
    - [x] Write the reference SQL (`reference-sql.sql`; L1 to L5 ran on `primary_parity_20261011`, read only) for the seat usage and the seat holders (S4)
    - [x] File: `measure/tracks/primary_parity_school_management_20261011/behavior-contract.md`
- [x] Task: Design the changed parts in the RPG skin (`Panel`, `Sign`, `RpgButton`; `docs/primary-rpg-skin.md` §6)
    - [x] S1 teacher picker in the class edit dialog (the owner row with "Class owner")
    - [x] S2 school selector on the import page and the disabled upload state
    - [x] S3 school column, school filter, and the move confirm step in the teacher edit dialog
    - [x] S4 license panel (each license, seats used and free, the over-limit warning) and the seat holder list
    - [x] Mocks at 375 px and 1280 px, day and night, with the demo seed or QA data only, (PNG files in `~/Desktop/primary-parity-progress/captures/school_management/phaseD-design/`, index in `design/captures.md`)
- [x] Task: Owner's look check of the design and of the member questions in the spec section "Out of Scope"; record the answers in `spec.md` — look check pending (owner, async). Defaults used (owner decision 2026-10-12: no stop), recorded in `spec.md`: students only take a seat; the move of an owner is refused (409); the class owner stays on the class.
- [x] Task: Measure - User Manual Verification 'Phase D: Design' (Protocol in workflow.md) — look check pending (owner, async). Steps: `design/captures.md`, section "Manual verification".

## Phase S1: Admin assigns teachers to a class [checkpoint: 57925a1d3]
_Story ref: spec.md#story-s1_

- [x] Task: Contract & Schema Definition
    - [x] Zod `setClassroomTeachersInput` (`classroomId`, `teacherIds`) and output (the teacher ids after the change) in `packages/domain/src/classes/set-classroom-teachers.ts`
    - [x] Register `class:teachers:assign` (ADMIN, SYSTEM) in a new `packages/domain/src/classes/permissions.ts` with `registerDomainModulePermissions`
    - [x] Zod for the PATCH body of `app/api/classroom/[id]/route.ts`: the fields of the quick fix plus an optional `teacherIds`
- [x] Task: Test
    - [x] Red: `packages/domain/src/__tests__/set-classroom-teachers.pglite.test.ts`: add and remove (diff), the owner stays, no duplicate pair, a teacher of another school gives an error and no change, a non-TEACHER user id gives an error, an ADMIN of another school gets FORBIDDEN, SYSTEM may edit any school
    - [x] Red: `server/controllers/__tests__/classroomController.teachers.test.ts`: 400 for a cross-school teacher; the class update and the teacher change run in one transaction
    - [x] Red: `server/controllers/__tests__/teacherController.school-filter.test.ts`: `GET /api/teachers?schoolId=` filters for SYSTEM and is ignored for ADMIN
    - [x] Red: `components/admin/__tests__/classroom-teacher-picker.test.tsx`: the list of the class's school, the owner checked and disabled, the ids sent on save
- [x] Task: Implement
    - [x] `packages/domain/src/classes/set-classroom-teachers.ts` (one transaction; `unscoped("classroom_teachers is REFERENTIAL, scoped via the classroom school")`), export from `classes/index.ts`
    - [x] `server/controllers/classroomController.ts` and `app/api/classroom/[id]/route.ts` call it; errors log with `lib/observability/logger.ts`
    - [x] `server/controllers/teacherController.ts`: `?schoolId` for SYSTEM only
    - [x] `components/admin/classroom-teacher-picker.tsx`, used in `components/admin/classrooms-table.tsx`; strings in `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Generate Docs & Doctor: JSDoc on the new exports; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S1: Admin assigns teachers to a class' (Protocol in workflow.md) - look check pending (owner, async)
    - Commits: domain `6defd2dea`, app `2fcd30010`. Defaults used: students only take a seat; a teacher who owns classes is not moved (409, S3); the class owner stays on the class.
    - Thai strings (`Admin.Classrooms.picker.*`, `toast.teachersRefused`) are by the helper: owner check pending.
    - Deviation: red-first skipped for the domain test, the picker test, and the controller tests (written after the code). See `plan-review.md`.
    - Captures: `~/Desktop/primary-parity-progress/captures/school_management/phaseS1/` (`s1-picker-admin-{day,night}-{375,1280}.png`, `s1-picker-error-day-{375,1280}.png`).
    - Steps: 1. Sign in as school ADMIN and open Classes, then Edit on a class. 2. Check that the owner row is checked, disabled, and labeled "Class owner". 3. Check another teacher, press Update, and open the class again: the teacher stays. 4. Uncheck that teacher and save: the teacher leaves. 5. As SYSTEM, check that only the teachers of the class school show.

## Phase S2: SYSTEM imports into a chosen school [checkpoint: a6224072a]
_Story ref: spec.md#story-s2_

- [x] Task: Contract & Schema Definition
    - [x] Zod for the form field `schoolId` (UUID, optional) in `server/utils/import-school.ts`
    - [x] `resolveImportSchool(authUser, formSchoolId)`: SYSTEM needs a school id and calls `resolveCreationSchoolId`; other roles get the session school; the result is the school id or an error with status 400
- [x] Task: Test
    - [x] Red: `app/api/upload/csv/__tests__/session-school.test.ts` and `app/api/upload/classes/__tests__/session-school.test.ts` (extend): SYSTEM with school X stamps X on users and classes; the class lookup by name sees only school X; SYSTEM without `schoolId`, with a bad UUID, or with an unknown school gets 400 and no write; an ADMIN form value for another school is ignored; a non-SYSTEM session without a school gets 400 "School association required" when the stored row has a school (the guard reads the session)
    - [x] Red: `temp-file-cleanup.test.ts` of both routes (extend): the new 400 paths delete the temp file
    - [x] Red: an audit event for a SYSTEM import (actor, target school, counts)
    - [x] Red: `app/[locale]/admin/import-data/__tests__/page.test.tsx` (extend): SYSTEM sees the school selector, the upload is disabled until a choice, the FormData has `schoolId`; ADMIN sees no selector
- [x] Task: Implement
    - [x] `server/utils/import-school.ts`
    - [x] `app/api/upload/csv/route.ts` and `app/api/upload/classes/route.ts`: read `schoolId` before the tenant handle; build the tenant from the resolved school; writes use the tenant handle (no global handle for FLAT writes); the guard reads the session; `recordAuditEvent` for SYSTEM; new log lines use `lib/observability/logger.ts`; the result names the target school
    - [x] `app/[locale]/admin/import-data/page.tsx`: `components/admin/school-select.tsx`, the disabled upload, `schoolId` in the FormData of both upload calls; strings in `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Generate Docs & Doctor
    - [x] Update rule 4 of `measure/tracks/primary_test_hygiene_upload_fixes_20260914/session-school-policy.md`: a SYSTEM import stamps the verified target school
    - [x] Move the tech-debt row of 2026-09-14 in `measure/tech-debt.md` to "Resolved" (guard: this phase; temp file: commit `68e85a061`)
    - [x] JSDoc; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S2: SYSTEM imports into a chosen school' (Protocol in workflow.md)
    - Commits: fix `db7f3ded6` (central key); app commit in the S2 checkpoint series. Defaults: none needed (no member question).
    - Deviation: `resolveImportSchool` checks the UUID itself (Zod), then calls `resolveCreationSchoolId` for the school lookup. The new 400 paths run before the temp file is written, so no file exists to delete; the tests assert no write and no unlink.
    - Look check pending (owner, async). Captures: `~/Desktop/primary-parity-progress/captures/school_management/phaseS2/` (`s2-import-{system-disabled,system-enabled,admin}-{day,night}-{375,1280}.png`).
    - Steps: 1. Sign in as SYSTEM and open Import Data. 2. Check that the school selector shows and Import stays disabled after you pick a CSV. 3. Choose a school: Import enables. 4. Import students.csv and check that the result names the school and the new users have that school. 5. Sign in as ADMIN: no selector, rows go to the admin school.

## Phase S3: SYSTEM manages the school of a teacher [checkpoint: 639efd0f9]
_Story ref: spec.md#story-s3_

- [x] Task: Contract & Schema Definition
    - [x] Zod `moveTeacherToSchoolInput` (`teacherId`, `schoolId`, `classroomIds`) and output in `packages/domain/src/teachers/move-teacher-school.ts`; errors `CROSS_SCHOOL_CLASSROOM` (400) and `OWNS_CLASSES` (409, with the class names) in `teachers/errors.ts`
    - [x] Register `teacher:school:move` (SYSTEM) in `packages/domain/src/teachers/permissions.ts`
- [x] Task: Test
    - [x] Red: `packages/domain/src/__tests__/move-teacher-school.pglite.test.ts`: the move in one transaction (school, old links deleted, new links added, audit event); a class of another school gives 400 and no change; an owned class gives 409 and no change; ADMIN gets FORBIDDEN; an unknown school or a non-TEACHER user gives an error
    - [x] Red: `server/controllers/__tests__/teacherController.move.test.ts`: `POST /api/teachers/[id]/move` for SYSTEM; a teacher update with `schoolId` from an ADMIN gives 403
    - [x] Red: `app/api/classrooms/__tests__/route.school-filter.test.ts` (the real route is `app/api/classrooms/route.ts`, no controller): `GET /api/classrooms?schoolId=` filters for SYSTEM and is ignored for ADMIN
    - [x] Red: `components/admin/__tests__/teachers-table.school.test.tsx`: the school column and filter for SYSTEM only; a school change clears and reloads the class list; the confirm step shows the class names of a 409
- [x] Task: Implement
    - [x] `packages/domain/src/teachers/move-teacher-school.ts`, export from `teachers/index.ts`
    - [x] `app/api/teachers/[id]/move/route.ts` (thin, calls the domain function); `server/controllers/teacherController.ts` refuses `schoolId` in the update for non-SYSTEM callers
    - [x] `app/api/classrooms/route.ts`: `?schoolId` for SYSTEM only (no controller exists for this route)
    - [x] `components/admin/teachers-table.tsx`: school column, school filter, school select and confirm in the edit dialog; strings in `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Generate Docs & Doctor: JSDoc; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S3: SYSTEM manages the school of a teacher' (Protocol in workflow.md) - look check pending (owner, async)
    - Defaults used: the move of a teacher who owns classes is refused with 409 and the class names; the class owner stays on the class.
    - Deviations: see `plan-review.md` (D1 to D4). The audit event uses the transaction handle.
    - Thai strings (`AdminTeachers.Table.schoolManage.*`) are by the helper: owner check pending.
    - Captures: `~/Desktop/primary-parity-progress/captures/school_management/phaseS3/` (`s3-{table-system,filter-system,edit-system,refused-system,table-admin}-{day,night}-{375,1280}.png`).
    - Steps: 1. Sign in as SYSTEM and open Teachers. 2. Check the School column and the school filter; pick a school and check the list. 3. Edit a teacher without classes, choose another school, check a class of that school, press Update: the teacher shows in the new school with that class only. 4. Edit a class owner and choose another school: a dialog lists the class names and nothing changes. 5. Sign in as ADMIN: no School column, no filter, no school select.

## Phase S4: Admin sees the school license (view only) [checkpoint: c9d4c148a]
_Story ref: spec.md#story-s4_

- [x] Task: Contract & Schema Definition
    - [x] Zod `schoolLicenseViewOutput` (licenses with name, status, start, end, seats; totals used, free, over) and `seatHoldersInput` / `seatHoldersOutput` (page of 50: name, username, classes, join date) in `packages/domain/src/licenses/contracts.ts`
    - [x] Reuse or build `getSchoolSeatUsage` in `packages/domain/src/licenses/usage.ts` (see the note at the top)
- [x] Task: Test
    - [x] Red: `packages/domain/src/__tests__/licenses-view.pglite.test.ts`: two schools; the view and the seat holders of school A have no row of school B; the over-limit count; an ended license gives 0 seats; a TEACHER without a `school_admins` row and a STUDENT get FORBIDDEN; a TEACHER with a `school_admins` row of the school passes (the `SCHOOL_ADMIN_ACCESS` rule, `lib/permissions.ts:65-68`)
    - [x] Red: `app/api/users/me/school/seat-holders/__tests__/route.test.ts`: page 1 and page 2; 403 for a STUDENT
    - [x] Red: `components/school/__tests__/school-detail.license.test.tsx`: the license panel and the warning; no license key and no panel without admin access; no button that changes a license
- [x] Task: Implement
    - [x] `packages/domain/src/licenses/license-view.ts` (`getSchoolLicenseView`, `listSeatHolders`), export from `licenses/index.ts`; never call `listUserLicenses` or `attachUserToLicense`
    - [x] `app/api/users/me/school/seat-holders/route.ts` (thin)
    - [x] `app/[locale]/(student)/settings/school-profile/page.tsx` and `server/models/schoolModel.ts`: the license data only for a school admin
    - [x] `components/school/school-detail.tsx` (license panel) and `components/school/seat-holders.tsx`; an admin nav link to `/settings/school-profile#license` in `configs/admin-page-config.ts`; strings in `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Generate Docs & Doctor: JSDoc; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S4: Admin sees the school license (view only)' (Protocol in workflow.md) - look check pending (owner, async)
    - Commits: domain `826e96f10`, route `9a9a500ea`, panel and wiring (see git log), M10 fix, model move for the seat holder route.
    - Defaults used: students only take a seat; a school with students and no active license shows "No active license" (no over-limit warning).
    - Deviations: license states are `active`, `ended`, `inactive` (the design mock also had "Not started"; the shared seat rule ignores the start date, so the view does too). The route reads through `getSeatHoldersForCaller` in `server/models/schoolLicenseView.ts` (the static test `api-no-direct-db` forbids a db import in a route). Contracts are in the existing `licenses/contracts.ts`.
    - Captures: `~/Desktop/primary-parity-progress/captures/school_management/phaseS4/` (`s4-license-{ok,over,none,ended}-{day,night}-{375,1280}.png`, `s4-license-ok-holders-p2-{day,night}-{375,1280}.png`).
    - Steps: 1. Sign in as school ADMIN of school 2c5f6031 or a5158947 and open School profile (sidebar "School license"). 2. Check the seats used, free, total, and each license with its dates. 3. Check that seat holders show 50 students for each page and that Next and Previous work. 4. Sign in as a TEACHER and as a STUDENT of the same school: no license part, no key, and `GET /api/users/me/school/seat-holders` returns 403. 5. Check that no button changes a license.

## Phase S5: A teacher role change takes effect [checkpoint: 39c826c36]
_Story ref: spec.md#story-s5_

- [x] Task: Contract & Schema Definition
    - [x] Zod for the teacher update body in `server/controllers/teacherController.ts` (today it is a cast, `:269-270`): `role` is `teacher` or `admin`; the map to `users.role` (`TEACHER`, `ADMIN`)
- [x] Task: Test
    - [x] Red: `server/models/__tests__/teacherModel.role-change.test.ts`: the change writes `users.role` and `user_roles` in one transaction, ends the user's sessions, and records an audit event with the old and new role; a user of another school or of a higher rank is refused and nothing changes
- [x] Task: Implement
    - [x] `server/models/teacherModel.ts` (`updateTeacher`): set `users.role` in the same transaction, call `revokeSessionsInTx`, call `recordAuditEvent`. The fix stays in this function because it holds the rank rule and the transaction
- [x] Task: Generate Docs & Doctor: JSDoc; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S5: A teacher role change takes effect' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual steps: sign in as a school ADMIN of the migrated copy. Open Admin, Teachers: the TEACHER users of the school show, with count and statistics. Change one teacher to admin: the list shows the new role and that teacher must sign in again. Delete a test teacher: it works. Open the monthly leaderboard: students show.
    - Extended scope (orchestrator): teacher reads with `roleSql`, `updateExistingTeacherToSchool` with `setUserRole`, school leaderboard students with `roleSql("student")`, `DELETE /api/users/me/school` owner downgrade from `users.role`. Details: `plan-review.md`, section "Role source fixes (lane C)".

## Phase A: Acceptance

- [ ] Task: Run S1 to S5 one time against a clone of the rehearsal copy (never the shared copy); check that no new row has `school_id` null
- [ ] Task: Side-by-side check with the kit of `primary_parity_acceptance_20261011`: AC-1 to AC-6, as a school ADMIN, a TEACHER, a STUDENT, and SYSTEM, legacy `bfea121` and the new build on copies with the same school data
    - [ ] Write `measure/tracks/primary_parity_school_management_20261011/acceptance-pairs.json` (kit FR-7): one pair for each check, with the legacy path, the new path, the role, and the observable behavior
    - [ ] Run `scripts/primary-parity/capture.ts` for legacy and new, then `scripts/primary-parity/report.ts`; the captures and the report stay in the private folder (kit FR-10)
    - [ ] Write `measure/tracks/primary_parity_school_management_20261011/acceptance.md` from the runbook template, with the result of each check
- [ ] Task: Captures of the changed parts at 375 px and 1280 px, day and night, with the demo seed or QA data only (`design/` folder; captures with real names stay in the private folder), and the owner's look check (AC-7)
- [ ] Task: Final gates: `pnpm --filter @reading-advantage/domain test`, `pnpm --filter primary-advantage test`, tsc and ESLint (AC-8); record the commands and results in `acceptance.md`
- [ ] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md)
