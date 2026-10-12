# Plan review — primary_parity_school_management_20261011

## Phase D: Design (review of `git diff dda0af73e..HEAD`)

Scope: documents only (behavior contract, reference SQL, design index, spec defaults, plan marks). No code, no test, no locale key changed.
Plan compliance: done. Critical: none. High: none.

Medium:

- M1. Seat usage has a shared owner. `packages/domain/src/licenses/usage.ts` comes from lane A (admin dashboard). Phase S4 must merge integration first and reuse it. If the file is missing at that time, build it as the admin dashboard FR-7 says.
- M2. The `licenses` table has two end dates (`expires_at`, `expiry_date`). The contract and SQL use `expiry_date` (the column that the school profile card reads). Phase S4 must confirm that `usage.ts` uses the same column.
- M3. The rehearsal copy has a school with 417 students and no license. The view shows "No active license" for it (design default). Acceptance AC-4 must pick a school with an active license.

Low:

- L1. The `licenses.school_id` column is nullable in the copy; the view reads licenses of the session school only.
- L2. Design clips: the "Choose file" label wraps at 375 px; a pinned `Panel` pin clips at a dialog edge (see `design/captures.md`).
- L3. Reference SQL L3 joins `classrooms` on `school_id`; a student in a class of another school would show no class name. This is the wanted behavior.

Shortcuts and lessons for the orchestrator: none for the shared files. The harness of the admin dashboard design is reusable: copy, change `ROOT`, and write new `page.tsx` and `render.tsx`.

## Phase S1: Admin assigns teachers to a class (review of `git diff 3d88cb41c..HEAD`)

Scope: `setClassroomTeachers` (domain), the PATCH `teacherIds` path, `GET /api/teachers?schoolId=`, the teacher picker, 5 locale files.
Plan compliance: done. Critical: none. High: none.
Checks: the tenant rule is in the domain function (ADMIN of another school gets FORBIDDEN, tested); Zod on the PATCH body and the domain input; `assertCan`; no `console.error` in new server code (logger used); locale key parity (6 keys + 1 toast key in each of 5 files).
Tests: domain 12 pass; app changed files 14 files, 86 tests pass; tsc clean; ESLint 0 errors on changed files.

Deviations:

- D1. Red-first skipped for the domain test, the controller tests, and the picker test. The earlier helper wrote the domain code first. The other tests came after the code.
- D2. `assertCan(user, "class:teachers:assign" as Permission)` uses a cast. The key lives in the module registry (`classes/permissions.ts`), not in the central `PERMISSIONS` type. Other modules list keys in both places.

Medium:

- M4. The picker lists `role=teacher` users only. A class owner with the ADMIN role does not show in the list. The owner stays on the class and its id is sent, but no owner row shows.
- M5. The picker asks for 500 teachers at most. A school with more teachers needs a search box.
- M6. The Thai text is by the helper: owner check pending.

Low:

- L4. The captures show no toast (the harness has no Toaster). The error capture shows the dialog kept open after a 400.
- L5. `PATCH` with `teacherIds` from a TEACHER session gives 403 after the class access check. No row changes.
- L6. A13 (stale archived directory `agents_md_audit_science_advantage_20260603`) is an old doctor failure.

Notes for S3: `ownerId` is now in the `GET /api/classroom` list rows. The `teachers-table` school filter can reuse the `?schoolId=` of `/api/teachers`. Keep the Phase D notes M2 and M3 for S4.

## Phase S2 review

Tests: app 20 files, 107 tests pass (upload routes, import page, components/admin, server/utils); auth permissions 17 pass; domain set-classroom-teachers 12 pass; app tsc clean; ESLint 0 errors on changed files.

Review result: no Critical or High finding. Every write in both routes uses the tenant handle of the resolved school. The session school feeds the guard. The audit event is best-effort (a failed write is logged).

Medium:

- M7. The Thai text of `ImportData.upload.chooseSchool` and `upload.success.school` is by the helper: owner check pending. Keys exist in the five locale files.
- M8. Both routes still use `console.error` in the old catch blocks (existing code, not changed). Move them to the logger in a later track.
- M9. The classes route audit counts come from the `stats` object (numeric fields only).

Low:

- L7. The page test replaces the Radix select with a native select. The captures cover the real select.
- L8. The harness stubs `csv/sync` (preview only).

Shortcut/tech-debt: the row of 2026-09-14 is set to Resolved in `measure/tech-debt.md` as the prompt allowed. Rule 4 of `session-school-policy.md` is updated.


## Phase S3 review

Tests: domain `move-teacher-school.pglite` 7 pass, `set-classroom-teachers.pglite` 12 pass, `teachers` and `primary-teacher-home` 18 pass; auth permissions 18 pass; app `teacherController.move`, `teacherController.school-filter`, `/api/classrooms` route tests, and `teachers-table.school` 19 pass; app tsc clean; ESLint 0 errors on changed files (5 old warnings).

Review result: no Critical or High finding. The domain function asserts `teacher:school:move` (SYSTEM only) before any read, runs in one transaction, locks the teacher row, scopes the class check with the tenant handle of the target school, and writes the audit event in the same transaction (ids and counts only). The move route checks SYSTEM before the body. The PUT route refuses `schoolId` from non-SYSTEM callers with 403 and writes nothing. New log lines use the logger.

Deviations:

- D1. The plan says `app/api/classrooms/route.ts` and `classroomController.ts`. The real route is `app/api/classrooms/route.ts` (the admin teachers table calls it). It has no controller, so `?schoolId=` is in the route. The route test is `app/api/classrooms/__tests__/route.school-filter.test.ts`. The separate `app/api/classroom` route (S1 picker) is unchanged.
- D2. The audit event writes with the transaction handle (`auditEvents` insert) and not with `recordAuditEvent`, because that helper uses the global handle and the event must commit with the move.
- D3. Red-first skipped (tests written after the code).
- D4. The 409 step is a refusal dialog with the class names and a Close button. There is no override (spec default).

Medium:

- M10. After a move, the table sends a second PUT for name, email, and role. When that PUT fails, the move stays committed and a toast shows the error.
- M11. A user with the `admin` role name cannot move (domain code NOT_A_TEACHER, 400). The edit dialog hides the school select for these rows.
- M12. The add-teacher dialog for SYSTEM still lists the classes of all schools (not in S3).
- M13. The Thai text of `AdminTeachers.Table.schoolManage.*` is by the helper: owner check pending.
- M14. The move does not change `school_admins` or legacy `user_roles` rows.

Low:

- L9. The harness fakes the API data; the captures show the real components and CSS only.
- L10. The test replaces the Radix selects with native selects.

## Phase S4 review (review of `git diff 90f90e525..HEAD`)

Tests: domain `licenses-view.pglite` 11 pass, `licenses-usage` 8 pass, `primary-school-dashboard.pglite` and `licenses` pass; app 56 files (components/school, components/admin, server/models, app/api/users, configs, lib) pass after the model fix; app tsc clean; ESLint 0 errors on changed files (old warnings only). The domain `dist` was rebuilt under the lock.

Review result: no Critical or High finding. `getSchoolLicenseView` and `listSeatHolders` check access before any read: SYSTEM, an ADMIN of the same school, or a TEACHER with a `school_admins` row of that school (read with the tenant handle). An ADMIN of another school gets FORBIDDEN. SQL uses `unscoped(reason)` and filters `school_id` in every query. Zod parses the page and the school id. The page, the `GET /api/users/me/school` route, and `getSchoolDetail` give the license and its key to a school admin only (default `withLicense: false`). The route uses the logger. Keys are in the five locale files (licensePanel 36 keys, Sidebar `schoollicense`). The view calls neither `listUserLicenses` nor `attachUserToLicense`.

Decision M2 (end date column): `usage.ts` already uses `expiry_date`. On `primary_parity_20261011` both columns are equal in the 2 licenses (read only), and the ETL (`primary-legacy-import.ts`) writes both from the legacy `expiryDate`. Decision: `expiry_date` everywhere. The only change in `usage.ts` is that `LICENSE_END_DAY` is exported, so the view reuses the same end-day SQL. Admin dashboard tests stay green.

M3 handled: no active license shows "No active license" and never the over-limit warning. AC-4 uses school 2c5f6031 or a5158947.

M10 fixed: `components/admin/teachers-table.tsx` sends the PUT first, then the move. A failed PUT sends no move. A failed move (400 or 500) shows the message in the dialog (`role="alert"`) and refreshes the list. A 409 still opens the refusal dialog. Side effect: after a refused move, the name, email, and role are saved already.

Deviations:

- D5. The license states are `active`, `ended`, `inactive`. The design mock had "Not started"; it is not built (the seat rule ignores the start date).
- D6. The seat holder route calls a model function (`getSeatHoldersForCaller`), not the domain directly, because `lib/__tests__/api-no-direct-db.test.ts` forbids a db import in a route.
- D7. The old license card (key, max users) stays above the new panel and shows for a school admin only (it showed "No license found" to every user before).

Medium:

- M11. Thai, Chinese (cn, tw), and Vietnamese text of `licensePanel` is by the helper: owner check pending.
- M12. A TEACHER with a `school_admins` row passes the domain check, but the session user has no `SchoolAdmins` list, so the sidebar link (`SCHOOL_ADMIN_ACCESS`) can stay hidden for that teacher. The page itself works.
- M13. The over count and the seats use students of the school only (`users.role = 'STUDENT'`); legacy counted all users. This is the spec default.

Low:

- L8. At 375 px the header text "License" over the light top of the backdrop has low contrast in day mode (see `s4-license-*-day-375.png`).
- L9. `userModel.activity.behavior.test.ts` failed one time in a full run under load and passed alone (flaky under load, not related).
- L10. No test covers `GET /api/users/me/school` with `licenseView` (the route test mocks are heavy); the helper and the model have tests.
