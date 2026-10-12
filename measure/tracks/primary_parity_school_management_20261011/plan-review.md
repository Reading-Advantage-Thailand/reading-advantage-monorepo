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
