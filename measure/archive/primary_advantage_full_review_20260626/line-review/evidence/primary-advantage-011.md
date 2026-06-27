# Line Review Evidence: primary-advantage-011

Reviewer: measure-jr-green/primary-advantage-011
Files assigned: 10
Lines assigned: 300

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/system/test/upload-test.tsx` | 1-51 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/teacher/assignments/[id]/page.tsx` | 1-5 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/teacher/assignments/page.tsx` | 1-14 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/enrollment/page.tsx` | 1-157 | reviewed | 3 |
| `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/page.tsx` | 1-13 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/teacher/class-roster/page.tsx` | 1-12 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/teacher/dashboard/page.tsx` | 1-6 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/teacher/layout.tsx` | 1-16 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/teacher/my-classes/page.tsx` | 1-13 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/teacher/my-students/page.tsx` | 1-13 | reviewed | 1 |

## Findings

### LR-primary-advantage-011-001 — Teacher layout drops auth + role + license checks present in Reading Advantage

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/teacher/layout.tsx:1-16`
- Evidence: Lines 1-16 define a server-rendered layout that wraps `children` in `<AppLayout mainNavConfig={teacherPageConfig.mainNav} sidebarNavConfig={teacherPageConfig.sidebarNav} disableLeaderboard>`. There is no call to `getCurrentUser()` / `currentUser()`, no `redirect("/auth/signin")` for anonymous visitors, no license-expiry check, and no `Role` enum check. The Reading Advantage equivalent at `apps/reading-advantage/app/[locale]/(teacher)/teacher/layout.tsx:10-24` runs the user through `getCurrentUser()` and rejects with `redirect("/auth/signin")` on null (line 12-14), then enforces a license-expiry check `new Date(user.expired_date) < new Date()` (line 15-17) with a fallback `/contact` redirect, then enforces a role allow-list of `SYSTEM | TEACHER | ADMIN` (line 18-24). Primary Advantage re-uses the same `teacherPageConfig` symbol but the layout body that consumed it was stripped. Note also the field-name drift: Reading Advantage reads `teacherPageConfig.teacherSidebarNav` (line 29) while Primary Advantage reads `teacherPageConfig.sidebarNav` (line 10), confirming this is a fork-specific copy that diverged from the shared source.
- Impact: Any visitor, including unauthenticated users, students, or expired-license teachers, can reach every route under `/teacher/*` and render the full `AppLayout` chrome. The `AppLayout` `disableLeaderboard` flag is the only divergence surfaced. This is a primary-student adaptation risk: a student in a primary school could navigate to `/teacher/class-roster` and the layout would not block them. Until the role check is restored, every page in this batch (and the rest of the teacher section) inherits the missing boundary.
- Recommendation: Restore the Reading Advantage pattern in this layout: `const user = await currentUser(); if (!user) redirect("/auth/signin");` plus the license-expiry and role allow-list. Update `teacherPageConfig` so both names (`teacherSidebarNav` and `sidebarNav`) point at the same data, or align Primary Advantage on the Reading Advantage field name. Add a regression test in `apps/primary-advantage/__tests__/teacher-layout.test.tsx` that asserts a 302 to `/auth/signin` for anonymous and a 302 to `/` for non-teacher roles.

### LR-primary-advantage-011-002 — Teacher dashboard renders a static placeholder string

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/teacher/dashboard/page.tsx:1-6`
- Evidence: Lines 1-2 import `currentUser` and `React` but neither is referenced again. Line 5 returns `<div>TeacherDashboard</div>` as the only body. The `export default async function TeacherDashboard()` signature implies an async server component, but no `await` is performed. The Reading Advantage equivalent at `apps/reading-advantage/app/[locale]/(teacher)/teacher/dashboard/page.tsx:69-100` implements a real dashboard: it calls `getCurrentUser()` (line 71), redirects to `/auth/signin` on null (line 73-75), redirects to `/` if the role is not `TEACHER | ADMIN | SYSTEM` (line 78-84), declares `metadata` (line 10-14), and renders a `<Suspense>` boundary around `<TeacherDashboardContent userId={user.id} />` with a `DashboardSkeleton` fallback (line 17-67, 96-98). Primary Advantage has none of these. The two unused imports on lines 1-2 are dead code from the deleted implementation.
- Impact: When a teacher logs in and clicks the dashboard link, the page is a static placeholder. There is no KPI grid, no class activity, no AI insights. This is a clear fork-specific regression, not a primary-student adaptation: the same Reading Advantage user journey is broken at the primary-advantage fork.
- Recommendation: Either delete the file and rely on the existing teacher pages (class-roster, my-classes, my-students) as the only teacher entry, or restore the Reading Advantage implementation by re-importing `TeacherDashboardContent`, `DashboardSkeleton`, the role check, and the i18n scoped translator. Remove the unused `currentUser` and `React` imports once the body is fixed.

### LR-primary-advantage-011-003 — Teacher assignments page checks authentication but not role

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/teacher/assignments/page.tsx:1-14`
- Evidence: Lines 6-11 define `async function AssignmentsPage()` that awaits `currentUser()` and renders `AuthErrorPage` on null. There is no role check after line 11 — the page renders `<Assignments />` for any authenticated user. The Reading Advantage equivalent at `apps/reading-advantage/app/[locale]/(teacher)/teacher/assignments/page.tsx` does not even have an auth check (it relies on the layout-level role enforcement at `apps/reading-advantage/app/[locale]/(teacher)/teacher/layout.tsx:18-24`); Primary Advantage has the same gap because LR-primary-advantage-011-001 removed the layout's role check. There is also a structural oddity at line 2: `import AuthErrorPage from "../../auth/error/page"` — this is a server-component file (`async function`, `await currentUser()`) that imports another route's default export as a React component. Cross-route imports of `page.tsx` files are not part of the Next.js App Router contract, and the import path skips the `[locale]` segment (the relative `../../auth/error/page` resolves to the root `auth/error/page` which does not exist in this app — the canonical error route is `app/[locale]/auth/error/page.tsx`, requiring `../../../[locale]/auth/error/page`).
- Impact: Two problems compound: (a) any authenticated student can browse the teacher assignments dashboard, and (b) the import path on line 2 may resolve to a missing file. The `../../auth/error/page` traversal from `app/[locale]/teacher/assignments/page.tsx` lands at `app/[locale]/auth/error/page` only if there is a parallel `auth/error` directory; in this app the file lives at `app/[locale]/auth/error/page.tsx`, so the path is plausible but the import is fragile (any move of the file breaks the assignment page silently). ESLint and the Next.js typed routes will not catch this. Primary-student adaptation risk: students navigating to `/teacher/assignments` will see teacher-specific data flows.
- Recommendation: Move the auth+role enforcement to the shared `teacher/layout.tsx` (per LR-primary-advantage-011-001) and drop the per-page `currentUser` call here. Replace the cross-route `import AuthErrorPage from "../../auth/error/page"` with a dedicated component import from `components/auth/auth-error-page` (or render an inline `<AuthErrorPage />` from the existing `components/auth/` folder). If the relative path is intentional, document why and add a typed-route alias.

### LR-primary-advantage-011-004 — Client-side enrollment fetch has no schema validation; tenant scoping depends entirely on the server

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/enrollment/page.tsx:49-64,116-119`
- Evidence: Lines 49-64 define `fetchClassroom`, which calls `fetch('/api/classroom/${classroomId}')`, checks `response.ok`, then `const data = await response.json()` (line 56) and `setClassroom(data.classroom)`. The local `useState<Classroom | null>(null)` on line 40 is only a TypeScript hint — the runtime data is `any` from `response.json()`. There is no Zod parse, no type guard, no error-shape check (the server may return `{ error: "..." }` with HTTP 200). The `classroomId` from `useParams()` (line 35, 37) is interpolated directly into the URL with no encoding. Lines 116-119 then derive `enrolledStudents` by mapping `classroom.students.map((cs) => ({ ...cs.student, enrolled: true as const }))` — the `enrolled: true as const` is misleading because the server already filtered the array, and the `enrolled` flag is never read by `EnrollmentManagement` (line 147-154) in a way that distinguishes enrolled vs. available students; the flag is dead at the type level.
- Impact: If the `/api/classroom/${classroomId}` server route ever changes its payload, the client will silently render `null` for every field. If a different school's classroom ID is passed, the response is whatever the server returns, so a tenant leak is possible at the API layer (the client has no defense). The `enrolled: true as const` is cosmetic; if `EnrollmentManagement` later expects a union of `{ enrolled: true } | { enrolled: false }`, this mapping is type-incorrect. Drizzle migration work on the shared `classroomStudents` table (`packages/db/src/schema/primary.ts`) cannot be validated from the client because the client does not enforce the shape.
- Recommendation: Parse the response with a Zod schema shared with the route handler (e.g., `ClassroomResponse = z.object({ classroom: ClassroomSchema })`), use `safeParse`, and set explicit error state on failure. Encode `classroomId` with `encodeURIComponent`. Remove the `enrolled: true as const` mapping unless the downstream component actually distinguishes enrolled from available; if it does, expose a Zod-discriminated union. Document the tenant-scoping contract in the route's JSDoc.

### LR-primary-advantage-011-005 — Unused awaited i18n call in classroom detail page

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/page.tsx:3,7`
- Evidence: Line 3 imports `getTranslations` from `next-intl/server`. Line 7 calls `await getTranslations("Teacher.EnhancedClassRoster")` and assigns it to no variable (`// Keep available for future header usage if needed` is the only comment). The result is then discarded. The page body (lines 8-12) renders only `<EnhancedClassRoster />`. The `React` import on line 1 is also unused.
- Impact: A wasted server-side i18n resolution per request adds latency to the classroom detail page. Lint will flag the unused `React` import on line 1 and the unused `await getTranslations` on line 7 (no-unused-vars). The comment claims the call is reserved for a future header, but no `TODO` or tracking issue is referenced. Reading Advantage's equivalent at `apps/reading-advantage/app/[locale]/(teacher)/teacher/class-roster/[classroomId]/page.tsx:1-10` does not call `getTranslations` at all, so the dead call is a fork-specific divergence.
- Recommendation: Drop the `await getTranslations` call and the `getTranslations` import. If a header is actually planned, add a `TODO(issue #)` comment with the originating ticket. Also remove the unused `React` import on line 1.

### LR-primary-advantage-011-006 — Inconsistent i18n key namespaces across teacher pages

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/teacher/my-classes/page.tsx:6`, `apps/primary-advantage/app/[locale]/teacher/my-students/page.tsx:6`
- Evidence: `my-classes/page.tsx:6` calls `await getTranslations("TeacherMyClasses.page")` — a flat camelCase namespace with no dot-separated category. `my-students/page.tsx:6` calls `await getTranslations("teacher.myStudents")` — a lowercase parent with a camelCase child. `class-roster/page.tsx:5` uses `Teacher.ClassRoster` (parent `Teacher`, child `ClassRoster`). `enrollment/page.tsx:38` uses `useTranslations("Teacher.Enrollment")` (client-side). The four pages in this batch use three different namespace shapes for sibling routes.
- Impact: Translation maintainers must add entries under three different parent keys for what is logically the same section. The "TeacherMyClasses" flat key is unique to this app and has no equivalent in the Reading Advantage source (Reading Advantage uses scoped translators via `getScopedI18n`, see `apps/reading-advantage/app/[locale]/(teacher)/teacher/dashboard/page.tsx:8,85`). A primary-language translator (e.g., Thai or Burmese) will need separate translation files for the three namespaces. Fork-specific divergence: the inconsistency is introduced by Primary Advantage's copy/paste approach.
- Recommendation: Pick one of two patterns: (a) use `Teacher.<Section>` everywhere (the convention from `class-roster/page.tsx` and `enrollment/page.tsx`), or (b) use `teacher.<section>` everywhere (the convention from `my-students/page.tsx`). Move all four pages onto the chosen convention. Add an ESLint rule that flags any `getTranslations` call whose key does not match the chosen regex.

### LR-primary-advantage-011-007 — `my-classes` and `my-students` pages rely entirely on layout-level auth (now missing)

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/teacher/my-classes/page.tsx:1-13`, `apps/primary-advantage/app/[locale]/teacher/my-students/page.tsx:1-13`
- Evidence: `my-classes/page.tsx:5-12` and `my-students/page.tsx:5-12` are both `async function` server components that call `await getTranslations(...)` and render `<Header />` plus the feature component (`<MyClasses />`, `<MyStudents />`). Neither page calls `currentUser()` or `redirect()`. The page-level protection depends entirely on `app/[locale]/teacher/layout.tsx` — and per LR-primary-advantage-011-001, that layout has no role or auth check. The Reading Advantage equivalent relies on the layout at `apps/reading-advantage/app/[locale]/(teacher)/teacher/layout.tsx:10-24` which enforces auth, license, and role. Primary Advantage's `my-classes` and `my-students` pages therefore inherit the broken layout.
- Impact: Any anonymous user (and any student) reaching `/teacher/my-classes` or `/teacher/my-students` will see the page rendered. The Header and feature components will attempt to fetch teacher data server-side and may throw a Prisma/Drizzle error (no user in session), revealing a stack trace. Primary-student adaptation risk: students seeing other teachers' classes and rosters is a privacy concern for a primary-school deployment.
- Recommendation: Once the layout fix from LR-primary-advantage-011-001 lands, these pages will be protected transitively. Until then, add a defensive `currentUser()` check at the top of each page that calls `redirect("/auth/signin")` when null, matching the pattern in `assignments/page.tsx:6-11`. Add a follow-up track to remove the per-page check once the layout enforcement is in place.

### LR-primary-advantage-011-008 — Enrollment page sends `classroomId` to API without encoding

- Severity: Low
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/enrollment/page.tsx:35,37,52`
- Evidence: Line 35 calls `useParams()`, line 37 narrows `params.classroomId as string`, and line 52 builds the URL with template literal `'/api/classroom/${classroomId}'`. CUID/UUID values do not need encoding, but if a future ID format allows `/` or `?` (e.g., human-readable slugs), the fetch will route incorrectly. The route handler at `app/api/classroom/[id]/route.ts:66` reads `id` from the URL params and the matching dynamic segment does not normalize the input.
- Impact: Currently safe for the CUID/UUID format used in this app, but fragile against any future ID migration. This is a shared package migration blocker because the shared Drizzle schema's `id` columns are `text` and could accept arbitrary strings in theory.
- Recommendation: Wrap `classroomId` in `encodeURIComponent` on line 52. Add a Zod parse in the route handler that validates the ID format (e.g., `z.string().regex(/^c[a-z0-9]{24,}$/)` for CUIDs).

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/system/test/upload-test.tsx`: reviewed line-by-line; the file is a small client component used by the system dashboard to trigger `uploadArticleImages`, `getDeleteArticleById`, and `deleteArticleFile` from `@/actions/test`. It does not pass any user-controlled file to the server (it relies on the `articleId` from a text input), so it does not introduce a new upload attack surface beyond what already exists in `actions/test.ts`. No role check on this page is consistent with the rest of the `/system/test/` routes (e.g., `audio-test.tsx`, `generate-images.tsx`, `roles-management.tsx`) which are dev-only utility pages. No findings.
- `apps/primary-advantage/app/[locale]/teacher/assignments/[id]/page.tsx`: reviewed line-by-line; the file is a 5-line server component that renders `<AssignmentDashboard />`. The `[id]` segment is preserved by the route folder but the component reads it internally via `useParams()`. The page is a thin pass-through; no findings.
- `apps/primary-advantage/app/[locale]/teacher/class-roster/page.tsx`: reviewed line-by-line; the file is a 12-line server component that renders `<Header />` and `<ClassroomSelector />`. The `await getTranslations("Teacher.ClassRoster")` is correctly assigned to `t` and used on lines 8-9. No findings.
