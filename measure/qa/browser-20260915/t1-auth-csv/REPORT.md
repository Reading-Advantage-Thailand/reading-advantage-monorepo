# T1 Browser QA — Auth, Session, CSV Upload Gate

- Date: 2026-09-15
- App: primary-advantage (Next.js dev server, http://localhost:3000)
- Method: headless Playwright (Chromium), repo-root `playwright` package
- Scope: School B users only (qa-admin-b, qa-teacher-b, qa-student-b1)
- Test-only run: no application code was modified
- Raw artifacts: `run-output.json` (console errors + notes), `api-upload-*.json` (API responses), `fixtures/` (CSV files)

## Case 1 — Auth: PASS

Screenshots: `t1-01-teacher-ui-login-validation.png`, `t1-02-teacher-landing.png`,
`t1-02b-teacher-dashboard-redirect.png`, `t1-02c-teacher-dashboard.png`,
`t1-04-after-logout.png`, `t1-04b-after-logout-signin.png`, `t1-04c-anon-landing.png`,
`t1-05-invalid-password-error.png`, `t1-06-unauth-redirect-to-signin.png`,
`t1-07-student-unauthorized-page.png`

Observations:

1. Valid login as qa-teacher-b lands on `/en` with the account menu and a
   "Teacher Dashboard" navigation entry. `/en/teacher/dashboard` redirects to
   `/en/teacher/my-classes` (teacher layout with My Classes / My Students /
   Reports / Assignments). Role-appropriate home: PASS.
   Note: the seeded username `qa-teacher-b` is not an email address. The
   teacher sign-in form uses an `type="email"` input, so the browser blocks
   submission. The session was established with the login API
   (`POST /api/auth/login`, status 200), then pages were exercised in the
   browser.
2. Invalid password: the form shows the banner "Invalid username or
   password". Login API returns 401 with `{"message":"Invalid username or
   password"}`. No 500. PASS.
3. Logout: `POST /api/auth/logout` returns 200 and the `session_token` cookie
   is cleared. The app stays on the public `/en` landing page. It does not
   force-redirect to `/en/auth/signin`. After logout, visiting
   `/en/teacher/my-classes` redirects to
   `/en/auth/signin?callbackUrl=%2Fen%2Fteacher%2Fmy-classes`. Session
   termination: PASS. Forced redirect to sign-in after logout: observation,
   not a failure against the tested flows.
4. Unauthenticated visit to `/en/teacher/my-classes` redirects to sign-in
   with a callback URL. PASS.
5. qa-student-b1 (read-only check) visiting `/en/teacher/my-classes` renders
   `/en/unauthorized` ("Unauthorized — Your account does not have access to
   this page" with a Back to home link). PASS.

Console errors (case 1 pages): only resource-load noise
("Failed to load resource: 401/400"). No uncaught page errors.

## Case 2 — Session: PASS

Screenshots: `t1-03-session-after-reload.png`

Observations:

1. After login, a reload of `/en/teacher/my-classes` keeps the session. The
   URL is unchanged and the teacher layout renders.
2. Session cookie flags: `session_token` is `httpOnly: true`, `sameSite: Lax`,
   `path: /`. `secure` is false, which is expected on the local http dev
   server.

Console errors: only resource-load noise (401/400).

## Case 3 — CSV Upload Gate: PASS

Screenshots: `t1-09-admin-import-data-ui.png`,
`t1-10-ui-upload-result.png`, `t1-11-api-upload-csv-first.png`,
`t1-12-api-upload-csv-reupload.png`, `t1-12b-api-upload-csv-teacher.png`
API responses: `api-upload-csv-first.json`, `api-upload-csv-reupload.json`,
`api-upload-csv-teacher.json`
Fixture: `fixtures/students.csv`

Fixture content (headers per `app/api/upload/csv/route.ts` contract):

```
name,email,role,classroom_name
Dup One,dup.browser@example.com,student,QA Class B
Dup Two,dup.browser@example.com,student,QA Class B
Mixed Cased,MixedCase.Browser@Example.COM,student,QA Class B
New Student,newstudent.browser@example.com,student,QA Class B
```

Results (`POST /api/upload/csv`, multipart file `students.csv`, qa-admin-b
session):

| Upload | HTTP | inserted | skippedDuplicate | skippedExisting |
|--------|------|----------|------------------|-----------------|
| First | 200 | 3 | 1 | 0 |
| Re-upload (same file, admin) | 200 | 0 | 1 | 3 |
| Re-upload (same file, teacher qa-teacher-b) | 200 | 0 | 1 | 3 |

First-upload stats block: `totalRows: 4`, `processedUsers: 3`,
`createdUsers: 3`, `errors: 0`, `classroomsCreated: 0` (QA Class B already
existed), `studentAssignments: 3`, school stamped as "QA School B".

Verification:

1. No 500 on any upload. All responses are HTTP 200.
2. Re-upload reports every row as existing/skipped (`inserted: 0`,
   `skippedExisting: 3`). The in-file duplicate row is counted once as
   `skippedDuplicate: 1` on every upload.
3. Teacher role is allowed by the `student:import` policy (200, not 403).
4. Read-only DB check confirms exactly three created users, no duplicates:
   `dup.browser@example.com`, `mixedcase.browser@example.com` (mixed-case
   input stored lowercased), `newstudent.browser@example.com`.

Observation (not a Case 3 failure):

- No UI calls `/api/upload/csv`. The admin Import Data page
  (`/en/admin/import-data`, admin-only — a teacher gets `/en/unauthorized`)
  posts every tab to `/api/upload/classes` (fetch URL has a trailing space).
  That route rejects in-file duplicate emails with HTTP 400
  ("Row 3: Duplicate email 'dup.browser@example.com' within the same
  upload"), so the same fixture cannot pass through the admin UI. The
  skip-and-count behavior of `/api/upload/csv` is only reachable via API.

Console errors: none on the API runs; admin UI pages show only 400
resource-load noise.

## Case 4 — Classes CSV Upload: PASS

Screenshot: `t1-13-api-upload-classes.png`
API response: `api-upload-classes.json`
Fixture: `fixtures/classes.csv` (header `classroom_name`, one row
`QA Browser Class T1`)

`POST /api/upload/classes` with qa-teacher-b: HTTP 200,
`stats: { totalRows: 1, errors: 0, processedClasses: 1, createdClassrooms: 0 }`.
The class already existed, so zero new classrooms were created. School
stamped as "QA School B". No 500. No console errors.

## Overall

| Case | Result |
|------|--------|
| 1 Auth | PASS |
| 2 Session | PASS |
| 3 CSV upload gate | PASS |
| 4 Classes CSV | PASS |

No FAIL items. No duplicate user creation. No 500 responses. Open
observations for the owning track:

1. Logout clears the session but leaves the browser on the public `/en`
   landing page instead of redirecting to sign-in.
2. `/api/upload/csv` has no UI caller; the admin Import Data UI posts to
   `/api/upload/classes` and rejects in-file duplicates instead of skipping
   them.
3. The teacher My Classes page rendered "Empty" for qa-teacher-b even though
   QA Class B exists and qa-teacher-b is its classroom teacher.
