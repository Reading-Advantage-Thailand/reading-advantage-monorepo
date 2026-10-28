# Review Report: Primary UX Rework, Phase 3 (teacher screens)

Date: 2026-10-05. Reviewer: a separate session (Fable), not the implementer.
Range: `f3a1e5e9a..571670430` on `primary/lane-c-ux-rework` (10 commits, 75 files, +4,693 / -3,095).

## Summary
Phase 3 does what the plan asks. The code is safe for the tenant and ready for Phase 4 after two
Medium fixes (applied in this review). No Critical or High finding.

## Verification Checks
- [x] **Plan Compliance**: Yes. Owner decisions (Thai font first, `th` default locale, no Google),
  the dashboard with `getTeacherHome`, one student list on the class page, teacher assignments,
  reports, student progress, my-students, and game-challenges are all in the range.
- [x] **Style Compliance**: Pass. Every new export has a JSDoc. No business logic in pages:
  `getTeacherHome` lives in `@reading-advantage/domain/primary-home` with `assertCan("class:list")`,
  a school filter on `classrooms.school_id`, and class-id filters for the roster, assignment, and
  activity reads (`unscoped` with a reason string; `tenant-coverage` passes).
- [x] **New Tests**: Yes. 9 new test files (dashboard page, reports page, class page, class tool
  pages, my-classes, my-students, teacher assignments, teacher reports, default locale, domain
  `primary-teacher-home`).
- [x] **Test Coverage**: Yes for the new screens and the domain function. The default-locale test
  runs the real proxy.
- [x] **Test Results**: Passed. Primary full suite on the Phase 3 head: 1,098 tests pass in 173 files (one file failed only because the reviewer was editing `app-layout.tsx` for Phase 4 while the run read it; it passes on re-run). Domain `primary-teacher-home` and `tenant-coverage`: 20 pass. `tsc`: 0 errors.
- [ ] **Browser Console Errors**: Skipped. No dev server or browser runs in this session (owner
  instruction), and Kimi WebBridge is not running.
- [ ] **Network Errors**: Skipped (same reason).
- [ ] **Visual Check**: Skipped. The Lane C gate (vision sweep at 3 widths) covers it.
- [x] **Graph Caller Check**: Pass by inspection. Every changed export is additive (`ReportPanels`
  and `CEFRLevels` `audience?`, `LiveRoster` and `ClassLoginPanel` slot props,
  `StudentUnenrollmentButton` `ariaLabel?`/`className?`, `EnhancedClassRoster` `classroomId?`,
  `searchParams?` on two pages). `graph.db` indexes the main checkout, not this lane, so
  `build-graph callers` was not run.

## Findings

### Medium — Sidebar link to a page that does not exist (fixed)
- **File**: `apps/primary-advantage/configs/teacher-page-config.ts`
- **Context**: "Student progress" linked `/teacher/student-progress`, which has only the `[id]`
  page. A teacher who taps the link gets a 404 page. The plan listed it as an open item.
- **Fix**: the item is removed (student progress opens from the reports, the class page, and the
  dashboard). New test `configs/__tests__/teacher-page-config.test.ts` checks that every teacher
  tab and sidebar href has a `page.tsx`.

### Medium — Assignments show "no classes" when the class list fails to load (fixed)
- **File**: `apps/primary-advantage/components/teacher/assignments.tsx`
- **Context**: `init()` set `classrooms = []` on a fetch error, so a network or server failure
  showed the empty state ("You have no classes yet") with a link to My Classes, not an error.
- **Fix**: a failed class read sets `loadError`; the retry button reloads the step that failed
  (classes, or the assignments of the open class). Test added in `teacher-assignments.test.tsx`.

### Low — Class page "Settings" link opens My Classes without the edit dialog
- **File**: `apps/primary-advantage/components/teacher/classroom-navigation.tsx` (L55)
- **Context**: the link is `/teacher/my-classes?edit=<id>`, but `my-classes.tsx` never reads the
  query (this predates Phase 3). The teacher lands on the class table and must open the menu.
- **Suggestion**: read `edit` with `useSearchParams` in My Classes and open the edit dialog, or
  drop the query. Phase 4.

### Low — Actions with no result message
- `my-classes.tsx` L296: the "Archive" menu item has no handler (predates Phase 3).
- `assignment-dashboard.tsx` L140: a failed "remove students" only logs to the console.
- `my-students.tsx` L118-126: a reset that returns a status other than 200 or 400 closes the
  dialog with no toast.
- **Suggestion**: Phase 4 "states on every screen": a toast on failure, and either an archive
  handler or no archive item.

### Low — English text outside the message files
- `enrollment-management.tsx` L100, L137, L152, L172, L191, L231, L257-258 (toasts, the search
  placeholder, the empty text); `student-unenrollment-button.tsx` "Unenroll" (predates Phase 3).
- **Suggestion**: Phase 4 i18n pass.

### Note — not findings
- `TeacherClass.xp` and `TeacherStudents.xpColumn` are "XP" in Thai too; that is the common term.
- The Thai, Vietnamese, and Chinese message files have the same key set as `en.json` (checked
  with a script: 0 missing, 0 extra).
- No `googleapis` import remains; the lockfile change is the dependency removal only.
