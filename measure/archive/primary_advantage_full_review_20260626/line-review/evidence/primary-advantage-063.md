# Line Review Evidence: primary-advantage-063

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-063
Files assigned: 6
Lines assigned: 1182

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/teacher/student-enrollment-button.tsx` | 1-311 | reviewed | 2 |
| `apps/primary-advantage/components/teacher/student-unenrollment-button.tsx` | 1-150 | reviewed | 2 |
| `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx` | 1-445 | reviewed | 3 |
| `apps/primary-advantage/components/ui/alert-dialog.tsx` | 1-157 | reviewed | 0 |
| `apps/primary-advantage/components/ui/alert.tsx` | 1-66 | reviewed | 0 |
| `apps/primary-advantage/components/ui/avatar.tsx` | 1-53 | reviewed | 0 |

## Findings

### LR-063-001 — Hardcoded English `buttonText` default bypasses i18n in enrollment dialog

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/student-enrollment-button.tsx:51`
- Evidence: The `buttonText` prop defaults to `"Enroll Student"` (hardcoded English), while the fallback on line 177 uses `t("actions.open")`. The translation key `t("title")` is used inside the dialog, but the trigger button text is English-first. If a caller omits the `buttonText` prop and the locale is Thai, the button renders in English.
- Impact: Inconsistent i18n behavior — some strings are translated, others are not. Thai or other non-English locales will show English on the enrollment trigger button.
- Recommendation: Default `buttonText` to an empty string and use `t("actions.open")` unconditionally, or remove the `buttonText` prop entirely in favor of the translation key.

### LR-063-002 — `any`-typed catch block erases error context in enrollment flow

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/student-enrollment-button.tsx:121`
- Evidence: `catch (error: any)` — the catch block accesses `error.message` without type narrowing. While functionally harmless, this is the same `any`-typed catch pattern seen across the Reading Advantage codebase and is inconsistent with TypeScript strictness goals.
- Impact: No runtime risk, but TypeScript `useUnknownInCatchVariables` (or plain `unknown`) would catch mistyped error property access at compile time.
- Recommendation: Change to `catch (error: unknown)` and narrow with `error instanceof Error ? error.message : ...`.

### LR-063-003 — Hardcoded English strings in unenrollment dialog without i18n

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/student-unenrollment-button.tsx:73,97,105,108-123,128,137-143`
- Evidence: Unlike `student-enrollment-button.tsx` which uses `useTranslations("Teacher.StudentEnrollmentButton")`, this component has zero translation keys. Hardcoded strings include: success toast (line 73), button label "Unenroll" (line 97), dialog title "Unenroll Student" (line 105), full confirmation message with bullet points (lines 108-123), "Cancel" (line 128), loading text "Unenrolling..." (line 137), and action button "Unenroll Student" (line 142).
- Impact: Thai or non-English locales will see entirely English unenrollment dialog. This is a direct fork divergence from the enrollment button which is i18n-ready.
- Recommendation: Add `useTranslations("Teacher.StudentUnenrollmentButton")` and replace all hardcoded strings with translation keys, mirroring the pattern in `student-enrollment-button.tsx`.

### LR-063-004 — `any`-typed catch and `studentData` state in teacher progress reports

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:66,145`
- Evidence: Line 66: `const [studentData, setStudentData] = useState<any>(null)` — the fetched student data is entirely untyped, meaning all downstream property accesses (`studentData.activity`, `studentData.xpLogs`) are unchecked. Line 145: `catch (error)` has no type annotation and only logs without user feedback.
- Impact: Schema drift between the API response shape and component usage will not be caught at compile time. Silent error swallowing means the teacher sees a blank area with no indication of failure.
- Recommendation: Define a `StudentData` interface matching the API response shape (with `activity` and `xpLogs` fields) and use it for `useState<StudentData | null>`. Add `toast.error()` in the catch block.

### LR-063-005 — Stale closure risk in `useEffect` calling `fetchStudentData`

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:151-157`
- Evidence: `useEffect(() => { if (selectedStudent) { fetchStudentData(selectedStudent); } ... }, [selectedStudent])` — `fetchStudentData` is defined as a plain `async` function (lines 136-149) without `useCallback` and is not included in the dependency array. The ESLint `react-hooks/exhaustive-deps` rule would flag this. While the function only depends on `setLoading` and `setStudentData` (stable setters), the pattern is fragile — if any non-stable reference is added to the function body in the future, it will silently use a stale closure.
- Impact: Currently safe because the function only uses stable state setters, but the pattern violates hooks rules and will cause subtle bugs if the function body is extended to reference props or state.
- Recommendation: Wrap `fetchStudentData` in `useCallback` and add it to the `useEffect` dependency array, or move the async logic inside the effect.

### LR-063-006 — No teacher-ownership verification before fetching student data

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:139`
- Evidence: The component accepts `currentUser: AuthUser` (line 55) but never uses it for authorization. Line 139 fetches `/api/users/${studentId}/article-records` using a student ID from the `selectedStudent` state, which is derived from the `students` prop. There is no client-side check that `currentUser` is the teacher of the selected student's classroom. The `students` prop is received from the parent page without any verification that the teacher owns those students.
- Impact: If the parent page passes students from a different teacher's classroom (or if the API lacks tenant scoping), a teacher could access another teacher's student data. This is a primary-student data privacy risk — FERPA/COPPA implications for student reading data.
- Recommendation: Verify that the `currentUser` has a teacher role and that the selected student is enrolled in one of the teacher's classrooms before fetching. The server-side API must also enforce this check, but the client-side component should not silently fetch without authorization awareness.

### LR-063-007 — Potential NaN in average XP calculation when student list is empty

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:98-100`
- Evidence: `filteredStudents.reduce((sum, student) => sum + (student.xp || 0), 0) / totalStudents || 0` — when `totalStudents` is 0 (empty classroom or no matches), this evaluates to `0 / 0 = NaN`, then `NaN || 0 = 0`. The `|| 0` fallback works because `NaN` is falsy, but the intermediate `NaN` is a code smell. Additionally, dividing after reduce is unnecessary — `reduce` could compute the average directly with a count.
- Impact: Cosmetic only — `NaN || 0` evaluates to `0` correctly. The stat card displays `0` for average XP in empty classrooms, which is acceptable.
- Recommendation: Guard with `totalStudents > 0 ? ... : 0` for explicit clarity, or compute average inside the reduce.

## No-Finding Notes

- `apps/primary-advantage/components/ui/alert-dialog.tsx`: reviewed line-by-line; no findings. Standard shadcn/ui AlertDialog wrapper around `@radix-ui/react-alert-dialog`. Clean Radix primitive forwarding with `cn()` utility, proper `data-slot` attributes, and correct `buttonVariants` application. No security or type issues.
- `apps/primary-advantage/components/ui/alert.tsx`: reviewed line-by-line; no findings. Standard shadcn/ui Alert component using `class-variance-authority` for variant support. Proper `role="alert"` ARIA attribute, clean variant definitions, and correct `data-slot` usage. No issues.
- `apps/primary-advantage/components/ui/avatar.tsx`: reviewed line-by-line; no findings. Standard shadcn/ui Avatar wrapping `@radix-ui/react-avatar`. Clean primitive forwarding, proper `data-slot` attributes, and correct fallback styling. No issues.
