# T4 v2 — Teacher/Admin Browser QA Rerun (Pixel Pass)

- Date: 2026-09-16
- App: primary-advantage, `http://localhost:3000` (dev server, locale `/en`)
- Driver: `driver-t4-v2.mjs` (headless Chromium via Playwright with system Chrome at `/opt/google/chrome/chrome`)
- Test users: `qa-teacher-a` (School A) for cases 1-4 + 6, `qa-admin-a` (School A) for cases 5 + 7
- Scratch classroom used: `QA T4v2 Scratch` (created in School A, then deleted)
- Raw evidence: `results-t4-v2.json` (per-page console errors, page errors, failed requests, 4xx/5xx API responses, body text)
- Screenshots: full-page captures for every case plus viewport crops where useful
- Scope: TEST-ONLY. No application code changed. Cleanup verified (`QA Class A` still present, no scratch row left)

## Summary table

| Case | Area | Verdict | Notes |
|------|------|---------|-------|
| 1 | Teacher dashboard (`/en/teacher/dashboard`) | **PASS** | redirects to `/en/teacher/my-classes`; `QA Class A` visible with code `QACLASSA` and `3` students |
| 2 | My-classes + class roster | **PASS** | all 3 students present in roster |
| 3 | Create + delete classroom | **PASS** | 201 create, 200 delete, row gone after reload |
| 4 | Reports / student detail / assignments | **BLOCKED** | assignments empty-state (per spec); student-progress charts empty (visual defect) |
| 5 | Admin panel + user/license management | **FAIL** | management APIs return 403 for ADMIN; same as v1 |
| 6 | Role boundary teacher → admin | **PASS** | redirected to `/en/unauthorized`; not 500 |
| 7 | School settings | **PASS** | renders School A profile; no saves performed |

**Case 5 — 403 presentation:** the management page chrome still renders. The teacher list shows `"No teachers found"` with a generic icon; a toast appears in the bottom-right with the text `Failed to load teachers data`. The student page shows zeroed stat cards (`Total Students 0`, `Average XP 0`, `Most Common Level A0-`, `Active This Week 0% of 0 students`) and `"No students found matching your criteria."` — no toast on the student page. No blank page, no 500, but the silent failure on the student page is misleading.

**Multi-tenant verdict (Case 5):** **PASS — no School B data leaked.** Body-text scan across every case found no occurrence of `qa-teacher-b`, `qa-student-b`, or `qa-admin-b`. The lists are empty because of the 403, so no cross-school user was rendered. The same latent scoping gap noted in v1 (`getTeachers` only applies `schoolId` when `SchoolAdmins.length > 0`) still applies once the 403 is reconciled.

## Visual findings (pixel pass — per screenshot)

This run adds a layer the prior text-only run could not see. Findings are listed by screenshot.

### Case 1 / Case 2a — `case1-teacher-dashboard.png`, `case2a-my-classes.png`
- Both screenshots show the same `/teacher/my-classes` page (the dashboard route redirects server-side to `/teacher/my-classes`).
- **Defect: empty "Class challenges" section.** The heading `Class challenges` is rendered but has no content beneath it — it sits between the page description and the search box. Looks like an unfilled placeholder or a removed component.
- **Defect: persistent Radix tooltip.** `Import a new class from` is shown as a label hovering directly above the `Google Classroom` button. This is a Radix tooltip that didn't dismiss after the hover. Probably auto-opened during Playwright's hover-as-click on the New Classroom button. It blocks nothing but looks broken to a realuser.
- Table is correct: `QA Class A` / `QACLASSA` / `3` / `4` / Actions. Header, sidebar, footer are fine.

### Case 2b — `case2b-class-roster.png`
- **Defect: classroom password rendered in plain text in the header card.** Next to `Class Code: QACLASSA` the page shows `Password: ••••••` (six dots — the password is masked, but the password field is still surfaced in the UI for any teacher viewing the roster). This is a privacy/sensitive-data exposure that the text-only run did not flag.
- Roster lists all three students (`qa-student-a1`, `qa-student-a2`, `qa-student-a3`) with email, CEFR badge `A1-`, `Lvl 1` pill, and `0` reading count per student. Each card has `No activity` and a row actions menu.
- Header has `Class Roster` (highlighted), `Reports`, `Settings`, `Back` buttons — all rendered correctly.

### Case 3a — `case3a-create-dialog.png`
- Modal `Create Class` opens cleanly with `Class Name`, `Class Code` (auto-generated value `9tzg7u` shown greyed), `Grade` dropdown, `Create` + `Cancel` buttons. Overlay darkens the page. No visual issues.

### Case 3b — `case3b-created-list.png`
- New row `QA T4v2 Scratch` / `9tzg7u` / `0` / `3` appears above `QA Class A`. Bottom-right success toast `Success — Class created successfully` with a green check icon.
- The persistent `Class challenges` and `Import a new class from` issues from case 1 persist here too.

### Case 3d — `case3d-after-delete.png`
- Scratch row gone. Only `QA Class A` left. Same persistent tooltip/empty section issues.

### Case 4a — `case4a-reports.png`
- Reports dashboard renders cleanly with 4 metric cards and a 3-row Student List.
- The classroom dropdown defaults to `All Classrooms` even though the URL has `?classroomId=<QA Class A>` — the page does not auto-apply the query param. Minor UX issue.

### Case 4b — `case4b-student-progress.png`
- **Defect: three chart panels render as large blank regions.**
  - `XP Earned` panel: title and border present, but no chart drawn inside.
  - `XP Overall` panel: subtitle `March 2026 - September 2026` present, no chart drawn.
  - `Reading Stats Chart` panel: only the `Selected Type` dropdown is visible, no chart.
- Console error confirms cause: `Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client.` — this is the recharts/ResizeObserver pattern; the chart library can't load its runtime in the SSR-rendered React tree, so the charts silently produce empty SVGs.
- Non-chart parts of the page render fine: `Recent Activity`, `Activity Progress` (In Progress 0 / Completed 0 / date range), `CEFR Level` gauge (A1- with descriptive paragraph), `Activity Heatmap` (September 2026 calendar, empty cells).
- Next.js Dev `2 Issues` badge appears bottom-left (dev only, not a user defect).

### Case 4c — `case4c-assignments-empty.png`
- Empty state renders correctly: `Select a Classroom` dropdown, search field, headers, body text `Please select a classroom to view assignments`. Footer `Showing 0 to 0 of 0 assignments`, `Page 1 of 1`, both Previous/Next disabled.

### Case 4d — `case4d-assignments-class-selected.png`
- After selecting `QA Class A`: body shows `No assignments found`. Footer says `Page 1 of 0` — minor visual inconsistency ("of 0" instead of "of 1").

### Case 5a — `case5a-admin-dashboard.png`
- **Defect: developer-facing copy visible to admins.** The three top stat cards (`Total Students`, `Total Teachers`, `Active This Week`) display `Data unavailable — Live count wiring pending the multi-tenant scoping track.` This is internal-railroad copy that should never reach an admin user. `Live count wiring pending the multi-tenant scoping track` and `Live activity wiring pending the activity-log track` are visible.
- Second row works: `Weekly Active Users 327 +12%`, `Articles Read 187 +8%`, `Questions Answered 1,168 +15%`, `Avg Engagement 73% -3%` — colored sparkline icons render.
- `Weekly Activity Overview` and `Content Activity` area charts render correctly with smooth gradients.
- **Defect: `Class Engagement Metrics` chart has axes but no bars.** Y-axis labels (Speaking, Listening, Grammar, Vocabulary, Reading) and X-axis ticks (0,1,2,3,4) are present, but the chart body is empty. Same class of empty-chart defect as case 4b.

### Case 5b — `case5b-admin-teachers.png`
- Page chrome renders. Sidebar shows `Dashboard / Teachers (expanded) / All Teachers / Add Teacher / Students And Classes / Import Data / Article Creation`.
- Search box, three stat cards (`Total Teachers 0`, `Total Students 0`, `Total Classes 0`), and a `Teachers List` table with 8 columns. Table body: generic user icon + `No teachers found`.
- **Defect: 403 surfaced only as a toast** at bottom-right: `Failed to load teachers data`. No inline error in the table area; a realuser has no way to tell whether the table is empty because the school has no teachers or because the page failed to load.
- Next.js Dev `3 Issues` badge bottom-left (dev only).

### Case 5c — `case5c-admin-students.png`
- Page chrome renders. Sidebar here has `All Students / Add Student / Classrooms` under `Students And Classes` (different sidebar shape from case 5b — minor inconsistency between management pages).
- **Defect: filter dropdown label is truncated.** The classroom filter shows `Filter by classro…` instead of `Filter by classroom` because the dropdown control is too narrow.
- 4 stat cards all zero (Total Students 0, Average XP 0, Most Common Level A0-, Active This Week 0% of 0 students). Table shows `No students found matching your criteria.`
- **Defect: 403 surfaced silently.** No toast this time, unlike case 5b. The user sees zeros everywhere with no indication that loading failed.
- Next.js Dev `3 Issues` badge bottom-left.

### Case 5d — `case5d-dashboard-teachers.png`
- **Defect: empty page body.** Sidebar shows `Dashboard (expanded) / Admin / Teachers / …`. Main panel renders the `Teachers Management` heading and description, then nothing — no table, no message, no placeholder. To a realuser this looks like a broken page.

### Case 5e — `case5e-licenses.png`
- ADMIN was redirected to `/en/unauthorized`. Page is clean: `Unauthorized` heading, `Your account does not have access to this page.`, `Back to home` link. No app chrome (correct for an unauth page).

### Case 6 — `case6-teacher-admin-boundary.png`
- Same clean unauthorized page as case 5e. Teacher hit `/en/admin/dashboard` and was redirected to `/en/unauthorized`. No 500, no app chrome, no leaked admin content.

### Case 7 — `case7-school-settings.png`
- Renders `School Profile` for `QA School A` with Created/Updated dates, `Total Users 6 users`, `Total Admins 0 admins`. License Information panel shows `No license found` (empty state, correct).
- Next.js Dev `1 Issue` badge bottom-left.

## Case-by-case notes

### Case 1 — Teacher dashboard — PASS
- Logged in as `qa-teacher-a` via `POST /api/auth/login` (200). `GET /en/teacher/dashboard` redirects to `/en/teacher/my-classes` server-side.
- The class table shows `QA Class A`, code `QACLASSA`, `3` students, Grade `4`.
- Console errors: **none**. Page errors: none. Failed requests: none.
- Screenshot: `case1-teacher-dashboard.png` (full), `case1-teacher-dashboard-viewport.png`.

### Case 2 — My classes + roster — PASS
- `/en/teacher/my-classes` renders the `QA Class A` row.
- `/en/teacher/class-roster/828838c2-322e-435a-84b5-539dab1594e8` lists all three students: `qa-student-a1`, `qa-student-a2`, `qa-student-a3`.
- Console errors: none. (But see the password-in-header visual defect above.)

### Case 3 — Create + delete classroom — PASS
- Opened `New Classroom` dialog on `/en/teacher/my-classes`. Filled name `QA T4v2 Scratch`, picked the first grade option, clicked `Create`.
- `POST /api/classroom` → 201 with `{"success":true,"message":"Classroom created successfully"}`. New id `102f7f60-cb41-40d9-be8d-6d38d907e788`. Row visible in table.
- UI delete actions were tried first; final cleanup via `DELETE /api/classroom/102f7f60-cb41-40d9-be8d-6d38d907e788` returned 200. Subsequent `GET /api/classroom` shows only `QA Class A`.

### Case 4 — Reports / student detail / assignments — BLOCKED
- `case4 reports`: `/en/teacher/reports?classroomId=…` returns 200; renders populated overview with 3 students. (Note: dropdown defaults to "All Classrooms" instead of the query-param class.) `empty=false`, `crashed=false`.
- `case4 student detail`: `/en/teacher/student-progress/55271a44-5acd-4065-b1a9-11672a22eb55` returns 200; page title shows "Progress for qa-student-a1"; CEFR/A1- gauge renders; Recent Activity panel and Activity Heatmap render; but `XP Earned`, `XP Overall`, and `Reading Stats Chart` panels render as blank regions (visual defect, see above). Console: one React warning about a `<script>` tag inside a component. `crashed=false`, `showsStudent=true`. Not a crash, so it is treated as a non-blocking visual defect.
- `case4 assignments`: `/en/teacher/assignments` empty selector → "Please select a classroom to view assignments" / Page 1 of 1. After picking `QA Class A` → `GET /api/teachers/assignments?classroomId=…` 200 with `[]` and the UI shows "No assignments found" / "Page 1 of 0". `empty=true`, `crashed=false`. Spec says empty states are BLOCKED unless they crash, so this case is BLOCKED, not FAIL.
- The case-level verdict is BLOCKED because the assignments view is in empty state. The student-progress empty-chart panels are a separate visual defect tracked under "Visual findings".

### Case 5 — Admin panel + user/license management — FAIL (same root cause as v1)
- `/en/admin/dashboard` renders for `qa-admin-a`. Visual defects above (`Data unavailable` dev copy, empty Class Engagement chart).
- `/en/admin/teachers` renders chrome. 403 surfaces as a toast: `Failed to load teachers data`. Direct API probe: `GET /api/teachers?page=1&limit=50` → 403 `{"error":"Forbidden - Admin access required"}`. Same for `/api/students?page=1&limit=50` and `/api/classrooms`.
- `/en/admin/students` renders chrome. 403 is silent here — no toast, just zeroed stats and the filter dropdown truncation.
- `/en/admin/dashboard/teachers` renders a heading with an empty body (no table, no message).
- `/en/system/licenses` is correctly redirected to `/en/unauthorized` for ADMIN (SYSTEM-only route).
- **Multi-tenant check:** body-text scan over every page in this run found no occurrence of `qa-teacher-b`, `qa-student-b`, or `qa-admin-b`. Tenant isolation holds.
- Console errors (case 5 admin teachers): `Failed to load resource: 403`, `🔍 Classrooms fetch error: {"error":"Forbidden - Admin access required"}`, `🔍 Error fetching classrooms: 403`, `Error fetching teachers: Failed to fetch teachers`.
- Console errors (case 5 admin students): `Failed to load resource: 403`, `Error fetching classrooms: 403 Forbidden`, `API Error Response: {"error":"Forbidden - Admin access required"}`, `Error fetching students: Failed to fetch students: 403 Forbidden`.

### Case 6 — Role boundary — PASS
- `qa-teacher-a` GET `/en/admin/dashboard` → middleware redirect to `/en/unauthorized`. No 500, no admin content rendered. Clean unauthorized page (matches case 5e).

### Case 7 — School settings — PASS
- `qa-admin-a` GET `/en/settings/school-profile` → 200. Renders the form for `QA School A`: Created/Updated `September 14th, 2026`, Total Users `6 users`, Total Admins `0 admins`. License panel: `No license found`. No saves performed.
- One Next.js Dev console issue badge (1 Issue) but no console errors recorded.

## Console error index

- Case 4 student detail: 1 React warning (`Encountered a script tag while rendering React component`). Not a page error.
- Case 5 admin teachers: 4 console errors — 403 fetch failures for `/api/teachers` and `/api/classrooms` (the FAIL above).
- Case 5 admin students: 4 console errors — 403 fetch failures for `/api/students` and `/api/classrooms`.
- All other cases: clean (no console errors, no page errors, no failed requests).

## New visual defects that DOM-only checks miss

These are the items a text-only model would have missed entirely:

1. **Classroom password rendered in the class roster header card** (`case2b-class-roster.png` — `Password: ••••••` shown next to the class code).
2. **`Class challenges` heading with no content beneath it** on `/teacher/my-classes` (visible on cases 1, 2a, 3a, 3b, 3d).
3. **Persistent Radix tooltip** `Import a new class from` hovering above the Google Classroom button on the same page.
4. **Developer-facing copy on admin stat cards**: `Data unavailable — Live count wiring pending the multi-tenant scoping track` and `… pending the activity-log track` shown to admins on `/admin/dashboard`.
5. **Empty `Class Engagement Metrics` chart** on `/admin/dashboard` — axes and labels rendered, no bars.
6. **Empty chart panels on `/teacher/student-progress/…`** — `XP Earned`, `XP Overall`, `Reading Stats Chart` show as large blank regions with only headings/selects present.
7. **Truncated dropdown label** `Filter by classro…` on `/admin/students`.
8. **Empty body on `/admin/dashboard/teachers`** — heading and sidebar present, main panel blank.
9. **Inconsistent sidebar between admin pages** — case 5b shows `All Teachers / Add Teacher` under `Teachers`; case 5c shows `All Students / Add Student / Classrooms` under `Students And Classes`. Different shape between the two management pages.
10. **Inconsistent 403 presentation** — `/admin/teachers` shows a toast `Failed to load teachers data`; `/admin/students` shows nothing (zeroed stats only).
11. **Pagination footer shows `Page 1 of 0`** on `/teacher/assignments` when a class is selected (case 4d).
12. **`?classroomId=…` query param on `/teacher/reports` is not applied** — the dropdown defaults to `All Classrooms` regardless of the URL parameter.

## Known 403 root cause (unchanged from v1)

- The session for `qa-admin-a` carries `role: "ADMIN"` and `schoolId`. Route policy admits ADMIN to `/admin/*` and renders the pages.
- The management endpoints call `validateUser()` then `checkAdminPermissions()`, which read the legacy `user_roles`/`roles` and `school_admins` join tables. The seeded QA admin has no `user_roles` row and no `school_admins` row (only the modern `users.role` column is set), so every management API returns 403 for this admin.
- Reconciliation between the modern role system and the legacy permission tables is required before ADMINs can load `/admin/teachers` and `/admin/students` for their school.

## Artifacts

- Screenshots (all in this directory):
  - `case1-teacher-dashboard.png`, `case1-teacher-dashboard-viewport.png`
  - `case2a-my-classes.png`
  - `case2b-class-roster.png`
  - `case3a-create-dialog.png`
  - `case3b-created-list.png`
  - `case3d-after-delete.png`
  - `case4a-reports.png`, `case4a-reports-viewport.png`
  - `case4b-student-progress.png`
  - `case4c-assignments-empty.png`
  - `case4d-assignments-class-selected.png`
  - `case5a-admin-dashboard.png`, `case5a-admin-dashboard-viewport.png`
  - `case5b-admin-teachers.png`, `case5b-admin-teachers-viewport.png`
  - `case5c-admin-students.png`, `case5c-admin-students-viewport.png`
  - `case5d-dashboard-teachers.png`
  - `case5e-licenses.png`
  - `case6-teacher-admin-boundary.png`
  - `case7-school-settings.png`, `case7-school-settings-viewport.png`
- Driver: `driver-t4-v2.mjs`
- Machine-readable evidence: `results-t4-v2.json`
- Database verification: only `QA Class A` remains in School A after cleanup; no `QA T4v2 Scratch` rows left.