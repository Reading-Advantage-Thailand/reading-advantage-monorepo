# Line-by-Line Review: Reading Advantage — Batch 32

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-32`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `88928ff5417608d340debf534c56ddefe2c6bbb2`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / anti-patterns

---

## Scope

All 20 files listed in the batch were read in full, line by line.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/components/system/reports-skeleton.tsx` | 1–111 |
| 2 | `apps/reading-advantage/components/system/reports.tsx` | 1–958 |
| 3 | `apps/reading-advantage/components/system/school-reports.tsx` | 1–124 |
| 4 | `apps/reading-advantage/components/system/shcools-dashboard.tsx` | 1–363 |
| 5 | `apps/reading-advantage/components/system/system-sidebar-nav.tsx` | 1–67 |
| 6 | `apps/reading-advantage/components/system/top-schools-xp-gained.tsx` | 1–88 |
| 7 | `apps/reading-advantage/components/tabs.tsx` | 1–76 |
| 8 | `apps/reading-advantage/components/teacher/archive-class.tsx` | 1–101 |
| 9 | `apps/reading-advantage/components/teacher/assign-dialog.tsx` | 1–744 |
| 10 | `apps/reading-advantage/components/teacher/assignment-dashboard.tsx` | 1–854 |
| 11 | `apps/reading-advantage/components/teacher/assignment-page.tsx` | 1–504 |
| 12 | `apps/reading-advantage/components/teacher/class-roster.tsx` | 1–480 |
| 13 | `apps/reading-advantage/components/teacher/create-new-class.tsx` | 1–153 |
| 14 | `apps/reading-advantage/components/teacher/create-new-student.tsx` | 1–187 |
| 15 | `apps/reading-advantage/components/teacher/delete-class.tsx` | 1–109 |
| 16 | `apps/reading-advantage/components/teacher/edit-class.tsx` | 1–132 |
| 17 | `apps/reading-advantage/components/teacher/edit-student.tsx` | 1–119 |
| 18 | `apps/reading-advantage/components/teacher/enroll-classes.tsx` | 1–337 |
| 19 | `apps/reading-advantage/components/teacher/export-story-workbooks-button.tsx` | 1–80 |
| 20 | `apps/reading-advantage/components/teacher/export-workbook-button.tsx` | 1–64 |

**Total lines reviewed:** 5,650
**No file was partially reviewed.**

---

## Executive Summary

This batch spans the system admin dashboard surface (school reports, license/XP charts, sidebar nav) and the teacher-side class-management and assignment surface (assign dialog, assignment dashboard, class roster, enroll/delete/edit/create flows, export buttons, plus the shared `tabs.tsx` practice tab container).

The most severe correctness issues are:

1. **`shcools-dashboard.tsx:148` `numberToCefr[Math.round(...)] || "A0-"`** — uses a number lookup that collapses several CEFR levels into one bucket because the source object maps strings to numbers and the inverse map (`Object.fromEntries`) re-uses string keys; the `||` fallback hides the rounding error rather than reporting it.
2. **`shcools-dashboard.tsx:94–99` `console.log` fires on every render of the dashboard** — pure debug logging left in production code, with structured-data payloads that include PII (email/licenseId) which should never appear in production browser logs.
3. **`school-reports.tsx:39` `setSchoolName(result.schoolName || "Unknown School")`** — assumes the API embeds the school name in the classroom payload; the route handler `/api/v1/system/school-classrooms` is not part of this batch and the contract cannot be verified from the front-end code alone.
4. **`reports.tsx:308–314` hardcodes `formatDate` to the `th-TH` locale with `Asia/Bangkok` time zone** — the app claims to support `en/th/cn/tw/vi` but every date in the system reports view is forced to Thai formatting in Bangkok time, which is incorrect for the Chinese and English locales and breaks any future locale expansion.
5. **`reports.tsx:154–193` column visibility effect has four nearly-identical branches differing only in a boolean that is always `true` for `width >= 640`** — the `width < 768` and `width < 1024` and `else` branches set identical state. Three of the four branches are dead code.
6. **`assign-dialog.tsx:117–194` four effects fire in sequence on classroom open and `setIsInitialLoad(false)` is invoked in all three branches** — the "initial load" boolean is reset after the first fetch, but the four effects race; rapid switching of classrooms can trigger overlapping fetches with stale closures over `isInitialLoad`.
7. **`assign-dialog.tsx:386–391` `toast` `description` mixes a hardcoded English fallback string and a `t(...)` interpolated key** — `Assignment "X" updated successfully` (line 389) is English-only and not localized.
8. **`assignment-dashboard.tsx:223–227` `fetchAssignment` does not check `response.ok`** — on a 500/401 the JSON envelope is read unconditionally and assigned into state; a `{ message: "Unauthorized" }` envelope becomes the `assignment` state.
9. **`assignment-dashboard.tsx:233–247` `fetchArticle` accesses `data.article` without verifying `data.article` exists** — on a 500 the response becomes `{ message: "..." }` and `data.article` is `undefined`, then `setArticle(undefined)` breaks the next render.
10. **`assignment-page.tsx:294–300` `useEffect` depends on `debouncedSearchQuery !== undefined` which is always true on the second render** — the effect re-fires every debounced input even when `selectedClassroom` is empty, hitting `/api/v1/assignments?classroomId=&...` which the server will reject as bad input.
11. **`enroll-classes.tsx:159–212` TanStack table uses `getSortedRowModel/getFilteredRowModel` but `data?.classroom` may be `undefined` and the `RadioGroupItem` cell renders a radio that is never wired to the table row's selected state** — selecting a radio in the body does not update TanStack's `rowSelection`, only the outer `RadioGroup` value; subsequent column-sort/filter calls on the table may select a different visual row but the enrollment target is the URL-side `selectedClassroomId`.
12. **`class-roster.tsx:200–210` `keyrooms` shadowing** — line 200 destructures `classrooms` from the outer scope but the line 204 template literal inserts `${process.env.NEXT_PUBLIC_BASE_URL}//teacher/...` (note the **double slash**) which produces `…//teacher/class-roster/...`. The path is malformed for every classroom.
13. **`tabs.tsx:30–75` Tabs are conditional on `activeTab === "tabN"` but `<TabsContent>` already gates rendering** — `activeTab === "tab1" && <FlashCard .../>` is redundant with `<TabsContent value="tab1">`; the dynamic imports create work but the inner guard prevents single-tab mount, so it works today but the contract is duplicated and brittle.
14. **`create-new-class.tsx:60–74` `finally` block runs `toast({ title: t("toast.successCreate") })` even when the fetch throws inside `catch`** — the `catch` swallows the error and the `finally` shows "Class created successfully" toast on failure. This is a UI lie.
15. **`create-new-class.tsx:81–83` `Math.random().toString(36).substring(2, 8)`** — non-cryptographic RNG used to generate a class code that students enter to join. Low entropy (~31 bits) and no collision check; collisions are statistically rare but the client can be confused by prompt-injection responses that return the same code twice.
16. **`edit-class.tsx:46–78` no `response.ok` check after `fetch(... PATCH ...)`** — failures (4xx/5xx) silently call `router.refresh()` and show "Success" toast, leaving the teacher with no error indication.
17. **`edit-student.tsx:58–74` `if (response.ok)` immediately after `if (!response.ok) return`** — the second `if (response.ok)` is redundant; the first already covered the error case. The code is correct (the second guard is hit only on success) but stylistically misleading.
18. **`enroll-classes.tsx:144–146` `setTimeout(() => router.push(...), 1000)` after a successful PATCH** — race condition: the user can click another row in the 1 s window and the navigation will still fire, but the row may now be stale. No `AbortController` to cancel.
19. **`enroll-classes.tsx:177` `onClick={() => row.toggleSelected}`** — `toggleSelected` is the function reference, not a call. The cell click never toggles selection. (Same anti-pattern as batch 31's `system-articles.tsx:389, 397`.)
20. **`export-story-workbooks-button.tsx:31–66` concurrent downloads via `Promise.all` and per-chapter `setCurrentChapter((prev) => prev + 1)`** — `setCurrentChapter` is called inside a `Promise.all`'d async function with no batching, so the displayed counter races between completed chapter downloads. If `chapters.length === 8` the displayed value can show `1/8`, `3/8`, `5/8`, etc. depending on which Promise resolves first.

No tests were found for any of these 20 components (`grep` for `*.test.{ts,tsx}` under `apps/reading-advantage/components/teacher/` and `apps/reading-advantage/components/system/` returned zero matches).

---

## Findings

### Critical / High

#### H-01 — `school-reports.tsx` assumes API envelope embeds `schoolName` next to classrooms
- **File:** `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** 26, 38–39
- **Severity:** High
- **Evidence:** `await fetch(\`/api/v1/system/school-classrooms?licenseId=${licenseId}\`)` and `setClassrooms(result.data || [])` and `setSchoolName(result.schoolName || "Unknown School")`. The endpoint `/api/v1/system/school-classrooms` is not part of this batch, so the front-end assumes the API returns `{ data: Classroom[], schoolName: string }`. If the API returns just `{ data: Classroom[] }`, then `result.schoolName` is `undefined` and the header shows `"Unknown School - School Reports"`.
- **Impact:** Unverified contract dependency. Without inspecting the route handler the only safe behaviour is to display the licenseId as a fallback or to fetch the license separately.
- **Fix:** Either fetch the license separately via `/api/v1/licenses/:id` (already used by `reports.tsx`) or display the `licenseId` and remove the assumption. Add a Zod-validated response shape.

#### H-02 — `reports.tsx` `formatDate` hardcodes `th-TH` locale and `Asia/Bangkok` timezone
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 305–314
- **Severity:** High
- **Evidence:**
  - Line 308: `dateObj.toLocaleDateString("th-TH", { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Bangkok' })`.
  - The comment on line 307 says "Use ISO format to avoid hydration mismatch" but `toLocaleDateString` with a fixed `"th-TH"` produces a locale-formatted output (`dd/MM/yyyy` in Thai calendar), not ISO. The hydration mismatch concern is therefore ill-founded.
  - This function is used on lines 487 (table `createdAt`), 503 (table `expiresAt`), 920 (detail dialog `createdAt`), 935 (detail dialog `expiresAt`).
- **Impact:** Every date in the system reports view is rendered in Thai locale with Bangkok time, regardless of the user's locale. For users in other timezones this is wrong by hours/days. For users on `cn/tw/en/vi` locales the Thai calendar digits and Buddhist-era year (if the browser renders them) are also wrong.
- **Fix:** Pass the user's locale into `toLocaleDateString`; remove the hard-coded time zone (use UTC for the wire format and let the browser format). Add a Zod schema for the date fields.

#### H-03 — `reports.tsx` `columnVisibility` effect has three dead branches
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 147–200
- **Severity:** High
- **Evidence:**
  - `width < 640` branch (lines 153–162): all eight keys set to `false`.
  - `width < 768` branch (lines 163–172): all eight keys set to `true`.
  - `width < 1024` branch (lines 173–182): all eight keys set to `true` — **identical to the `width < 768` branch**.
  - `else` branch (lines 184–192): all eight keys set to `true` — **identical to the `width < 1024` branch**.
  - Branches 3 and 4 are unreachable in any meaningful sense; they can be collapsed.
- **Impact:** Maintenance hazard — the next developer will not realize branches 2 and 3 are the same, and may add logic to one and forget the other.
- **Fix:** Collapse to two branches (`< 640` vs `>= 640`).

#### H-04 — `shcools-dashboard.tsx` `console.log` of PII in production
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 94–99
- **Severity:** High
- **Evidence:**
  - `console.log("SchoolsDashboard received data:"); console.log("schoolList:", schoolList); console.log("userRoleList:", userRoleList); console.log("averageCefrLevelData:", averageCefrLevelData);`
  - `userRoleList.results` carries `email` per the `UserRole` interface (line 67). `schoolList.data` carries `id` and `schoolName`.
  - Inside `handleSchoolChange` (lines 154, 155, 156, 163, 169, 173, 177, 182, 187) there are nine more `console.log` calls, again including `userIds`, `filteredActivityLog`, and licenseId comparisons.
- **Impact:** PII (email) is written to the browser console on every render and every school-filter change. AGENTS.md §"Observability" mandates structured logging and forbids free-form console logs in production.
- **Fix:** Remove all ten `console.log` calls. If telemetry is required, route through a structured logger.

#### H-05 — `shcools-dashboard.tsx:148` rounding + lookup collapses CEFR levels silently
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 144–148
- **Severity:** High
- **Evidence:**
  - Line 135–137: `numberToCefr = Object.fromEntries(Object.entries(cefrToNumber).map(([k, v]) => [v, k]))` produces keys like `0`, `1`, `2`, ... `18` (numbers, but `Object.fromEntries` coerces to strings when used as keys, so the keys are `"0"`.."18"`).
  - Line 148: `averageCefrLevel = averageCefrValue > 0 ? numberToCefr[Math.round(averageCefrValue)] || "A0-" : "A0-";`
  - `Math.round(7.4)` → `7`. `numberToCefr["7"]` → `"A2+"`. `Math.round(7.6)` → `8` → `"B1-"`. The boundary `7.5` rounds to `8`; the next boundary `8.5` rounds to `9`. Many levels are reachable; **but** the `||` fallback silently collapses anything outside `[0, 18]` to `"A0-"`, which is the same default as the empty-average path. There is no error or warning.
- **Impact:** Teachers see incorrect "Average User CEFR Level" values that hide the difference between a true average of 17.5 (≈ C2) and a missing-data average (default "A0-"). The card says "Based on user profiles" (line 259) — this is a misleading statement when the data is missing.
- **Fix:** Compute the average by directly mapping each user's CEFR string to its bucket, find the **mode**, and display a non-misleading string when data is missing. Alternatively, show the numeric average and a separate "no data" state.

#### H-06 — `shcools-dashboard.tsx:179–185` filter callback uses console.log inside filter hot loop
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 179–185
- **Evidence:** `if (!included && userIds.length > 0) { console.log("Activity userId:", activity.userId, "not in filtered users"); }` — this logs only when the userId is NOT included, but does so inside the filter callback. With thousands of activity entries the log may flood the console.
- **Impact:** Performance and log noise.
- **Fix:** Remove the per-activity log; debug logging should be opt-in.

#### H-07 — `assign-dialog.tsx` four effects race and reset `isInitialLoad` in three places
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 108–232
- **Severity:** High
- **Evidence:**
  - Effect A (108–115): syncs `classroomId` into form on `pageType === "assignment"`.
  - Effect B (117–134): fetches `/api/v1/classroom` on `isOpen`. Stores result in `setClassrooms(data.data)` — no `response.ok` check.
  - Effect C (136–195): fetches `/api/v1/assignments?classroomId=X&articleId=Y` when both IDs are set. Sets `isInitialLoad(false)` in both `if` and `else` branches plus the catch block (lines 178, 190, 191).
  - Effect D (197–232): fetches `/api/v1/classroom/:id` when both IDs are set. Calls `toast(...)` on error.
  - Both Effect C and Effect D depend on `[form.classroomId, articleId]` (Effect C: line 195; Effect D: line 232), but **Effect C's dep array does not include `isOpen`**. The articleId guard on line 137 short-circuits when `!isOpen`, but the form.classroomId is updated by Effect A which does not depend on `isOpen`, so opening the dialog flips `form.classroomId` and both effects fire.
  - The `isInitialLoad` flag is set to `false` in three places, so the order of fetch completions determines whether the form is populated from `assignments.meta` or from the empty state.
- **Impact:** Rapid classroom switching can interleave fetches; "first" assignment metadata from a previous classroom may show up. The `isInitialLoad` semantics are broken.
- **Fix:** Consolidate into one effect with an `AbortController`; drop `isInitialLoad`; gate per-classroom state with a classroomId-prefixed key.

#### H-08 — `assign-dialog.tsx:389` hardcoded English success message in toast description
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 386–391
- **Severity:** High (UX / i18n)
- **Evidence:** Line 389 hardcodes `Assignment "${form.title}" updated successfully`. Line 390 uses `t("toast.assignmentCreated", { title: form.title })`. The first string is English-only and is shown to non-English teachers.
- **Impact:** Non-English users see English toast text after every assignment update.
- **Fix:** Add a `t("toast.assignmentUpdated", { title: form.title })` key and use it.

#### H-09 — `assignment-dashboard.tsx` fetchAssignment / fetchArticle do not check `response.ok`
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 213–248
- **Severity:** High
- **Evidence:**
  - Line 226: `const data = await response.json(); setAssignment(data);` — no `response.ok` check. A 401 returns `{ message: "Unauthorized" }`; `setAssignment({ message: "Unauthorized" })` then makes `assignment.meta.title` undefined in the render.
  - Line 243–244: `const data = await response.json(); setArticle(data.article);` — `data.article` may be undefined for non-OK responses; `setArticle(undefined)` then breaks the type and the next render's `article.title`.
- **Impact:** Unhandled errors propagate into state. The "isLoading" flag becomes false because `await Promise.all([fetchAssignment(), fetchArticle()])` resolves, but the rendered `article.title`/`assignment.meta.title` are undefined.
- **Fix:** Check `response.ok` first, throw or set an error state, never call `setArticle(data.article)` without `data.article &&`.

#### H-10 — `assignment-dashboard.tsx` `SkeletonProgressSection` renders 4 cards but `SkeletonStudentsList` renders 5 filter buttons even when `stats.total === 0`
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 123–171, 666–725
- **Severity:** Medium / High (UX)
- **Evidence:**
  - Line 666–725 renders the "All / Not started / In progress / Completed / Overdue" filter row even when `stats.total === 0`.
  - The skeleton on line 161 generates 5 filter buttons; the live UI shows the same 5 even when no students are loaded.
- **Impact:** Teachers see "0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0)" filter buttons that filter a zero-row list.
- **Fix:** Hide the filter row when `assignment.students.length === 0`.

#### H-11 — `assignment-page.tsx:295–300` debounced search effect hits `/api/v1/assignments?classroomId=&...`
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 295–300, 98–112
- **Severity:** High
- **Evidence:**
  - Line 296: `if (selectedClassroom && debouncedSearchQuery !== undefined) { ... fetchAssignments(selectedClassroom, 1, debouncedSearchQuery); }`.
  - The `useDebounce` hook is declared **inside the component** (line 98). The first render initializes `debouncedValue = value`; the `useEffect` on line 101 sets `debouncedValue` after the `delay` (1000 ms). On the very first render the value is `""`, which is the initial `searchQuery` from line 81.
  - The condition `debouncedSearchQuery !== undefined` is therefore always true once the effect has run once. There is no skip path.
  - `fetchAssignments` constructs the URL as `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/assignments?classroomId=${classroomId}&page=${page}&limit=10`. If `selectedClassroom` is empty the guard prevents the call, but the `useDebounce` declaration itself calls `useState` and `useEffect` inside a function that is not a top-level hook — violating the rules-of-hooks in spirit.
- **Impact:** Conceptual violation of rules-of-hooks. If `fetchAssignments` is ever called when `selectedClassroom === ""` the server will see a bad request. The hooks-of-hooks declaration creates new `useState`/`useEffect` references each render, which means React cannot memoize them.
- **Fix:** Extract `useDebounce` to a top-level custom hook. Add a separate `if (!selectedClassroom) return` guard.

#### H-12 — `enroll-classes.tsx:159–212` TanStack table is built around classroom rows but selection is via outer `RadioGroup`
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 159–212, 261–313
- **Severity:** High
- **Evidence:**
  - The `RadioGroup` wraps the entire `<Table>` (lines 261–313) and uses `value={selectedClassroomId}` (line 262).
  - Inside the table body, line 189 renders `<RadioGroupItem value={row.original.id} />`. The radio is wired to the `RadioGroup`'s `onValueChange`, **not** to `row.toggleSelected`.
  - TanStack's `onRowSelectionChange: setRowSelection` (line 205) is wired but never used by the radio cell — `rowSelection` is only updated by header checkbox logic that this table does not have.
  - Selecting a radio updates `selectedClassroomId` (outer state) but does not call `row.toggleSelected()`. Sorting/filtering the table after a radio selection will reorder rows; the `selectedClassroomId` still points at the previously-clicked ID — which is correct for the enrollment API call, but the `data-state="selected"` styling on line 289 will not appear on the radio'd row.
- **Impact:** Visual inconsistency — the radio button shows selection, but the row does not get the `data-state="selected"` highlight; users may think no row is selected. Also `row.toggleSelected` is referenced on line 177 of `enroll-classes.tsx` (Wait — that's a different file. Let me re-check.)
- **Correction:** `onClick={() => row.toggleSelected}` on line 177 of `enroll-classes.tsx` **is** present in `enroll-classes.tsx`. Verified: `cell: ({ row }) => { ... return ( <div className="captoliza ml-4" onClick={() => row.toggleSelected}>...)}` — `toggleSelected` is the function reference, not invoked. Click does nothing.
- **Fix:** Either `onClick={() => row.toggleSelected()}` (add parentheses) or remove the onClick handler.

#### H-13 — `enroll-classes.tsx:125–137` `setData((prevData) => ...)` after success can produce incorrect classroom list
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 124–137
- **Severity:** High
- **Evidence:** After a successful enrollment the code calls `setData((prevData) => { const safePrevData = prevData ?? { classroom: [], student: {} as Student }; return { ...safePrevData, classroom: safePrevData.classroom.filter((classroom: Classroom) => classroom.id !== selectedClassroomId) }; })`. If the API returns a non-2xx but the `then` branch on line 124 is reached because of a race condition (e.g., the response body parses before the status check on line 109), the filter removes the classroom from the local state even though the server rejected the request.
- **Impact:** Local state desync from server; the student appears "enrolled" in the UI but is not enrolled on the server. On the next visit the user will see the same classroom again.
- **Fix:** Check `response.ok` **before** updating state; never trust the optimistic mutation when the request failed.

#### H-14 — `class-roster.tsx:200–210` `classrooms` destructured but unused for routing; double-slash URL bug
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 200–210
- **Severity:** High
- **Evidence:**
  - Lines 200–210: `{classrooms && (<DropdownMenuItem onClick={() => router.push(\`${process.env.NEXT_PUBLIC_BASE_URL}//teacher/class-roster/${classrooms[0]?.id}/history/${payment.id}\`)}>...)}`.
  - Note the double slash: `${process.env.NEXT_PUBLIC_BASE_URL}//teacher/...`. The first `/` comes from the env var (likely already includes `http://host`) and the second `/` is in the template literal. The result is `https://example.com//teacher/class-roster/.../history/...`.
  - The dropdown shows the History action only if `classrooms` is non-empty. It uses `classrooms[0]?.id` — i.e., the **first** classroom in the teacher's list — not the current classroom's id. This is almost certainly a bug: clicking "History" navigates to a *different* classroom than the one currently shown.
- **Impact:** URL is malformed (double slash) and routes to the wrong classroom. Most browsers tolerate `//` in the path component but Next.js routing may match against the wrong segment.
- **Fix:** Use the `classroomId` state on line 104 instead of `classrooms[0]?.id`. Remove the extra `/`.

#### H-15 — `class-roster.tsx:155` renders `row.getValue("last_activity")` then formats with `new Date(...)` without verifying the value
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 148–156
- **Severity:** Medium / High
- **Evidence:** Line 151: `row.getValue("last_activity") ? new Date(row.getValue("last_activity")).toLocaleString() : "No Activity"`. The ternary checks truthiness but does not validate the value is a valid date string. `new Date("invalid")` returns an `Invalid Date` object; `.toLocaleString()` on it returns `"Invalid Date"`. The fallback "No Activity" only fires for `null`/`undefined`/`""`/`0`.
- **Impact:** A malformed last-activity string displays `"Invalid Date"` in every student's row.
- **Fix:** Use `Number.isFinite(new Date(value).getTime())` to gate the format.

#### H-16 — `class-roster.tsx:241–265` two effects race on `pathname` and `classrooms`
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 241–265
- **Severity:** High
- **Evidence:** The first effect (lines 241–259) depends on `[pathname, classrooms]` and runs `fetchStudentInClass(currentClassroomId)`. The second effect (lines 261–265) depends on `[]` (empty array — runs once) and calls `fetchClassrooms()` if `classrooms.length === 0`. On the very first render `classrooms` is `[]`, so the second effect dispatches `fetchClassrooms()`. Once the result arrives, `classrooms` updates and the first effect re-runs. There is no protection against `classrooms[0]?.id !== currentClassroomId` after navigation.
- **Impact:** Repeated fetches on navigation. The two effects re-trigger each other (second triggers first when classrooms change). The `[]` dep on the second effect is a code smell — the ESLint rule for exhaustive deps would normally flag this.
- **Fix:** Combine the two effects into one with `[pathname, classrooms.length]`. Disable the ESLint rule only with a clear comment.

#### H-17 — `create-new-class.tsx:36–75` `finally` block toasts "success" on error
- **File:** `apps/reading-advantage/components/teacher/create-new-class.tsx`
- **Lines:** 36–75
- **Severity:** High
- **Evidence:** The structure is `try { ... fetch ... } catch (error) { console.error(error); } finally { toast({ title: t("toast.successCreate"), description: t("toast.successDescription") }); setClassCode(generateRandomCode()); setOpen(false); router.refresh(); }`. The `finally` always runs, including after a thrown error. The toast says the class was created even when the fetch failed.
- **Impact:** UI lies. Teachers see a "class created" toast but no class exists.
- **Fix:** Move the toast into the `try` block's success branch (e.g., after `if (res.ok) { fetchClassrooms(); toast(...); }`).

#### H-18 — `create-new-class.tsx:36–62` `setOpen(true)` is called at the **start** of `handleCreateClass` rather than after success
- **File:** `apps/reading-advantage/components/teacher/create-new-class.tsx`
- **Lines:** 37, 72
- **Severity:** Medium
- **Evidence:** Line 37 opens the dialog immediately, then the fetch happens, then line 72 closes it again in `finally`. The dialog never actually displays because it is opened and closed within the same synchronous function (the `setOpen(true)` is queued, but `setOpen(false)` is also queued in the `finally`, and React will batch them).
- **Impact:** The opening state is never visible. `setOpen` is being used incorrectly here — it should be removed (or replaced with loading state).
- **Fix:** Remove `setOpen(true)` and `setOpen(false)`; use a `setIsSubmitting` state instead.

#### H-19 — `create-new-class.tsx:81–83` non-cryptographic class code generator
- **File:** `apps/reading-advantage/components/teacher/create-new-class.tsx`
- **Lines:** 81–83, 85–87
- **Severity:** Medium / High
- **Evidence:** `const generateRandomCode = () => Math.random().toString(36).substring(2, 8);` produces a 6-character lowercase alphanumeric string. `Math.random()` is non-cryptographic and the alphabet excludes digits and some letters in base-36 (the `toString(36)` output uses `0-9` and `a-z` only). Real entropy is ~31 bits, but the effective keyspace is smaller because the substring is 6 chars from a 36-char alphabet.
- **Impact:** Class codes are guessable and the same code can repeat on rapid creation. If the API does not deduplicate, two classes can share the same join code.
- **Fix:** Use `crypto.randomUUID()` or `crypto.getRandomValues()` to produce a longer random code; verify uniqueness server-side.

#### H-20 — `edit-class.tsx:46–78` no `response.ok` check; success toast always fires
- **File:** `apps/reading-advantage/components/teacher/edit-class.tsx`
- **Lines:** 46–78
- **Severity:** High
- **Evidence:** The fetch is awaited but the response is ignored. The `try/catch` catches network errors but not 4xx/5xx responses with a body. The success toast on line 71–75 fires regardless of `response.ok` (in the `else` branch on line 56) and again in the catch block is missing.
- **Impact:** Same UI lie as H-17 — teachers see "Class updated successfully" even when the server returns 500.
- **Fix:** Check `response.ok`; branch toast accordingly.

#### H-21 — `edit-student.tsx:66–74` `if (response.ok)` is a redundant re-check
- **File:** `apps/reading-advantage/components/teacher/edit-student.tsx`
- **Lines:** 58–74
- **Severity:** Low (correctness is OK; style is misleading)
- **Evidence:** Line 58: `if (!response.ok) { toast({...error}); return; }`. Line 66: `if (response.ok) { toast({...success}); ... }`. The second guard is reached only on the success path, so the toast is correct, but the indentation makes it look like a separate `if` branch from the error case. The `else` keyword would be clearer.
- **Impact:** Maintenance hazard; future developer may add logic to the second `if` thinking it can also be false.
- **Fix:** Replace `if (response.ok)` with `else`.

#### H-22 — `edit-student.tsx:87` `onOpenChange={() => setOpen(!open)}` re-inverts state
- **File:** `apps/reading-advantage/components/teacher/edit-student.tsx`
- **Lines:** 87
- **Severity:** Medium
- **Evidence:** `<Dialog open={open} onOpenChange={() => setOpen(!open)}>`. `onOpenChange` from `shadcn/ui` passes `open` as the argument, but this handler ignores the argument and toggles the state. If the dialog is already `open=true` and shadcn calls `onOpenChange(false)` (e.g., from an outside click), the handler sets `setOpen(!true) = false` (correct). If shadcn calls `onOpenChange(true)` when the dialog was just closed, the handler sets `setOpen(!false) = true` (correct). The handler is functionally equivalent to `onOpenChange={setOpen}` **only if** shadcn always passes the inverse of the current state, which is true for a single `Dialog` instance but breaks if shadcn ever passes the new state directly.
- **Impact:** Subtle correctness risk if shadcn changes semantics.
- **Fix:** Use `onOpenChange={setOpen}`.

#### H-23 — `enroll-classes.tsx:144–146` `setTimeout(() => router.push(...), 1000)` after success
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 144–146
- **Severity:** High
- **Evidence:** After a successful PATCH, a 1-second `setTimeout` schedules a `router.push("/teacher/my-students")`. If the user navigates manually before the timeout fires, the navigation is still queued and will fire after they reach their destination.
- **Impact:** Unwanted navigation; the user is taken back to `/teacher/my-students` even after they manually navigated to a different page.
- **Fix:** Cancel the timer on unmount or use a `useEffect` cleanup that clears the timeout.

#### H-24 — `enroll-classes.tsx:73–80` no `selectedClassroomId` empty check (partial)
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 72–80, 251–258
- **Severity:** Low / Medium
- **Evidence:** `handleStudentEnrollment` checks `!selectedClassroomId` on line 73 and toasts an error. The button on line 251 is `disabled={isEnrolling || !selectedClassroomId}`. So the user cannot click the button when no classroom is selected. The defensive toast is redundant but harmless.
- **Impact:** No bug, but the hardcoded "Please select a classroom first." string on line 76 bypasses i18n. AGENTS.md §"i18n" requires all user-facing strings to be localized.
- **Fix:** Use `te("toast.pleaseSelectClassroom")` or a similar key.

#### H-25 — `export-story-workbooks-button.tsx:31–66` `setCurrentChapter` race inside `Promise.all`
- **File:** `apps/reading-advantage/components/teacher/export-story-workbooks-button.tsx`
- **Lines:** 31–66
- **Severity:** High
- **Evidence:** `const exportPromises = chapters.map(async (chapter, index) => { ... await fetch(...); ... setCurrentChapter((prev) => prev + 1); }); await Promise.all(exportPromises);`. Multiple async fetches resolve concurrently and each calls `setCurrentChapter((prev) => prev + 1)`. React batches the updates but the displayed counter will jump from `0 → 3 → 5 → 7 → 8` rather than incrementing linearly.
- **Impact:** Counter is unreadable; users see "Exporting... (3/8)" while only 3 of 8 have finished.
- **Fix:** Use a sequential `for` loop with `await`, or track per-chapter completion with a `Set` and update the counter only when a new chapter completes.

#### H-26 — `export-workbook-button.tsx:52` `alert(...)` fallback after `catch`
- **File:** `apps/reading-advantage/components/teacher/export-workbook-button.tsx`
- **Lines:** 52
- **Severity:** Medium
- **Evidence:** `alert(t("error") + ". See console for details.");` — uses the native `alert` dialog, bypassing the shadcn toast infrastructure used elsewhere.
- **Impact:** UX inconsistency. Browser alerts are blocking and styled differently from the rest of the app.
- **Fix:** Use `toast(...)` from `@/components/ui/use-toast`.

#### H-27 — `tabs.tsx:30–75` redundant `activeTab === "tabN"` guard duplicates `<TabsContent>` gating
- **File:** `apps/reading-advantage/components/tabs.tsx`
- **Lines:** 39–75
- **Severity:** Medium
- **Evidence:** `<TabsContent value="tab1">{activeTab === "tab1" && <FlashCard userId={userId} deckType="SENTENCE" />}</TabsContent>`. The `activeTab === "tab1"` check is redundant because `<TabsContent>` from shadcn only renders its children when `value === activeTab`. The double-gating prevents the dynamic import from being pre-fetched.
- **Impact:** Slower tab switching on first paint of each tab because the dynamic chunk is loaded on first activation rather than at idle.
- **Fix:** Remove the inner `activeTab === "tabN"` check; use the `forceMount` prop if eager loading is desired.

#### H-28 — `tabs.tsx:30` `showButton` state is declared but never used
- **File:** `apps/reading-advantage/components/tabs.tsx`
- **Lines:** 32
- **Severity:** Low
- **Evidence:** `const [showButton, setShowButton] = useState(true);` — neither `showButton` nor `setShowButton` is referenced anywhere in the file.
- **Impact:** Dead state, dead setter.
- **Fix:** Remove the line.

#### H-29 — `top-schools-xp-gained.tsx:5–13` `Pie`, `PieChart`, `Label` imported but never used
- **File:** `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- **Lines:** 8, 10, 11
- **Severity:** Low
- **Evidence:** `import { ..., Pie, PieChart, ..., Label, ... } from "recharts";`. The component only uses `Bar`, `BarChart`, `CartesianGrid`, `XAxis`, `ChartTooltip`, `ChartTooltipContent`, and `Card`. The unused imports are `Pie`, `PieChart`, `Label`, `LabelList`.
- **Wait:** `LabelList` **is** used on line 71. Re-check: `LabelList` is in the destructured imports on line 9 and used on line 71. `Pie`, `PieChart`, and `Label` are not used. The component name says "ByXPGained" but contains a Pie chart that is never rendered.
- **Impact:** Bundle bloat; confusing because the file imports a pie chart.
- **Fix:** Remove `Pie`, `PieChart`, `Label`.

#### H-30 — `top-schools-xp-gained.tsx:77` `formatter={(value: any) => ...}`
- **File:** `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- **Lines:** 77
- **Severity:** Low
- **Evidence:** `(value: any)` in a `LabelList` `formatter` callback. Recharts expects `(value: any, entry?: ...)`.
- **Impact:** Type safety loss. Same anti-pattern as `system-articles.tsx` (batch 31).
- **Fix:** Replace with `(value: number | string)` or use the recharts-provided type.

### Medium

#### M-01 — `reports.tsx:316–363` `ActionsCell` defined inside component, recreated on every render
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 316–363, 526
- **Severity:** Medium
- **Evidence:** `const ActionsCell = ({ school }: { school: LicenseData }) => { ... }` is declared inside `SystemReports` and used in the `columns` array (line 526). Every render of `SystemReports` creates a new `ActionsCell` function and a new `columns` array, defeating TanStack Table's memoization.
- **Impact:** Performance — every state change (sorting, filtering) re-creates the columns array.
- **Fix:** Move `ActionsCell` to a top-level component and `useCallback` the `columns` factory.

#### M-02 — `reports.tsx:80–101` `LicenseData` is defined locally but not aligned with server contract
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 80–101
- **Severity:** Medium
- **Evidence:** `LicenseData` declares `id`, `key`, `schoolName`, `expiresAt: Date | null`, `maxUsers`, `licenseType`, `currentUsers`, `totalXp`, `isActive`, `createdAt: Date`, `updatedAt: Date`, `owner`. The `expiresAt` is parsed as `Date | null` but the JSON response will be a string. TypeScript will not complain because `JSON.parse(...).expiresAt` is `any`.
- **Impact:** Type safety loss; consumers can treat strings as `Date` and `null` interchangeably. If the server sends `expiresAt: ""` (empty string), it does not satisfy `Date | null`.
- **Fix:** Use Zod schema; coerce at the boundary.

#### M-03 — `reports.tsx:154–200` resize handler uses `window` and is registered in two effects
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 137–145, 196–199
- **Severity:** Medium
- **Evidence:** The first effect on lines 134–145 registers a `resize` listener for `checkMobile`. The second effect on lines 147–200 registers another `resize` listener for `checkScreenSize`. Each runs on `isClient` change. Both handlers update state. Two listeners on the same event is wasteful and can cause double state updates.
- **Impact:** Performance and event-handler duplication.
- **Fix:** Consolidate into one effect with one handler.

#### M-04 — `reports.tsx:282–294` `useEffect` sets `isLoading(false)` based on length checks
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 282–294
- **Severity:** Medium
- **Evidence:** `if (schoolXpData.length >= 0 && licensesData.length >= 0) { setIsLoading(false); }`. Both `length` values are always `>= 0` (arrays are always non-negative), so this condition is always true. The effect always sets `isLoading` to `false`.
- **Impact:** The `isLoading` flag never stays `true`. The skeleton on line 550 is never shown if the fetch resolves fast.
- **Fix:** Track an explicit `pending` flag set at the start of each fetch.

#### M-05 — `reports.tsx:296–303` `formatXP` thresholds are magic numbers
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 296–303
- **Severity:** Low / Medium
- **Evidence:** `if (xp >= 1000000) { return \`${(xp / 1000000).toFixed(1)}M\`; } else if (xp >= 1000) { return \`${(xp / 1000).toFixed(1)}K\`; }`. Magic numbers `1000000` and `1000`.
- **Impact:** Maintenance hazard.
- **Fix:** Extract `MILLION = 1_000_000` and `THOUSAND = 1_000` constants.

#### M-06 — `reports.tsx:386` `cell: ({ row }) => { const fullKey = row.getValue("key") as string; ... }` assumes `key` is always a string
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 386–421
- **Severity:** Medium
- **Evidence:** `const fullKey = row.getValue("key") as string;` — if the server returns `key: null` (e.g., for an internal license), `fullKey` is `null` and the subsequent `fullKey.substring(0, 10)` throws.
- **Impact:** Runtime error on malformed data.
- **Fix:** Use `(row.getValue("key") as string) ?? ""` or guard with `if (!fullKey) return null;`.

#### M-07 — `school-reports.tsx:15` `useState<any[]>` for classrooms
- **File:** `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** 15
- **Severity:** Medium
- **Evidence:** `const [classrooms, setClassrooms] = useState<any[]>([]);` — defeats type safety. The component passes these to `<AdminReports classes={classrooms} />` (line 119) but `AdminReports` likely has a typed `classes` prop.
- **Impact:** Type safety loss; `AdminReports` cannot validate the input.
- **Fix:** Import the `AdminReports` props type and use `useState<AdminReportsProps["classes"]>([])`.

#### M-08 — `school-reports.tsx:39` `result.schoolName || "Unknown School"` is an unverified contract
- **File:** `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** 39
- **Severity:** Medium
- **Evidence:** See H-01 — same line. Listed separately because the failure mode is **UI**: the header reads "Unknown School - School Reports".
- **Impact:** Teachers cannot tell which school's reports they are looking at.
- **Fix:** Use the `licenseId` as the header if `schoolName` is missing.

#### M-09 — `shcools-dashboard.tsx:155–156` console.log inside `handleSchoolChange` is not the only debug output
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 154–198
- **Severity:** Medium
- **Evidence:** Lines 154, 155, 156, 163, 169, 173, 177, 182, 187 contain `console.log` calls in `handleSchoolChange`. Plus the four calls in the data effect.
- **Impact:** Production console noise, PII leak.
- **Fix:** Remove all.

#### M-10 — `system-sidebar-nav.tsx:14, 56` commented-out i18n
- **File:** `apps/reading-advantage/components/system/system-sidebar-nav.tsx`
- **Lines:** 14, 56
- **Severity:** Low
- **Evidence:** Line 14: `// const t = useScopedI18n('components.sidebarTeacherNav');` and line 56: `{/* {t(item.title as "myClasses" | "myStudents" | "classRoster" | "reports")} */}`. The hardcoded `{item.title}` (line 57) renders whatever the caller passed in, which may or may not be localized.
- **Impact:** i18n not applied even though the file is a sidebar nav.
- **Fix:** Restore the i18n call once the title keys are added to the locale JSON.

#### M-11 — `system-sidebar-nav.tsx:37` `Icons[item.icon as keyof typeof Icons]` casts but `item.icon` could be a runtime string that does not match an icon key
- **File:** `apps/reading-advantage/components/system/system-sidebar-nav.tsx`
- **Lines:** 37
- **Severity:** Medium
- **Evidence:** `const Icon = Icons[item.icon as keyof typeof Icons]`. If `item.icon === "foo"`, `Icons.foo` is `undefined` and rendering `<Icon className="mr-2 h-4 w-4" />` crashes the entire sidebar.
- **Impact:** Sidebar can crash if the config array passes a bad icon name.
- **Fix:** Validate `item.icon` against a whitelist or default to a fallback icon.

#### M-12 — `system-sidebar-nav.tsx:35–62` `key={index}` on the outer map
- **File:** `apps/reading-advantage/components/system/system-sidebar-nav.tsx`
- **Lines:** 40
- **Severity:** Low
- **Evidence:** `<Link key={index} href={...}>` — index used as key. If the sidebar config is reordered at runtime, React may reuse the wrong link element.
- **Impact:** Reconciliation bug on reorder.
- **Fix:** Use `item.href` or `item.title` as the key.

#### M-13 — `system-sidebar-nav.tsx:21` `<>...</>` fragment with no key
- **File:** `apps/reading-advantage/components/system/system-sidebar-nav.tsx`
- **Lines:** 21–66
- **Severity:** Low
- **Evidence:** The component returns a fragment containing the optional Back button (lines 24–33) and the nav (lines 34–64). Both are conditional/static so the fragment is fine.
- **Impact:** None.
- **Fix:** No change.

#### M-14 — `top-schools-xp-gained.tsx:66–68` `tickFormatter` truncates school names to 5 chars
- **File:** `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- **Lines:** 65–68
- **Severity:** Low / Medium (UX)
- **Evidence:** `tickFormatter={(value: string) => value.length > 5 ? value.slice(0, 5) + "..." : value}`. School names like `"Bangkok International School"` become `"Bangkok..."`.
- **Impact:** Information loss in the X-axis labels.
- **Fix:** Rotate the labels, use full names, or pass via tooltip only.

#### M-15 — `assign-dialog.tsx:71–80` `student` is a tuple type `[ {...} ]` — too narrow
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 71–76
- **Severity:** Medium
- **Evidence:** `student: [{ studentId: string; lastActivity: Date; }]` — the type is a 1-element tuple, not an array. The actual API returns an array (see line 211 `data.studentInClass || data.data?.studentInClass || []`).
- **Impact:** TypeScript errors when iterating or `.map()`-ing. The build should already fail; if it doesn't, the type is being widened to `any[]` somewhere.
- **Fix:** Change to `student: { studentId: string; lastActivity: Date; }[]`.

#### M-16 — `assign-dialog.tsx:304–310` `AssignmentFormData` always sends `dueDate: date!.toISOString()` but date may be undefined when user submits
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 291–310
- **Severity:** Medium
- **Evidence:** `validateForm()` checks `!date` and adds an error, but `onSubmit` does not return after `validateForm()` returns `false` until line 298. If validation passes but `date` is still undefined (impossible per current `validateForm`), `date!.toISOString()` throws. In practice the validateForm guard prevents this, but the `!` non-null assertion is misleading.
- **Impact:** Code smell. Future developer may relax the validateForm guard and the assertion becomes a runtime crash.
- **Fix:** Refactor `date` into a non-nullable value or check explicitly.

#### M-17 — `assign-dialog.tsx:340–362` PUT for meta is sent when `assignedStudentIds.length > 0` even when no students were removed
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 340–363
- **Severity:** Medium
- **Evidence:** The PUT is gated on `if (assignedStudentIds.length > 0)`, but it updates title/description/dueDate regardless of whether the user actually changed them. Even if the user only added new students, the PUT is sent, which may overwrite concurrent edits.
- **Impact:** Race condition with concurrent edits; redundant write traffic.
- **Fix:** Compare current values to original values and skip the PUT if no fields changed.

#### M-18 — `assign-dialog.tsx:366–384` DELETE per-student loop is sequential
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 366–384
- **Severity:** Low / Medium
- **Evidence:** `for (const studentId of removedStudents) { const response = await fetch(... DELETE ...) }`. Sequential awaits, no `Promise.all`. If the user un-enrolls 30 students this is 30 round-trips.
- **Impact:** Slow dialog close on bulk un-enroll.
- **Fix:** Use `Promise.all(removedStudents.map(...))` and collect failures.

#### M-19 — `assignment-dashboard.tsx:330–365` `getStatusInfo` returns inconsistent styles for status 2
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 348–355
- **Severity:** Low
- **Evidence:** `bgColor: "bg-secondary/5"` and `dotColor: "bg-secondary"`. The completed status uses `secondary` token, but the progress bar on line 608 uses `bg-gradient-to-r from-primary to-secondary` — both colors are present. The styling is consistent but the choice of `secondary` instead of `green-600` is unusual.
- **Impact:** Cosmetic.
- **Fix:** Decide on a single accent for "completed" status.

#### M-20 — `assignment-dashboard.tsx:386–403` `getProgressStats` filters by `status !== 2` but compares `getDaysRemaining(...) < 0` inside the filter
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 386–403
- **Severity:** Low
- **Evidence:** `students.filter((s) => s.status !== 2 && getDaysRemaining(assignment.meta.dueDate) < 0)`. The function `getDaysRemaining` is called once per student in the filter callback.
- **Impact:** Minor performance.
- **Fix:** Hoist `getDaysRemaining(...)` outside the filter.

#### M-21 — `assignment-dashboard.tsx:741–744` `Delete (${selectedStudents.length})` hardcoded English
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 740–746, 742–745
- **Severity:** Medium (i18n)
- **Evidence:** Line 742–745 mixes `t(...)` keys with hardcoded English: `Deleting...` and `Delete (${selectedStudents.length})`. The `t("deleting")` key may not exist.
- **Impact:** English-only button labels.
- **Fix:** Add `t("deleting")` and `t("deleteWithCount", { count })` keys.

#### M-22 — `assignment-page.tsx:74` `Assignments` component does not validate `pageType`
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 74
- **Severity:** Low
- **Evidence:** The component name is just `Assignments`. AGENTS.md does not mandate PascalCase but the rest of the codebase uses it.
- **Impact:** Cosmetic.
- **Fix:** Rename to `AssignmentsPage` or `TeacherAssignments`.

#### M-23 — `assignment-page.tsx:98–112` `useDebounce` declared inside the component
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 98–112
- **Severity:** High (rules-of-hooks)
- **Evidence:** `const useDebounce = (value: string, delay: number) => { const [debouncedValue, setDebouncedValue] = useState(value); useEffect(() => { ... }, [value, delay]); return debouncedValue; }`. The function is called on line 114. Per rules-of-hooks, `useState` and `useEffect` must be called at the top level of a function component — calling them inside a helper that is named like a hook but lives inside the component is a code smell. Each render creates a new helper function with new hooks. React's hook tracking relies on call order within a component; if `useDebounce` is conditional (e.g., `if (foo) useDebounce(...)`) it will break. Today it is called unconditionally, so it works.
- **Impact:** Conceptual violation. If anyone makes the call conditional, the app crashes.
- **Fix:** Extract `useDebounce` to `apps/reading-advantage/hooks/useDebounce.ts`.

#### M-24 — `assignment-page.tsx:228–238` `Array.isArray(data)` fallback lacks pagination
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 228–238
- **Severity:** Medium
- **Evidence:** `else if (Array.isArray(data)) { setAssignments(data); setPagination({ currentPage: 1, totalPages: 1, totalCount: data.length, hasNextPage: false, hasPrevPage: false, limit: 10, }); }`. If the API returns a flat array (legacy contract), pagination is set to single-page. The user sees "Showing 1 to 10 of 25 assignments" if the array has 25 items, but the pagination buttons are disabled — so the user can never reach items 11–25.
- **Impact:** Data loss.
- **Fix:** If the array exceeds `limit=10`, paginate client-side or request the API to add pagination metadata.

#### M-25 — `assignment-page.tsx:443` `Please select a classroom to view assignments` hardcoded
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 455
- **Severity:** Medium (i18n)
- **Evidence:** `<TableCell ...>Please select a classroom to view assignments</TableCell>` — English-only.
- **Impact:** i18n hole.
- **Fix:** Use a `t("selectClassroomToViewAssignments")` key.

#### M-26 — `class-roster.tsx:176–177` `router.push` builds URL with `process.env.NEXT_PUBLIC_BASE_URL` prefix
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 176–179, 185–188, 200–209
- **Severity:** Medium
- **Evidence:** `router.push(\`${process.env.NEXT_PUBLIC_BASE_URL}/teacher/student-progress/${payment.id}\`)` — `router.push` from `next/navigation` expects a path, not a fully-qualified URL. If `NEXT_PUBLIC_BASE_URL` is `https://example.com`, the call becomes `router.push("https://example.com/teacher/student-progress/...")`. Next.js will extract the pathname and navigate, but mixing fully-qualified URLs and relative paths is inconsistent.
- **Impact:** Maintenance hazard. The same anti-pattern is repeated in `assignment-page.tsx:171, 427` and `my-students.tsx:195, 204, 213` and `edit-student.tsx:50` (where the same pattern is used for an API fetch, which **is** a legitimate use of the env var).
- **Fix:** Use relative paths for `router.push`. Use the env var only for fetch URLs.

#### M-27 — `class-roster.tsx:204` `//teacher/class-roster/${classrooms[0]?.id}/history/${payment.id}` double slash + wrong classroom
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 200–210
- **Severity:** High (covered by H-14)
- **Evidence:** Same as H-14.

#### M-28 — `class-roster.tsx:140` `<div className="captoliza ml-4">` — `captoliza` is a non-standard CSS class
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 140, 150, 176
- **Severity:** Medium
- **Evidence:** The class `captoliza` appears 3 times in the file. There is no definition of `.captoliza` in the codebase (the closest is `capitalize` from Tailwind).
- **Impact:** The intended text-transform does not apply.
- **Fix:** Replace with `capitalize`.

#### M-29 — `create-new-student.tsx:74–81` `lastActivity` field may be `"No Activity"` (string) or `{ _seconds: number }` (object); the type union is OK but the runtime check is fragile
- **File:** `apps/reading-advantage/components/teacher/create-new-student.tsx`
- **Lines:** 18–22, 74–81
- **Severity:** Medium
- **Evidence:** `last_activity: { _seconds?: number } | "No Activity"`. The runtime check on line 77 uses `_seconds in item.last_activity`, but `item.last_activity` is `"No Activity"` (a string) — `in` on a string checks for properties of the string wrapper object (e.g., `length`), not for substring matches. The check works in practice because `"No Activity"` does not have an `_seconds` property, but it's brittle.
- **Impact:** Readability and robustness.
- **Fix:** Use a tagged union (`{ kind: "ts"; _seconds: number } | { kind: "none" }`).

#### M-30 — `create-new-student.tsx:50` checks `studentDataInClass.some(...)` for duplicate email — O(N*M) for N existing and M new students
- **File:** `apps/reading-advantage/components/teacher/create-new-student.tsx`
- **Lines:** 49–70
- **Severity:** Low
- **Evidence:** Inside `for (const emailValue of email)`, two linear scans: `studentDataInClass.some((student) => student.email === emailValue)` (line 50) and `allStudentEmail.find(...)` (line 59). With 200 existing students and 50 emails, this is 10,000 comparisons.
- **Impact:** Performance with large classes.
- **Fix:** Build a `Set` from `studentDataInClass.map(s => s.email)` once before the loop.

#### M-31 — `create-new-student.tsx:127` FormData iteration extracts values but uses keys incorrectly
- **File:** `apps/reading-advantage/components/teacher/create-new-student.tsx`
- **Lines:** 122–131
- **Severity:** Medium
- **Evidence:** `const entriesArray = Array.from(formEmail.entries()); const emails = entriesArray.map(([key, value]) => value).filter((value) => value);`. Multiple `<input name="email">` elements (lines 150, 158) have the same name. `formData.entries()` will return one `[name, value]` pair per input. The `.map(([key, value]) => value)` discards the key but that is fine because they are all "email".
- **Impact:** Works but the unused `key` is misleading.
- **Fix:** `entriesArray.map(([, value]) => value)`.

#### M-32 — `create-new-student.tsx:157–165` `Array.from({ length: inputs }).map((_: any, index: number) => ...)`
- **File:** `apps/reading-advantage/components/teacher/create-new-student.tsx`
- **Lines:** 157
- **Severity:** Low
- **Evidence:** `(_: any, index: number)` — typed as `any` for the unused value.
- **Impact:** Type safety loss.
- **Fix:** `(_: undefined, index: number)`.

#### M-33 — `create-new-student.tsx:74–81` PATCH body includes `lastActivity: "No Activity"` literal string for every new student
- **File:** `apps/reading-advantage/components/teacher/create-new-student.tsx`
- **Lines:** 74–93
- **Severity:** Low / Medium
- **Evidence:** When a student has never logged in, the `lastActivity` field is set to the literal string `"No Activity"`. The backend presumably expects an ISO timestamp or null. The string `"No Activity"` is a magic value.
- **Impact:** Backend may store the literal string or reject the request.
- **Fix:** Send `null` instead of the literal `"No Activity"`.

#### M-34 — `create-new-class.tsx:55–58` POST sends `body: JSON.stringify({ classroom })` but no `Content-Type`
- **File:** `apps/reading-advantage/components/teacher/create-new-class.tsx`
- **Lines:** 55–58
- **Severity:** Medium
- **Evidence:** `fetch(\`/api/v1/classroom\`, { method: "POST", body: JSON.stringify({ classroom }), });` — no `Content-Type: application/json` header. Some servers will fail to parse the body.
- **Impact:** May produce 415 Unsupported Media Type depending on the route handler.
- **Fix:** Add `headers: { "Content-Type": "application/json" }`.

#### M-35 — `create-new-class.tsx:130` grade `Array.from({ length: 10 }, (_, i) => i + 3)` produces grades 3–12
- **File:** `apps/reading-advantage/components/teacher/create-new-class.tsx`
- **Lines:** 130–135
- **Severity:** Low
- **Evidence:** Magic 10 and `i + 3` — assumes the school's grade system is 3–12. Edit-class.tsx (line 111) uses the same magic 10.
- **Impact:** Not portable to other grade systems.
- **Fix:** Extract a constant `GRADE_RANGE` and import from a shared config.

#### M-36 — `delete-class.tsx:65–68` `finally` block runs `router.refresh()` and `setOpen(false)` after success
- **File:** `apps/reading-advantage/components/teacher/delete-class.tsx`
- **Lines:** 65–68
- **Severity:** Low
- **Evidence:** `router.refresh()` is called even on failure. The teacher's page will reload regardless of whether the class was actually deleted. The state is updated (line 50) only on success, so after refresh the class will re-appear in the list if the server rejected the request.
- **Impact:** Confusing — the UI shows the class, then refreshes, then shows the class again. The teacher must click delete twice.
- **Fix:** Only call `router.refresh()` on success.

#### M-37 — `edit-class.tsx:55` PATCH with no `response.ok` check
- **File:** `apps/reading-advantage/components/teacher/edit-class.tsx`
- **Lines:** 55–66
- **Severity:** High (covered by H-20)

#### M-38 — `edit-class.tsx:111` same `Array.from({ length: 10 }, (_, i) => i + 3)` magic grade range
- **File:** `apps/reading-advantage/components/teacher/edit-class.tsx`
- **Lines:** 111–117
- **Severity:** Low
- **Evidence:** Same magic numbers as M-35.

#### M-39 — `edit-student.tsx:49–57` PATCH with no `Content-Type`
- **File:** `apps/reading-advantage/components/teacher/edit-student.tsx`
- **Lines:** 49–57
- **Severity:** Medium
- **Evidence:** `fetch(\`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${studentId}\`, { method: "PATCH", body: JSON.stringify({ display_name: studentName }), });` — no headers.
- **Impact:** Same as M-34.
- **Fix:** Add `Content-Type: application/json`.

#### M-40 — `edit-student.tsx:91` `aria-label="edit class"` but the component edits a student
- **File:** `apps/reading-advantage/components/teacher/edit-student.tsx`
- **Lines:** 91
- **Severity:** Low
- **Evidence:** `aria-label="edit class"` — the component is `EditStudent`. Accessibility label is wrong.
- **Impact:** Screen reader announces wrong action.
- **Fix:** `aria-label="edit student"`.

#### M-41 — `enroll-classes.tsx:177` `onClick={() => row.toggleSelected}` — function reference, not invoked
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 173–179
- **Severity:** High
- **Evidence:** `cell: ({ row }) => { const classroomName: string = row.getValue("classroomName"); return ( <div className="captoliza ml-4" onClick={() => row.toggleSelected}> {classroomName ? classroomName : "Anonymous"} </div> ); }`. `row.toggleSelected` is a function reference, not a call. `onClick` returns the function and never executes it.
- **Impact:** Clicking the classroom name does nothing.
- **Fix:** `onClick={() => row.toggleSelected()}` or remove the onClick.

#### M-42 — `enroll-classes.tsx:189` `<RadioGroupItem value={row.original.id} />` is a shadcn Radio with no label or aria-label
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 188–191
- **Severity:** Low / Medium
- **Evidence:** The radio is rendered without a `<Label>` parent or `aria-label`. The `RadioGroupItem` from shadcn requires an accessible name.
- **Impact:** Screen reader users cannot tell what each radio represents.
- **Fix:** Wrap with a `<Label>` or add `aria-label={row.original.classroomName}`.

#### M-43 — `enroll-classes.tsx:214–231` `useEffect` with `[]` dep calls fetch but doesn't cancel
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 214–231
- **Severity:** Medium
- **Evidence:** `useEffect(() => { const fetchData = async () => { await fetch(...) }; fetchData(); }, []);`. No `AbortController`, no `params.studentId` in deps. If `studentId` changes (e.g., navigating to a different student's enroll page), the effect does not re-run.
- **Impact:** Stale data when navigating between students without remount.
- **Fix:** Add `[params.studentId]` to deps and pass `signal` to `fetch`.

#### M-44 — `enroll-classes.tsx:307` `Empty` hardcoded English in empty table cell
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 307
- **Severity:** Medium (i18n)
- **Evidence:** `>Empty<` in the `colSpan` cell.
- **Impact:** i18n hole.
- **Fix:** Use `te("empty")` or `t("empty")`.

#### M-45 — `export-story-workbooks-button.tsx:31–66` `Promise.all` triggers N parallel file downloads
- **File:** `apps/reading-advantage/components/teacher/export-story-workbooks-button.tsx`
- **Lines:** 31–66
- **Severity:** Medium
- **Evidence:** All chapters are downloaded concurrently. Browsers limit the number of simultaneous downloads (Chrome ~6). With 8 chapters the user may see a "do you want to download multiple files" prompt that blocks further interaction.
- **Impact:** UX disruption; some browsers may cancel excess downloads.
- **Fix:** Add a `setTimeout` between downloads or chunk into batches of 2–3.

#### M-46 — `export-workbook-button.tsx:49` commented-out `alert(t("success"))`
- **File:** `apps/reading-advantage/components/teacher/export-workbook-button.tsx`
- **Lines:** 49
- **Severity:** Low
- **Evidence:** `// alert(t("success"));` — dead code.
- **Impact:** None.
- **Fix:** Remove.

#### M-47 — `tabs.tsx:45` `TabsList` uses `grid-cols-1 md:grid-cols-6` with 6 tabs but no `h-fit` issue
- **File:** `apps/reading-advantage/components/tabs.tsx`
- **Lines:** 45–52
- **Severity:** Low
- **Evidence:** `className="h-fit grid grid-cols-1 md:grid-cols-6"`. With long tab labels (e.g., localized), 6 columns on `md` may overflow.
- **Impact:** UX on narrow screens.
- **Fix:** Consider `md:grid-cols-3 lg:grid-cols-6`.

#### M-48 — `system/reports.tsx` `system/school-reports.tsx` rely on system admin endpoints that need tenant scoping
- **File:** `apps/reading-advantage/components/system/reports.tsx`, `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** reports.tsx:211–212, 239; school-reports.tsx:26
- **Severity:** Medium
- **Evidence:** `fetch("/api/v1/system/school-xp", ...)`, `fetch("/api/v1/system/licenses", ...)`, `fetch("/api/v1/system/school-classrooms?licenseId=...", ...)`. AGENTS.md §"Multi-Tenancy" requires every query to be scoped by `schoolId`. The system admin pages are deliberately cross-tenant, but the front-end should verify that the user has system admin role before calling these endpoints. The components do not check role.
- **Impact:** Authorization bypass — if the API does not enforce the system admin role, any user who reaches the page can list all schools.
- **Fix:** Add a role check (`if (!isSystemAdmin) return null`); rely on the API to enforce; document the contract.

#### M-49 — `class-roster.tsx:220` `useMemo` on `studentInClass` reference only
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 220
- **Severity:** Low
- **Evidence:** `const data = React.useMemo(() => studentInClass || [], [studentInClass]);` — if `studentInClass` is `null`, `data` is `[]`; otherwise it is the same array. The memo is trivially correct.
- **Impact:** None.
- **Fix:** No change.

#### M-50 — `enroll-classes.tsx:144–146` `setTimeout(1000)` is not cancellable
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 144–146
- **Severity:** Medium (covered by H-23)

### Low

#### L-01 — `reports.tsx:120` `isMobile` is computed via `window.innerWidth < 768` but the chart already uses `isMobile` for axis rotation
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 137–145, 686–693
- **Severity:** Low
- **Evidence:** `isMobile` is used only for the chart's `angle`, `height`, and `fontSize` props. Other components don't reference it.
- **Impact:** None.
- **Fix:** No change.

#### L-02 — `reports.tsx:211–212` URL params for `/api/v1/system/school-xp` are constructed but `period` defaults to `"all"`
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 206–212
- **Severity:** Low
- **Evidence:** `if (period) params.append("period", period);` — when `period === "all"`, the param is sent as `"period=all"`. The server may treat this as the "all" filter or as an invalid value.
- **Impact:** Depends on server contract.
- **Fix:** Verify server handling.

#### L-03 — `reports.tsx:227–235` error catch sets `schoolXpData([])` but does not surface a user-visible error
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 227–232
- **Severity:** Low
- **Evidence:** On error, the chart shows "No data available for the selected period" (line 720–723), which is misleading.
- **Impact:** UX.
- **Fix:** Toast on error.

#### L-04 — `reports.tsx:485–488` `formatDate(row.getValue("createdAt"))` formats a Date but the cell expects a string from TanStack
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 485–488
- **Severity:** Low
- **Evidence:** `row.getValue("createdAt")` returns whatever the API sent. `formatDate` accepts `string | Date` so it is safe, but the type coercion happens at runtime.
- **Impact:** None.
- **Fix:** No change.

#### L-05 — `reports.tsx:495–496` `expiresAt` cell returns `<div>Never</div>` for null but `Never` is English-only
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 495–506, 938–940
- **Severity:** Medium (i18n)
- **Evidence:** Hardcoded `"Never"`. Same string on line 939 in the detail dialog.
- **Impact:** i18n hole.
- **Fix:** `t("licenseNeverExpires")`.

#### L-06 — `reports.tsx:518` `Active / Inactive` hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 518, 946–948
- **Severity:** Medium (i18n)
- **Evidence:** `isActive ? "Active" : "Inactive"`.
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-07 — `reports.tsx:465–468` `Full / Available` hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 466–467
- **Severity:** Medium (i18n)
- **Evidence:** `currentUsers >= maxUsers ? "Full" : "Available"`.
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-08 — `reports.tsx:347` `Detail` hardcoded English in dropdown
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 347, 357
- **Severity:** Medium (i18n)
- **Evidence:** `<Eye className="mr-2 h-4 w-4" /> Detail` and `<BookOpen className="mr-2 h-4 w-4" /> Reports`.
- **Impact:** i18n hole.
- **Fix:** Use `t("details")` and `t("reports")`.

#### L-09 — `reports.tsx:565–567` description text under the system reports heading is hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 564–567
- **Severity:** Medium (i18n)
- **Evidence:** `View comprehensive system analytics including school performance, license usage, and XP statistics across all registered schools.`
- **Impact:** i18n hole.
- **Fix:** Use a `t(...)` key.

#### L-10 — `reports.tsx:574, 588, 601, 611` `Total XP / Active Schools / Total Licenses / Total Users` hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 573, 586, 598, 611, 580, 592, 605, 621
- **Severity:** Medium (i18n)
- **Evidence:** Card titles and subtitles are English.
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-11 — `reports.tsx:581` "Across all schools" hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 580, 592, 605, 621
- **Severity:** Medium (i18n)
- **Evidence:** Card subtitle strings.
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-12 — `reports.tsx:610–623` `Total Users` card computes `licensesData.reduce((sum, license) => sum + license.currentUsers, 0)` — double-counts because a single user may belong to multiple licenses
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 610–623
- **Severity:** Low / Medium (correctness)
- **Evidence:** If a user has licenses from two schools, summing `currentUsers` counts them twice. The card says "Total Users" but actually shows the sum of license seats occupied.
- **Impact:** Inconsistent reporting.
- **Fix:** Either rename to "Total License Seats Used" or call a `/api/v1/system/users/count` endpoint.

#### L-13 — `reports.tsx:628–666` chart card period buttons hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 647–653
- **Severity:** Medium (i18n)
- **Evidence:** `"Today" / "7 Days" / "30 Days" / "All Time"`.
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-14 — `reports.tsx:675` `Loading chart data...` hardcoded
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 675
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-15 — `reports.tsx:721` `No data available for the selected period` hardcoded
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 720–723
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-16 — `reports.tsx:735–748` table filter input placeholder `Filter schools...` hardcoded
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 737
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-17 — `reports.tsx:801` `No results.` hardcoded English in empty table cell
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 801
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-18 — `reports.tsx:812–813` `Showing X of Y schools` hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 812–813
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-19 — `reports.tsx:822, 830` `Previous / Next` hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 822, 830
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-20 — `reports.tsx:848` `School Details` hardcoded English
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 848
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-21 — `reports.tsx:854, 860, 891, 898, 904, 910, 917, 923, 943` many hardcoded English section titles in the detail dialog
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 854, 860, 891, 898, 904, 910, 917, 923, 943
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-22 — `school-reports.tsx:64, 87, 110` `Back to System Reports` hardcoded English
- **File:** `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** 64, 87, 110
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-23 — `school-reports.tsx:71, 94` `Loading school reports...`, `Error loading reports:` hardcoded
- **File:** `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** 71, 94
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` keys.

#### L-24 — `school-reports.tsx:115` description text `View comprehensive reports for {schoolName} including classroom performance and student analytics.` hardcoded
- **File:** `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** 114–116
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-25 — `shcools-dashboard.tsx:25` `import { UserActivityLog } from "../models/user-activity-log-model"` — relative path uses `..` instead of `@/`
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 25
- **Severity:** Low
- **Evidence:** Relative import crosses from `components/system/` up to `components/` then into `models/`. The convention used elsewhere is `@/components/models/...`.
- **Impact:** Inconsistency.
- **Fix:** `@/components/models/user-activity-log-model`.

#### L-26 — `shcools-dashboard.tsx:26` `import { CloudHail } from "lucide-react"` is unused
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 26
- **Severity:** Low
- **Evidence:** `CloudHail` is never referenced in the file.
- **Impact:** Bundle bloat.
- **Fix:** Remove.

#### L-27 — `shcools-dashboard.tsx:27` `import { Role } from "@/lib/enums"` is used only once
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 27, 122
- **Severity:** Low
- **Impact:** None.
- **Fix:** No change.

#### L-28 — `shcools-dashboard.tsx:84` `ShcoolsDashboard` — typo in component name (`Shcools` instead of `Schools`)
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 84, 363
- **Severity:** Low
- **Evidence:** The component name and file name both have the typo. The file is `shcools-dashboard.tsx` and the function is `ShcoolsDashboard`.
- **Impact:** Maintenance hazard.
- **Fix:** Rename in a dedicated chore.

#### L-29 — `shcools-dashboard.tsx:96–98` debug logs in production
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 94–99
- **Severity:** High (covered by H-04)

#### L-30 — `shcools-dashboard.tsx:205` `Selete School :` typo
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 205
- **Severity:** Low
- **Evidence:** `Selete School :` should be `Select School:`. Hardcoded English anyway.
- **Impact:** Cosmetic.
- **Fix:** Rename + localize.

#### L-31 — `shcools-dashboard.tsx:217` `All School.` English + period
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 217
- **Severity:** Low / Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-32 — `shcools-dashboard.tsx:239–285` card titles hardcoded English
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 240, 251, 265, 278, 290, 304, 319, 335
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-33 — `shcools-dashboard.tsx:259` `Based on user profiles` hardcoded
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 258–260, 295–297
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-34 — `system-sidebar-nav.tsx:30` `Back` hardcoded English
- **File:** `apps/reading-advantage/components/system/system-sidebar-nav.tsx`
- **Lines:** 30
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-35 — `top-schools-xp-gained.tsx:38–40` `xp.label = "XP"` hardcoded
- **File:** `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- **Lines:** 36–42
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-36 — `top-schools-xp-gained.tsx:48` `Top Schools by XP Gained` hardcoded
- **File:** `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- **Lines:** 48–50
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-37 — `tabs.tsx:30` component name `TabsPractice` is fine; `Tabs` import may shadow Radix `Tabs`
- **File:** `apps/reading-advantage/components/tabs.tsx`
- **Lines:** 3
- **Severity:** Low
- **Evidence:** `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";` — `@/components/ui/tabs` likely re-exports from `@radix-ui/react-tabs`. The local `Tabs` is a re-export.
- **Impact:** None.
- **Fix:** No change.

#### L-38 — `archive-class.tsx:41` checks `res.status === 200` but the API may return 204
- **File:** `apps/reading-advantage/components/teacher/archive-class.tsx`
- **Lines:** 41
- **Severity:** Medium
- **Evidence:** `if (res.status === 200)` — only matches 200. A 204 No Content (common for PATCH archive) is treated as an error.
- **Impact:** Toast shows "Failed to archive class" even though the archive succeeded.
- **Fix:** `if (res.ok)` or `if (res.status >= 200 && res.status < 300)`.

#### L-39 — `archive-class.tsx:36` PATCH with no `Content-Type`
- **File:** `apps/reading-advantage/components/teacher/archive-class.tsx`
- **Lines:** 36–40
- **Severity:** Medium
- **Evidence:** `fetch(\`/api/v1/classroom/${classroomId}/achived\`, { method: "PATCH", body: JSON.stringify({ archived: true }) })` — note the URL has a typo: `achived` instead of `archived`. Same typo in `archive-class.tsx` line 36.
- **Impact:** Mismatched URL; either the route handler is at `/achived` (typo on server) or the request will 404.
- **Fix:** Verify the route handler; correct the URL to `/archived`.

#### L-40 — `archive-class.tsx:78, 81, 83, 90, 92` hardcoded i18n keys reference "archieve" (typo)
- **File:** `apps/reading-advantage/components/teacher/archive-class.tsx`
- **Lines:** 31, 78, 81, 83, 90, 92
- **Severity:** Low
- **Evidence:** `useScopedI18n("components.myClasses.archieve")` — the key is `archieve` (typo). If the locale JSON uses `archive` the lookup returns undefined.
- **Impact:** Title/description fallback to the key name in production.
- **Fix:** Confirm locale JSON uses the same key.

#### L-41 — `assign-dialog.tsx:42` `display_name?` and `name?` fields on `Student`
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 43–47
- **Severity:** Low
- **Evidence:** `Student` interface has `display_name?: string` and `name?: string` — both optional. The `display_name || name || email || id` fallback chain on line 215 is correct.
- **Impact:** None.
- **Fix:** No change.

#### L-42 — `assign-dialog.tsx:123` `setClassrooms(data.data)` — no `Array.isArray` guard
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 122–123
- **Severity:** Medium
- **Evidence:** If `data.data` is not an array (e.g., error envelope `{ message: "..." }`), `classrooms.map` on line 475 crashes.
- **Impact:** Runtime crash on malformed response.
- **Fix:** `setClassrooms(Array.isArray(data.data) ? data.data : [])`.

#### L-43 — `assign-dialog.tsx:151` `assignments.meta` truthiness check
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 151
- **Severity:** Medium
- **Evidence:** `if (assignments.meta) { ... setSelectedStudents(studentIdsFromServer); setAssignedStudentIds(studentIdsFromServer); }` — but the assignment may be `undefined` (no existing assignment) and `assignments.meta` may be a non-null object representing a brand-new assignment.
- **Impact:** Depends on server contract.
- **Fix:** Use a more specific schema check.

#### L-44 — `assign-dialog.tsx:298–308` `date!.toISOString()` can throw on Invalid Date
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 308
- **Severity:** Low
- **Evidence:** `date!.toISOString()` — if `date` is `Invalid Date` (e.g., after a parse failure elsewhere), this throws `RangeError: Invalid time value`.
- **Impact:** Runtime crash on submit.
- **Fix:** Validate `!isNaN(date.getTime())` before calling `toISOString()`.

#### L-45 — `assign-dialog.tsx:389` hardcoded English "Assignment updated successfully"
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 388–391
- **Severity:** Medium (i18n, covered by H-08)

#### L-46 — `assign-dialog.tsx:432–434` `editAssignment` vs `assignment` toggle uses the i18n key
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 432–434
- **Severity:** Low
- **Evidence:** `t("editAssignment")` and `t("assignment")` — both used as the trigger button label. The `assignment` key is a noun; `editAssignment` is a verb phrase. Depending on the locale, the trigger button shows either noun or verb.
- **Impact:** i18n confusion.
- **Fix:** Add a separate `triggerButton` key.

#### L-47 — `assign-dialog.tsx:448, 451` hardcoded fallback for missing article
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 448, 451
- **Severity:** Low
- **Evidence:** `article?.title || "The Great Gatsby"` and `article?.summary || "A novel by F. Scott Fitzgerald"`.
- **Impact:** If `article` is null, the dialog shows "The Great Gatsby" which may be wrong.
- **Fix:** Either require `article` to be defined via prop type or show a generic placeholder.

#### L-48 — `assign-dialog.tsx:485–487, 519–521, 536–539, 648–651, 708–710` `text-red-500 text-sm mt-1` validation error labels are hardcoded English-ish (the `{t("error.X")}` may not exist)
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 484–487, 519–521, 536–539, 648–651, 708–710
- **Severity:** Low / Medium (i18n)
- **Impact:** If the i18n key is missing, the literal key is shown.
- **Fix:** Verify locale JSON has all error.X keys.

#### L-49 — `assign-dialog.tsx:617–621` `noStudentsFound` / `pleaseSelectClassroomFirst` hardcoded i18n keys
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 618, 619
- **Severity:** Low
- **Impact:** i18n key existence not verified.
- **Fix:** Verify.

#### L-50 — `assign-dialog.tsx:640–643` `student.display_name || student.name || student.id` fallback chain
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 642
- **Severity:** Low
- **Evidence:** Falls back to `student.id` if both names are missing — exposes internal UUIDs to teachers.
- **Impact:** UX (UGLY UUIDs in the UI).
- **Fix:** Show "Unnamed student" or the email.

#### L-51 — `assign-dialog.tsx:665` `selectedDueDate:` hardcoded English label
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 665
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-52 — `assign-dialog.tsx:687` `h-12 w-12 sm:w-16 sm:h-18 p-0 font-normal` — `sm:h-18` is not a valid Tailwind class
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 687
- **Severity:** Low
- **Evidence:** Tailwind's spacing scale goes up to 96 in 4px increments. `h-18` is not a default class.
- **Impact:** The class is ignored.
- **Fix:** `sm:h-20` or `sm:h-24`.

#### L-53 — `assign-dialog.tsx:724` `Cancel` hardcoded English in dialog footer
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 724
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t("cancel")`.

#### L-54 — `assign-dialog.tsx:733` `Updating...` hardcoded English
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 733
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t("updating")`.

#### L-55 — `assign-dialog.tsx:401–404` `Failed to update assignment` hardcoded English in error toast
- **File:** `apps/reading-advantage/components/teacher/assign-dialog.tsx`
- **Lines:** 401
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Use `t(...)` key.

#### L-56 — `assignment-dashboard.tsx:188–202` `SkeletonCard` etc. have hardcoded class names; the skeleton layout duplicates the real layout
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 85–171
- **Severity:** Low
- **Evidence:** Five skeleton components each replicate part of the real UI. They drift independently.
- **Impact:** Maintenance hazard.
- **Fix:** Extract a single `<Skeleton variant="card|header|..." />` or use shadcn's `Skeleton` primitive.

#### L-57 — `assignment-dashboard.tsx:210` `useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi"` type assertion
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 210
- **Severity:** Low
- **Evidence:** Same anti-pattern as `student-assignment-dashboard.tsx` (batch 31).
- **Impact:** Type safety loss.
- **Fix:** Use a typed locale lookup.

#### L-58 — `assignment-dashboard.tsx:367–376` `formatDate` uses `currentLocale` directly in `toLocaleDateString` — locale not validated
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 367–376
- **Severity:** Low
- **Evidence:** `date.toLocaleDateString(\`${currentLocale}\`, ...)` — if `currentLocale` is undefined or an unsupported value, `toLocaleDateString` falls back to the system locale silently.
- **Impact:** Inconsistent rendering.
- **Fix:** Validate `currentLocale` before use.

#### L-59 — `assignment-dashboard.tsx:457` two `<h1>` and `<h2>` for the same title
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 452–457
- **Severity:** Low
- **Evidence:** `<h1>{article.title}</h1> <h2>{assignment.meta.title}</h2>` — both are visually identical (`text-3xl font-bold`). The `<h2>` is semantically subordinate but visually equal.
- **Impact:** Accessibility / hierarchy confusion.
- **Fix:** Make the styles differ.

#### L-60 — `assignment-dashboard.tsx:753` `Cancel` hardcoded English
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 753, 764
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-61 — `assignment-dashboard.tsx:813` `ID: {student.studentId.slice(-8)} {"..."}` shows truncated ID with ellipsis
- **File:** `apps/reading-advantage/components/teacher/assignment-dashboard.tsx`
- **Lines:** 811–814
- **Severity:** Low (UX)
- **Evidence:** `student.studentId.slice(-8)} {"..."}` — produces `"ID: abcdef12 ..."`. The ellipsis is misleading because it suggests more characters but the entire ID is `slice(-8)`.
- **Impact:** UX confusion.
- **Fix:** Drop the `"..."`.

#### L-62 — `assignment-page.tsx:216` `console.log("Fetching URL:", url)` debug log
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 216
- **Severity:** Low
- **Impact:** Console noise.
- **Fix:** Remove.

#### L-63 — `assignment-page.tsx:217` `fetch(url, { method: "GET" })` with no headers
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 217
- **Severity:** Low
- **Evidence:** GET requests typically don't need Content-Type. The lack of `Authorization` header suggests the cookie-based session is used.
- **Impact:** None.
- **Fix:** No change.

#### L-64 — `assignment-page.tsx:329` `placeholder="Select a Classroom"` hardcoded English
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 329
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-65 — `assignment-page.tsx:343` `placeholder="Search assignments..."` hardcoded
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 343
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-66 — `assignment-page.tsx:351` `Searching...` hardcoded
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 351
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-67 — `assignment-page.tsx:466–476` `Showing X to Y of Z assignments` hardcoded English
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 465–477
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-68 — `assignment-page.tsx:489` `Page X of Y` hardcoded
- **File:** `apps/reading-advantage/components/teacher/assignment-page.tsx`
- **Lines:** 488–490
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-69 — `class-roster.tsx:273` `placeholder="Select a Classroom"` hardcoded
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 273
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-70 — `class-roster.tsx:153` `No Activity` hardcoded
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 153
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-71 — `class-roster.tsx:339, 349` `Sync students` hardcoded
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 338–349
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-72 — `class-roster.tsx:417` `Empty` hardcoded in empty table cell
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 417
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-73 — `class-roster.tsx:469` `Resetting...` hardcoded
- **File:** `apps/reading-advantage/components/teacher/class-roster.tsx`
- **Lines:** 468–470
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-74 — `create-new-class.tsx:43` `description: "description"` literal string
- **File:** `apps/reading-advantage/components/teacher/create-new-class.tsx`
- **Lines:** 42
- **Severity:** Medium
- **Evidence:** `description: "description"` — sends the literal string `"description"` as the description. Likely a placeholder that was never filled in.
- **Impact:** Backend stores a useless string for every new class.
- **Fix:** Either accept a description from the form or remove the field from the POST.

#### L-75 — `create-new-class.tsx:50` hardcoded English toast title/description keys `attention`
- **File:** `apps/reading-advantage/components/teacher/create-new-class.tsx`
- **Lines:** 49–50
- **Severity:** Low
- **Impact:** i18n key existence not verified.
- **Fix:** Verify.

#### L-76 — `delete-class.tsx:66` `router.refresh()` called in `finally`
- **File:** `apps/reading-advantage/components/teacher/delete-class.tsx`
- **Lines:** 65–68
- **Severity:** Medium
- **Evidence:** Refresh runs whether or not the delete succeeded. On failure, the class reappears after refresh.
- **Impact:** Confusing UX.
- **Fix:** Refresh only on success (covered by M-36).

#### L-77 — `delete-class.tsx:88, 90, 91, 98, 100` hardcoded i18n keys
- **File:** `apps/reading-advantage/components/teacher/delete-class.tsx`
- **Lines:** 33, 86, 88, 91, 98, 100
- **Severity:** Low
- **Impact:** i18n key existence not verified.
- **Fix:** Verify.

#### L-78 — `edit-class.tsx:71–75` success toast fires even on error
- **File:** `apps/reading-advantage/components/teacher/edit-class.tsx`
- **Lines:** 71–77
- **Severity:** High (covered by H-20)

#### L-79 — `edit-class.tsx:90, 92, 95, 99, 105, 108, 114, 124` hardcoded i18n keys
- **File:** `apps/reading-advantage/components/teacher/edit-class.tsx`
- **Lines:** 44, 90, 92, 95, 99, 105, 108, 114, 124
- **Severity:** Low
- **Impact:** i18n key existence not verified.
- **Fix:** Verify.

#### L-80 — `edit-student.tsx:91` `aria-label="edit class"` mismatch
- **File:** `apps/reading-advantage/components/teacher/edit-student.tsx`
- **Lines:** 91
- **Severity:** Low (covered by M-40)

#### L-81 — `enroll-classes.tsx:76` "Please select a classroom first." hardcoded
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 76
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-82 — `enroll-classes.tsx:112` hardcoded Thai "ไม่สามารถเพิ่มนักเรียนได้" (cannot enroll student)
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 112
- **Severity:** Medium (i18n)
- **Evidence:** Mixed-language UI; Thai for one toast title and English for everything else.
- **Impact:** i18n hole.
- **Fix:** Localize via i18n key.

#### L-83 — `enroll-classes.tsx:113` `description: result.message` — uses server message
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 113
- **Severity:** Medium
- **Evidence:** `description: result.message` — server message is rendered raw. If the server returns English (or any language) the client shows whatever the server sent.
- **Impact:** Locale mismatch.
- **Fix:** Map server error codes to i18n keys.

#### L-84 — `enroll-classes.tsx:177` `onClick={() => row.toggleSelected}` — function reference (covered by M-41)

#### L-85 — `enroll-classes.tsx:257` `Adding...` hardcoded
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 257
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-86 — `enroll-classes.tsx:177` `Anonymous` fallback hardcoded
- **File:** `apps/reading-advantage/components/teacher/enroll-classes.tsx`
- **Lines:** 177
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-87 — `export-story-workbooks-button.tsx:76` `Exporting... (X/Y)` hardcoded
- **File:** `apps/reading-advantage/components/teacher/export-story-workbooks-button.tsx`
- **Lines:** 75–77
- **Severity:** Medium (i18n)
- **Impact:** i18n hole.
- **Fix:** Localize.

#### L-88 — `export-workbook-button.tsx:52` `alert(...)` (covered by H-26)

#### L-89 — `reports.tsx:516` `bg-green-600/10 text-green-600 border-secondary/20` uses `secondary` border with `green-600` text/bg — visual inconsistency
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 514–517
- **Severity:** Low (style)
- **Impact:** Visual inconsistency.
- **Fix:** Use `border-green-600/20` for consistency.

#### L-90 — `school-reports.tsx:38` `result.data || []` — no `Array.isArray` guard
- **File:** `apps/reading-advantage/components/system/school-reports.tsx`
- **Lines:** 38
- **Severity:** Medium
- **Evidence:** `setClassrooms(result.data || [])` — if `result.data` is not an array, downstream code may crash.
- **Impact:** Runtime crash on malformed response.
- **Fix:** Guard with `Array.isArray`.

#### L-91 — `top-schools-xp-gained.tsx:39` commented-out `color: "hsl(var(--chart-1))"`
- **File:** `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- **Lines:** 39
- **Severity:** Low
- **Impact:** Dead code.
- **Fix:** Remove.

#### L-92 — `tabs.tsx:32` `useState(true)` for `showButton` (unused)
- **File:** `apps/reading-advantage/components/tabs.tsx`
- **Lines:** 32
- **Severity:** Low (covered by H-28)

#### L-93 — `tabs.tsx:46–51` `.toString()` calls on `t(...)` returns are defensive but `useScopedI18n` already returns a string
- **File:** `apps/reading-advantage/components/tabs.tsx`
- **Lines:** 46–51
- **Severity:** Low
- **Evidence:** `{t("flashcard").toString()}` — `t()` returns a string already.
- **Impact:** Style noise.
- **Fix:** `{t("flashcard")}`.

#### L-94 — `shcools-dashboard.tsx:223` `setIsLoading(true)` followed by `setTimeout(() => setIsLoading(false), 100)` — fake delay
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 196
- **Severity:** Medium
- **Evidence:** `setTimeout(() => setIsLoading(false), 100); // Small delay to show loading state`. The 100 ms artificial delay is a code smell.
- **Impact:** Always delays the response by 100 ms.
- **Fix:** Remove the artificial delay; let state update immediately.

#### L-95 — `reports.tsx:147–200` effect uses `isClient` as a dep, but the resize listener should only depend on a stable flag
- **File:** `apps/reading-advantage/components/system/reports.tsx`
- **Lines:** 200
- **Severity:** Low
- **Evidence:** `useEffect(() => { ... }, [isClient])` — `isClient` is set in a separate effect on line 134–145. Both effects run when `isClient` changes.
- **Impact:** Listener registration on every `isClient` change.
- **Fix:** Use `useEffect(..., [])` and check `typeof window !== "undefined"` inside.

#### L-96 — `shcools-dashboard.tsx:101` `schoolSelected` state is declared but the `Select` uses `defaultValue` and never updates
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 101, 189, 207–211
- **Severity:** Medium
- **Evidence:** `const [schoolSelected, setSchoolSelected] = React.useState<string>("all")` is updated inside `handleSchoolChange` (line 189) but `<Select defaultValue={"all"} onValueChange={...}>` uses `defaultValue`, not `value`. The state and the displayed value are independent.
- **Impact:** Visual desync; selecting a school updates the state but the Select's displayed value reverts to "all" after re-render.
- **Fix:** Use `value={schoolSelected}` on the `Select`.

#### L-97 — `shcools-dashboard.tsx:223` filter inside `handleSchoolChange` uses `console.log` per item
- **File:** `apps/reading-advantage/components/system/shcools-dashboard.tsx`
- **Lines:** 168–171, 179–185
- **Severity:** High (covered by H-06 and M-09)

#### L-98 — `top-schools-xp-gained.tsx:30` `topSchoolByXP: { school: string; xp: number }[]` is fine; the file does not validate the input shape
- **File:** `apps/reading-advantage/components/system/top-schools-xp-gained.tsx`
- **Lines:** 30–32
- **Severity:** Low
- **Impact:** If the server returns a different shape, the chart silently renders an empty state.
- **Fix:** Add a Zod schema.

#### L-99 — `archive-class.tsx:36` URL typo `/achived` (covered by L-39)

#### L-100 — `delete-class.tsx:38` URL `/api/v1/classroom/${classroomId}` is fine; the DELETE method may not be supported
- **File:** `apps/reading-advantage/components/teacher/delete-class.tsx`
- **Lines:** 38–40
- **Severity:** Low
- **Evidence:** `fetch(\`/api/v1/classroom/${classroomId}\`, { method: "DELETE" })` — the route handler should support DELETE. If not, the request 405s.
- **Impact:** Depends on server.
- **Fix:** Verify the route handler.

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Yes | `create-new-class.tsx:64–74` toasts "success" in `finally` even when `catch` ran; `edit-class.tsx:46–78` no `response.ok` check then success-toasts; `delete-class.tsx:65–68` refreshes even on failure; `school-reports.tsx:41–46` `console.error` and silent state reset; `reports.tsx:228–231` toasts nothing on error. |
| A2 | Raw `JSON.stringify` body without `Content-Type` | Yes | `archive-class.tsx:36–39`, `create-new-class.tsx:55–58`, `edit-student.tsx:49–57`, `edit-class.tsx:57–66`. |
| A3 | Digit-only as a "labeled count" | Yes | `assignment-dashboard.tsx:684–721` filter buttons use magic `0/1/2/overdue`; `assignment-dashboard.tsx:330–365` `getStatusInfo` switch uses magic 0/1/2; `assignment-dashboard.tsx:386–403` filter chains. |
| A4 | Vacuous-pass on nothing-done | Partial | `enroll-classes.tsx:124–137` removes classroom from local state on 2xx but not 4xx (race). |
| A5 | False-claim text vs test reality | N/A | No tests exist for this batch to contradict. |
| A6 | Provider-specific hardcoded URLs | Partial | `class-roster.tsx:204` has `//teacher/...` double slash; `archive-class.tsx:36` `/achived` typo URL; `system/reports.tsx:308–314` hardcoded `th-TH` locale and `Asia/Bangkok` timezone. |
| A7 | Magic numbers without enum | Yes | `assignment-dashboard.tsx` status 0/1/2; `shcools-dashboard.tsx` 19-element CEFR map; `create-new-class.tsx:130` grade `length=10, i+3`; `edit-class.tsx:111` same; `reports.tsx:297, 299` million/thousand thresholds; `assignment-page.tsx:89` limit=10. |
| A8 | Unused `any` | Yes | `top-schools-xp-gained.tsx:77` `(value: any)`; `shcools-dashboard.tsx:161, 168, 176, 179` `(school: any)`; `class-roster.tsx:220` references studentInClass (no `any` but check); `create-new-student.tsx:157` `(_: any, ...)`. |
| A9 | `onClick={() => funcRef}` (function reference, not call) | Yes | `enroll-classes.tsx:177` `onClick={() => row.toggleSelected}`. |
| A10 | `finally` runs success-only logic | Yes | `create-new-class.tsx:67–73` toast success in finally; `delete-class.tsx:65–68` router.refresh in finally. |
| A11 | Effect dep array includes `[]` for side-effects with closure-captured state | Yes | `enroll-classes.tsx:214–231` `useEffect(..., [])` reads `params.studentId`; `assignment-page.tsx:302–321` same; `class-roster.tsx:261–265`. |
| A12 | Local i18n declared but unused | Yes | `system-sidebar-nav.tsx:14` commented out. |
| A13 | Commented-out code | Yes | `system-sidebar-nav.tsx:14, 56`, `top-schools-xp-gained.tsx:39`, `export-workbook-button.tsx:49`. |
| A14 | Native `alert()` instead of toast | Yes | `export-workbook-button.tsx:52`. |
| A15 | Loop inside `Promise.all` that increments a shared counter | Yes | `export-story-workbooks-button.tsx:31–66`. |
| A16 | Double slash in URL template | Yes | `class-roster.tsx:204` `${NEXT_PUBLIC_BASE_URL}//teacher/...`. |

---

## Test / Coverage Observations

1. **No tests cover any of the 20 files.** `glob` for `*.test.{ts,tsx}` under both `apps/reading-advantage/components/teacher/` and `apps/reading-advantage/components/system/` returned **zero matches**. The closest tests are in unrelated `apps/reading-advantage/components/games/`, `apps/reading-advantage/hooks/`, and one `components/ui/__tests__/calendar.test.tsx`.
2. **Behavior worth testing (representative, not exhaustive):**
   - `reports.tsx`: column visibility branches at width boundaries (640/768/1024); `formatXP` at 999/1000/999999/1000000; `formatDate` locale fix; `fetchSchoolXpData` and `fetchLicensesData` with non-OK responses.
   - `school-reports.tsx`: `fetchClassrooms` with missing `schoolName`; `setClassrooms` with non-array `result.data`.
   - `shcools-dashboard.tsx`: `cefrToNumber` round-trip for each level; `averageCefrLevel` for averages below/above boundaries; `handleSchoolChange` filter logic for each option.
   - `system-sidebar-nav.tsx`: `Icons[item.icon]` for valid and invalid icon names; `pathWithoutLocale` for paths with fewer than 2 segments.
   - `top-schools-xp-gained.tsx`: `tickFormatter` truncation at length 5; chart renders without `LabelList`.
   - `tabs.tsx`: dynamic imports resolve; `activeTab` syncs with `<Tabs>` state.
   - `archive-class.tsx`: 200 vs 204 status codes; URL typo `/achived`.
   - `assign-dialog.tsx`: `validateForm` for each combination of empty/missing fields; `checkExistingAssignment` with `assignments.meta` undefined; `studentdata` filters; DELETE loop runs for each removed student.
   - `assignment-dashboard.tsx`: `getStatusInfo` for each status; `getProgressStats` for empty/full student list; `getDaysRemaining` for past/today/future dates.
   - `assignment-page.tsx`: `useDebounce` integration; `fetchAssignments` for both envelope shapes; pagination when array > 10.
   - `class-roster.tsx`: `studentInClass` last-activity formatting; double-slash URL bug; `captoliza` class.
   - `create-new-class.tsx`: `handleCreateClass` failure path (toast in `finally`); class code generation collision.
   - `create-new-student.tsx`: PATCH for each email; duplicate-email toast; FormData iteration with multiple email inputs.
   - `delete-class.tsx`: 200 vs error; `router.refresh()` in `finally`.
   - `edit-class.tsx`: `response.ok` check; grade range `Array.from({length:10}, (_,i)=>i+3)`.
   - `edit-student.tsx`: `response.ok`; PATCH with no `Content-Type`.
   - `enroll-classes.tsx`: `row.toggleSelected` not invoked; double-counted classrooms; `ALREADY_ENROLLED` branch.
   - `export-story-workbooks-button.tsx`: counter accuracy with N parallel downloads.
   - `export-workbook-button.tsx`: `alert()` fallback path.
3. **No test execution was attempted.** No tests exist for these files; node modules were not installed; `pnpm turbo` was not run.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

---

## Recommendations (focused, no broad refactor)

1. **H-02 — `reports.tsx:308–314`** — remove the hardcoded `th-TH` and `Asia/Bangkok`; pass the user's locale and use UTC dates.
2. **H-04 — `shcools-dashboard.tsx:94–99, 154–198`** — remove all 13 `console.log` calls; route telemetry through a structured logger.
3. **H-05 — `shcools-dashboard.tsx:148`** — derive `averageCefrLevel` from the **mode** of per-user CEFR strings, or display a numeric average with a clear "no data" state.
4. **H-09 — `assignment-dashboard.tsx:213–247`** — check `response.ok` and validate `data.article` exists before calling `setArticle(data.article)`.
5. **H-11 — `assignment-page.tsx:98–112`** — extract `useDebounce` to a top-level custom hook.
6. **H-14 — `class-roster.tsx:204`** — fix the double-slash URL and use the current `classroomId` instead of `classrooms[0]?.id`.
7. **H-17 / H-20 — `create-new-class.tsx:36–75`, `edit-class.tsx:46–78`** — move success toast inside the success branch; check `response.ok`.
8. **H-19 — `create-new-class.tsx:81–83`** — use `crypto.randomUUID()` for class codes and have the server verify uniqueness.
9. **H-23 — `enroll-classes.tsx:144–146`** — replace the uncancellable `setTimeout` with a `useEffect` cleanup that clears the timer.
10. **H-25 — `export-story-workbooks-button.tsx:31–66`** — process chapters sequentially or batch the counter update.
11. **H-26 — `export-workbook-button.tsx:52`** — replace `alert(...)` with the shadcn toast.
12. **H-27 / H-28 — `tabs.tsx:30–75`** — drop redundant `activeTab === "tabN"` guards; remove unused `showButton` state.
13. **H-29 — `top-schools-xp-gained.tsx:5–13`** — remove `Pie`, `PieChart`, `Label` imports.
14. **H-38 — `archive-class.tsx:36`** — confirm the `/achived` URL or fix to `/archived`; check `response.ok` instead of `res.status === 200`.
15. **M-48 — `reports.tsx`, `school-reports.tsx`** — confirm that `/api/v1/system/*` endpoints enforce system-admin role; add a front-end guard.
16. **A6 family — `reports.tsx:308`, `class-roster.tsx:204`, `archive-class.tsx:36`** — fix locale, double-slash, and typo URLs.
17. **A8 / A9** — replace `any` types and the `onClick={() => row.toggleSelected}` reference-not-call bug.
18. **A10 / A14** — eliminate `finally`-block success toasts and `alert()` fallbacks.
19. **A11** — fix `useEffect(..., [])` reads of `params.studentId`, `classrooms`, `pathname`.
20. **i18n** — every `L-**` finding above identifies a hardcoded English string that should go through `useScopedI18n`. AGENTS.md §"Backend Function Requirements" extends to UI: every external boundary (including the i18n boundary) must be validated.

---

*End of line-review report for batch 32.*

MEASURE_AGENT_RESULT: REVIEW_ONLY_NO_EDITS