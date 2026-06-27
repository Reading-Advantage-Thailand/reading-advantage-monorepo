# Line Review Evidence: primary-advantage-007

Reviewer: measure-jr-green/primary-advantage-007
Files assigned: 5
Lines assigned: 1090

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx` | 1-654 | reviewed | 5 |
| `apps/primary-advantage/app/[locale]/admin/layout.tsx` | 1-16 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/admin/page.tsx` | 1-224 | reviewed | 3 |
| `apps/primary-advantage/app/[locale]/admin/students/add/page.tsx` | 1-180 | reviewed | 3 |
| `apps/primary-advantage/app/[locale]/admin/students/classrooms/page.tsx` | 1-16 | reviewed | 0 |

## Findings

### LR-primary-advantage-007-001 — Trailing space in upload endpoint URL

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:124`
- Evidence: Line 124 calls `fetch("/api/upload/classes ", { method: "POST", body: formData })`. The URL literal contains a trailing space character after `classes`. Line 120-121 separately runs a setInterval `progressInterval` that increments `uploadProgress` every 2 s, capped at 90, but the trailing-space URL is a hard request-routing bug: most HTTP servers and Next.js Route Handlers will treat `/api/upload/classes ` (with trailing space) as a 404 since route segments are not whitespace-padded. The success/result handling at lines 132-143 then derives `result.originalName`, `result.size`, and `result.fileName` from a response that is unreachable in normal deployment.
- Impact: Bulk import of students/teachers/classes is silently broken at the client side. The UI shows a green success alert (lines 323-347) only because the JSON parsing at line 132 throws, and the catch branch (line 144-148) sets `uploadError` to `t("errors.uploadFailed")`. The progress bar (lines 119-121) advances independently of the failed request, so admins may believe the upload succeeded. This is a fork-specific regression: the Reading Advantage app uses a different, unspaced upload endpoint, and this trailing space is unique to the primary-advantage client copy.
- Recommendation: Strip the trailing space from the URL string on line 124 and use a clean `/api/upload/classes` (or, if the new server uses `/api/classes/import`, update both sides together). Add an explicit response.ok check before showing the success alert.

### LR-primary-advantage-007-002 — Use of `any` types for upload state

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:50,52,87,410,411,412,499,500,504`
- Evidence: Line 50 declares `useState<any[]>([])` for `previewData`, line 52 declares `useState<any>(null)` for `uploadResult`. The CSV parse at line 86-89 returns a typed `Record<string, string>[]`, but the typed value is immediately widened to `any[]` at line 90. Downstream renders (`row.name`, `row.email`, `row.role` on lines 410-412, and `cell` in the format-example table on lines 499-509) bypass TypeScript protection: a header rename in the CSV (`name → full_name`) would compile but throw `undefined` at runtime inside the preview dialog. Line 87 in the csv parse options passes a typed `columns: true` literal but the parse result is still assigned to `any[]`.
- Impact: The import flow loses type safety end-to-end. The shared Drizzle migration blocked the same anti-pattern elsewhere, and the inline `any` widens the surface back to pre-migration risk. The Drizzle column renames documented in `apps/primary-advantage/AGENTS.md:21-54` cannot be enforced when the file's intermediate data is `any`.
- Recommendation: Type `previewData` as `Record<string, string>[]` (or a named `CsvRow` interface), derive `uploadResult` as the API response shape (defined in the matching Route Handler), and remove the `any` annotations on lines 50, 52. If the API contract is unstable, mark `uploadResult` as `unknown` and narrow with a Zod schema before rendering.

### LR-primary-advantage-007-003 — Fake progress interval independent of network state

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:118-121,128-130`
- Evidence: Lines 118-121 set up `const progressInterval = setInterval(() => { setUploadProgress((prev) => Math.min(prev + 10, 90)); }, 2000);`. The interval runs every 2 seconds and increments the progress bar by 10 unconditionally, regardless of actual upload bytes transferred. Line 129 clears the interval only after the `await fetch(...)` on line 124 resolves. Line 130 then jumps `setUploadProgress(100)` regardless of whether the upload succeeded or failed. There is no `XMLHttpRequest` or `ReadableStream` reading `Content-Length`; the progress bar is purely cosmetic.
- Impact: During a 5 MB CSV upload of class lists, admins see the progress bar reach 90% while the file is still being transmitted, then snap to 100% on completion. This is misleading but not destructive; the underlying data import still happens server-side. Reading Advantage uses a similar cosmetic bar, so this is a divergence that needs documentation rather than a regression.
- Recommendation: Either (a) use `XMLHttpRequest` with an upload `progress` event tied to `e.loaded / e.total`, or (b) document that the bar is a UX placeholder until the server returns. Add a TODO comment referencing the chosen approach.

### LR-primary-advantage-007-004 — In-memory CSV parsing loads entire file before upload

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:82-103,113-127`
- Evidence: Lines 82-103 read the entire CSV file into memory via `FileReader.readAsText`, then `csv/sync.parse` (line 86-89) tokenises every row. The result is stored in `previewData` (line 90). The subsequent `handleUpload` (line 105-152) re-uses `selectedFile` (line 116) to build `FormData` and POSTs the file to the server. The client therefore parses the CSV twice (once for preview, once implicitly server-side) and holds the full parsed array in browser memory. The 5 MB size guard at line 70-78 only applies to the original File; a malformed CSV that expands on parse (e.g., quoted multi-line cells) can balloon past the browser's memory limits.
- Impact: For a school admin onboarding a full primary cohort (typically 200-500 students × 4 fields), a 5 MB CSV is plausible and works. However, the in-memory parse happens before any schema validation, so a malformed file (missing headers, wrong role values) only fails on the server, after the user has waited for a parse that already consumed browser memory. This is a primary-student adaptation risk because primary-class sizes are often larger than adult-class sizes, and the per-school onboarding path is more frequent.
- Recommendation: Stream-parse the CSV using `csv-parse/sync` with a `to: 50` line limit for the preview, or move all parsing to the server and have `/api/upload/classes` return a parsed summary that the dialog can render. Add a row-count cap (e.g., max 2000 rows) to fail fast.

### LR-primary-advantage-007-005 — Endpoint mismatched with UI label (classes vs. students/teachers)

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:124,194-242,434-457`
- Evidence: The Tabs list (lines 434-457) and `formatExamples` (lines 194-242) describe three flows: `students`, `teachers`, `classes`. The active tab is stored as `activeTab` (line 51, default `"students"` on line 51). However, the upload always POSTs to `/api/upload/classes ` (line 124) regardless of `activeTab`. The `formatExamples.classes` example (line 235-241) is the only one whose data shape matches a "classes"-only endpoint. The `formatExamples.students` (lines 195-214) and `formatExamples.teachers` (lines 215-234) CSV templates include a `classroomName` and `role` column that the server would have to extract and dispatch.
- Impact: The server endpoint name suggests only the `classes` tab actually works as advertised; for `students` and `teachers`, the file format includes extra columns that the server may silently drop, leaving admins unsure whether the bulk upload registered their students. There is no per-tab endpoint, and the UI does not surface which mode was used. The dead space after the trailing-space URL (finding 001) compounds the issue.
- Recommendation: Either split into `/api/upload/students`, `/api/upload/teachers`, and `/api/upload/classes` and switch the endpoint by `activeTab`, or document that the server parses all formats from a single endpoint and update the endpoint name to a generic `/api/upload/bulk`. Either way, the trailing space must be fixed.

### LR-primary-advantage-007-006 — Stray backtick + semicolon at end of admin page.tsx

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/page.tsx:224`
- Evidence: Line 224 is literally two characters: a backtick (`` ` ``) followed by a semicolon (`;`). There is no matching opening backtick in the file, so the file is not a syntactically valid TypeScript module. Lines 30-173 define `AdminPage` returning an empty `<div></div>`, with the entire legacy dashboard (lines 36-171) commented out. Lines 176-223 define three unused skeleton components (`StatsCardsSkeleton`, `QuickActionsSkeleton`, `RecentActivitySkeleton`). The function-local variable `t = await getTranslations("AdminDashboard")` on line 32 is destructured but never used because the body is empty. `params` (line 27) is destructured into `locale` (line 31) but `locale` is never referenced.
- Impact: The TypeScript compiler will reject this file outright (`Unterminated template literal`) on any `tsc --noEmit` pass, blocking `pnpm turbo run check-types` for the `primary-advantage` workspace. The admin landing page therefore cannot be reached via SSR even if it wanted to render the legacy dashboard. The previous primary_advantage_drizzle_migration_20260526 migration track missed this syntax error because it focused on data-layer changes. The Skeleton functions and unused imports are also dead code.
- Recommendation: Delete lines 36-223 (the commented-out JSX and the three skeleton components), restore the function body to a working minimal admin landing (e.g., a redirect to `/admin/dashboard`), drop unused imports from lines 1-25, and remove the trailing `` `; `` on line 224. Run `pnpm --filter primary-advantage check-types` after the fix.

### LR-primary-advantage-007-007 — Widespread unused imports and unused destructured vars in admin page.tsx

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/admin/page.tsx:1-25,27,31,32,35`
- Evidence: Lines 1-25 import 18 symbols (`Suspense`, `getTranslations`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Badge`, `Skeleton`, 8 lucide icons, `Link`, and 5 admin component imports); none of them are used in the current empty `<div></div>` body. The `params` argument (line 27) is typed as `Promise<{ locale: string }>` and destructured on line 31, but `locale` is never read. `t = await getTranslations("AdminDashboard")` on line 32 is destructured but never read.
- Impact: Bundle weight for the admin landing route is inflated by imports that the empty body never touches, and ESLint `no-unused-vars` would flag 20+ issues. There is no Primary-specific reason to keep them — they are leftovers from the commented-out implementation.
- Recommendation: Either restore the implementation (so the imports are used) or strip them. Document the intentional divergence only if a partial restoration is queued.

### LR-primary-advantage-007-008 — Entire admin page body is a placeholder returning `<div></div>`

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/page.tsx:34-35,172`
- Evidence: Line 34-35 returns `<div></div>` as the entire page body. The only useful JSX in the file is the trailing semicolon-style syntax error (finding 006) and the three Skeleton functions (lines 176-223). The page exposes nothing actionable to a school admin landing on `/en/admin` (the route resolved by `[locale]/admin/page.tsx`). The legacy implementation is preserved only as a commented-out block (lines 36-171), so there is no way to recover the admin dashboard without uncommenting and fixing that block.
- Impact: School admins see an empty page when they visit the admin root, which is a fork-specific regression — the equivalent Reading Advantage route (`apps/reading-advantage/app/[locale]/admin/page.tsx`) renders a working dashboard. The reading-advantage app also has a system dashboard at `/system/dashboard` (line 10 of `app/[locale]/system/dashboard/page.tsx` in primary-advantage references it), but the primary-advantage variant leaves `/admin` empty.
- Recommendation: Either (a) restore the commented-out implementation after fixing the syntax error, (b) add `redirect("/admin/dashboard")` as the page body, or (c) remove this file entirely and rely on the `app/[locale]/admin/dashboard/page.tsx` route as the only admin entry. Document the chosen path in `workflow-map.md` and the admin page-config.

### LR-primary-advantage-007-009 — Unused lucide imports in add student page

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/admin/students/add/page.tsx:29`
- Evidence: Line 29 imports `{ Eye, EyeOff, User, Mail, Lock, GraduationCap }` from `lucide-react`. Of these, only `User` (lines 93, 112) and `Mail` (line 136) are used. `Eye`, `EyeOff`, `Lock`, and `GraduationCap` are imported but never referenced in the file. The page does not show/hide a password field (the schema at lines 38-41 has only `name` and `email`), so `Eye`/`EyeOff` are dead; `Lock` would be used for a password input; `GraduationCap` is the student-side icon, not relevant for the admin add-student form.
- Impact: Bundle weight for the admin add-student route is inflated by 4 unused icon imports. Lint will flag them as `no-unused-vars`.
- Recommendation: Remove `Eye, EyeOff, Lock, GraduationCap` from the lucide import on line 29. If a password/role expansion is queued, add a TODO comment explaining the intentional divergence.

### LR-primary-advantage-007-010 — Add-student form posts only name + email; no classroom or role selection

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/admin/students/add/page.tsx:38-41,53-65,89-152`
- Evidence: The Zod schema (lines 38-41) defines only `name` and `email`. The form (lines 89-152) renders only two `FormField`s. The `fetch("/api/students", { method: "POST", body: JSON.stringify({ name, email }) })` call (lines 56-65) sends only those two fields. There is no classroom selector, no role selector, no parent/guardian email, no consent flag, no date-of-birth. The success branch (line 73-75) toasts and redirects to `/admin/students`; the failure branch (line 76-78) shows the error. The Reading Advantage equivalent (referenced in batch 006's `app/[locale]/admin/dashboard/students/page.tsx:552` line count) uses a more complete admin form.
- Impact: A school admin onboarding a new primary-age student cannot assign the student to a classroom or set their role from this form. The server `/api/students` is forced to invent defaults, leaving unassigned primary students potentially visible to the entire school. This is a primary-student adaptation risk because the data model is sensitive (age, classroom, guardian consent), and the form is missing the minimum viable fields for safe onboarding.
- Recommendation: Add `classroomId` (Select populated from `db.select().from(classrooms)` server-side) and `role` (`Select` with `student | teacher | admin` options) to the schema and form. For primary-age students, also collect `dateOfBirth` and a `parentEmail` consent field. Validate on the server before insert.

### LR-primary-advantage-007-011 — Add-student form has no client-side tenant/school scoping visible

- Severity: Low
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/admin/students/add/page.tsx:1-82,84-179`
- Evidence: The page is a client component (`"use client"` on line 1). It does not read the current user's `schoolId` from any session/cookie; it does not check that the user is an admin; it does not include the `schoolId` in the POST body. Tenant isolation depends entirely on the server route `/api/students` enforcing `user.schoolId === student.schoolId`. The form's data flow is: form fields → JSON.stringify → fetch POST. There is no CSRF token, no Idempotency-Key, and no auth header (`Authorization`, `Cookie` is implicit).
- Impact: If the server route forgets to scope by `schoolId`, a cross-tenant insert is possible. The Drizzle migration flagged this risk for shared package work. For a primary-school admin, inserting a student into the wrong school (or no school) is a privacy bug, not just a UI issue.
- Recommendation: Either (a) move this to a Server Action that calls `requireRole("admin")` and `assertCan(user, "student:create", tenant)` before the insert, or (b) read the current session via a `useSession()` hook and pass `schoolId` explicitly. Add a CSRF token to the fetch.

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/admin/layout.tsx`: reviewed line-by-line; the file is a thin wrapper that delegates to `@/components/shared/app-layout` with `adminPageConfig.mainNav` and `adminPageConfig.sidebarNav` and a `disableLeaderboard` flag. No dead imports, no inline DB access, no role checks missing (delegated to AppLayout). The file relies on the shared layout for auth/tenant, which is the expected pattern.
- `apps/primary-advantage/app/[locale]/admin/students/classrooms/page.tsx`: reviewed line-by-line; renders a `Header`, `Separator`, and `ClassroomsTable` from `@/components/admin/classrooms-table`. i18n key prefix `Admin.Classrooms` is consistent with sibling admin pages. No findings.
