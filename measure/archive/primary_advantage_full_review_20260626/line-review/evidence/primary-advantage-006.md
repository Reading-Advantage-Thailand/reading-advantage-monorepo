# Line Review Evidence: primary-advantage-006

Reviewer: measure-jr-green/primary-advantage-006
Files assigned: 4
Lines assigned: 660

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/admin/article-creation/page.tsx` | 1-16 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/admin/dashboard/page.tsx` | 1-75 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx` | 1-552 | reviewed | 6 |
| `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx` | 1-17 | reviewed | 3 |

## Findings

### LR-primary-advantage-006-001 — Hardcoded placeholder statistics on admin dashboard; no data fetch wired

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/page.tsx:20-74`
- Evidence: `DashboardPage` (lines 20-74) is a server component that renders three stat cards with literal strings: "Total Students" → `100` (lines 33-36), "Total Teachers" → `5` (lines 45-48), and "Active This Week" → `100%` (lines 57-62). There is no `db.select()`, no server action call, no fetch, and no prop plumbing from the page to the imported `WeeklyActivityChart` / `ClassEngagementChart` / `ActivityMetricsChart` / `ActivitySummaryCards` (lines 4-9, 66-71). The page returns a fully rendered dashboard whose numbers are JS literals.
- Impact: The admin dashboard is decorative — the displayed counts and the "100% active this week" claim have no basis in the database. An admin relying on this page to make scheduling or staffing decisions for primary-student programs will act on fabricated data. This regresses from the expected Reading Advantage dashboard behavior, where cards are populated from real queries.
- Recommendation: Replace the literals with a server-side Drizzle query (e.g., `db.select({ count: count() }).from(users).where(eq(users.role, "student"))` and equivalent for teachers, scoped by `users.schoolId`) and pass the result into the card bodies; drop the hardcoded "100%" claim.

### LR-primary-advantage-006-002 — Hardcoded English header copy diverges from sibling admin pages that use `getTranslations`

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/page.tsx:23`
- Evidence: Line 23 passes literal English strings `heading="Admin Dashboard"` and `text="Admin Dashboard Description"` to `<Header />`. The sibling admin page `app/[locale]/admin/article-creation/page.tsx:7-15` (batch 006) uses `getTranslations("AdminArticleCreationPage.header")` and renders translated `t("heading")` / `t("text")`. The whole app uses `next-intl` per `apps/primary-advantage/AGENTS.md:12` ("next-intl for i18n"). This page is the outlier in the admin section.
- Impact: Operators viewing the admin dashboard in any non-English locale see mixed-language chrome — the header copy will not switch with the locale switcher, while every other admin page does. Either this is an intentional English-only surface (and should be documented as such) or it is an incomplete migration that needs to be aligned with the i18n pattern.
- Recommendation: Either add an `AdminDashboardPage.header` namespace in the `messages/` JSON files and call `getTranslations("AdminDashboardPage.header")` here, or document the intentional English-only decision in `apps/primary-advantage/AGENTS.md`.

### LR-primary-advantage-006-003 — Entire student-management UI is commented out behind an early-return placeholder

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:205,207-551`
- Evidence: Line 205 returns `<div>Students</div>` and short-circuits the function. Lines 207-551 (≈345 lines) contain the actual management UI (header, KPI cards, Add Student dialog, edit dialog, delete confirmation, full table) entirely commented out, including the JSX that consumes the `students` state, `formData`, `isAddDialogOpen`, `isEditDialogOpen`, `editingStudent`, and the CRUD handlers defined on lines 107-189. The component therefore renders only the literal text `Students` and exposes no admin functionality.
- Impact: The route `/{locale}/admin/dashboard/students` is effectively a placeholder. There is no way for an admin to list, search, add, edit, or delete primary-student accounts from this page, even though the URL is linked from the admin layout (batch 007) and the admin nav (batch 045). This regresses from the documented Reading Advantage admin workflow.
- Recommendation: Either delete the entire commented-out block and rewrite the page against Drizzle queries (`db.select().from(users).where(eq(users.role, "student"))` scoped by `schoolId`), or restore the live JSX and replace the fake sample data with a real fetch + server action flow.

### LR-primary-advantage-006-004 — Mass of unused UI imports on the students page

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:2-52`
- Evidence: Lines 2-52 import `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Input`, `Label`, the full `Table`/`TableBody`/`TableCell`/`TableHead`/`TableHeader`/`TableRow` set, `Dialog` and its 5 sub-components, `AlertDialog` and its 7 sub-components, `Select` and its 3 sub-components, `Badge`, plus seven `lucide-react` icons (`BookOpen`, `Clock`, `TrendingUp`, `Users`, `Plus`, `Edit`, `Trash2`). The only JSX actually rendered (line 205) is `<div>Students</div>`, which uses none of these imports. Combined with the `"use client";` directive on line 1, the entire client bundle for this page ships unused Radix + lucide code paths.
- Impact: Bundle weight and tree-shaking failure surface. ESLint with `no-unused-vars` and `import/no-unused-modules` (which the monorepo enables per `pnpm turbo run lint`) will fail on this file until the imports are pruned or the UI is restored.
- Recommendation: Either drop the unused imports immediately (preferred for the placeholder state) or restore the live UI that consumes them (preferred for functional correctness) so the imports have a purpose again.

### LR-primary-advantage-006-005 — Hardcoded sample student data with no API call

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:75-104`
- Evidence: Line 76 initialises `useState<Student[]>` with three fabricated students (`John Doe`, `Jane Smith`, `Mike Johnson`) using `@example.com` emails and literal CEFR/XP/createdAt values. There is no `useEffect` fetch, no server action, no Drizzle query, and no SWR/React Query call in the file. The handlers on lines 135-189 mutate this fake array in-memory only.
- Impact: Even if the commented-out UI were uncommented tomorrow, the table would show three hand-typed example accounts forever — and any new student added through the dialog (lines 135-149) would disappear on page reload because there is no persistence layer. An admin would believe they had created real accounts when none were written to the database. This is a fork-specific regression; Reading Advantage's equivalent page is backed by Prisma/Drizzle reads.
- Recommendation: Replace the literal array with a server-side fetch (or server-action-driven `useEffect` with SWR) against `db.select().from(users).where(eq(users.role, "student"))` and scope it by `users.schoolId`. Move mutations to server actions instead of in-memory `setStudents`.

### LR-primary-advantage-006-006 — Student interface lacks schoolId; tenant scoping absent for primary-student PII

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:55-72,135-149,187-189`
- Evidence: The `Student` interface (lines 56-64) defines only `id, name, email, cefrLevel, xp, role, createdAt` — no `schoolId`, no tenant scoping field, no classroom join. `handleAddStudent` (lines 135-149) and `handleDeleteStudent` (lines 187-189) operate purely against the local fake array. The root `AGENTS.md` multi-tenancy rule requires every query to be scoped by `schoolId`. There is no place on the page where a tenant boundary is enforced.
- Impact: If the commented-out UI is restored without adding schoolId, an admin viewing this page could see students from any school in the database — a serious PII risk for primary-student records. Even after restoration, the missing field means client code cannot tell which school a row belongs to, so cross-tenant enrollment, reporting, and deletion actions become possible.
- Recommendation: Add `schoolId: string` (and ideally `classroomId` plus a join to `classrooms`) to the `Student` interface, scope every Drizzle read/write through `eq(users.schoolId, tenant.schoolId)` or the shared `createTenantDB` helper described in the root `AGENTS.md`, and surface the school context in the table UI.

### LR-primary-advantage-006-007 — Page export name `DashboardPage` is misleading inside the students route

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:74`
- Evidence: The exported function on line 74 is named `DashboardPage` even though the file lives at `app/[locale]/admin/dashboard/students/page.tsx`. The parent file `app/[locale]/admin/dashboard/page.tsx:20` (batch 006) already exports a function with the same `DashboardPage` name. The route segment convention in this app is to name the function after its segment (e.g., `StudentsPage`, `TeachersPage`).
- Impact: Confuses stack traces, devtools, and code search. Two identically named `DashboardPage` symbols in adjacent files invites incorrect copy-paste during future edits. Not security-critical, but a regression versus the sibling `teachers/page.tsx:6` (`TeachersPage`) and `article-creation/page.tsx:7` (`ArticleCreationPage`).
- Recommendation: Rename this file's default export to `StudentsDashboardPage` (or `StudentsPage`) and update any devtools/internal references accordingly.

### LR-primary-advantage-006-008 — Dead state setters and form handlers behind early return

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:107-204`
- Evidence: `isAddDialogOpen`/`isEditDialogOpen`/`editingStudent` (lines 107-109), `formData` and `handleInputChange` (lines 112-122), `resetForm` (lines 125-132), `handleAddStudent` (lines 135-149), `handleEditStudent` (lines 152-161), `handleUpdateStudent` (lines 164-184), `handleDeleteStudent` (lines 187-189), and `getRoleBadgeVariant` (lines 192-203) are all defined in the component body but are never invoked because the JSX that consumes them is commented out and the early return on line 205 short-circuits the render.
- Impact: ~100 lines of dead code. The functions reference the fake `students` state, so even if they were wired up they would not touch the database. Reviewers and future maintainers will waste time reading dead handlers and may believe the feature is half-implemented when in fact it is fully stubbed-out.
- Recommendation: Either remove these handlers together with the commented-out UI until the feature is ready to be re-implemented, or uncomment the JSX and rewire the handlers to server actions over Drizzle.

### LR-primary-advantage-006-009 — `<TeachersTable />` is commented out; teachers page is an empty placeholder

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx:14`
- Evidence: Line 14 is `{/* <TeachersTable /> */}`. The component is imported on line 1 from `@/components/admin/teachers-table` (batch 024) but is never rendered. The page therefore renders only `<Header>` (lines 9-12) and `<Separator>` (line 13), with no actual teacher management UI.
- Impact: The `/{locale}/admin/dashboard/teachers` route is a placeholder shell. An admin navigating to it sees a title and a separator line and nothing else — there is no way to list, search, add, edit, or deactivate teacher accounts from this page. This regresses from the Reading Advantage admin-teacher workflow and leaves a critical admin role-management surface empty.
- Recommendation: Either restore `<TeachersTable />` once batch 024's component is production-ready and the page is wired to a server-side fetch, or document the route as intentionally hidden and remove the link from the admin nav (batch 045) until then.

### LR-primary-advantage-006-010 — Hardcoded English header copy on the teachers page

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx:9-12`
- Evidence: `<Header heading="Teachers Management" text="Manage teachers and their access to the system" />` on lines 9-12 uses English literals. The sibling admin pages use `getTranslations(...)`: `admin/article-creation/page.tsx:7-8` calls `getTranslations("AdminArticleCreationPage.header")`, and the rest of the app follows `next-intl` (see `apps/primary-advantage/AGENTS.md:12`). This page is not covered by any locale namespace.
- Impact: Same shape as LR-primary-advantage-006-002 — the header copy will not switch with the locale switcher, while every other admin page does. For Thai or other non-English operators viewing this page the chrome is mixed-language.
- Recommendation: Add an `AdminTeachersPage.header` namespace in `messages/` and call `getTranslations("AdminTeachersPage.header")`, or document the intentional English-only decision in `apps/primary-advantage/AGENTS.md`.

### LR-primary-advantage-006-011 — Stale `TeachersTable` import on a page that never renders it

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx:1,14`
- Evidence: Line 1 imports `{ TeachersTable }` from `@/components/admin/teachers-table`, but line 14 renders `{/* <TeachersTable /> */}`. The import is therefore dead, and ESLint's `import/no-unused-modules` (enabled via `pnpm turbo run lint`) will flag the import until either the JSX is restored or the import is dropped.
- Impact: Lint failure + bundle-time tree-shaking noise. Reviewers reading the file are led to believe the table is wired up when it is not.
- Recommendation: When the table is ready to be restored, uncomment line 14. If the page is intentionally hidden for now, drop line 1 and the comment on line 14.

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/admin/article-creation/page.tsx`: reviewed line-by-line (lines 1-16). Standard async server component that imports `AdminArticleCreation` from `@/components/admin/article-creation` (batch 022), wraps it in `<Header>` + `<Separator>` + the component, and pulls the header strings through `getTranslations("AdminArticleCreationPage.header")`. No in-page auth/role check, but the admin layout (batch 007) is responsible for that boundary and is not in scope for this batch. No findings.
