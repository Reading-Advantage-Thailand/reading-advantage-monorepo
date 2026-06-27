# Line Review Evidence: primary-advantage-058

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-058
Files assigned: 4
Lines assigned: 1155

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/teacher/class-roster.tsx` | 1-521 | reviewed | 6 |
| `apps/primary-advantage/components/teacher/classroom-navigation.tsx` | 1-274 | reviewed | 0 |
| `apps/primary-advantage/components/teacher/classroom-selector.tsx` | 1-201 | reviewed | 0 |
| `apps/primary-advantage/components/teacher/create-classes.tsx` | 1-159 | reviewed | 1 |

## Findings

### LR-058-001 — Disabled Reset button with no-op onClick

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/class-roster.tsx:510-513`
- Evidence: The "Reset" button at line 510 renders a `variant="destructive"` button inside the Reset Progress dialog. Its onClick handler is commented out (line 512: `// onClick={() => handleResetProgress(selectedStudentId)}`), making the button visually clickable but completely non-functional. The `handleResetProgress` function (lines 109-133) exists and is fully implemented but is never invoked.
- Impact: Teachers see a "Reset" button in the reset-progress dialog but clicking it does nothing. No feedback is given to the user. This is a dead control that will confuse primary-school teachers.
- Recommendation: Restore the onClick handler: `onClick={() => handleResetProgress(selectedStudentId)}`. If the feature is intentionally disabled, add a tooltip or disable the button explicitly.

### LR-058-002 — Commented-out code blocks (dead code)

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/class-roster.tsx:95-97,101,275-299,333-344,346-351,379-420`
- Evidence: Multiple blocks of commented-out code remain throughout the file: unused i18n hooks (lines 95-97), a commented-out `useClassroomStore` import (line 101), commented-out `useEffect` hooks for classroom syncing (lines 275-299), commented-out Select dropdown (lines 333-344), commented-out Header section (lines 346-351), and commented-out button section (lines 379-420).
- Impact: Dead code adds noise, increases cognitive load for maintainers, and may mask intentionally removed functionality. Commented-out code can become stale and diverge from the rest of the codebase.
- Recommendation: Remove all commented-out code blocks. If the Google Classroom sync feature (lines 379-420) or classroom select (lines 333-344) is planned for future use, track it in a feature spec rather than leaving commented-out JSX in production code.

### LR-058-003 — Missing CSRF token on fetch PATCH request

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/class-roster.tsx:111-121`
- Evidence: `handleResetProgress` issues a `PATCH` request to `/api/users/${selectedStudentId}` (line 112-120) without including a CSRF token or any explicit authentication headers. The request relies solely on browser cookie-based auth. While Next.js App Router may provide implicit CSRF protection via same-origin policy, the pattern is inconsistent with secure form submission best practices.
- Impact: Cross-site request forgery attacks could reset student progress if a teacher visits a malicious page while authenticated. The absence of an explicit CSRF token weakens the defense-in-depth posture.
- Recommendation: Include a CSRF token in the request headers or body, consistent with the project's auth adapter patterns. Alternatively, verify that the API route enforces a `SameSite=Strict` cookie policy.

### LR-058-004 — Inconsistent i18n: hardcoded English strings

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/class-roster.tsx:144,156,171,191,199,353,374,465,480,487,498,501,507,514`
- Evidence: Multiple hardcoded English strings appear alongside i18n translations: "Name" (line 144), "Last Activity" (line 156), "Actions" (line 171), "Progress" (line 191), "Reset Progress" (line 199), "Search" (line 353), "Enroll Student" (line 374), "Empty" (line 465), "Previous" (line 480), "Next" (line 487), "Reset Progress" dialog title (line 498), dialog description (line 501), "Cancel" (line 507), "Reset" (line 514). Meanwhile, `classroom-navigation.tsx` and `classroom-selector.tsx` in the same batch use `useTranslations` properly.
- Impact: Primary-school teachers using non-English locales (cn, th, tw, vi) will see mixed English/translated UI, creating a confusing experience for young learners.
- Recommendation: Replace all hardcoded strings with `useTranslations()` calls and add corresponding keys to `messages/*.json` files.

### LR-058-005 — console.error in production code

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/class-roster.tsx:270,315,327`
- Evidence: `console.error` calls appear in `syncStudents` (line 270), `fetchStudentInClass` (line 315), and `handleClassChange` (line 327). These emit unstructured error output to the browser console. The monorepo AGENTS.md requires structured logging.
- Impact: Production errors are not captured in observability systems. Debugging relies on browser console inspection rather than centralized error reporting.
- Recommendation: Replace `console.error` with the project's structured logging utility or remove if errors are already handled by try/catch toast notifications.

### LR-058-006 — CSS class typo "captoliza"

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/class-roster.tsx:150,160`
- Evidence: The CSS class `captoliza` appears on lines 150 and 160. This is likely intended to be `capitalize` (a standard CSS text-transform utility). In Tailwind CSS, `capitalize` is a valid utility class; `captoliza` is not and will have no effect.
- Impact: Student names and last-activity text are not capitalized as intended. The typo results in a silent CSS failure with no visual feedback.
- Recommendation: Replace `captoliza` with `capitalize` in both locations.

## No-Finding Notes

- `apps/primary-advantage/components/teacher/classroom-navigation.tsx`: reviewed line-by-line; no findings. Component uses i18n properly via `useTranslations`, has clean navigation structure, responsive design, and proper clipboard error handling.
- `apps/primary-advantage/components/teacher/classroom-selector.tsx`: reviewed line-by-line; no findings. Component fetches classrooms, renders a responsive grid with loading skeletons, empty state, and proper i18n usage.
