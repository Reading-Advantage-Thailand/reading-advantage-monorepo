# Line Review Evidence: primary-advantage-009

Reviewer: measure-jr-green/primary-advantage-009
Files assigned: 10
Lines assigned: 546

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx` | 1-324 | reviewed | 4 |
| `apps/primary-advantage/app/[locale]/admin/teachers/page.tsx` | 1-16 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/auth/error/page.tsx` | 1-9 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/auth/forgot-password/page.tsx` | 1-5 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/auth/layout.tsx` | 1-45 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/auth/signin/page.tsx` | 1-30 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/auth/signup/page.tsx` | 1-5 | reviewed | 0 |
| `apps/primary-advantage/app/[locale]/layout.tsx` | 1-86 | reviewed | 2 |
| `apps/primary-advantage/app/[locale]/system/dashboard/page.tsx` | 1-10 | reviewed | 1 |
| `apps/primary-advantage/app/[locale]/system/layout.tsx` | 1-16 | reviewed | 0 |

## Findings

### LR-primary-advantage-009-001 — Add-teacher form posts to a route handler via fetch instead of a Next.js Server Action

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:81-114`
- Evidence: `onSubmit` (line 81) calls `fetch("/api/teachers", { method: "POST", ... })` on lines 84-95, then `await response.json()` on line 97. The route handler at `apps/primary-advantage/app/api/teachers/route.ts:13-15` delegates to `createTeacherController`. The root `AGENTS.md` ("Route Handlers vs API Services") states Route Handlers are for "App-local endpoints, UI-driven workflows" but the same root policy also says core business logic "must be callable from Next.js Server Actions, Route Handlers, Workers, Cron jobs, CLI tools, Tests, HTTP adapters, tRPC adapters" — i.e. the recommended primary path for UI-driven mutations in App Router is a Server Action. The page-level form lives in a `"use client"` component (line 1) so it would need to call a Server Action via `import { createTeacherAction } from "@/actions/teachers"`. None exists; instead a route-handler+JSON-contract path is used. Other Add pages in this fork (e.g. the admin/articles flow reviewed in batch 006) follow the same fetch pattern, so this is a fork-wide fork-specific regression, not a single-file mistake.
- Impact: Two transports (`fetch /api/...` and a Server Action) for the same mutation increase the surface area. Server Actions give us CSRF protection, automatic revalidation, and the ability to invoke server-only code without exposing a JSON contract; this page forfeits all three. The route handler also returns `application/json` (line 97) which the client then deserializes, a pattern that is brittle to error-shape changes.
- Recommendation: Move the create-teacher flow into a Server Action colocated with the controller (e.g. `apps/primary-advantage/actions/create-teacher-action.ts`) that re-uses `createTeacherController` and call it via `await createTeacherAction(formData)` from `onSubmit`. Keep the controller intact so the legacy `/api/teachers` POST still works for external clients during migration, but retire it for the UI.

### LR-primary-advantage-009-002 — Add-teacher role select hardcodes only "teacher" and "admin"; misses other roles the system supports

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:182-213`
- Evidence: Lines 203-208 hardcode `<SelectItem value="teacher">` and `<SelectItem value="admin">` inside the role `<FormField>` (lines 182-213). The shared `packages/db/src/schema/primary.ts` referenced in `apps/primary-advantage/AGENTS.md:34` exports a `Role` enum (and `UserRole`) and an additional `SchoolAdmins` table is mentioned for system-level admins. The form's `role: z.string().min(1, ...)` Zod schema on line 58 only enforces non-emptiness — the dropdown is the only place a value is sourced, and it has no way to surface `SchoolAdmins` or any other role added by the shared package. The Zod schema also does not constrain the role to a known enum value, so a value that does not exist in the database can still be submitted and validated client-side.
- Impact: When the shared package adds new roles (e.g., a `SchoolAdmin` role for multi-tenant administration of primary-student schools), the Add-Teacher page will silently drop them from the UI while still allowing arbitrary strings client-side. This blocks the shared package migration for any role-rich feature and is a tenant-scoping risk — the wrong role could be assigned to a teacher whose actual duties only cover one school.
- Recommendation: Move the role list into a shared constant exported from the same module as the `Role` enum (e.g. `export const ROLE_VALUES = ["teacher", "admin", "schoolAdmin"] as const` in `packages/db/src/schema/primary.ts`), iterate it to render the `<SelectItem>`s, and tighten the Zod schema with `z.enum(ROLE_VALUES)`. Make the values an inferred type so future role additions surface here automatically.

### LR-primary-advantage-009-003 — Free-form `console.error` in client mutation handler violates root AGENTS.md structured-logging guidance

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:107`
- Evidence: Line 107 inside the catch block reads `console.error("Error creating teacher:", error);`. The root `AGENTS.md` "Logging" section states "Use structured logs. Avoid free-form console logging in production code." The same file otherwise uses Sonner toasts (lines 103, 108-110) for user feedback, so this is a one-off debug-style log left in a production client bundle. There is no structured logger configured for this app to receive the log instead.
- Impact: Free-form `console.error` does not carry request identifiers, user identifiers, operation names, or timing — all of which are required by the root observability section. This is a low-severity issue because the action is recoverable (the user sees a toast), but it is a fork-specific regression against the shared logging contract.
- Recommendation: Replace `console.error` with `logger.error({ op: "teachers.create", userId, schoolId, err: error })` once a shared client-safe logger is added; until then, drop the line entirely because the toast already surfaces the failure to the user.

### LR-primary-advantage-009-004 — Add-teacher payload omits tenant identifier; relies entirely on `/api/teachers` to derive schoolId from session

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:81-114`
- Evidence: The fetch payload on lines 89-94 contains only `{ name, email, role, password }`. There is no `schoolId`, `tenantId`, or any tenant-bound field. The route handler at `apps/primary-advantage/app/api/teachers/route.ts:13-15` delegates to `createTeacherController`, which is not in scope for this batch but is the only place that can enforce a schoolId from the session. The page itself performs no `currentUser()` check; the only auth boundary is the `admin` layout (out of scope for this batch). For a primary-student app where teachers and admins operate strictly inside their school, the absence of a client-side tenant marker is acceptable IF and ONLY IF the controller hard-fails when no session schoolId is present.
- Impact: If the controller forgets the `schoolId` filter — or if the legacy `/api/teachers` POST is reused by another client (e.g. a curl-based integration) — a school admin could create a teacher account attached to the wrong school, or to no school at all. For primary-student deployments this is a PII/safety concern: a teacher at school A could end up with access to school B's class roster.
- Recommendation: Add an integration test that asserts `createTeacherController` rejects (or scopes to `null`) requests with no authenticated session, and document the tenant boundary in the page's JSDoc. Optionally, pass the page's session-derived `schoolId` through a hidden field on the form so the server can compare it against the session to detect drift.

### LR-primary-advantage-009-005 — Auth error page renders hardcoded English; sibling auth/signin uses next-intl

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/auth/error/page.tsx:1-9`
- Evidence: Lines 4-5 render literal English strings `<h1>Authentication Error</h1>` and `<p>There was an error during the authentication process.</p>`. The sibling signin page at `apps/primary-advantage/app/[locale]/auth/signin/page.tsx:8` calls `await getTranslations("AuthPage.signin")` and consumes translated strings. `apps/primary-advantage/AGENTS.md:12` mandates `next-intl for i18n`. The auth/error page is the only page in the `[locale]/auth/` segment without translations. The page is also referenced as an `AuthErrorPage` default-exported component elsewhere in the app (e.g. `evidence/primary-advantage-005.md:119` documents a parent reading page returning it for a missing-activity case), which makes the lack of translations more impactful.
- Impact: Operators in non-English locales see the auth-error page in English even though every neighboring auth surface is localized. More importantly, when `AuthErrorPage` is returned inside a student-facing page (e.g. reading flow) the embedded English error text leaks into the primary-student experience.
- Recommendation: Add an `AuthPage.error` namespace in `messages/<locale>.json` with `heading` and `description`, and have the page call `await getTranslations("AuthPage.error")` like `signin/page.tsx:8` does. If English-only is intentional, document the decision in `apps/primary-advantage/AGENTS.md` next to the next-intl declaration.

### LR-primary-advantage-009-006 — Auth error page provides no error context, recovery links, or role-aware messaging

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/auth/error/page.tsx:1-9`
- Evidence: The component returns a static `<div><h1>Authentication Error</h1><p>There was an error during the authentication process.</p></div>` (lines 3-6) with no `useSearchParams`/search-param read, no link back to `/auth/signin` or `/auth/forgot-password`, no role-aware branching, and no error-code rendering. Reading Advantage's auth-error page (the comment on line 18 of `auth/layout.tsx` and the broader Reading Advantage pattern) surfaces the error code or at least a recovery link.
- Impact: A primary student who mistypes their password and lands here gets no actionable next step. A parent assisting a child has no idea whether to retry, reset, or contact the school. The page is reachable both directly via `/auth/error` and as a fallback render from other pages (batch 005 documents this), so the impact is broader than the route itself suggests.
- Recommendation: Read `searchParams.error` (NextAuth's standard convention) and switch on the code, then render a localized heading, a localized body, and links to `/auth/signin` and `/auth/forgot-password`. Keep the tone age-appropriate (a "Try again" button for kids, an admin note for teachers).

### LR-primary-advantage-009-007 — Auth layout carries a commented Reading Advantage storage URL — fork-divergence evidence

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/[locale]/auth/layout.tsx:18`
- Evidence: Line 18 reads `// src="https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/article-images/3OdR9eoaNqmHfxV3KnHW.png"`. This is a comment that records the Reading Advantage GCS bucket (`artifacts.reading-advantage.appspot.com`) — the parent project's storage — and was clearly swapped out for the local `/login-image.png` (line 19) when this fork was created. There is no reading-advantage file in this fork's layout; the comment is the only remaining evidence that the original referenced the parent's bucket. The comment itself contains an asset ID (`3OdR9eoaNqmHfxV3KnHW.png`) that exposes the parent project's internal asset naming.
- Impact: Reading Advantage storage bucket name is leaked into a primary-student-facing file even though the line is commented out. Future maintainers may be tempted to re-enable it, which would (a) introduce a cross-project fetch dependency, (b) breach the storage-neutrality rule in the root `AGENTS.md` ("Storage: Use S3-compatible object storage through an internal adapter"), and (c) ship the wrong branding image because the bucket belongs to the parent project, not to primary-advantage. The same root cause exists in Reading Advantage (the bucket still exists); the fork-specific issue is that the primary-advantage fork propagated the bucket reference downstream instead of replacing it cleanly.
- Recommendation: Delete line 18 entirely. The active `src` on line 19 is the only image this layout loads; the comment adds no documentation value.

### LR-primary-advantage-009-008 — Root locale layout hardcodes English SEO keywords regardless of locale

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/layout.tsx:20-46`
- Evidence: The exported `metadata` constant (lines 20-46) sets `title.default = siteConfig.name`, `description = siteConfig.description`, and `keywords: ["primary advantage", "primary", "advantage", "primary advantage app", "primary advantage web"]` (lines 26-32). `siteConfig` is imported from `@/configs/site-config` (line 6). The `keywords` array is hardcoded English and does not consult the `locale` from `params` (lines 53-56). For Thai or other localized deployments the SEO keywords stay in English.
- Impact: Non-English locales will see English SEO keywords in the page metadata. This is intentional for some SEO strategies (English keywords can drive cross-language discovery), but is undocumented. It is not a bug per se.
- Recommendation: Either move the keywords into a per-locale dictionary (e.g. `siteConfig.keywordsByLocale[locale]`) so they switch with locale, or add a one-line comment above the `keywords` array documenting the intentional English-only SEO strategy.

### LR-primary-advantage-009-009 — Root locale layout has commented-out PWA manifest and openGraph metadata; PWA install is not supported

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/layout.tsx:33-45`
- Evidence: Lines 33-40 contain a commented-out `openGraph: { ... }` block and lines 44-45 a commented-out `manifest: ...` line that points at `siteConfig.url + "/site.webmanifest"` and `localhost:3000/site.webmanifest`. The `icons` block on lines 41-43 is the only live metadata. The page does not render a `<link rel="manifest">` anywhere in the JSX.
- Impact: The app cannot be installed as a PWA on iOS/Android home screens, even though primary-student usage may benefit from installable shortcuts. OpenGraph previews shared on social media will fall back to defaults. This is a feature gap, not a bug.
- Recommendation: Either enable the openGraph block (pointing at a real `siteConfig.url`) and ship a `/site.webmanifest` to enable PWA install, or document the intentional decision in `apps/primary-advantage/AGENTS.md` and link the AGENTS file from this layout's JSDoc.

### LR-primary-advantage-009-010 — System dashboard header copy is hardcoded English; app-wide pattern uses next-intl

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/[locale]/system/dashboard/page.tsx:1-10`
- Evidence: Line 7 passes literal English `heading="System Dashboard"` and `text="System Dashboard Description"` to `<Header />`. The sibling admin pages in the same app use `getTranslations`: `app/[locale]/admin/article-creation/page.tsx:7-15` calls `getTranslations("AdminArticleCreationPage.header")` (covered in batch 006), and the same pattern is used by `app/[locale]/admin/teachers/page.tsx:8` (in this batch). The whole app is documented to use `next-intl` per `apps/primary-advantage/AGENTS.md:12`. The system dashboard is the only top-level page in the `[locale]/system/` segment that does not localize its header.
- Impact: System operators in non-English locales see English chrome on the system dashboard while every other localized page around it switches correctly. For a fork whose entire value proposition is localized primary-student content, this English header is a noticeable inconsistency.
- Recommendation: Add a `SystemDashboardPage.header` namespace in `messages/<locale>.json` and switch the page to an async server component that calls `await getTranslations("SystemDashboardPage.header")` like the rest of the system pages; if English-only is intentional, document it in `apps/primary-advantage/AGENTS.md`.

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/admin/teachers/page.tsx`: reviewed line-by-line (lines 1-16). Async server component that loads `AdminTeachers.page` translations (line 8) and renders `<Header>` + `<Separator>` + `<TeachersTable />`. No auth/role check in this file (the admin layout is responsible for the boundary). Clean — no findings.
- `apps/primary-advantage/app/[locale]/auth/forgot-password/page.tsx`: reviewed line-by-line (lines 1-5). Pure passthrough rendering `<UserResetPassForm />` from `@/components/auth/user-reset-pass-form` (line 1). The component encapsulates form, validation, and password-reset flow. No findings.
- `apps/primary-advantage/app/[locale]/auth/signin/page.tsx`: reviewed line-by-line (lines 1-30). Async server component (line 7) that loads `AuthPage.signin` translations and renders a shadcn `Tabs` with two panels (student and teacher sign-in forms) using localized trigger labels and lucide icons (`BookTextIcon`, `SchoolIcon`). The role split (student vs teacher) is itself a primary-student adaptation worth noting: Reading Advantage's signin is single-form; here it explicitly distinguishes student signin from teacher signin. No findings for this batch (the adaptation is intentional and well-localized).
- `apps/primary-advantage/app/[locale]/auth/signup/page.tsx`: reviewed line-by-line (lines 1-5). Pure passthrough rendering `<SignUpForm />` from `@/components/auth/user-signup-form`. No findings.
- `apps/primary-advantage/app/[locale]/system/layout.tsx`: reviewed line-by-line (lines 1-16). Async server component that composes `<AppLayout>` from `@/components/shared/app-layout` and passes `systemPageConfig.mainNav`, `systemPageConfig.sidebarNav`, and `disableLeaderboard` (lines 9-12). The `disableLeaderboard` prop is a fork-specific decision: system pages should not show a primary-student leaderboard. No findings.