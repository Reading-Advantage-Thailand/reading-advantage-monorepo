# Line Review Evidence: primary-advantage-023

Reviewer: coder-minimax-m3/primary-advantage-023
Files assigned: 1
Lines assigned: 585

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/admin/classrooms-table.tsx` | 1-585 | reviewed | 16 |

## Findings

### LR-primary-advantage-023-001 — `Math.random()` class-code generator is not cryptographically secure; same-file sibling `lib/utils.ts` already uses `crypto.getRandomValues` for a different string

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:105,164,201,273`
- Evidence: The `formData.classCode` initial value on line 105, the create-time reset on line 164, the edit-time reset on line 201, and the `resetForm` reset on line 273 all call `generateRandomClassCode()` (imported line 54). The implementation is `Math.random().toString(36).substring(2, 8)` in `lib/utils.ts:47-49` — a 6-char base-36 string from a non-cryptographic PRNG. The same `lib/utils.ts` file already uses `crypto.getRandomValues` for a different random string (lines 40-44) and a `Uint32Array` for the charset, so the project clearly has access to a crypto-grade helper. Class codes are the primary join credential for primary-age students (rendered as a Badge on line 419-432 and exposed in the row's classCode cell), so brute-forceability of the namespace is a primary-student adaptation risk; collision risk under concurrent admin opens is the more immediate fork-specific bug.
- Impact: An attacker who knows the alphabet (36 chars) and the length (6) can brute-force the namespace in 36^6 ≈ 2.18B guesses. With no rate limit on `POST /api/classroom/[id]/enroll` (the join endpoint), the class code is the only barrier between a primary-age student and an attacker. The "Use crypto-grade random" pattern is already used in the same lib/utils.ts (line 43); this call site is the regression.
- Recommendation: Replace `Math.random().toString(36).substring(2, 8)` with `crypto.getRandomValues(new Uint32Array(2))` mapped to a 6-char charset (or reuse the existing `randomString(6)` helper on line 40). Add a Zod `.regex(/^[a-zA-Z0-9]{6}$/)` validation in `app/api/classroom/route.ts:22` so the contract is enforced server-side. Document the class-code entropy in `apps/primary-advantage/AGENTS.md` under a new "Class code security" section.

### LR-primary-advantage-023-002 — `updateClassroomController` destructures `classroomName` but the page sends `name`; every Edit save returns 400 "Classroom name is required"

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:180-214,502-509`, `apps/primary-advantage/server/controllers/classroomController.ts:125-132`
- Evidence: `handleEditClassroom` (lines 180-214) sends `JSON.stringify(formData)` (line 188) where `formData` has key `name` (line 103, populated from `classroom.name` on line 248). The server's `updateClassroomController` destructures `const { classroomName, grade, description } = body;` (classroomController.ts:125), then `if (!classroomName) return 400 "Classroom name is required"` (lines 127-132). Because the client's key is `name` and the server's key is `classroomName`, the destructured `classroomName` is `undefined` for every save attempt, the 400 always fires, and the catch on line 192-194 displays `t("toast.updateFailed")` (line 210). The page never knows that the field name is the problem; it just looks like a generic save failure.
- Impact: Critical. The Edit Classroom dialog (lines 491-549) is completely non-functional. Every admin who tries to rename a classroom or change its grade sees "Failed to update classroom" and no actionable error. The Edit dialog's purpose is fully broken at the API contract boundary. This is the same fork-specific contract-drift pattern as LR-008-001, LR-008-002, LR-008-003 from batch 008 — the page assumes a stable API contract that the controller does not honor.
- Recommendation: Rename the server destructure to `const { name, grade, description } = body;` (and update the line 134-138 `updateClassroom` call accordingly) so the contract matches the client. Add a Zod input schema (`updateClassroomSchema`) to the PATCH route so the contract is enforced and the type of the body is inferred. As an interim safety net, the page should surface `errorData.error` from the 400 response (it already does on line 193 via the `throw new Error(errorData.error || ...)`) — consider rendering `errorData.error` in the toast on catch.

### LR-primary-advantage-023-003 — Create body sends `passwordStudents` and `classCode` but the POST route only destructures `{ name, grade, classCode }`; `passwordStudents` is silently dropped

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:102-107,147-178`, `apps/primary-advantage/app/api/classroom/route.ts:22`
- Evidence: `formData` (line 102-107) always includes `passwordStudents: ""` (line 106). `handleCreateClassroom` (line 147-178) calls `JSON.stringify(formData)` (line 153), so the POST body contains `passwordStudents: ""` plus `name`, `grade`, and `classCode`. The server (`app/api/classroom/route.ts:22`) destructures `const { name, grade, classCode } = await request.json();` and passes them to `createClassroomController` (lines 31-37). The `passwordStudents` field is never read, validated, or stored. The Create dialog (lines 292-364) also never renders a password field — so the form has no way to set a join password, but the empty string is silently sent on every save.
- Impact: High. The "Join Classroom" flow that students will use (presumably keyed by the auto-generated `classCode`) cannot be augmented by a school admin's chosen password. The model layer (`classroomModel.ts:75-80, 91-96, 102-106`) does not insert `passwordStudents` either, so the column (per the `Classroom` interface on line 61) stays null. The form shape is misleading — the admin might believe they can set a join password because the data is in the form state.
- Recommendation: Either (a) drop `passwordStudents` from `formData` and the `Classroom` interface (line 61) until the column is wired through, or (b) extend the POST route to accept and validate `passwordStudents` (Zod schema, length floor, etc.) and the model to persist it. Option (a) is the smaller fix. Also drop the `passwordStudents: ""` default on lines 106, 165, 203, 274 to make the form-state shape match the wire contract.

### LR-primary-advantage-023-004 — Edit form sends `passwordStudents` in PATCH body, but the controller destructures only `{ classroomName, grade, description }`; password is silently dropped and `description` is the third unused field

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:180-214,499-535`, `apps/primary-advantage/server/controllers/classroomController.ts:125-138`
- Evidence: `handleEditClassroom` (line 180-214) sends `JSON.stringify(formData)` (line 188) where `formData` includes `passwordStudents: classroom.passwordStudents || ""` (line 250). The server's `updateClassroomController` destructures `const { classroomName, grade, description } = body;` (line 125) and passes those to `updateClassroom(id, { name: classroomName, grade, description })` (lines 134-138). The `passwordStudents` value is silently dropped; `description` is in the destructure but the form never sends it. Even setting aside the `name`/`classroomName` mismatch from LR-023-002, the password field's value would never reach the database.
- Impact: Critical. The Edit dialog's password input (lines 522-534) is fully non-functional. The admin types a new student password, clicks Update, and the next read of the classroom shows the old (or null) password. For primary-student accounts where the join credential is the single authentication factor, this is a credential-update silent-failure — a school admin changing a compromised class password will believe the change saved, then later discover that students can still join with the old password (or fail to join if a new password was expected). This compounds LR-023-002 (the entire edit flow is non-functional).
- Recommendation: Add `passwordStudents` to the PATCH controller destructure on classroomController.ts:125, validate it (Zod min-length 4), pass to `updateClassroom`. Add a `description` field to the Edit dialog if the server contract requires it (otherwise drop it from the destructure to tighten the contract). Add a server-side audit log entry for password changes per the AGENTS.md "Audit Logs" requirement.

### LR-primary-advantage-023-005 — `grade` is sent as a string but the model does `parseInt(data.grade)`; an empty string from the Select placeholder yields `NaN`, failing the integer column insert

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:103,162,199,337-355`, `apps/primary-advantage/server/models/classroomModel.ts:78,94,105`
- Evidence: `formData.grade` is a `string` (line 103, default `""` on line 104). The `Select` on lines 337-355 has a placeholder "Select grade" (line 344) and the `SelectValue` reads from `formData.grade` (line 338). If the admin creates a classroom without picking a grade, `formData.grade` is `""` and the POST body includes `grade: ""`. The model's `createClassroom` does `grade: data.grade ? parseInt(data.grade) : null` (classroomModel.ts:78, 94, 105) — so the empty string is converted to `null`, which is correct. However, a non-numeric grade string (e.g., "k", "Pre-K") would pass the truthy check and produce `parseInt("k") === NaN` — the insert into an `integer` column would then fail and the API would return 500.
- Impact: Medium. For numeric grade strings the flow is fine. For non-numeric strings the create fails with 500 and the user sees "Failed to create classroom" with no error detail. The Edit side has a plain `<Input>` for grade (line 513-520, free-form string), so the admin can type any string and the same parseInt + null-guard pattern applies — but with a free-form input the risk of a non-numeric string is much higher.
- Recommendation: Add a server-side Zod schema for the POST body: `z.object({ name: z.string().min(1), grade: z.coerce.number().int().min(1).max(12).optional(), classCode: z.string().regex(/^[a-zA-Z0-9]{6}$/).optional() })`. Replace the free-form `<Input>` for grade in the Edit dialog (line 513-520) with a `<Select>` matching the Add dialog. Drop the `parseInt(data.grade)` and rely on Zod's coercion to produce a number at the boundary.

### LR-primary-advantage-023-006 — `passwordStudents` is sent on every Create POST as an empty string, but the form has no input for it; admin sees a `passwordStudents: ""` in the form state with no UI control

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:102-107,147-178,306-356`
- Evidence: `formData.passwordStudents` is initialized to `""` (line 106). The Create dialog body (lines 306-356) renders an Input for name (line 311-319), a disabled Input for classCode (line 325-330), and a Select for grade (line 337-355). There is no input for `passwordStudents`. The POST body nonetheless contains `passwordStudents: ""` (line 153) — which the server silently drops per LR-023-003. An admin inspecting the form state (via React DevTools) would see a `passwordStudents: ""` field with no corresponding input. The mismatch between form state shape and form UI shape is a contract drift that suggests the form was meant to include a password field at some point.
- Impact: Medium. For a primary-student onboarding flow, the absence of a password field on the create dialog means a school admin cannot set a student join password at classroom creation time. The only way to set a join password (per the Edit dialog on lines 522-534) is to first create a classroom (without a password) and then go back and edit. The Edit path is itself non-functional (LR-023-004), so the password field on the Edit dialog is also broken. Net result: primary-age students join with the auto-generated classCode and no second factor.
- Recommendation: Either (a) drop `passwordStudents` from the form state (lines 106, 165, 203, 250, 274) and the `Classroom` interface (line 61) until the full create+edit+server-model flow is wired, or (b) complete the wiring: add a `passwordStudents` input to the Create dialog (line 311 area), extend the POST and PATCH routes to accept it, and have the model persist it. Document the classCode vs passwordStudents distinction in `apps/primary-advantage/AGENTS.md`.

### LR-primary-advantage-023-007 — No tenant context in the Header; `schoolId` and `school` fields are read into state but never surfaced, so a school admin cannot audit which school's classrooms they are seeing

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:56-86,110-136,283-291,382-486`
- Evidence: The `Classroom` interface (line 56-86) declares `schoolId?: string` (line 65) and `school?: { id: string; name: string }` (line 66-69). The `fetchClassrooms` call on line 110-136 reads `data.classrooms` and stores the full objects in state (line 123) — the server's `getAllClassrooms` does join `schools` (classroomModel.ts:412-416), so the response likely includes `schoolId` and `school`. The Header (line 285-365) shows only `t("classrooms")` and the create button — no school name, no tenant context, no `schoolId` chip. The table itself (line 384-392) renders `name`, `grade`, `classCode`, `students`, `teachers`, `createdAt`, and an actions cell — no `school` column. The Edit dialog (line 499-535) also shows no school context.
- Impact: High. The Drizzle migration to multi-tenant scoping depends on every UI surface that lists tenant data to make the tenant visible to the user (root AGENTS.md: "Multi-tenancy ... never trust tenant IDs from the frontend without verifying the user has access"). If a school admin sees classrooms from multiple schools (e.g., a system-actor promoting to school-admin role, or a class-management UI shared by multiple schools), there is no way to tell which classroom belongs to which school. This is a shared-package migration blocker: the `Classroom` interface is hand-rolled (not `InferSelectModel<typeof classrooms>` per the primary-advantage AGENTS.md "Query patterns" section) and includes tenant fields that are then ignored.
- Recommendation: Add a `school` column to the TableHead/TableCell (around lines 390-391 and 451-452) that renders `classroom.school?.name ?? "—"` as a Badge. Add a `schoolId` filter input in the search section (lines 366-379) to filter by school when the admin is system-scoped. In the Edit dialog, render a read-only Label/Badge showing the school name so the admin confirms the right school before saving. Replace the hand-rolled `Classroom` interface (line 56-86) with `InferSelectModel<typeof classrooms>` plus the nested `school` join type, or extract the type from a Drizzle `relations()` declaration.

### LR-primary-advantage-023-008 — Single `isLoading` boolean drives table fetch, create, edit, and delete; the create button is not disabled while in flight, so a double-click submits two POSTs

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:97,110-136,147-178,180-214,216-242,359,544,575`
- Evidence: A single `isLoading` boolean (line 97) is set to `true` at the start of `fetchClassrooms` (line 112), `handleCreateClassroom` (line 148), `handleEditClassroom` (line 183), and `handleDeleteClassroom` (line 219). The Create button on line 359 (`<Button type="submit" onClick={handleCreateClassroom}>`) has no `disabled={isLoading}` and no early-return guard inside `handleCreateClassroom`. A user who double-clicks "Create" triggers two POSTs with the same `formData` (the `setFormData` reset on line 161-166 happens only on success). The Edit and Delete buttons on lines 544 and 575 do have `disabled={isLoading}` (lines 540, 569, 576) — proving the pattern is known — but the Create button on line 359 was missed.
- Impact: Medium. A double-click creates two classrooms with the same name and classCode (if the server's `classCode` column is not unique, both inserts succeed). For a primary-school admin, this is a duplicate-row bug. The toast on success (line 169) is the only feedback; the duplicate creation is silent.
- Recommendation: Add `disabled={isLoading}` to the Create button on line 359. Add an early-return guard inside `handleCreateClassroom`: `if (isLoading) return;` after line 147. Better: split the loading state into `isFetching`, `isCreating`, `isEditing`, `isDeleting` so each operation has its own button-disabled signal and concurrent operations don't block each other.

### LR-primary-advantage-023-009 — Delete confirmation is a single-click destructive action against a classroom that contains primary-age students; no typed-name confirmation, no soft-delete preview, no school scope

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:551-582`
- Evidence: The Delete dialog (lines 552-582) shows a generic `t("deleteClassroomWarning")` (line 562) and a single-click `<Button variant="destructive" onClick={handleDeleteClassroom}>` (line 573-579). There is no "type the classroom name to confirm" guard, no preview of the affected student count (the server's `classroom.students?.length` is available on line 444 and could be displayed), and no school-scope check. An admin who mis-clicks the trash icon → "Delete" in the DropdownMenu (lines 472-478) can wipe a classroom with one click. The confirmation copy is generic — `t("deleteClassroomDescription")` (line 557) and `t("deleteClassroomWarning")` (line 562) are localizable but the localizer may not have conveyed the destructive weight.
- Impact: Medium. For primary-student records, a single-click classroom delete is a data-integrity and consent concern: parents are not notified, students are silently removed from the classroom roster (which feeds `classroomStudents` rows on the server), and the action is unrecoverable. The same pattern was flagged in batch 008 (LR-008-011) for student deletion; the classroom-level version is the same primary-student adaptation risk at a higher blast radius (a classroom can hold 30+ students).
- Recommendation: Add a typed-confirmation Input that requires the user to type the classroom's `name` (or `classCode`) before the Delete button enables. Render a "This classroom has N students and M teachers" preview inside the dialog body so the admin sees the impact. Add a server-side `classroomStudents` count and `classroomTeachers` count to the GET `/api/classroom/[id]` response so the UI can show the count. Consider moving to a soft-delete (`deletedAt` column) with a 7-day restore window, per the AGENTS.md "Destructive actions" guidance.

### LR-primary-advantage-023-010 — Edit dialog's grade field is a free-form `<Input>` accepting any string, but the model does `parseInt()`; non-numeric strings silently coerce to `NaN` and the integer column insert fails

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:511-521`, `apps/primary-advantage/server/models/classroomModel.ts:78,94,105`
- Evidence: The Add dialog uses a `<Select>` for grade (lines 337-355) which constrains the value to a numeric string `"3"` through `"12"` (line 348). The Edit dialog uses a free-form `<Input>` for grade (lines 513-520). The PATCH route accepts the body's `grade` field and passes it to the model, which does `grade: data.grade ? parseInt(data.grade) : null` (classroomModel.ts:78, 94, 105). A user who types "k", "Pre-K", or "Year 5" passes the truthy check and `parseInt("k") === NaN` — the Drizzle `integer` column insert fails, the API returns 500, and the toast on line 210 says "Failed to update classroom". The Add dialog's Select is good UX but the Edit dialog's free-form input is a regression in input validation.
- Impact: Medium. The Edit dialog is the only way to fix a wrong grade after creation. If the original grade was "5" and the admin needs to change it to "Year 5" (e.g., a K-2 school), the edit fails with a 500 and no detail. The asymmetric input UX (Select on Add, free-form on Edit) is also a UX dead-end — the admin who selected "5" on Add sees a free-form input on Edit and is encouraged to type any value.
- Recommendation: Replace the Edit dialog's grade `<Input>` (line 513-520) with the same `<Select>` (lines 337-355) used in the Add dialog. Add a server-side Zod schema for the PATCH body: `grade: z.coerce.number().int().min(1).max(12).optional()`. Drop the `parseInt(data.grade)` calls in the model and rely on Zod's coercion at the boundary.

### LR-primary-advantage-023-011 — `searchTerm` filter is purely client-side and not in the URL; refresh drops the search context and the filter cannot be shared via link

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:98,138-145,278-280,367-379`
- Evidence: `searchTerm` is a `useState` (line 98) and the filter on lines 138-145 is applied in-memory to the `classrooms` array. There is no `useSearchParams`/`useRouter` integration, no URL persistence, no `replaceState`. The `useEffect` on line 278-280 refetches the entire classroom list on mount, but never on `searchTerm` change. A page refresh resets the search. A back-button navigation resets the search. A shared URL contains no search context.
- Impact: Low. The same root-cause pattern was flagged in batch 008 (LR-008-012) for the students page. The classroom count is small (per-school), so client-side filtering is acceptable. The URL state, however, is the consistent remediation.
- Recommendation: Move `searchTerm` into a `useSearchParams` + `useRouter` pair. Read it on mount via `useSearchParams().get("q") ?? ""`, write it via `router.replace(\`?q=\${value}\`)`. This makes search shareable, refresh-safe, and back-button-navigable.

### LR-primary-advantage-023-012 — Dialog body is a `<div>`, not a `<form>`; the `type="submit"` Button does not fire on Enter, and the form has no `onSubmit` handler

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:306-362,499-547,552-580`
- Evidence: The Create dialog body (line 306-357) is wrapped in `<div className="grid gap-4 py-4">` (line 306), not a `<form>`. The Create button on line 359 is `<Button type="submit" onClick={handleCreateClassroom}>` — but `type="submit"` is a no-op outside a `<form>` (the `onClick` does fire on click, but the keyboard Enter key on a focused Input does not submit). The Edit dialog body (line 499-535) is `<div className="space-y-4">` (line 499), same pattern, and the Update button on line 544 is `<Button onClick={handleEditClassroom}>` (no `type` attribute, but still no form wrapper). The Delete dialog body (line 560-564) is `<div className="py-4">`. The pattern is identical across all three dialogs and is the same root cause as LR-008-013 from batch 008.
- Impact: Medium. Standard keyboard form-submission is broken. A user who tabs through the Name → ClassCode → Grade inputs and presses Enter expects the form to submit. It does not — the click handler is the only path. For a primary-school admin, this is a usability regression. A11y tooling that expects Enter to submit (most ARIA form patterns) will report a conformance failure.
- Recommendation: Wrap each dialog body in `<form onSubmit={...}>`: Create dialog body at line 306, Edit dialog body at line 499, Delete dialog body at line 560. Add `onSubmit={(e) => { e.preventDefault(); handleCreateClassroom(); }}` (or the appropriate handler) to each form. Drop the now-redundant `onClick` from the Buttons (or keep both for click + keyboard parity).

### LR-primary-advantage-023-013 — `useEffect` closure over `fetchClassrooms` captures stale state; if `classrooms` is ever moved to props or URL-driven, the empty-deps effect will silently break

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:110-136,278-280`
- Evidence: `fetchClassrooms` is defined as an inner function (line 110-136) that closes over `setClassrooms` and `setIsLoading` (the only state setters, stable references). The `useEffect` on line 278-280 calls `fetchClassrooms()` with an empty-deps array, which works because the function and its closure-captured setters are stable. The effect does not re-run on `searchTerm` change (lines 138-145 — search is purely client-side). If a future refactor moves `classrooms` to props, or adds a `currentSchoolId` to the closure, the empty-deps array will silently hold the old closure and miss the new state.
- Impact: Low today. Latent: any refactor that adds a dependency to `fetchClassrooms` will need to also update the `useEffect` dep array, and the existing comment-free code gives no hint that the empty-deps is intentional.
- Recommendation: Add a comment above line 278-280 documenting that the empty-deps is intentional because `fetchClassrooms` is parameter-free and the setters are stable. Or wrap `fetchClassrooms` in `useCallback` and depend on it in the effect array. The `useCallback` approach is the React 19 best practice and makes the dependency explicit.

### LR-primary-advantage-023-014 — `formatDate` uses no locale; class-code expiration dates and `createdAt` render in the browser's default locale, not the app locale selected via `next-intl`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:260-262,436,454`
- Evidence: `formatDate` on lines 260-262 calls `new Date(dateString).toLocaleDateString()` with no locale argument. The component imports `useTranslations` from `next-intl` (line 4) and uses `useTranslations("Admin.Classrooms")` (line 89), implying the app is multi-locale. The `toLocaleDateString()` without a locale falls back to the browser's `navigator.language`, which may not match the app's `next-intl` locale. A Thai user who switches the app to English will see dates in Thai format (or browser default).
- Impact: Low. The i18n story is partly broken for dates. The strings (classroom names, headers) are localized via `t(...)` calls, but the dates are not. This is a silent i18n gap that is hard to spot in development because the dev machine's locale often matches the app's default locale.
- Recommendation: Pass the next-intl locale into `formatDate`: `function formatDate(dateString: string, locale: string) { return new Date(dateString).toLocaleDateString(locale); }`. Read the locale via `useLocale()` from `next-intl` (line 4 import) and pass it to the call sites on line 436 and 454. Document the locale behavior in `apps/primary-advantage/AGENTS.md` under an "i18n" section.

### LR-primary-advantage-023-015 — `Filter` icon and `cn` utility are imported but never used; dead imports

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:43-53`
- Evidence: Line 51 imports `Filter` from `lucide-react`. The only icon rendered in the file is `Filter` is not rendered anywhere (search the file: `Filter` does not appear as a JSX element). Line 53 imports `cn` from `@/lib/utils`. The only other import from `@/lib/utils` is `generateRandomClassCode` on line 54. `cn` is never used. Both imports add to the bundle and trigger dead-code-elimination passes for no benefit.
- Impact: Low. Bundle size, lint noise (`no-unused-vars`), and a maintenance trap (a future reader assumes `Filter` is rendered and searches for it). The `cn` import is the same anti-pattern that appears across the codebase.
- Recommendation: Remove `Filter` from line 51 and `cn` from line 53. If the Filter icon is intended for a future "filter by school" UI, add a TODO comment with a ticket reference instead of leaving it imported.

### LR-primary-advantage-023-016 — DropdownMenuItems for Edit and Delete have no `aria-label` and the inner icon-only Buttons (line 459-461) provide no accessible name

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/admin/classrooms-table.tsx:456-481`
- Evidence: The actions cell on lines 456-481 renders a `<DropdownMenu>` with a `<DropdownMenuTrigger asChild>` wrapping a `<Button variant="ghost" className="h-8 w-8 p-0">` that contains only the `MoreHorizontal` icon (line 460). The trigger button has no `aria-label` or visible text — screen readers will announce only "button" with no name. The `DropdownMenuItem`s on lines 466-478 wrap the Edit and Trash2 icons with localized text (`t("edit")` on line 470, `t("delete")` on line 477), so those have accessible names, but the `DropdownMenuLabel` (line 464) is "Actions" with no per-item context (a screen reader hears "Actions, Edit, Delete" with no indication of which row).
- Impact: Low to Medium. An admin using a screen reader cannot tell which row the "Edit" or "Delete" menu belongs to. For a school admin tool that manages primary-student records, an accessible actions menu is a baseline expectation. The trigger button's missing `aria-label` is the highest-priority sub-issue: it has no name at all.
- Recommendation: Add `aria-label={t("actions")} — or a per-row label like `aria-label={\`Actions for ${classroom.name}\`}` to the trigger Button on line 459. For the menu items, add `aria-label` overrides that include the classroom name (e.g., `aria-label={\`${t("edit")} ${classroom.name}\`}` on line 466 and `aria-label={\`${t("delete")} ${classroom.name}\`}` on line 472). The localized text already serves most screen readers, but the per-row context disambiguates when multiple rows are read in sequence.

## No-Finding Notes

- `apps/primary-advantage/components/admin/classrooms-table.tsx`: reviewed line-by-line (1-585). 16 findings documented above. No additional findings for the remaining lines (e.g., the Dialog/DropdownMenu/Select primitive imports, the useTranslations namespace usage on line 89-90, the toast.success calls on lines 169, 205, 233) — these are correctly used and not material to this review.

## Summary

- Total findings: 16 (2 Critical, 3 High, 6 Medium, 5 Low).
- Per-file finding count: 16 (single-file batch).
- Severity tally: Critical = LR-002, LR-004 (2). High = LR-001, LR-003, LR-007 (3). Medium = LR-005, LR-006, LR-008, LR-009, LR-010, LR-012 (6). Low = LR-011, LR-013, LR-014, LR-015, LR-016 (5).
- Critical-severity findings: LR-002 (PATCH route `classroomName` vs client `name` field name mismatch — every Edit save returns 400), LR-004 (Edit password and PATCH controller's `classroomName`/`grade`/`description` destructure drops `passwordStudents` — Edit dialog's password field is non-functional).
- Highest-impact fork-divergence categories for this batch: `Fork-specific regression` (8 findings: LR-001, LR-002, LR-003, LR-004, LR-005, LR-008, LR-010, LR-015 — contract drift between page and API, free-form vs Select UX, dead imports, single loading state, Math.random class codes), `Primary-student adaptation risk` (3 findings: LR-006, LR-009, LR-016 — `passwordStudents` form state without UI, single-click classroom delete, a11y gaps in admin tool managing primary-student records), `Shared package migration blocker` (1 finding: LR-007 — tenant context invisible to admin despite `schoolId`/`school` fields in the response), `Same root cause as Reading Advantage` (2 findings: LR-011 URL state, LR-012 form wrapper), `Intentional product divergence that needs documentation` (2 findings: LR-013 useEffect closure, LR-014 locale in formatDate).
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is written under `line-review/coverage-patches/primary-advantage-023.tsv` and the evidence is in this file.
