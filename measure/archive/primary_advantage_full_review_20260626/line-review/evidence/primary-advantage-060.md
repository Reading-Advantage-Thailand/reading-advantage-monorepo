# Line Review Evidence: primary-advantage-060

Reviewer: coder-minimax-m3/primary-advantage-060
Files assigned: 1
Lines assigned: 528

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/teacher/enrollment-management.tsx` | 1-528 | reviewed | 9 |

## Findings

### LR-060-001 — Hardcoded English UI strings (no i18n in this component)

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:244,245,247,269,283,292,293,374,376,402,403,482,497,500,501,504,508,521`
- Evidence: The component renders all user-facing copy as hardcoded English strings rather than calling `useTranslations` from `next-intl`. Examples: header "Student Enrollment" (line 244) and "Manage students in {classroomName}" (line 247); search placeholder "Search students by name or email..." (line 269); section title "Enrolled Students ({count})" (line 283); empty-state copy "No students match your search" / "No students enrolled yet" (lines 292-293); dialog title "Enroll Students" (line 374) and "Select students to enroll in {classroomName}" (line 376); dialog empty-state "No available students match your search" / "No students available for enrollment" (lines 402-403); footer button "Close" (line 482); alert title "Unenroll Student" (line 497); description "Are you sure you want to unenroll … from {classroomName}? This action cannot be undone." (lines 500-504); action labels "Cancel" (line 508) and "Unenroll" (line 521). Sibling component `enrollment-demo.tsx` and the `classroom-navigation.tsx` reviewed in batch 058 already use `useTranslations` — this component is the inconsistent one.
- Impact: Primary Advantage ships with `i18n/locales/{cn,en,es,th,tw,vi}` and a `next-intl` provider. Teachers in non-English classrooms will see this enrollment management screen in English while surrounding chrome is translated, producing a jarring, inconsistent UX for primary-school staff and undermining the application's localization guarantee. For younger students whose teachers rely on translated guidance, missing i18n also blocks accessibility features that may be locale-specific.
- Recommendation: Wrap every user-visible string above in `const t = useTranslations("enrollmentManagement");` and add the corresponding keys to `apps/primary-advantage/messages/en.json` (then translate into cn, th, tw, vi, es). Defer the i18n extraction to the dedicated `agents_md_audit`-style fork-divergence remediation track; do not edit copy in this review-only pass.

### LR-060-002 — `fetch` calls lack CSRF token and rely on cookie-only auth

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:97-99,134-140,169-175`
- Evidence: Three endpoints are called via `fetch` with no explicit CSRF or anti-forgery token: `GET /api/classroom/${classroomId}/available-students` (lines 97-99), `POST /api/classroom/${classroomId}/enroll` (lines 134-140), and `DELETE /api/classroom/${classroomId}/unenroll` (lines 169-175). Only `Content-Type: application/json` is set. Cookie auth is assumed, matching the pattern flagged in batch primary-advantage-058 finding LR-058-003 for `class-roster.tsx`. The next-intl + Next.js App Router context provides no built-in CSRF defence beyond same-origin.
- Impact: A teacher who is authenticated and visits a malicious page can be tricked into enrolling or unenrolling primary students from a classroom via cross-site request forgery. The `DELETE` path is the most damaging because unenrollments are silent in the audit trail and "cannot be undone" (line 504).
- Recommendation: Either include the session-issued CSRF token in a custom header (`X-CSRF-Token` / `X-Requested-With`) sourced from a server component parent, or migrate this component to a Server Action so the framework's form-encoded POST can carry the token. Verify the API routes enforce `SameSite=Strict` cookies. Do not remediate in this review pass.

### LR-060-003 — `console.error` calls leak unstructured errors to the browser console

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:106,158,197`
- Evidence: Three production `console.error` calls: `Error fetching available students:` (line 106), `Error enrolling student:` (line 158), `Error unenrolling student:` (line 197). The monorepo root `AGENTS.md` "Observability" section mandates structured logs, and sibling component `class-roster.tsx` (primary-advantage-058 finding LR-058-005) was already flagged for the same pattern.
- Impact: Errors that the user does not see (e.g. when `toast.error` is suppressed, or before the toast handler is attached) are not captured in centralized observability. Primary teachers will report issues that have no server-side trace.
- Recommendation: Replace with the project's structured client logger (or remove when the `toast.error` already conveys the user-visible failure). Out of scope for this review-only track.

### LR-060-004 — Student email PII rendered in unenroll confirmation dialog

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:44,317,424,500-504`
- Evidence: The `Student` interface declares `email: string | null` (line 44), and the `EnrolledStudent`/`AvailableStudent` lists include email. The unenroll confirmation renders `{studentToUnenroll?.name || studentToUnenroll?.email}` (lines 500-504) so when a student record has no `name`, the email is the identifying string shown to the teacher and on any screen-reader / OSD overlay. Email is also rendered in the card and the enroll dialog (lines 317, 424). The app is for primary students, many of whom are minors.
- Impact: Showing primary-student email addresses in a teacher's UI is unnecessary PII exposure, and renders the email visibly to anyone looking at the teacher's screen (e.g. another student). It also creates a risk of email being captured by screen-sharing or screenshots during support calls. Emails of minors require stricter consent and minimal disclosure.
- Recommendation: Use a stable, non-PII identifier (display id, or initials + classroom nickname) in the dialog body, and keep email hidden behind a "show email" toggle. Mask email in the card view (`a***@school`) and add a per-tenant policy. Track this in the Primary-student adaptation remediation track.

### LR-060-005 — No `AbortController` / cleanup on async fetch calls (race condition on unmount)

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:94-111,131-163,166-202`
- Evidence: `fetchAvailableStudents` (lines 94-111), `handleEnrollStudent` (lines 131-163), and `handleUnenrollStudent` (lines 166-202) all call `fetch` with no `signal`, and the `useEffect` at lines 113-115 only syncs `enrolledStudents` state from props — it does not cancel pending requests. `useCallback` dependencies do not include any cancellation token. The dialog and the unenroll `AlertDialog` are both unmounted on close, so late-resolving `fetch` promises will call `setAvailableStudents`, `setEnrolledStudents`, or `setEnrollmentLoading` on an unmounted component.
- Impact: React 19 surfaces "state update on unmounted component" warnings in dev, and the rapid open/close of the enroll dialog can result in stale `availableStudents` data being applied after a fresh `fetchAvailableStudents` has been kicked off, producing flicker and ghost rows in the roster. Most importantly, a teacher who clicks "Enroll" and then navigates away can still see the success toast and a re-rendered "unenrolled" state from a later request.
- Recommendation: Introduce an `AbortController` in a `useEffect` cleanup (`controller.abort()` on unmount) and pass `signal` into `fetch`. Reset `enrollmentLoading` only after the awaited response resolves, not in `finally`, if the request was aborted. Track in the shared component-quality remediation track.

### LR-060-006 — `catch (error: any)` violates TypeScript strictness

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:157,196`
- Evidence: Both `handleEnrollStudent` and `handleUnenrollStudent` declare `catch (error: any)` (lines 157, 196). The monorepo root `AGENTS.md` and the JSDoc standard call for explicit types. `app/eslint.config.*` (inherited from the Next.js 16 app) is configured for strict typing and will warn on `any`.
- Impact: Type checking skips the catch path, so refactors that change the error shape (e.g. typed `ResponseError`) silently break the call site. Also disables several `@typescript-eslint` no-unsafe-* rules.
- Recommendation: Type the catch as `catch (error)` and narrow with `instanceof Error`, or use `catch (error: unknown)` and surface `error instanceof Error ? error.message : "Unknown error"`. Out of scope for this review-only pass.

### LR-060-007 — Search input has no associated label or `aria-label`

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:268-273`
- Evidence: The search `Input` (lines 268-273) relies solely on a `placeholder` ("Search students by name or email...") for context. There is no surrounding `<label htmlFor>`, no `aria-label`, and no `aria-describedby` for the search hint. Tailwind class `pl-10` (line 272) reserves space for the leading `Search` icon, but the icon (line 267) is decorative and has no `aria-hidden`.
- Impact: Screen-reader users get no announcement of what the field searches. WCAG 2.2 SC 1.3.1 / 4.1.2 fail. For primary-student classrooms that may include teachers with low-vision assistive tech, this is a real accessibility regression.
- Recommendation: Add `aria-label="Search enrolled and available students"` and `aria-hidden="true"` on the decorative `Search` icon. Track in the accessibility remediation track.

### LR-060-008 — Icon-only Unenroll button has no `aria-label`; loading state is not announced

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:349-361,454-470,516-520`
- Evidence: The card-level unenroll button (lines 349-361) renders only a `UserMinus` icon — no visible text and no `aria-label`. When `enrollmentLoading === student.id`, a `div` with `animate-spin` is rendered (lines 356-360) without `role="status"`, `aria-busy`, or `aria-live`, so assistive tech does not learn that an action is in progress. The same pattern repeats in the enroll dialog button (lines 454-470) and the alert-dialog action (lines 516-520).
- Impact: A primary-school teacher using a screen reader cannot tell which student the unenroll button targets, nor whether the request is in flight. The Unenroll action is destructive and irreversible, so discoverability matters.
- Recommendation: Add `aria-label={\`Unenroll ${student.name ?? student.email ?? student.id}\`}` and render `aria-busy={enrollmentLoading === student.id}` plus a visually hidden "Enrolling…" or "Unenrolling…" text inside the spinner. Track in the accessibility remediation track.

### LR-060-009 — No test file for `enrollment-management.tsx`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/enrollment-management.tsx` (component file); test gap
- Evidence: `find apps/primary-advantage -name "*.test.*"` returns only `apps/primary-advantage/lib/__tests__`, `apps/primary-advantage/server/models/__tests__`, and `apps/primary-advantage/server/utils/genaretors/__tests__`. None cover this component. The AGENTS.md testing policy mandates Vitest tests for new client components and warns that "tests for all new backend code" is the project norm. The sibling `class-roster.tsx` (primary-advantage-058) was likewise noted as untested.
- Impact: The component drives three mutating endpoints that affect primary-student data (enroll, unenroll, list available). A regression in the optimistic UI merge logic (lines 147-149, 182-189) cannot be caught by CI. Primary-student enrolment state is sensitive and an off-by-one or stale-state bug would directly affect classrooms.
- Recommendation: Add `apps/primary-advantage/components/teacher/__tests__/enrollment-management.test.tsx` using Vitest + `@testing-library/react`. Mock `fetch` and the dialog components; cover the empty/loading/error branches and the optimistic add/remove branches. Track in the test-gaps remediation track.

## No-Finding Notes

- None — every file in this batch produced at least one finding.
