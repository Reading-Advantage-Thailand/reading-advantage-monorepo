# Line Review Evidence: primary-advantage-008

Reviewer: measure-jr-green/primary-advantage-008
Files assigned: 1
Lines assigned: 934

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/admin/students/page.tsx` | 1-934 | reviewed | 18 |

## Findings

### LR-primary-advantage-008-001 — `handleAddStudent` never POSTs to the server; the add flow is purely local

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:268-287`
- Evidence: `handleAddStudent` (lines 268-287) constructs a `Student` object (lines 269-279) with `id: Date.now().toString()` and the current form values, then calls `setStudents((prev) => [...prev, newStudent])` on line 281. There is no `fetch("/api/students", { method: "POST", body: ... })` call anywhere in the handler. The trailing `fetchStudents()` on line 286 is described by the comment on line 285 as a server refresh, but the server has no record of this locally-created student, so the GET refresh on line 161 immediately overwrites the optimistic insert with the authoritative (and un-augmented) list. The `app/api/students/route.ts:13` POST handler exists and delegates to `createStudentController` (`server/controllers/studentController.ts:100-185`), so the API is wired but the page never reaches it.
- Impact: The "Add Student" dialog is non-functional. An admin who fills in name/email, clicks "Save Student", and watches the dialog close will believe the student was created. On the next render (or page reload, or any filter change that re-fetches), the student disappears. There is no error message, no warning, no audit trail. For a primary-school admin onboarding real students, this is a data-loss path masquerading as a success.
- Recommendation: Add a `await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, cefrLevel, classroomId, password }) })` call inside `handleAddStudent`, gate `setStudents` on a `response.ok` check, surface API errors to the user, and only then call `fetchStudents()`. A Server Action is the cleaner long-term fit per `AGENTS.md` "Backend Function Pattern".

### LR-primary-advantage-008-002 — `handleUpdateStudent` never sends a PUT request; edits are silently discarded

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:302-325`
- Evidence: `handleUpdateStudent` (lines 302-325) does `setStudents((prev) => prev.map(...))` (lines 305-317) to mutate the in-memory list with the new name/email/cefrLevel/role from `formData`, then calls `fetchStudents()` on line 324. No `fetch("/api/students/{id}", { method: "PUT", body: ... })` call. The PUT route handler does exist at `app/api/students/[id]/route.ts` (referenced in `studentController.ts:239-299`), so the API is wired but unused.
- Impact: Critical. Clicking "Save Changes" in the edit dialog (line 925-927) updates the row in the table for a fraction of a second, then the next fetch from the server wipes the change. The admin's edits never persist. There is no UI feedback indicating the failure because there is no error path at all.
- Recommendation: Wire `handleUpdateStudent` to call `PUT /api/students/{editingStudent.id}` with the new name/email/cefrLevel/classroomId, await the response, check `response.ok`, surface errors, and only then call `fetchStudents()` to refresh. Consider using a Server Action for the mutation so the route handler is colocated with the form.

### LR-primary-advantage-008-003 — `handleDeleteStudent` never sends a DELETE request; the delete is optimistic-only

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:327-332`
- Evidence: `handleDeleteStudent` (lines 327-332) does `setStudents((prev) => prev.filter((student) => student.id !== id))` on line 329, then `fetchStudents()` on line 331. There is no `fetch("/api/students/{id}", { method: "DELETE" })` call. The DELETE route handler exists at `app/api/students/[id]/route.ts` (delegated from `studentController.ts:302-351`).
- Impact: Critical. Clicking the trash icon → "Delete" in the AlertDialog (lines 773-779) removes the row visually; the next fetch restores it because the server never received the delete. The admin believes the student was deleted; in fact the row is still in the database and will reappear on the next page load, filter change, or any other action that triggers a refetch. For primary-student records, this is a data-integrity bug with privacy implications.
- Recommendation: Call `await fetch(\`/api/students/${id}\`, { method: "DELETE" })`, await the response, check `response.ok`, surface errors, then either optimistic-update the local list or call `fetchStudents()`.

### LR-primary-advantage-008-004 — Form's `role` field is silently dropped by the API contract

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:268-279,539-550`
- Evidence: The role Select on lines 539-547 exposes three options: `student`, `teacher`, `admin`. `handleAddStudent` (lines 268-279) populates the optimistic `Student.role` from `formData.role` on line 275. However, `createStudentController` at `server/controllers/studentController.ts:128` destructures only `{ name, email, cefrLevel, classroomId, password }` from the request body — `role` is not in the allowlist. Even if the page ever sent the role (it currently doesn't, per LR-008-001), the server would discard it. The same gap exists in the edit flow: the form submits `role` via `formData.role` (line 296, 313) but `updateStudentController` (`studentController.ts:268-272`) casts the body to `UpdateStudentInput` without role handling.
- Impact: High. The role select is a UI-only control. An admin who selects "admin" for a new student will see "admin" briefly in the table (the optimistic insert on line 281 uses the locally-chosen role), then on the next fetch the server returns the actual stored role — which is whatever default the create path applies. This is a contract mismatch between the page and the API that no reviewer of either side in isolation would catch.
- Recommendation: Either (a) extend `createStudentController` to accept and validate `role` (with a Zod schema, a server-side role guard, and a TenantDB-scoped insert), or (b) drop the role Select from the form and let the server always default to `"student"`. Option (a) requires removing the `"admin"` option for non-system actors (see LR-008-005).

### LR-primary-advantage-008-005 — Role select offers "admin" to school-level admins; privilege-escalation surface

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:539-547`
- Evidence: The role Select on lines 539-547 includes `<SelectItem value="admin">{t("roles.admin")}</SelectItem>`. The current API drops the field (LR-008-004), so this is inert today, but if `createStudentController` is later extended to honor the field, a school-level admin using this page could set a freshly-created student's role to `"admin"`. The page provides no UI signal that "admin" is a system-only role, and the page itself does not check the current user's role — it relies entirely on the server route. Per the root `AGENTS.md` permissions section, role escalation should never be reachable from a school-admin surface.
- Impact: High latent risk. The mere presence of the option in a form targeted at school admins is enough to flag this as a primary-student adaptation risk: if a school admin elevates a primary-age student (or a colleague) to system admin, the consequences span the entire platform. The fact that the API currently drops the field should not be relied on as a security boundary — the form shape itself should not offer the option.
- Recommendation: Remove `<SelectItem value="admin">` from the form. If system admins need to create other admins, that should be a separate route guarded by a system-role check. For school admins, the role options should be `student` only (or `student` + `teacher` if a teacher-onboarding flow is in scope, but never `admin`).

### LR-primary-advantage-008-006 — No `schoolId`/tenant scoping in the client interface; tenant context invisible to the admin

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:60-71,148-181`
- Evidence: The `Student` interface on lines 61-71 defines `id, name, email, cefrLevel, xp, role, createdAt, className, classroomId` but no `schoolId`. The fetch on line 161 builds `URLSearchParams` with `page, limit, search, classroomId, cefrLevel` and no `schoolId` parameter. The form's POST body (when wired, per LR-008-001) would carry `name, email, cefrLevel, classroomId` and no `schoolId`. The Header on line 350 displays only `t("header.title")` and `t("header.subtitle")` — no school name, no tenant context. The page has no way to display which school a row belongs to. Per the root `AGENTS.md` multi-tenancy rule, every query must be scoped by `schoolId` and that scoping must be visible in the UI surface that lists tenant data.
- Impact: High. The admin sees rows that are filtered server-side by `userWithRoles.schoolId` (in `studentController.ts:40-69` and `classrooms/route.ts:60-63`), but the client has no audit-friendly way to verify that the filter is applied, no way to display the school context, and no defensive client-side check. If the server route ever forgets the `where` clause, the client will silently render cross-tenant data. This is a shared-package migration blocker because the Drizzle migration depends on consistent `schoolId` propagation in UI code — a missing `schoolId` field on the client interface is a regression versus the migration contract.
- Recommendation: Add `schoolId: string` (or `tenantId`) to the `Student` interface, include it in the displayed table column or in a school-name chip, pass it explicitly in the POST/PUT bodies, and surface a school indicator in the Header so the admin knows which school's data they are looking at.

### LR-primary-advantage-008-007 — Search query triggers a fetch on every keystroke; comment claims debounce but no debounce exists

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:202-215`
- Evidence: The `useEffect` on lines 207-209 has `[pagination.page, searchQuery, selectedClassroom, selectedCefrLevel]` as its dependency array. `handleSearch` (lines 212-215) calls `setSearchQuery(value)` directly (line 213) which causes the effect to refire and `fetchStudents()` to run. There is no `setTimeout`-based debounce, no `useDeferredValue`, no `useTransition`, no SWR/React Query. The comment on line 211 (`// Handle search with debounce`) is aspirational — the implementation does not match. Typing "alex" in a 200-student school produces four API calls in <1s, plus the statistics are recomputed server-side on every call (LR-008-015).
- Impact: Medium. Server-load amplification. If the API is rate-limited per session, a fast-typing admin will hit the limit. The misleading comment is also a maintenance trap: a future reviewer may believe the debounce is in place and avoid fixing it.
- Recommendation: Implement a real debounce (e.g., `useEffect` with `setTimeout(() => setSearchQuery(inputValue), 300)` and a `clearTimeout` cleanup), or move to a Server Action + `useDeferredValue`, or use SWR/React Query's built-in debounce. Either way, update or remove the comment on line 211.

### LR-primary-advantage-008-008 — `id: Date.now().toString()` is a fragile local ID for new students

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:270`
- Evidence: Line 270 sets `id: Date.now().toString()`. The current pattern is local-only (LR-008-001 means the optimistic insert is wiped by the next fetch), so the collision risk is theoretical. If the add fix is implemented as a real POST + optimistic update, two clicks in the same millisecond or two browser tabs opened against the same admin session would produce the same id, and the optimistic-insert + server-merge pattern would either deduplicate incorrectly or surface a key collision.
- Impact: Low (latent). The collision window is sub-millisecond; under normal use it will not fire. Under load or rapid clicking it can. The pattern is also a fork-specific anti-pattern — `crypto.randomUUID()` is available in all modern browsers and the server should always be the source of truth for IDs.
- Recommendation: When wiring the real POST, drop the local `id` from the optimistic insert and use the server-returned `student.id` from the POST response. Until then, change `Date.now().toString()` to `crypto.randomUUID()` to remove the collision risk for the brief local lifetime.

### LR-primary-advantage-008-009 — `fetchStudents` swallows errors with only `console.error`; no user-visible failure feedback

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:163-180`
- Evidence: Lines 163-169 read the error response body and `console.error("API Error Response:", errorText)` before throwing. Lines 176-180 catch and `console.error("Error fetching students:", error)`. There is no `setError(...)` state, no toast, no banner, no inline message. The `isLoading` flag is reset in `finally` (line 179) so the page returns to its empty state with no indication that the empty list is the result of a failure, not the absence of students. The same pattern is mirrored in `fetchClassrooms` on lines 184-200.
- Impact: Medium. Silent failure mode for the central admin workflow. An admin who loses network or whose session has expired will see "No students" and assume their school has no students. The admin dashboard silently stops working without any user-visible signal. This is a regression from a baseline where error toasts or banners are standard.
- Recommendation: Add an `error: string | null` state, set it on caught exceptions, render it as a `<Card variant="destructive">` (or equivalent) at the top of the table area, and clear it on the next successful fetch. Consider also adding a manual "Retry" button.

### LR-primary-advantage-008-010 — Form submit button has no `disabled` and inputs have no `required`; empty submissions silently fail

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:461-555,843-928`
- Evidence: The "Save" Button on line 553 (and the equivalent "Save Changes" on line 925) is `<Button type="submit" onClick={handleAddStudent}>` with no `disabled` prop and no early-return guard inside `handleAddStudent`. The Input fields on lines 461-472 (name) and 478-488 (email) are missing the `required` HTML attribute. The same is true for the edit dialog on lines 848-867. The server's `createStudentController` (line 132-137) does check for missing name/email and returns 400, but the page never surfaces that 400 — combined with LR-008-001 the form closes, the optimistic insert flashes, and the next fetch wipes it.
- Impact: Medium. A user who clicks "Save" with an empty form sees the dialog close, the table unchanged, and no error. For a primary-school admin (often non-technical) this is indistinguishable from a successful save followed by some server-side dedup.
- Recommendation: Add `required` to the name and email Inputs, add a `disabled={!formData.name || !formData.email}` to the save buttons, and surface server validation errors through a `setError`/`setFormError` state rendered inline in the dialog.

### LR-primary-advantage-008-011 — Delete confirmation uses a generic AlertDialog with no identity check and no second confirmation

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:751-783`
- Evidence: The trash button (line 752-755) opens an `AlertDialog` whose body templating on lines 763-766 is `student.name || student.email || ""`. If both fields are null/empty (which the `Student` interface allows for both, lines 63-64), the user sees the message "Are you sure you want to delete ?". The `AlertDialogAction` on line 773-779 calls `handleDeleteStudent(student.id)` directly. There is no "type the student's name to confirm" guard, no school-scope check, and the destructive action is initiated by a single click.
- Impact: Medium. The soft confirmation is easy to mis-click. A second admin on the same school, or a parent/guardian viewing over a teacher's shoulder, can trigger the destructive action with one click. Because LR-008-003 means the delete is currently a no-op, the data is safe; once the delete is wired, this becomes a real concern for primary-student records.
- Recommendation: Add a typed-confirmation input (e.g., require the user to type the student's email before the Delete button enables), use `<AlertDialogAction>` only after the typed name matches, and surface the school context so the admin confirms they are deleting from the right school.

### LR-primary-advantage-008-012 — Filter state lives in component state, not URL; refresh drops the filter context

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:130-133,148-181`
- Evidence: `searchQuery` (line 131), `selectedClassroom` (line 132), `selectedCefrLevel` (line 133), and `pagination` (lines 123-128) are all `useState`. None of them are written to `URLSearchParams` via `useRouter`/`useSearchParams` or `window.history`. The fetch on line 161 reads them from state, not from the URL. Reloading the page or sharing a link drops the filter and pagination context.
- Impact: Medium. The dashboard filters don't survive a refresh, a back-button navigation, or a link share. For a primary-school admin investigating a specific student, the only way to preserve context is to take a screenshot.
- Recommendation: Move `searchQuery`, `selectedClassroom`, `selectedCefrLevel`, and `pagination.page` into URL search params using `useSearchParams` + `useRouter`. Read them in `fetchStudents` (or have a `useEffect` that syncs state from the URL). This makes filters shareable, back-button navigable, and refresh-safe.

### LR-primary-advantage-008-013 — Save button uses `type="submit"` but the dialog has no `<form>` wrapper; Enter key does not submit

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:445-558,835-930`
- Evidence: The Add dialog (lines 445-558) and Edit dialog (lines 835-930) wrap the form fields in `<div className="grid gap-4 py-4">` (lines 459, 843), not a `<form>`. The save buttons on line 553 (`<Button type="submit" onClick={handleAddStudent}>`) and line 925 (`<Button type="submit" onClick={handleUpdateStudent}>`) use `type="submit"`, but with no enclosing `<form>` this attribute is a no-op. Pressing Enter while focused on any input does not fire `handleAddStudent` / `handleUpdateStudent`. The form also has no `onSubmit` handler.
- Impact: Medium. Standard keyboard form-submission pattern is broken. Users who tab through the form and press Enter (the most common pattern for accessibility and power users) cannot save. The `type="submit"` attribute is misleading.
- Recommendation: Either wrap the dialog body in `<form onSubmit={handleAddStudent}>` and use `type="submit"` (which will then correctly fire on Enter), or drop `type="submit"` and rely on the `onClick`. The wrapper approach is preferred for accessibility and keyboard handling.

### LR-primary-advantage-008-014 — Statistics recomputed on every fetch; no client-side memoization or cache

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:171-180,202-209`
- Evidence: `fetchStudents` always sets `setStatistics(data.statistics)` (line 174) from the server response. The `useEffect` (lines 207-209) refires on every search/filter change. The server's `getStudentStatistics` (referenced via `studentController.ts:72`) runs the underlying SQL each time. There is no client-side cache, no `useMemo`, no SWR.
- Impact: Low. Server-side cost; the stats query is presumably small but is not free. Combined with the lack of debounce (LR-008-007), this amplifies the per-keystroke server load.
- Recommendation: Split the statistics fetch from the students fetch (e.g., fire stats on mount only, or use a longer-lived SWR cache for stats). Or accept the cost and document it as a known trade-off.

### LR-primary-advantage-008-015 — `useEffect` closure race: rapid filter changes can let an older response overwrite a newer one

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:148-181,207-209`
- Evidence: `fetchStudents` (lines 149-181) is an `async` function that `await`s `fetch(...)` on line 161. The `useEffect` on lines 207-209 fires a new `fetchStudents()` on every `searchQuery`/`selectedClassroom`/`selectedCefrLevel`/`pagination.page` change. There is no request-cancellation token (e.g., `AbortController`) and no response-staleness check. If the user types "a" then "al" within 100ms, the "a" request may resolve after the "al" request and overwrite the table with stale "a" data. The state setters on lines 173-175 run unconditionally.
- Impact: Medium. A user who filters quickly may see results that match a previous (shorter) filter, not the current one. The pagination shown on line 175 may also be wrong.
- Recommendation: Add an `AbortController` per request, or wrap the response-handling in a `useRef` flag that suppresses state updates for stale responses. A request library (SWR, React Query) handles this automatically.

### LR-primary-advantage-008-016 — Page has no auth/role guard of its own; relies entirely on layout and API

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:1,110-205`
- Evidence: The page is `"use client"` (line 1). It does not call `currentUser` (which exists at `lib/session.ts:16`), does not read the session from a hook, and does not perform any client-side role check. The only auth boundary is in `app/api/students/route.ts` (which delegates to `studentController.ts:34-50` for `validateUser` + `checkAdminPermissions`). If a user without admin role lands on this page, the page renders fully (with empty data) and the API calls return 401/403, which the page swallows via `console.error` (LR-008-009). The admin layout at `app/[locale]/admin/layout.tsx:1-16` (already reviewed in batch 007) also performs no auth check, deferring to `AppLayout`.
- Impact: Medium. The defense-in-depth is OK (server enforces), but the user experience is bad: an unauthenticated user sees the page chrome and an empty table with no error message. They may not realize they are not signed in. There is no client-side redirect to `/auth/signin`.
- Recommendation: Either add a top-level `useEffect` that calls a `/api/session` endpoint and redirects on 401, or wrap the page in a `<RequireRole role="admin">` client component that handles the redirect. The `AppLayout` could also do this at the layout level.

### LR-primary-advantage-008-017 — Most-common-level default `"A0-"` is a sentinel that displays as a real level on first load

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:114-120,395-413`
- Evidence: `statistics.mostCommonLevel` is initialized to `"A0-"` on line 117 — the same string used as an actual selectable level in the form (lines 505, 601, 883). The KPI card on lines 395-413 renders this string directly (line 407). On first load (before `fetchStudents` resolves) the admin sees a "Most Common Level" of "A0-" which is indistinguishable from a real value.
- Impact: Low. Visual confusion for the first ~200ms of page load. After the API resolves, the real value replaces the sentinel. For an admin glancing at the page during navigation, this can mislead.
- Recommendation: Either initialize to `null`/`""` and render an em-dash when the value is null, or set `isLoading` to `true` immediately and rely on the loading spinner (which is already there, line 405) — the spinner is what should display before the first fetch resolves. The current code does show the spinner when `isLoading` is true (line 405), so the issue is only that the value is set to `"A0-"` and may briefly display if `setIsLoading(false)` runs before the spinner has a chance to render. Confirm the loading state actually covers this transition.

### LR-primary-advantage-008-018 — Bulk-import-style "Add Student" UI offers no `password` field, but server requires it for primary-student accounts

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:74-79,140-146,459-550`
- Evidence: The form schema on lines 74-79 defines only `name, email, cefrLevel, role`. There is no `password` field in either the Add dialog (lines 459-550) or the Edit dialog (lines 843-923). However, `createStudentController` (`studentController.ts:128,154`) destructures `password` from the request body and passes it to `createStudent` in the model layer. For primary-student accounts, the absence of a password means the school admin either (a) must manually email a generated password outside the system, or (b) the server falls back to a default and the student never changes it. There is no UI for "send invite email" or "generate random password".
- Impact: Medium. The UX is incomplete. A school admin adding 30 primary-age students must individually message each one with credentials. The lack of a `password` field on the form is consistent with the API contract gap, but the form claims to be a complete onboarding flow.
- Recommendation: Add a `password` field to the form (or a "Generate random password" button that the user can copy), or extend the API to send an invite email and have the form reflect that the password is server-generated. For primary-age students, the invite flow is also a consent / guardian-notification surface that should be documented in `apps/primary-advantage/AGENTS.md`.

## No-Finding Notes

No files in this batch produced no-finding entries; the single file (`apps/primary-advantage/app/[locale]/admin/students/page.tsx`) generated 18 findings.
