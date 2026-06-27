# Line Review: sa-batch-09

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-09 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns

---

## Files Reviewed

1. `apps/science-advantage/components/features/student/student-curriculum-view.tsx`
2. `apps/science-advantage/components/features/student/student-nav.tsx`
3. `apps/science-advantage/components/features/student/student-progress-card.tsx`
4. `apps/science-advantage/components/features/system/system-nav.tsx`
5. `apps/science-advantage/components/features/teacher/analytics/class-analytics-overview.tsx`
6. `apps/science-advantage/components/features/teacher/analytics/lesson-detail-analytics.tsx`
7. `apps/science-advantage/components/features/teacher/analytics/student-detail-analytics.tsx`
8. `apps/science-advantage/components/features/teacher/analytics/student-lesson-detail-analytics.tsx`
9. `apps/science-advantage/components/features/teacher/assign-button.tsx`
10. `apps/science-advantage/components/features/teacher/class-detail/class-detail-header.tsx`
11. `apps/science-advantage/components/features/teacher/class-detail/class-intervention-summary.tsx`
12. `apps/science-advantage/components/features/teacher/class-detail/class-roster.tsx`
13. `apps/science-advantage/components/features/teacher/class-detail/class-snapshot-panel.tsx`
14. `apps/science-advantage/components/features/teacher/class-detail/class-tabs.tsx`
15. `apps/science-advantage/components/features/teacher/class-detail/curriculum-accordion.tsx`
16. `apps/science-advantage/components/features/teacher/class-detail/curriculum-with-data.tsx`
17. `apps/science-advantage/components/features/teacher/class-detail/join-code-panel.tsx`
18. `apps/science-advantage/components/features/teacher/class-progress-card.tsx`
19. `apps/science-advantage/components/features/teacher/intervention-alerts-widget.test.tsx`
20. `apps/science-advantage/components/features/teacher/intervention-alerts-widget.tsx`

---

## File-by-File Findings

### File 1: `student-curriculum-view.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `"use client"` directive present — correct, component uses hooks and browser APIs. | OK | — |
| 10–21, 23–32, 34–39, 41–47, 49–57 | **Inline type definitions**: `LessonProgress`, `Lesson`, `AssignmentData`, `CurriculumUnit`, `CurriculumData` are all defined locally instead of imported from `@reading-advantage/types` or a shared component types module. Causes type drift risk across the codebase. | Medium | F-SA-B09-001 |
| 132 | Fetches `/api/classes/${classId}/curriculum`. The `classId` prop comes from a parent; if the parent sourced it from URL params without server-side verification, this could allow a student to enumerate curriculum from other classes. Authorization is delegated to the API route (defense-in-depth is acceptable but worth noting). | Info | — |
| 150–162 | **Silent catch on assignments fetch**: The inner `try/catch` at L160–161 silently swallows fetch/parse errors for assignments. The comment says "badges just won't show", but a network error or malformed JSON would be invisible to the user and unlogged. | Low | F-SA-B09-002 |
| 241 | **Non-interactive element as clickable**: `<li>` element with `onClick` handler for navigation. `<li>` is not natively keyboard-focusable; keyboard users cannot activate this navigation with Enter/Space. Should use `<Link>` or `<button>` with proper `<li>` styling, or add `tabIndex={0}`, `role="button"`, and `onKeyDown` handlers. | Medium | F-SA-B09-003 |
| 272–278 | **Tooltip trigger on non-focusable `<span>`**: The `TooltipTrigger asChild` wraps a `<span>`, which is not focusable. Keyboard users navigating via Tab will not reach the score badge and therefore cannot open the tooltip. | Low | F-SA-B09-004 |
| 119 | **No JSDoc**: Exported component `StudentCurriculumView` has no JSDoc description. Violates AGENTS.md documentation standard. | Low | F-SA-B09-005 |
| 63–90 | `STATUS_CONFIG` — well-structured map pattern. | OK | — |
| 99–104 | `formatPercentage` handles null/undefined correctly. | OK | — |

---

### File 2: `student-nav.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` present — correct; uses `usePathname()`. | OK | — |
| 7–10 | `NAV_ITEMS` array — clean static data. | OK | — |
| 12–33 | Component correctly uses `Link` (accessible navigation) and `cn()` for active class. Active-link comparison uses exact match (`pathname === item.href`), correct for top-level routes. | OK | — |
| — | **No JSDoc on exported `StudentNav`**. | Low | F-SA-B09-005 |

**Verdict**: Clean, minimal, correct. No security concerns.

---

### File 3: `student-progress-card.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` present — correct. | OK | — |
| 11–13, 15–17, 19–21 | **Inline types**: `StudentProgressCardProps`, `MasteryStrand`, `MasteryProfileResponse` defined locally instead of shared. | Medium | F-SA-B09-001 |
| 33 | Fetches `/api/students/${studentId}/mastery-profile?limit=200`. The `studentId` from props — potential IDOR if parent doesn't verify the student belongs to the current user. Authorization delegated to API (acceptable). | Info | — |
| 36–39 | On fetch error, sets `error = true` and returns early — at L76 this shows "Complete lessons to start tracking" message which is misleading for a network/server error. Should distinguish between "no data" and "fetch failed". | Low | F-SA-B09-006 |
| 59 | Client-logger error logged with structured key — good observability. | OK | — |
| 23 | **No JSDoc on exported `StudentProgressCard`**. | Low | F-SA-B09-005 |
| 8 | Imports `MasteryProgressDisplay` from `./mastery-profile/mastery-progress-display` — correct colocated import. | OK | — |

---

### File 4: `system-nav.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` present — correct. | OK | — |
| 7–10 | Two nav items: Dashboard and Schools — appropriate for system admin. | OK | — |
| 12–32 | Same clean `Link`-based navigation pattern as `student-nav.tsx`. | OK | — |
| — | **No JSDoc on exported `SystemNav`**. | Low | F-SA-B09-005 |

**Verdict**: Clean, minimal, correct.

---

### File 5: `class-analytics-overview.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` present — correct. | OK | — |
| 100–128 | `fetchAnalytics` with 403/404 state handling — good user-facing error messages. | OK | — |
| 22–33, 35–40, 42–44, 45–47 | **Inline types**: All data and prop types defined locally. | Medium | F-SA-B09-001 |
| 49–62 | `getScoreColorVariant` — duplicated identically in files 6, 7, 8 in this batch. Should be a shared utility in `lib/utils/` or a component file. | Medium | F-SA-B09-007 |
| 64–73 | `formatTime` — duplicated identically in files 6, 7, 8. Should be shared. | Medium | F-SA-B09-007 |
| 75–88 | `getSortIcon` — duplicated in files 6, 7. Should be shared. | Low | F-SA-B09-007 |
| 143–161 | Client-side sorting — functional but inefficient for large datasets (re-sorts on every render via spreading). Acceptable for typical class sizes (<100 lessons). | Info | — |
| 294–296 | Uses `lesson.averageScore` with `%` suffix. The type defines both `averageScore: number` and `averageScorePercentage: number` (L28–29). If `averageScore` is already a percentage (e.g., 85 for 85%), the naming is ambiguous. Should use `averageScorePercentage` for display and validate the API contract. | Low | F-SA-B09-008 |
| 90–92 | **No JSDoc on exported `ClassAnalyticsOverview`**. | Low | F-SA-B09-005 |

---

### File 6: `lesson-detail-analytics.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` present — correct. | OK | — |
| 100–113 | `getScoreColorVariant` — duplicate of file 5 (see F-SA-B09-007). | Medium | F-SA-B09-007 |
| 115–124 | `formatTime` — duplicate. | Medium | F-SA-B09-007 |
| 126–139 | `getSortIcon` — duplicate of file 5. | Low | F-SA-B09-007 |
| 233–236 | `handleStudentClick` navigates to `/teacher/classes/${classId}/students/${studentId}` — correct path. | OK | — |
| 273–276 | **Back button uses `<Button>` with `onClick` + `router.push` instead of `<Link>`**: This is a navigation action, not an action. Should use `<Link>` for accessibility (right-click, open in new tab, SEO, reduced JS bundle) or `asChild` on the Button wrapping a Link. | Low | F-SA-B09-009 |
| 403–407 | Student rows clickable via `onClick` on `<TableRow>` — same keyboard-accessibility concern as File 1 (non-interactive element with click handler). | Medium | F-SA-B09-003 |
| 515–516 | Displays `question.incorrectStudents` (student names) to teacher — correct authorization boundary (teacher viewing their class). PII disclosure is expected here. | OK | — |
| 141–144 | **No JSDoc on exported `LessonDetailAnalytics`**. | Low | F-SA-B09-005 |
| 34–45, 47–58, 59–68, 70–90, 92–93, 95–97 | All types defined inline. | Medium | F-SA-B09-001 |

---

### File 7: `student-detail-analytics.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 78–91 | `getScoreColorVariant` — duplicate (F-SA-B09-007). | Medium | F-SA-B09-007 |
| 93–102 | `formatTime` — duplicate (F-SA-B09-007). | Medium | F-SA-B09-007 |
| 104–117 | `getSortIcon` — duplicate (F-SA-B09-007). | Low | F-SA-B09-007 |
| 119–130 | **`getCompletionStatusBadge` uses `status: string` instead of the specific union type**: The `LessonPerformance.completionStatus` is `'completed' | 'in_progress' | 'not_started'` (L27) but the function accepts `string`, losing type safety. If a new status value is added, the compiler would not flag missing cases. | Low | F-SA-B09-010 |
| 148–151 | Fetches `/api/students/${studentId}/classes/${classId}/analytics` — note: `classId` is included in the path. That is good for tenancy scoping. | OK | — |
| 280 | **Displays raw `colorCode` value as badge text**: Shows "blue", "green", "yellow", "red" as visible label text (L280-282). This is a developer-oriented enum value, not user-friendly. A human-readable label (e.g., "Excellent", "Good") would be more appropriate, as done in `lesson-detail-analytics.tsx` (L332-338). | Low | F-SA-B09-011 |
| 132–135 | **No JSDoc on exported `StudentDetailAnalytics`**. | Low | F-SA-B09-005 |
| 23–33, 35–44, 46–68, 70–71, 73–76 | All types defined inline. | Medium | F-SA-B09-001 |
| 209–213 | Lesson click navigates correctly. | OK | — |

---

### File 8: `student-lesson-detail-analytics.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 90–103 | `getScoreColorVariant` — duplicate (F-SA-B09-007). | Medium | F-SA-B09-007 |
| 105–114 | `formatTime` — duplicate (F-SA-B09-007). | Medium | F-SA-B09-007 |
| 128–136 | `formatAnswer` — correctly handles the complex `StudentAnswer` union type with runtime type narrowing. Good defensive code. | OK | — |
| 156–158 | **Fetches `/api/students/${studentId}/lessons/${lessonId}/analytics` — does NOT include `classId`**: The component accepts `classId` as a prop (L139) but does not include it in the API call. If the API does not cross-verify that the student belongs to the class, this could allow a teacher to view any student's lesson data without class-scoped authorization. | High | F-SA-B09-012 |
| 231–250 | **Breadcrumb uses `<Button>` + `router.push` instead of `<Link>` for navigation**: Same concern as File 6 (F-SA-B09-009). Three separate Button/link instances. | Low | F-SA-B09-009 |
| 116–126 | `formatDateTime` — clean date formatting with explicit locale. | OK | — |
| 138–142 | **No JSDoc on exported `StudentLessonDetailAnalytics`**. | Low | F-SA-B09-005 |
| 30 | Imports `StudentAnswer` from `@/components/features/student/quiz-questions/types` — correct import from the owning module. | OK | — |
| 33–43, 45–57, 59–68, 70–82, 84–88 | Inline types. | Medium | F-SA-B09-001 |

---

### File 9: `assign-button.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 56–86 | `handleAssign` — POST to `/api/classes/${classId}/assignments` with `{ lessonId, dueAt }` in body. Authorization must be enforced at the API level. | OK | — |
| 78 | **Fragile API response assumption**: `onAssigned?.(data.data)` assumes the response shape has a `.data` property. If the API changes its response format (e.g., `{ success: true, data: ... }` vs flat `{ id, ... }`), this silently breaks. The route handler contract is not typed/shared with the component. | Low | F-SA-B09-013 |
| 88–112 | `handleRemove` — DELETE to same endpoint. Similar assumption at L106. | Low | F-SA-B09-013 |
| 38–48 | Props interface is well-typed with proper optional callbacks. | OK | — |
| 146–192 | AlertDialog pattern with loading/error states — good UX consideration. | OK | — |
| 67–68 | Uses `new Date(dueDate).toISOString()` for the due date — correct. | OK | — |
| 38 | **No JSDoc on exported `AssignButton`**. | Low | F-SA-B09-005 |
| 19–24 | Inline `AssignmentData` type — duplicates the type from other files in this batch (see F-SA-B09-001). | Medium | F-SA-B09-001 |

---

### File 10: `class-detail-header.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 45–61 | **`handleSave` submits a PATCH to rename the class**: No error handling on failed PATCH — the `try` block has no `catch`. If the API fails, the user gets no feedback. The button text changes to "Saving..." but never reverts if the request fails (the `finally` block sets `setSaving(false)` but that runs regardless — wait, L57 shows no catch, so if the fetch throws, it propagates and `setSaving(false)` in `finally` would still run. But if `res.ok` is false (non-2xx), the function just silently returns without resetting the UI. | Medium | F-SA-B09-014 |
| 63–74 | **`handleDelete` — same issue**: No catch block. If the DELETE request fails, the `finally` block still runs and closes the dialog, leaving the user thinking the class was deleted. | Medium | F-SA-B09-014 |
| 168 | `classTitle` displayed via JSX — React auto-escapes, so no XSS risk. | OK | — |
| 46 | UI-side validation (`editName.trim().length < 3`) — good UX guard, but final validation must be server-side. | OK | — |
| 31–37 | Props interface well-typed, imports `StandardsAlignment` from shared types. | OK | — |
| 31 | **No JSDoc on exported `ClassDetailHeader`**. | Low | F-SA-B09-005 |

---

### File 11: `class-intervention-summary.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 27 | `'use client'` — correct. | OK | — |
| 34–36 | Fetches `/api/teachers/classes/${classId}/intervention-alerts?limit=100`. | OK | — |
| 39–54 | Correctly filters alerts by severity to build summary counts. | OK | — |
| 56–57 | **Silent catch**: If fetch fails, the error is swallowed entirely — no console log, no user feedback. The component renders null (L81–83) which leaves the teacher with no indication that intervention data failed to load (vs. no data at all). | Medium | F-SA-B09-015 |
| 81–83 | Returns `null` when no alerts or summary is null — this means the entire card disappears, which could be confusing (teacher might wonder if the feature is working). An empty state message would be more informative. | Low | F-SA-B09-016 |
| 23–25 | Props interface minimal — good. | OK | — |
| 27 | **No JSDoc on exported `ClassInterventionSummary`**. | Low | F-SA-B09-005 |

---

### File 12: `class-roster.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 71 | Fetches `/api/classes/${classId}/roster`. | OK | — |
| 72, 75–77 | **Silent error handling**: `if (!res.ok) return;` and empty `catch {}` — no error logging or user feedback. If the roster fetch fails, the page shows loading skeletons that transition to an empty state. | Medium | F-SA-B09-015 |
| 85–102 | **`handleRemoveStudent` — no catch**: If the DELETE request throws, the error propagates unhandled. And if `res.ok` is false, there's no user feedback — the dialog closes and the student is not removed but the UI shows no error. | Medium | F-SA-B09-014 |
| 94–97 | Optimistic UI update (`setStudents(prev => prev.filter(...))`) followed by `router.refresh()`. If the server rejects the deletion, the local state is already wrong until the page refreshes. Combined with the no-error-feedback issue, this could silently mislead the user. | Medium | F-SA-B09-017 |
| 61 | **No JSDoc on exported `ClassRoster`**. | Low | F-SA-B09-005 |
| 28–34 | Inline `RosterStudent` type. | Medium | F-SA-B09-001 |
| 40–46, 48–59 | `formatDate` and `formatLastActive` — clean utility functions. | OK | — |

---

### File 13: `class-snapshot-panel.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | **No `'use client'` directive**: Component uses no hooks or browser APIs and only renders static data from props. This is correct — it can be a Server Component, avoiding unnecessary client JS. | OK | — |
| 2 | Imports from `@/lib/utils/class-format` and `@/lib/enums` — correct shared utility usage. | OK | — |
| 11–40 | Clean presentational component with Card layout. No data fetching, no state, no effects. | OK | — |
| 11 | **No JSDoc on exported `ClassSnapshotPanel`**. | Low | F-SA-B09-005 |

**Verdict**: Cleanest component in this batch. Correct Server Component pattern.

---

### File 14: `class-tabs.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `'use client'` — correct (uses `usePathname()`). | OK | — |
| 12–58 | Clean tab navigation with three tabs (Curriculum, Roster, Analytics). | OK | — |
| 36 | Analytics tab uses `pathname.startsWith(tab.href)` while others use exact match — correctly handles sub-routes under analytics. | OK | — |
| 40–48 | `cn()` for conditional styling, `aria-current` for active tab — good accessibility. | OK | — |
| 12 | **No JSDoc on exported `ClassTabs`**. | Low | F-SA-B09-005 |

**Verdict**: Clean, correct navigation component.

---

### File 15: `curriculum-accordion.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 44–55 | **`formatDueDate` — duplicate**: Identical implementation in `student-curriculum-view.tsx` (L106–117). Should be a shared utility. | Low | F-SA-B09-018 |
| 87–151 | Lesson items rendered inside `<Link>` — correct accessible navigation pattern (unlike the `<li onClick>` in `student-curriculum-view.tsx`). | OK | — |
| 102–113 | Assignment badge with due date — good UX. | OK | — |
| 117–131 | Completion count badge and status icon — correct conditional rendering. | OK | — |
| 133 | **`onClick` with `e.preventDefault()` on AssignButton container**: Correct pattern to prevent Link navigation when clicking the assign action. | OK | — |
| 11–26, 28–34, 36–42 | Local interfaces — but these are internal to the component/feature and used to type props received from parent. Acceptable given the current architecture (no shared types layer for component-specific data shapes). | Info | — |
| 57–63 | **No JSDoc on exported `CurriculumAccordion`**. | Low | F-SA-B09-005 |

---

### File 16: `curriculum-with-data.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 48–81 | Fetches completions and assignments via `Promise.allSettled` — correct pattern for independent parallel fetches. | OK | — |
| 73–76 | **Silent catch**: Errors are swallowed. The comment explains the fallback behavior gracefully ("badges just won't show counts"), but unlogged errors hinder debugging. | Low | F-SA-B09-002 |
| 83–90 | Enriches units with `completionCount` and `assignment` data — clean data merging pattern. | OK | — |
| 92–102 | `handleAssignmentChange` — optimistic state update with immutable Map copy. | OK | — |
| 43 | **No JSDoc on exported `CurriculumWithData`**. | Low | F-SA-B09-005 |
| 7–15, 17–23, 25–29, 31–34, 36–41 | Inline types — shared with `curriculum-accordion.tsx` (partial duplication). | Medium | F-SA-B09-001 |

---

### File 17: `join-code-panel.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 84–302 | Well-structured component with i18n, accessibility, and authorization-aware rendering. | OK | — |
| 112–118 | **Locale detection from `document.documentElement.lang`**: Falls back to `"en"` when `document` is undefined (SSR safety). Correct pattern. | OK | — |
| 128–143 | `handleRevealToggle` — gated by `isOwner` and `internalStatus === "ready"`. Good authorization-aware UI. | OK | — |
| 145–168 | `handleCopy` — uses clipboard utility; also owner-gated. Logs analytics event with `track()`. | OK | — |
| 170–184 | **Keyboard shortcut `Shift+C`**: Custom keyboard shortcut on the Card container. This could conflict with assistive technology shortcuts or browser extensions. The `event.preventDefault()` mitigates native conflicts, but the scope (entire Card) means focus could be anywhere inside. | Low | F-SA-B09-019 |
| 196–202 | Non-owner sees locked/unauthorized message — correct access control in the UI. | OK | — |
| 289–301 | `aria-live="polite"` region for announcements and `aria-pressed` on reveal toggle — good accessibility. | OK | — |
| 104–110 | `useEffect` syncs internal status with props — correct pattern. | OK | — |
| 186–192 | Cleanup effect for copy-reset timeout — good. | OK | — |
| 84 | **No JSDoc on exported `JoinCodePanel`**. | Low | F-SA-B09-005 |
| 35–69 | i18n `translations` object with `en`/`th` — complete and well-organized. | OK | — |

---

### File 18: `class-progress-card.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 102–276 | Well-structured dashboard widget with loading, error, empty, and data states. | OK | — |
| 107–139 | `fetchData` — uses `new URL` with `window.location.origin` (no hardcoded base). `credentials: "include"` for cookie auth. Good. | OK | — |
| 112 | Uses `/api/teachers/dashboard` with optional `?refresh=true` param. | OK | — |
| 122–126 | Handles 401 with user-facing session-expired message — good. | OK | — |
| 131 | Client-logger error with structured key — good observability. | OK | — |
| 145–147 | Refresh handler — correct. | OK | — |
| 164–174 | Refresh button with spinning icon — good UX for loading state. | OK | — |
| 192–207 | Error state with retry button and i18n text — good. | OK | — |
| 210–224 | Empty state with motivational message — good. | OK | — |
| 69–86 | `DualText` component for i18n — clean pattern used across the batch. | OK | — |
| 102 | **No JSDoc on exported `ClassProgressCard`**. | Low | F-SA-B09-005 |
| 34–67 | `TEXT` constant with full i18n coverage — good. | OK | — |

---

### File 19: `intervention-alerts-widget.test.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–413 | Comprehensive test file. | OK | — |
| 7–8 | Mocks `global.fetch` with `vi.fn()` — standard Vitest pattern. | OK | — |
| 79–85 | **Test: "renders nothing when no classes are provided"** — correct assertion for `null` return. | OK | — |
| 87–100 | **Test: "renders loading state on initial load"** — mocks fetch with never-resolving promise. Skeleton detection at L96–99 uses `screen.getAllByRole('generic')` with className filter on `'animate-pulse'`. This is **fragile**: `getAllByRole('generic')` matches all generic elements (divs, spans, etc.), and the className check may falsely match unrelated elements in certain rendering contexts. A more precise selector (`container.querySelector`) or a test ID would be more robust. | Low | F-SA-B09-020 |
| 102–125 | **Test: "fetches and displays alerts successfully"** — correct mock response and assertions. | OK | — |
| 127–149 | **Test: "displays empty state when no alerts"** — correct empty array response handling. | OK | — |
| 152–168 | **Test: "displays error state on fetch failure"** — tests `role="alert"` and retry button. | OK | — |
| 171–188 | **Test: "handles 401 unauthorized error"** — correct message assertion. | OK | — |
| 191–208 | **Test: "handles 403 forbidden error"** — correct message assertion. | OK | — |
| 211–256 | **Test: "allows manual refresh"** — tests two sequential fetch calls, verifies `refresh=true` in URL. Good coverage of refresh flow. | OK | — |
| 258–306 | **Test: "allows class selection change"** — tests combobox interaction and second class fetch. Good. | OK | — |
| 308–329 | **Test: "displays alert severity badges correctly"** — correct. | OK | — |
| 331–353 | **Test: "displays weak standards with truncation"** — verifies `+1 more` text. Good edge case. | OK | — |
| 355–380 | **Test: "makes alert rows clickable with correct href"** — uses `screen.getByRole('button', ...).closest('a')` to find the link. This is **fragile** because the component renders a `<Link>` (which is an `<a>` element) with `role="button"`, and the test depends on the DOM hierarchy. If the component changes its wrapping element, this test silently fails (expectation at L376 would be null). | Low | F-SA-B09-020 |
| 382–412 | **Test: "respects display limit and shows view all link"** — good test with 10 generated alerts. | OK | — |
| 75–77 | `beforeEach` clears all mocks — correct. | OK | — |

**Verdict**: Excellent test coverage (12 test cases). Two test-selector fragility issues.

---

### File 20: `intervention-alerts-widget.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 240–525 | Main widget component with comprehensive state management. | OK | — |
| 252–328 | `fetchAlerts` — correctly handles 401, 403, HTTP errors. Includes latency telemetry (L294–297) and impression tracking (L300–311) — good observability. | OK | — |
| 25 | `DISPLAY_LIMIT = 5` — constant for pagination. | OK | — |
| 26 | `AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000` — auto-refresh. | OK | — |
| 331–333 | Initial fetch effect — correct. | OK | — |
| 336–342 | **Auto-refresh interval**: Creates interval that calls `fetchAlses(false)` every 5 minutes. The effect depends on `fetchAlerts` which changes when `selectedClassId` changes — React runs cleanup (clearInterval) before creating a new interval. | OK | — |
| 336–342 | **Potential stale closure**: If `fetchAlerts` is recreated due to state changes not related to `selectedClassId`, the old interval is correctly torn down. The `useCallback` with `[selectedClassId]` dependency ensures this. | OK | — |
| 370–372 | Returns `null` when no classes — consistent with test at L79–85 of the test file. | OK | — |
| 394–418 | Class selector (`Select`) and refresh button — well-placed in card header. | OK | — |
| 424–438 | Skeleton loading state with `aria-live="polite"` — good. | OK | — |
| 442–461 | Error state with `role="alert"` and retry button — good. | OK | — |
| 464–492 | Empty state with Link to class analytics — good. | OK | — |
| 496–519 | Alerts list using `AlertRow` sub-component with "view all" link when `totalAlerts > DISPLAY_LIMIT`. | OK | — |
| 166–238 | `AlertRow` sub-component — well-structured with severity badge, student initials avatar, weak standards display (truncated at 2), and relative time. Uses `Link` with `role="button"` — accessible. | OK | — |
| 61–64 | Props interface well-typed. | OK | — |
| 240–243 | **No JSDoc on exported `InterventionAlertsWidget`**. | Low | F-SA-B09-005 |

---

## Cross-Cutting Findings

| ID | Finding | Affected Files | Severity |
|----|---------|----------------|----------|
| F-SA-B09-001 | **Inline type definitions**: Local interfaces for API response shapes, props, and internal data are defined per-file instead of in a shared types package. Leads to type drift and maintenance burden. | 1, 3, 5, 6, 7, 8, 9, 12, 16 | Medium |
| F-SA-B09-002 | **Silent catch on non-critical fetch**: Secondary/non-essential API calls are wrapped in try/catch with empty blocks — no logging, no user feedback. | 1, 16 | Low |
| F-SA-B09-003 | **Non-interactive element with click handler**: `<li>` and `<TableRow>` elements used as click targets for navigation without proper focus management or keyboard handling. | 1, 6 | Medium |
| F-SA-B09-004 | **Non-focusable tooltip trigger**: Tooltip wrapping `<span>` elements that are not keyboard-accessible. | 1 | Low |
| F-SA-B09-005 | **Missing JSDoc on exported components**: Exported components lack required JSDoc descriptions per AGENTS.md standard. | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20 | Low |
| F-SA-B09-006 | **Misleading error vs. empty-state messaging**: Components conflate "API fetch failed" with "no data available", showing empty-state messaging that could be confusing when the system is broken. | 3 | Low |
| F-SA-B09-007 | **Duplicated utility functions**: `getScoreColorVariant`, `formatTime`, and `getSortIcon` are defined identically across 4 analytics files. Should be extracted to `lib/utils/`. | 5, 6, 7, 8 | Medium |
| F-SA-B09-008 | **Ambiguous field naming**: `averageScore` used with `%` suffix while both `averageScore` and `averageScorePercentage` exist in the type. | 5 | Low |
| F-SA-B09-009 | **`<Button>` + `router.push` for navigation instead of `<Link>`**: Navigation actions should use `<Link>` for accessibility (right-click, open in new tab) and smaller client JS bundle. | 6, 8 | Low |
| F-SA-B09-010 | **`string` typed parameter instead of union type**: `getCompletionStatusBadge` accepts `string` instead of the specific completion-status union, losing compile-time exhaustiveness checking. | 7 | Low |
| F-SA-B09-011 | **Raw enum value shown as UI text**: `data.summary.colorCode` ("blue", "green", etc.) displayed directly instead of a human-readable label. | 7 | Low |
| F-SA-B09-012 | **Missing `classId` in API call**: `student-lesson-detail-analytics.tsx` fetches lesson analytics without including `classId` in the request. If the server does not independently verify class membership, this could allow cross-class student data access. | 8 | High |
| F-SA-B09-013 | **Fragile API response shape assumption**: Components assume `data.data` property without a typed contract shared with the API route. | 9 | Low |
| F-SA-B09-014 | **Missing error handling on mutations**: `class-detail-header.tsx` and `class-roster.tsx` have no `catch` blocks on destructive operations (PATCH, DELETE). If the API rejects the request, the user receives no feedback. | 10, 12 | Medium |
| F-SA-B09-015 | **Silent catch on primary data fetches**: Components swallow fetch errors with empty catch blocks and no error state management. | 11, 12 | Medium |
| F-SA-B09-016 | **`null` return instead of empty state**: `ClassInterventionSummary` returns `null` when no data is available, leaving the page layout empty without explanation. | 11 | Low |
| F-SA-B09-017 | **Optimistic update without rollback**: `class-roster.tsx` optimistically removes a student from local state before the server confirms success. No rollback is performed if the server rejects the deletion. | 12 | Medium |
| F-SA-B09-018 | **Duplicated `formatDueDate`**: Identical implementation in student and teacher curriculum views. | 1, 15 | Low |
| F-SA-B09-019 | **Custom keyboard shortcut on container**: `Shift+C` handler on entire Card container could conflict with assistive technology. | 17 | Low |
| F-SA-B09-020 | **Fragile test selectors**: Skeleton detection and link lookup use DOM-traversal tricks (`closest('a')`, `getAllByRole('generic')` with className filter) instead of more precise queries. | 19 | Low |

---

## Summary

| Metric | Count |
|--------|-------|
| Files reviewed | 20/20 |
| High severity findings | 1 (F-SA-B09-012) |
| Medium severity findings | 11 |
| Low severity findings | 12 |
| Info / OK observations | multiple |

### Most Significant Finding

**F-SA-B09-012 (High)**: `student-lesson-detail-analytics.tsx` fetches from `/api/students/${studentId}/lessons/${lessonId}/analytics` without including `classId` in the request. The component receives `classId` as a prop but does not pass it to the API. If the API route does not perform an independent class-membership check (relying only on the requesting user's JWT/session roles), this could allow a teacher to view lesson analytics for students in other teachers' classes by simply changing the `studentId` parameter. The API route should be reviewed to confirm it verifies that the student belongs to a class the requesting teacher owns.

### Strengths

- All components correctly use the `'use client'` directive only when hooks or browser APIs are needed.
- Analytics components consistently handle loading, error, and empty states.
- `intervention-alerts-widget` has excellent test coverage (12 cases) including edge cases (401, 403, class switching, truncation, display limits).
- `join-code-panel.tsx` is well-constructed with i18n, accessibility (aria-live, aria-pressed, sr-only), and explicit authorization gating.
- `class-progress-card.tsx` and `intervention-alerts-widget.tsx` demonstrate good observability patterns with latency tracking and impression logging.
- No direct provider SDK usage; all data access goes through route handlers.
- No bypass of auth/storage/AI adapters.
- Components consistently delegate authorization to the API layer (defense-in-depth).

### Limitations

- This review covers component files only — corresponding API routes are not reviewed. Several findings (F-SA-B09-012 in particular) depend on the API route's authorization behavior.
- Inline types (F-SA-B09-001) are a codebase-wide pattern; transitioning to shared types would require a larger refactoring track.
- No integration tests exist for these components — they rely on mocked fetch in unit tests.
- The `classId`/`studentId` sourcing chain from URL params through parent components was not traced; findings assume the props could originate from untrusted sources.
- Dynamic analysis (runtime behavior, actual API contracts) was not performed.
