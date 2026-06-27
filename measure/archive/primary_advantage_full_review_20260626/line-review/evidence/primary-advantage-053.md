# Line Review Evidence: primary-advantage-053

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-053
Files assigned: 5
Lines assigned: 1175

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/student-assignment-table.tsx` | 1-815 | reviewed | 6 |
| `apps/primary-advantage/components/switchers/locale-switcher.tsx` | 1-70 | reviewed | 0 |
| `apps/primary-advantage/components/switchers/theme-switcher-toggle.tsx` | 1-27 | reviewed | 0 |
| `apps/primary-advantage/components/system/create-school-dialog.tsx` | 1-54 | reviewed | 1 |
| `apps/primary-advantage/components/system/create-school-form.tsx` | 1-209 | reviewed | 4 |

## Findings

### LR-primary-advantage-053-001 — AssignmentDetailDialog compares status as number (0,1,2) but data model uses string enum

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/student-assignment-table.tsx:561-588`
- Evidence: `AssignmentDetailDialog` defines `getStatusIcon(status: number)` and `getStatusText(status: number)` using numeric `case 0`, `case 1`, `case 2`. However, `AssignmentStatusValue` at line 44 is `"NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"`, and `selectedAssignment.status` is typed as this string union. Passing a string like `"NOT_STARTED"` to a function expecting `number` will never match the numeric switch cases, so the dialog always shows the default "⏳ / Not Finished" regardless of actual status. This is a fork-specific regression: the outer column cell at lines 314-342 correctly switches on string values.
- Impact: Mobile detail dialog always displays "Not Finished" status regardless of actual assignment state — user sees incorrect information.
- Recommendation: Change `getStatusIcon(status: number)` and `getStatusText(status: number)` to accept `AssignmentStatusValue` and switch on string values, matching the outer column logic.

### LR-primary-advantage-053-002 — Extensive hardcoded English strings bypassing i18n in student-assignment-table

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/student-assignment-table.tsx:172,179,186,193,281,331,333,337,339,578,580,584,587,601,612,628,651,681`
- Evidence: Commented-out `t(...)` calls replaced with English string literals throughout. Examples: line 172 `text: "Overdue"`, line 179 `text: "Due Today"`, line 281 `Due Date` in header, lines 331-340 status text "Not Finished"/"In Progress"/"Done", lines 601/612/628/651/681 dialog labels. The component already imports `useTranslations` (line 124) and uses `t(...)` in some places but these are commented out.
- Impact: Thai, Chinese, Vietnamese users see English text in the assignment table and mobile dialog. Inconsistent i18n coverage.
- Recommendation: Uncomment and restore `t(...)` calls or add translation keys for all hardcoded strings.

### LR-primary-advantage-053-003 — useDebounce is defined as a custom hook inside the component body

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/student-assignment-table.tsx:143-157`
- Evidence: `useDebounce` is defined as a function containing `useState` and `useEffect` hooks at lines 143-157, but it is declared inside the `StudentAssignmentTable` component body rather than at module scope. React hooks rules require that hooks are called at the top level of a component or custom hook, and the custom hook itself should be defined at module scope. While this technically works because `useDebounce` is called in a stable order at line 159, it creates a new function reference each render and violates conventions. Additionally, there is no `useDebounce` in `packages/ui` or standard hooks.
- Impact: Minor code quality issue; risk of accidental misuse if component is refactored.
- Recommendation: Extract `useDebounce` to `hooks/use-debounce.ts` as a standalone custom hook.

### LR-primary-advantage-053-004 — Status filter sends string "0"/"1"/"2" but column filter expects string enum values

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/student-assignment-table.tsx:708-712,351-354`
- Evidence: The `<select>` filter at lines 708-712 sends values `"0"`, `"1"`, `"2"` (matching the status text mapping). But the column's `filterFn` at lines 351-354 does `row.getValue(columnId) === filterValue`. The actual `status` column value is a string like `"NOT_STARTED"`, so `row.getValue("status") === "0"` will always be false. The filter dropdown will never actually filter rows on the client side.
- Impact: Status filter dropdown is non-functional — selecting "Not Finished" etc. does not filter the table.
- Recommendation: Either align filter values with the string enum values (`"NOT_STARTED"`, `"IN_PROGRESS"`, `"COMPLETED"`) or add a mapping layer in the filter function.

### LR-primary-advantage-053-005 — useEffect missing `fetchAssignment` in dependency array

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/student-assignment-table.tsx:479-498`
- Evidence: The `useEffect` at line 479 calls `fetchAssignment` (defined at line 415) but the dependency array at lines 492-498 includes `user?.id`, `currentPage`, `statusFilter`, `dueDateFilter`, `debouncedSearchQuery` but not `fetchAssignment` itself. Since `fetchAssignment` is redefined every render (it captures state in closure), the effect may use a stale closure. ESLint `react-hooks/exhaustive-deps` would flag this.
- Impact: Potential stale-closure bug where fetch uses outdated filter values. In practice the other deps cover most cases, but it is a correctness concern.
- Recommendation: Wrap `fetchAssignment` in `useCallback` or move it inside the effect, and add it to the dependency array.

### LR-primary-advantage-053-006 — AssignmentDetailDialog component redefined on every render inside parent

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/student-assignment-table.tsx:554-688`
- Evidence: `AssignmentDetailDialog` is defined as a function component at line 554 inside the body of `StudentAssignmentTable`. It is re-created on every render, causing React to unmount/remount the dialog DOM tree each time the parent re-renders (e.g., during data fetching at line 481). This wastes performance and can lose dialog internal state.
- Impact: Minor performance issue; dialog may flicker or lose scroll position during parent re-renders.
- Recommendation: Extract `AssignmentDetailDialog` as a standalone component or memoize with `React.memo`.

### LR-primary-advantage-053-007 — create-school-dialog has hardcoded English text without i18n

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/system/create-school-dialog.tsx:39,44,46`
- Evidence: Line 39: `"Create School"` button text, line 44: `"Create New School"` dialog title, lines 46-47: `"Add a new school to the system..."` description. None of these use `useTranslations`. The component has no i18n imports.
- Impact: Thai/Chinese/Vietnamese users see English in the school creation dialog.
- Recommendation: Add `useTranslations` and replace hardcoded strings with translation keys.

### LR-primary-advantage-053-008 — create-school-form has hardcoded English validation messages, placeholders, and labels

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/system/create-school-form.tsx:25-43,89,94-95,101-105,122,126,131-133,150,155-157,175,180-182,196,203`
- Evidence: Zod validation messages (lines 25-43) are English strings. Toast messages at lines 89, 94-95, 101-105 are English. Form labels "School Name", "Contact Name", "Contact Email" (lines 122, 150, 175) and placeholders (lines 126, 150, 175) and descriptions (lines 131-133, 155-157, 180-182) are all English. Button text "Cancel" (line 196) and "Create School" (line 203) are English.
- Impact: Non-English users see English throughout the school creation form.
- Recommendation: Use `useTranslations` for labels/placeholders/descriptions and i18n-aware Zod messages, or at minimum the toast messages.

### LR-primary-advantage-053-009 — create-school-form POSTs to /api/schools with no CSRF or auth token visible

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/system/create-school-form.tsx:79-85`
- Evidence: The form submits via `fetch("/api/schools", { method: "POST", ... })` without including any CSRF token or authorization header. The request relies solely on cookie-based session auth. If the `/api/schools` endpoint does not verify CSRF tokens, a cross-site request could create schools on behalf of an authenticated admin.
- Impact: Potential CSRF vulnerability allowing unauthorized school creation if server-side CSRF protection is absent.
- Recommendation: Verify that `/api/schools` enforces CSRF protection (e.g., SameSite cookies, CSRF token). If not, add CSRF token to the request headers.

### LR-primary-advantage-053-010 — create-school-form response.json() called twice without guard

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/system/create-school-form.tsx:88,92`
- Evidence: Line 88 calls `response.json()` to read error data when `!response.ok`, then line 92 calls `response.json()` again for the success path. While these are in separate branches so the double-read doesn't occur at runtime, the pattern is fragile: if the error branch throws before reading (e.g., network error after partial read), the success branch would fail. More critically, if the server returns a non-JSON error body, both calls will throw an unhandled parse error.
- Impact: Minor robustness issue; poor error UX if server returns non-JSON.
- Recommendation: Store `response.json()` result in a variable and use a single parse with try/catch.

## No-Finding Notes

- `apps/primary-advantage/components/switchers/locale-switcher.tsx`: reviewed line-by-line; no findings. Clean i18n implementation using `next-intl` routing, `useRouter`/`usePathname` for locale switching, and `useTranslations` for labels. Follows the standard locale-switcher pattern.

- `apps/primary-advantage/components/switchers/theme-switcher-toggle.tsx`: reviewed line-by-line; no findings. Clean, minimal theme toggle using `next-themes` with proper `useCallback`, dark/light CSS class toggling, and accessible sr-only label.
