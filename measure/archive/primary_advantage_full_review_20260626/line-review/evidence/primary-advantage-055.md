# Line Review Evidence: primary-advantage-055

Reviewer: coder-minimax-m3/primary-advantage-055
Files assigned: 2
Lines assigned: 815

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/teacher/assign-form.tsx` | 1-294 | reviewed | 3 |
| `apps/primary-advantage/components/teacher/assignment-button.tsx` | 1-521 | reviewed | 7 |

## Findings

### LR-primary-advantage-055-001 — fetchClassrooms has no res.ok guard and no try/catch

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/teacher/assign-form.tsx:107-114`
- Evidence: `useEffect(() => { async function fetchClassrooms() { const res = await fetch("/api/classroom"); const data = await res.json(); setClassrooms(data.classrooms); } fetchClassrooms(); }, []);` — the effect calls `fetch("/api/classroom")` at line 109 and immediately `await res.json()` at line 110 with no `res.ok` check, no try/catch, and no error toast. If the API returns 401/403/500 or a non-JSON body, the await throws and React surfaces an unhandled rejection; the form remains without `classrooms` and the teacher cannot submit. Sibling `assignment-button.tsx` (lines 160-174) does wrap its `/api/classroom` call in try/catch with a toast — same root-cause gap as Reading-era components that predate the shared error-handling pattern.
- Impact: A failed network or auth check on `/api/classroom` leaves the assignment form unusable with no user feedback.
- Recommendation: Mirror the pattern from `assignment-button.tsx:160-174`: wrap in try/catch, check `res.ok`, call `setClassrooms([])` on failure, and emit a `toast.error(...)`.

### LR-primary-advantage-055-002 — articleId Zod field has no `.min(1)` while sibling fields do

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assign-form.tsx:31-38`
- Evidence: `formSchema` declares `classroomId: z.string().min(1, "Classroom is required")` (line 32), `name: z.string().min(1, "Name is required")` (line 33), `students: z.array(z.string()).min(1, "Students are required")` (line 35) — but `articleId: z.string()` at line 36 has no length constraint. Default value at line 73 is `articleId: articleId` (the prop). The prop type at line 59 is `articleId: string`, so it should always be set, but client-side validation is asymmetric and a missing prop would silently submit `articleId: undefined` (JSON-serialized as omitted key) to `/api/assignments`. Sibling `assignment-button.tsx:98` does use `articleId: z.string().min(1, "Article is required")`, confirming this is a regression specific to `assign-form.tsx`.
- Impact: Inconsistent client-side validation; if the prop is ever undefined the form would submit a malformed payload to the assignments controller.
- Recommendation: Add `.min(1, "Article is required")` to `articleId` to match sibling forms and provide defense-in-depth.

### LR-primary-advantage-055-003 — Hardcoded English Zod validation messages

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assign-form.tsx:32,33,35`
- Evidence: All three Zod `.min(1, ...)` validation messages are inline English strings: `"Classroom is required"`, `"Name is required"`, `"Students are required"`. The component otherwise uses `useTranslations("Assignment.assignForm")` at line 64 and consumes `t(...)` for visible UI text (lines 143, 147, 167, 180, 194, 200-201, 226, 273, 275). When `FormMessage` (line 158, 171, 184, 263) renders a validation error, it will show English even though the rest of the form is translated.
- Impact: Thai/Chinese/Vietnamese users see English validation errors next to translated field labels — i18n is broken for the failure path.
- Recommendation: Move validation messages to the Zod schema using translated strings (e.g., `t("classroomRequired")`) or add the keys to the locale message files.

### LR-primary-advantage-055-004 — Entire component is hardcoded English; no `useTranslations` import

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-button.tsx:1-521`
- Evidence: The file imports (lines 1-42) include `react`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `sonner`, shadcn UI primitives, `cn` util, `Skeleton`, and the shared `Article` type — but no `useTranslations` from `next-intl`. This is a fork-specific regression: the sibling `assign-button.tsx` uses `useTranslations("Assignment")` and `useTranslations("Components")` (lines 28-29), and `assign-form.tsx` uses `useTranslations("Assignment.assignForm")` (line 64). Every user-facing string in this 521-line dialog is hardcoded English: dialog title/description (lines 247-249), `Classroom` label (267), `Select Classroom` placeholder (274), `Assignment Name` label + placeholder (298, 301), `Assignment Description` label + placeholder (314-315, 318), `Students *` label (333), `No students found` / `Please select a classroom first` (410-411), `Due Date` label (462), `Selected Due Date:` prefix (467), `Cancel` (499), submit button text (502, 506-512), toast messages (145, 151-152, 167-170, 202-205), and trigger button text `Assignment` (241).
- Impact: Primary-advantage supports Thai/Chinese/Vietnamese (per the AGENTS.md mention of `next-intl` for i18n) but this dialog renders entirely in English. Teachers in non-English locales cannot use this feature with proper localization, contradicting the documented i18n strategy.
- Recommendation: Add `import { useTranslations } from "next-intl";`, instantiate `const t = useTranslations("Teacher.AssignmentDialog");` (or appropriate namespace), and replace every hardcoded literal with a translation key. Add the keys to the locale message JSON files.

### LR-primary-advantage-055-005 — `assignedStudentIds` state declared but never updated; submit button always shows "Create"

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-button.tsx:117,506-512`
- Evidence: Line 117: `const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);`. After reading all 521 lines, `setAssignedStudentIds` is never invoked anywhere in the file — the hook is purely vestigial. The submit button at lines 501-513 conditionally renders `"Updating..."` vs `"Creating..."` (line 507-509) and `"Edit Assignment"` vs `"Create Assignment"` (line 510-512) based on `assignedStudentIds.length > 0`. Since the value is permanently `[]`, the button always shows the create-mode strings, and the edit-assignment pathway in this dialog is unreachable.
- Impact: The component appears to support editing an existing assignment (per the `onUpdate` prop, see LR-055-007) but actually only supports create. Teachers clicking "Edit" through other UI surfaces that route to this dialog will get a misleading "Create Assignment" button.
- Recommendation: Either remove the unused `assignedStudentIds` state if this dialog only handles creation, or populate it from props/`/api/classroom/[id]` data when editing so the conditional rendering activates.

### LR-primary-advantage-055-006 — `errors` state never populated; manual error-rendering path is dead code

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-button.tsx:114,215-219,229-231,370-373,446-450`
- Evidence: Line 114 declares `const [errors, setErrors] = useState<Record<string, string>>({});` and the component renders `errors.selectedStudents` at lines 446-450. Three `setErrors` call sites exist (lines 217, 230, 370-373) — all of them only *clear* the field (`selectedStudents: ""`). No code path ever sets a non-empty error string. The clearing `useEffect` at lines 215-219 (`if (errors.selectedStudents && selectedStudents.length > 0)`) therefore never has work to do, and the visible error block at lines 446-450 never renders. Zod/react-hook-form already validates `selectedStudents: z.array(z.string()).min(1, ...)` (line 97) via `FormMessage`, so the manual error state is redundant dead code.
- Impact: Misleading code structure suggests manual error UX that doesn't exist; future maintainers may try to wire up `setErrors({ selectedStudents: "..." })` without realizing the rendering path is fragile.
- Recommendation: Remove `errors` state, the clearing `useEffect` (lines 215-219), and the manual error block (lines 446-450) — rely on Zod's `FormMessage` already wired through the form. If a manual error path is genuinely needed, document why and wire up a real setter.

### LR-primary-advantage-055-007 — `student: any` type erases safety; display fallback exposes student email

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/assignment-button.tsx:195-198`
- Evidence: `studentsData.map((student: any) => ({ id: student.id, display_name: student.display_name || student.name || student.email, }))` (lines 195-198) uses TypeScript `any` for the student element and falls back to `student.email` when neither `display_name` nor `name` is present. Because primary-advantage serves primary (minor) students per the track scope, surfacing email addresses to teachers in an assignment-creation UI is a data-display risk: emails can be PII, may not be intended for in-app display, and could be a COPPA/GDPR-K consideration if a teacher screenshots the dialog. The `Student` interface at lines 54-58 (`{ id: string; display_name?: string; name?: string; }`) is the declared contract; using `any` defeats this and the email field is not in the declared shape.
- Impact: Loss of compile-time safety; potential display of minor student emails to teachers without explicit UX intent.
- Recommendation: Define the API response element type (no `any`), restrict the display fallback to `display_name || name || <opaque placeholder like initials>`, and never fall back to email in a teacher-facing UI for primary students.

### LR-primary-advantage-055-008 — `onUpdate` prop destructured but never invoked in `onSubmit`

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-button.tsx:50,108,131-157`
- Evidence: The `Props` type at lines 44-51 declares `onUpdate?: () => void;` and the component destructures it at line 108 (`onUpdate,`). The `onSubmit` handler at lines 131-157 calls `form.reset()` (line 146) and `setIsOpen(false)` (line 147) on success but never calls `onUpdate?.()`. The sibling `assign-form.tsx` correctly invokes its `onSave()` callback (line 94) after a successful submission. The prop name `onUpdate` strongly implies "tell the parent to refresh its assignment list after I update," so any parent that wires this prop will silently fail to refresh.
- Impact: Parent components cannot refresh their assignment list after a successful create through this button; the prop is effectively a no-op contract violation.
- Recommendation: After `toast.success("Assignment created successfully!")` (line 145) and before/after `setIsOpen(false)` (line 147), call `onUpdate?.()` to honor the documented contract.

### LR-primary-advantage-055-009 — Commented-out i18n calls reveal incomplete migration

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/teacher/assignment-button.tsx:332,413-415`
- Evidence: Line 332: `/* <Label className="text-sm font-medium">{t("students")} *</Label> */`. Lines 413-415: `/* {form.classroomId ? `${t("noStudentsFound")}` : `${t("pleaseSelectClassroomFirst")}` } */`. No `t` is in scope (no `useTranslations` import), so these are aspirational comments. They appear to be remnants of a half-completed next-intl migration that was rolled back. Documenting this divergence would let reviewers understand why this dialog is the odd one out among the assignment components.
- Impact: Code-archaeology confusion; readers may assume the strings are localized or that an i18n helper exists nearby.
- Recommendation: Either finish the migration by adding `useTranslations` (resolves LR-055-004) and uncommenting the calls, or remove the commented-out lines and document in the track spec that this dialog is intentionally English-only pending a follow-up migration track.

### LR-primary-advantage-055-010 — `classroom.id!` non-null assertion on a typed string field

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-button.tsx:280`
- Evidence: At line 280, `value={classroom.id!}` uses a non-null assertion even though the `Classes` interface at lines 70-91 declares `id: string;` (non-optional). The assertion is unnecessary on a properly typed field. More importantly, if the API ever returns a classroom object missing `id`, the Radix `SelectItem` will throw at render time rather than being filtered out. The pattern is inconsistent with `assign-form.tsx:151` (`value={classroom.id}`) which trusts the type without the assertion.
- Impact: Unnecessary non-null assertion masks potential data-quality issues; runtime crash if `id` is ever undefined.
- Recommendation: Drop the `!` and either rely on the type contract or filter `classrooms.filter(c => c.id)` before mapping. Mirroring `assign-form.tsx:151` is the simplest fix.

## No-Finding Notes

- `apps/primary-advantage/components/teacher/assign-form.tsx`: reviewed line-by-line (1-294). 3 findings recorded above (fetch error handling, asymmetric articleId validation, English Zod messages). The remainder — import structure, form-state shape, i18n usage via `useTranslations("Assignment.assignForm")`, the classroom → students two-step flow (lines 107-129), the controlled checkbox grid (lines 196-266), and the Calendar date picker (lines 268-290) — is implemented per the shared Reading Advantage pattern and is internally consistent with `assign-button.tsx` parent component.

- `apps/primary-advantage/components/teacher/assignment-button.tsx`: reviewed line-by-line (1-521). 7 findings recorded above. The Dialog scaffolding (lines 234-251), controlled Select for classrooms (lines 262-291), and Calendar date picker (lines 457-485) follow the shared shadcn/RHF patterns correctly; the issues concentrate in i18n coverage, dead/uninitialized state, type safety, and prop-contract violations rather than in the structural React plumbing.