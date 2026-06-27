# Line Review Evidence: primary-advantage-062

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-062
Files assigned: 3
Lines assigned: 1101

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/teacher/my-students.tsx` | 1-426 | reviewed | 5 |
| `apps/primary-advantage/components/teacher/reports.tsx` | 1-436 | reviewed | 6 |
| `apps/primary-advantage/components/teacher/student-cefr-level-setter.tsx` | 1-239 | reviewed | 3 |

## Findings

### LR-062-001 — Hardcoded CEFR reset value bypasses current level

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/my-students.tsx:128`
- Evidence: `handleResetProgress` sends `{ cefrLevel: "A0-" }` to PATCH `/api/users/${selectedStudentId}`. The CEFR level is hardcoded rather than querying or confirming the intended reset level. This means a reset always forces "A0-" regardless of the student's actual starting state or teacher intent.
- Impact: Teacher cannot reset XP/level to a custom value; all students are forced to "A0-" on reset. In a primary-student context this may mask a student who was assessed at a higher level.
- Recommendation: Add a confirmation prompt or use a configurable reset level.

### LR-062-002 — Unused type `MyStudentProps`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/my-students.tsx:72-74`
- Evidence: `type MyStudentProps = { matchedStudents: Student[] }` is declared but never referenced. The component `MyStudents` takes no props.
- Impact: Dead code; suggests a previous refactor removed the prop without cleaning up the type.
- Recommendation: Remove the unused type in a cleanup pass.

### LR-062-003 — Misleading variable name `payment` for student row data

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/my-students.tsx:247`
- Evidence: `const payment = row.original;` names the student row data "payment", a leftover from a template or copy-paste from a billing component. The same pattern appears at line 260 (`payment.id`) and line 269 (`payment.id`).
- Impact: Reduces readability and could mislead future developers into thinking this is a payment/billing domain.
- Recommendation: Rename to `student` in a cleanup pass.

### LR-062-004 — CSS class typo `captoliza`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/my-students.tsx:171,185`
- Evidence: `className="captoliza ml-4"` at line 171 and `className="captoliza"` at line 185. The intended class is `capitalize`. The Tailwind class `captoliza` is not a valid utility and will have no effect.
- Impact: Student name and email display will not be capitalised as intended.
- Recommendation: Fix to `capitalize`.

### LR-062-005 — `console.error` for error logging in production component

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/my-students.tsx:109,147`
- Evidence: `console.error("Error fetching students:", error)` and `console.error("Error resetting progress:", error)` use raw console output. Per AGENTS.md, structured logging is preferred.
- Impact: No structured metadata for error observability.
- Recommendation: Migrate to structured logger in a later pass.

### LR-062-006 — Hardcoded English strings bypass i18n

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/reports.tsx:132,148,157,166,173,181,201,406,421,429`
- Evidence: Lines 132, 148, 157, 166, 181 use raw `"Name"`, `"XP"`, `"Level"`, `"Last Activity"`, `"Actions"` instead of i18n translation keys. Line 173 uses `"No Activity"`. Line 201 uses `"View Details"`. Lines 406, 421, 429 use `"Empty"`, `"Previous"`, `"Next"`. The `useTranslations` hook is not imported or used.
- Impact: Reports page is English-only; will not render correctly for Thai, Chinese, Vietnamese, or Taiwanese locales. This directly undermines the multi-language product goal.
- Recommendation: Add `useTranslations` and replace all hardcoded strings with translation keys.

### LR-062-007 — Reports table is hardcoded to empty data

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/reports.tsx:229`
- Evidence: `data: []` is passed directly to `useReactTable`. The table will never display any rows. All commented-out data fetching (lines 247-267) was disabled but not replaced. The `fetchStudentInClass` function (line 269) is defined but never called.
- Impact: The teacher Reports page is completely non-functional — it always shows "Empty". This is a critical feature gap for teacher workflows.
- Recommendation: Either wire up actual data fetching or clearly mark the page as WIP/disabled.

### LR-062-008 — Dead `payment` variable name in reports columns

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/reports.tsx:184,215`
- Evidence: `const payment = row.original;` at lines 184 and 215 names student data "payment". Same template leftover as in my-students.tsx.
- Impact: Reduces code clarity.
- Recommendation: Rename to `student`.

### LR-062-009 — `process.env.NEXT_PUBLIC_BASE_URL` used for client-side navigation

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/reports.tsx:197`
- Evidence: `router.push(\`${process.env.NEXT_PUBLIC_BASE_URL}/teacher/student-progress/${payment.id}\`)` constructs an absolute URL using an environment variable for an in-app navigation. The Next.js `router.push()` accepts relative paths; using the env var introduces a runtime dependency on correct env configuration and bypasses locale routing.
- Impact: If `NEXT_PUBLIC_BASE_URL` is misconfigured or missing, navigation breaks. Locale prefixing may be skipped.
- Recommendation: Use relative path: `router.push(\`/teacher/student-progress/${payment.id}\`)`.

### LR-062-010 — CSS class typo `captoliza` in reports

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/reports.tsx:139,151,160,170`
- Evidence: `className="captoliza"` appears at lines 139, 151, 160, 170. Same typo as in my-students.tsx.
- Impact: No capitalisation applied to student names, XP, level, or last activity display.
- Recommendation: Fix to `capitalize`.

### LR-062-011 — Unused `calculateAverageLevel` and `fetchXpPerStudents` functions

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/reports.tsx:103-119,287-302`
- Evidence: `calculateAverageLevel` (line 103) and `fetchXpPerStudents` (line 287) are defined but never called. The XP state (`xpData`, line 92) is set but never rendered.
- Impact: Dead code; the XP average display was commented out (lines 352-361).
- Recommendation: Remove in cleanup pass.

### LR-062-012 — CEFR level descriptions hardcoded in English, not i18n

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/student-cefr-level-setter.tsx:34-98`
- Evidence: The `CEFR_LEVELS` array contains 15 entries with hardcoded English `label` and `description` strings (e.g., `"A0- (Beginner)"`, `"Pre-A0, very basic"`). These are displayed directly in the UI via the `SelectItem` component (lines 191-200) and the current level info panel (lines 175-181). The component uses `useTranslations` for button/dialog labels but not for CEFR level names.
- Impact: Teachers with non-English locales will see English CEFR labels. For a primary-student app targeting Thai, Chinese, Vietnamese, and Taiwanese markets, this is a localisation gap.
- Recommendation: Move CEFR level labels and descriptions to i18n message files.

### LR-062-013 — CEFR setter does not sync `selectedLevel` when `currentCefrLevel` prop changes

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/student-cefr-level-setter.tsx:107`
- Evidence: `const [selectedLevel, setSelectedLevel] = useState(currentCefrLevel)` initialises the state from the prop only on first render. If the parent component re-renders with a new `currentCefrLevel` (e.g., after another teacher changes the level), the dialog will show a stale selected level.
- Impact: Teacher could overwrite a recently changed CEFR level without seeing the current value.
- Recommendation: Add a `useEffect` to sync `selectedLevel` when `currentCefrLevel` changes, or reset on dialog open.

### LR-062-014 — Generic error message "FAILED" thrown without context

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/student-cefr-level-setter.tsx:134`
- Evidence: `throw new Error("FAILED")` is thrown when the PATCH response is not ok. The actual HTTP status code and response body are discarded.
- Impact: Error toast shows a generic message; difficult to debug in production.
- Recommendation: Include status code in the error or log the response body.

## No-Finding Notes

All three files were reviewed line-by-line. Findings are documented above. Remaining lines contain standard React component boilerplate, UI component composition, and table rendering patterns with no additional material issues.
