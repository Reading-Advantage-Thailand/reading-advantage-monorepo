# Line Review Evidence: primary-advantage-059

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-059
Files assigned: 2
Lines assigned: 992

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/components/teacher/enhanced-class-roster.tsx | 1-689 | reviewed | 5 |
| apps/primary-advantage/components/teacher/enrollment-demo.tsx | 1-303 | reviewed | 4 |

## Findings

### LR-primary-advantage-059-001 — Hardcoded English strings break i18n in active roster JSX

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:484`, `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:567`
- Evidence: The component uses `useTranslations("Teacher.EnhancedClassRoster")` and routes nearly all copy through `t(...)`, but line 484 renders `student.display_name || "No name"` as a raw English literal (the disabled list-view code at line 384 correctly used `t("labels.noName")`), and line 567 renders a hardcoded `Reset Progress` `DropdownMenuItem` label instead of `t(...)` (e.g. the `t("actions.resetProgress")` key already used at line 682).
- Impact: Non-English locales see untranslated UI text in the live student roster, an i18n regression introduced when the active layout was rewritten from the now-commented version.
- Recommendation: Replace the raw literals with the existing translation keys (`t("labels.noName")`, a reset-progress action key) under a Primary-specific UI-polish remediation track.

### LR-primary-advantage-059-002 — Large commented-out dead-code blocks left in source

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:86`, `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:99`, `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:276-365`, `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:371-470`
- Evidence: A `ViewMode` type and `viewMode` state are commented out (lines 86, 99), an entire `StudentCard` grid component is commented out (lines 276-365), and a large alternate `StudentRow` layout is commented out inside the active component (lines 371-470). All are dead and unmaintained.
- Impact: Dead code obscures the real render path, increases review/maintenance cost, and risks future edits to stale snippets. The commented snippets also contain hardcoded English ("View Progress", "Reset Progress", "No name") that diverge from the live i18n keys.
- Recommendation: Delete the commented blocks (and the unused `viewMode`/`ViewMode` scaffolding) in a UI cleanup track.

### LR-primary-advantage-059-003 — useEffect omits fetchClassroomData from dependency array

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:139-141`
- Evidence: The initial-fetch `useEffect` calls `fetchClassroomData()` but lists only `[classroomId]` as dependencies, omitting the `fetchClassroomData` closure (react-hooks/exhaustive-deps). `fetchClassroomData` is recreated each render and closes over `t`/state setters.
- Impact: Lint suppression / stale-closure risk; mirrors a common pattern copied from the Reading Advantage roster components rather than a Primary-specific defect.
- Recommendation: Wrap `fetchClassroomData` in `useCallback` (or inline it) and include it in the dependency array.

### LR-primary-advantage-059-004 — Unused lucide-react icon imports

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:37-53`
- Evidence: The import block pulls in icons that are no longer used by the active render path because their usages live only in the commented-out blocks — e.g. `Calendar` (line 43), `UserPlus` (line 47), `Grid3X3` (line 48), `List` (line 49), `Settings` (line 52), and `UserMinus` (line 41). The live JSX uses only a subset (`Users`, `Search`, `MoreVertical`, `TrendingUp`, `GraduationCap`, `Star`, `RotateCcw`, `ChevronLeft`, `Activity`).
- Impact: Unused imports add noise and (depending on lint config) trigger no-unused-vars warnings; they were stranded when the grid/list views were commented out.
- Recommendation: Prune unused icon imports as part of the same UI cleanup.

### LR-primary-advantage-059-005 — Client trusts /api/users PATCH for progress reset without visible tenant/role guard

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:192-223`
- Evidence: `handleResetProgress` issues `PATCH /api/users/${selectedStudentId}` with `{ xp: 0, level: 1, cefrLevel: "A0" }` directly from the client. This is a destructive teacher action against a student record; the component itself performs no authorization and relies entirely on the route handler. For a primary-student app, resetting a child's progress is a sensitive, irreversible operation.
- Impact: If the `/api/users/[id]` route does not enforce teacher-role + same-school/classroom tenant scoping, any authenticated user could reset another student's progress. This file cannot confirm server-side enforcement; it is flagged for verification against the route handler (out of this batch's file scope).
- Recommendation: Confirm `/api/users/[id]` PATCH enforces role + `schoolId`/classroom-membership scoping and audit-logs the reset; add a confirmation that the target student belongs to the acting teacher's classroom.

### LR-primary-advantage-059-006 — Demo component is unreferenced dead code shipped in app source

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:23-303`
- Evidence: `EnrollmentDemo` is the default export of this file, but a repo-wide search for `EnrollmentDemo`/`enrollment-demo` finds no importer anywhere in `apps/primary-advantage`. The component renders a static marketing/demo page ("Student Enrollment System") with mock data.
- Impact: Dead demo code in the production component tree adds maintenance burden and bundle-graph noise, and can confuse reviewers about which enrollment UI is canonical.
- Recommendation: Remove the file (or relocate to a Storybook/docs fixture) in a cleanup track.

### LR-primary-advantage-059-007 — `any`-typed callback parameter

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:42`
- Evidence: `const handleStudentEnrolled = (student: any) => {` uses `any`, defeating TypeScript checking for the enrolled-student payload.
- Impact: Loss of type safety; violates strict-typing conventions. Low real impact because the file is demo-only, but it is a copyable anti-pattern.
- Recommendation: Type the parameter with the shared student/enrollment type (or remove the file per LR-...-006).

### LR-primary-advantage-059-008 — Leftover console.log debug statements

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:43`, `apps/primary-advantage/components/teacher/enrollment-demo.tsx:48`
- Evidence: `console.log("Student enrolled:", student)` (line 43) and `console.log("Student unenrolled:", studentId)` (line 48) remain in the demo handlers.
- Impact: Free-form console logging contradicts the observability/structured-logging guidance in AGENTS.md; harmless in a demo but a copyable pattern.
- Recommendation: Remove the console.log calls (or remove the file per LR-...-006).

### LR-primary-advantage-059-009 — Demo UI is entirely hardcoded English (no i18n)

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:56-300`
- Evidence: Unlike the production roster components, every string here (headings, feature cards, usage instructions, technical features) is hardcoded English with no `useTranslations` usage. If this demo were ever surfaced in-product, it would be unlocalized.
- Impact: Only material if the demo is exposed to users; combined with LR-...-006 (unreferenced) the practical risk is low, but it confirms the file is not production-ready.
- Recommendation: Either localize or delete per LR-...-006.

## No-Finding Notes

- Both files in this batch produced findings; no fully clean files in batch primary-advantage-059.
