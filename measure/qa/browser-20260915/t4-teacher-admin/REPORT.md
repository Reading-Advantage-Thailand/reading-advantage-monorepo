# T4 — Teacher/Admin Browser QA Report

- Date: 2026-09-15
- App: primary-advantage, `http://localhost:3000` (dev server, locale `/en`)
- Driver: `driver-t4.mjs` (headless Chromium via Playwright)
- Raw evidence: `results-t4.json` (per-page console errors, page errors, failed requests, 4xx/5xx API responses, body text)
- Scope: test only. No application code changed. One scratch classroom was created and then deleted.

## Summary table

| Case | Area | Verdict |
|------|------|---------|
| 1 | Teacher dashboard | **PASS** |
| 2 | My classes + class roster | **PASS** |
| 3 | Create + delete classroom | **PASS** |
| 4 | Reports / student detail / assignments | **PASS** (assignments list empty → documented, not a crash) |
| 5 | Admin panel, user + license management | **FAIL** (management APIs return 403 for the ADMIN user) |
| 6 | Role boundary teacher → admin | **PASS** |
| 7 | School settings | **PASS** |

Multi-tenant verdict for Case 5: **PASS on tenant isolation — NO School B data leaked.**
The Case 5 failure is a functional authorization bug, not a tenant leak.

## Case 1 — Teacher dashboard — PASS

- Logged in as `qa-teacher-a` through `POST /api/auth/login` (status 200). The UI email field rejects bare usernames, so the session uses the same login API the app ships.
- `GET /en/teacher/dashboard` performs a server redirect to `/en/teacher/my-classes` (the current dashboard implementation).
- The class table shows `QA Class A`, code `QACLASSA`, and student count `3`.
- Console errors on this page: **none**. Page errors: none. Failed requests: none.
- Screenshot: `t4-01-teacher-dashboard.png`.

## Case 2 — My classes and roster — PASS

- `/en/teacher/my-classes` renders the `QA Class A` card/row with code `QACLASSA` and 3 students.
  Screenshot: `t4-02a-my-classes.png`.
- Opened class detail `/en/teacher/class-roster/828838c2-322e-435a-84b5-539dab1594e8`.
  The roster lists all three students: `qa-student-a1`, `qa-student-a2`, `qa-student-a3`.
  Screenshot: `t4-02b-class-roster.png`.
- Console errors: none.

## Case 3 — Create and clean up a classroom — PASS

- Opened the "New Classroom" dialog on `/en/teacher/my-classes`.
- Filled name `QA T4 Scratch`, selected a grade. Class code is auto-generated and read-only in the UI.
- `POST /api/classroom` returned **201 Created**. The new row appeared in the table.
  Screenshot: `t4-03a-class-created.png`.
- Cleanup: `DELETE /api/classroom/a30b5023-fe85-4b85-a099-52ae66e6ecf8` returned 200. The row disappeared.
  Screenshot: `t4-03b-after-delete.png`.
- Database verification after the run: `SELECT name FROM classrooms WHERE name LIKE 'QA T4%';` returns zero rows.

## Case 4 — Reports, student detail, assignments — PASS

No view crashed. All routes returned HTTP 200 with rendered content.

- Progress report `/en/teacher/reports?classroomId=<QA Class A>`: renders populated overview.
  It shows Total Students 3, Average XP 0, Active This Week 0%, and all three students.
  Screenshot: `t4-04a-reports.png`.
- Student detail `/en/teacher/student-progress/<qa-student-a1>`: renders "Progress for qa-student-a1"
  with Recent Activity, XP, reading stats, CEFR level A1-, and the activity heatmap.
  Screenshot: `t4-04b-student-progress.png`.
- Assignments `/en/teacher/assignments`: list-only page. The classroom selector works and lists
  `QA Class A`. After selection, `GET /api/teachers/assignments?classroomId=...` returns HTTP 200
  with `{"assignments":[],...}` and the UI shows the empty state
  "Please select a classroom to view assignments" / zero assignments.
  Screenshots: `t4-04c-assignments-empty.png`, `t4-04d-assignments-class-selected.png`.
  This is an empty state, recorded per instruction as not a failure. No assignment-creation form
  exists on this page; the per-article assign dialog is reached from content, not this route.

## Case 5 — Admin panel and user/license management — FAIL

Multi-tenant verdict: **NO School B leak. Isolation holds.** The failure is a broken authorization
gate on the management data APIs.

What works:

- `/en/admin/dashboard` renders for `qa-admin-a`. Screenshot: `t4-05a-admin-dashboard.png`.
- `/en/admin/dashboard/teachers` renders. Its teachers table is intentionally commented out in code.
  Screenshot: `t4-05d-dashboard-teachers.png`.
- License management: `/en/system/licenses` is a SYSTEM-only route. The ADMIN user is correctly
  redirected to `/en/unauthorized` (not a 500). Screenshot: `t4-05e-licenses.png`.
  No ADMIN-reachable license-management page exists under `/admin`.

Failure:

- `/en/admin/teachers` renders the page chrome, but its data calls fail:
  - `GET /api/teachers` → **403** `{"error":"Forbidden - Admin access required"}`
  - `GET /api/classrooms` → **403** `{"error":"Forbidden - Admin access required"}`
  Screenshot: `t4-05b-admin-teachers.png`.
- `/en/admin/students` has the same failure:
  - `GET /api/students?page=1&limit=10` → **403**
  - `GET /api/classrooms` → **403**
  Screenshot: `t4-05c-admin-students.png`.
- The browser console logs the matching fetch errors (captured in `results-t4.json`).

Root cause (from code and database inspection, test-only read access):

- The session for `qa-admin-a` carries `role: "ADMIN"` and `schoolId`, and the route middleware
  (`lib/route-policies.ts`) admits ADMIN to `/admin`. The dashboard renders.
- The management endpoints use a different gate. `server/controllers/teacherController.ts`,
  `studentController.ts`, and `app/api/classrooms/route.ts` call `validateUser()` then
  `checkAdminPermissions()`. These read the legacy join tables `user_roles`/`roles` and
  `school_admins`.
- The seeded QA users get their role only on the `users.role` column via
  `createCredentialAccount()` (`packages/auth/src/credential-account.ts`). That function inserts no
  `user_roles` or `school_admins` row.
- Database evidence: `roles` contains only `student` and `teacher` (no `admin` row), and
  `qa-admin-a` has no `user_roles` row. Therefore the legacy gate denies every management API for
  this admin, even though the route policy and the new auth system identify the user as ADMIN.
- Result: an ADMIN can open the admin pages but cannot load any user, student, or classroom list.

Multi-tenant check:

- DOM text on both management pages contains no `qa-teacher-b` and no `qa-student-b1`.
  The lists are empty because of the 403, so no cross-school user was rendered.
- School A data present where reachable: the admin's own school settings show QA School A with
  6 users; the database confirms QA School A has 6 users and QA School B has 6 users.
- Code observation (not runtime-reachable because of the 403): `getTeachers` in
  `server/models/teacherModel.ts` applies the `schoolId` filter only when
  `SchoolAdmins.length > 0`. An ADMIN that passed the permission check without a `school_admins`
  row would query with no school filter. This latent scoping gap needs a follow-up once the
  authorization gate is reconciled.

Repro:

1. `curl -c cj.txt -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
   -d '{"username":"qa-admin-a","password":"QaTest!2026x"}'`
2. `curl -b cj.txt http://localhost:3000/api/teachers?page=1&limit=50` → 403
   `{"error":"Forbidden - Admin access required"}`.
3. `curl -b cj.txt 'http://localhost:3000/api/students?page=1&limit=50'` → 403.
4. `curl -b cj.txt http://localhost:3000/api/classrooms` → 403.

## Case 6 — Role boundary — PASS

- With a `qa-teacher-a` session, `GET /en/admin/dashboard` is redirected by middleware to
  `/en/unauthorized`. No 500 and no admin content rendered.
- Screenshot: `t4-06-teacher-admin-boundary.png`.
- Console note: one `TypeError: Failed to fetch` for an in-flight
  `/api/teachers/assignments` request (`net::ERR_ABORTED`) appears during the redirect.
  This is a client fetch canceled while the assignments page unmounts. It is not a page error and
  not an authorization failure.

## Case 7 — School settings — PASS

- As `qa-admin-a`, opened `/en/settings/school-profile`. The page renders the "School Profile"
  form for **QA School A**: created/updated dates, Total Users 6, Total Admins 0, and a
  "No license found" license panel.
- Multi-tenant: the page shows the admin's own school only.
- No fields were saved and no submit was clicked.
- Screenshot: `t4-07-school-settings.png`.
- Note: the first browser navigation to this route exceeded 90 seconds during dev first-compile.
  A warm-up request plus one retry succeeded; the route then returned HTTP 200 in about 0.7 s.

## Console error index

See `results-t4.json` for full text.

- Cases 1, 2, 3, 4, 7: no console errors, no page errors.
- Case 5: 403 fetch errors from `/api/teachers`, `/api/students`, `/api/classrooms` (the FAIL above).
- Case 6: one benign aborted in-flight fetch during the redirect.

## Artifacts

- Screenshots: all `t4-*.png` in this directory.
- Driver: `driver-t4.mjs`.
- Machine-readable evidence: `results-t4.json`.
- `case*.png` files in this directory are stale artifacts from an earlier same-day manual run.
  The current run uses the `t4-*` files listed above.
