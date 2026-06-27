# Primary Advantage Line-Review Findings

> **Total:** 893 findings across 102/103 batches (batch 088 has zero findings)
> **Reviewed:** 446 files, 118,709 lines
> **Severity:** Critical 66, High 177, Medium 302, Low 348

## Finding Index by Batch

### Batch 001 (8 findings)

- **[LR-primary-advantage-001-001](evidence/primary-advantage-001.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/Dockerfile:12-18,40-42`
  - Dockerfile still references Prisma despite claimed removal
- **[LR-primary-advantage-001-002](evidence/primary-advantage-001.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/Dockerfile:7-9`
  - Dockerfile uses npm instead of monorepo pnpm
- **[LR-primary-advantage-001-003](evidence/primary-advantage-001.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/actions/article.ts:25-37`
  - Server actions expose article generation/deletion without authorization
- **[LR-primary-advantage-001-004](evidence/primary-advantage-001.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/actions/article.ts:64-83,108-117`
  - getLessonSummaryData lacks tenant/schoolId scoping
- **[LR-primary-advantage-001-005](evidence/primary-advantage-001.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/actions/article.ts:49,132`
  - Server actions use unstructured console.error logging
- **[LR-primary-advantage-001-006](evidence/primary-advantage-001.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/actions/classroom.ts:31-46`
  - Classroom code creation lacks authorization
- **[LR-primary-advantage-001-007](evidence/primary-advantage-001.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/actions/classroom.ts:9-29`
  - Fetch students by class code lacks authorization
- **[LR-primary-advantage-001-008](evidence/primary-advantage-001.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/README.md:73`
  - README and AGENTS.md disagree on authentication stack

### Batch 002 (8 findings)

- **[LR-primary-advantage-002-001](evidence/primary-advantage-002.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/actions/flashcard.ts:441-465`
  - Hardcoded NULL `due`/`state` columns in dashboard query
- **[LR-primary-advantage-002-002](evidence/primary-advantage-002.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/actions/flashcard.ts:1128-1157`
  - `getLessonClozeTestSentences` returns cloze tests with empty `blanks` array
- **[LR-primary-advantage-002-003](evidence/primary-advantage-002.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/actions/flashcard.ts:37,831,962,1105,1183`
  - `NextResponse.json` returned from server actions
- **[LR-primary-advantage-002-004](evidence/primary-advantage-002.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/actions/flashcard.ts:219-220,235,245-247,278-298,322-325,366-374,421-447,460-474,686,696-767,939-945,981-983,999-1011,1047-1055,1070,1124-1126,1139,1142-1155,1202-1204,1220,1225,1235,1243-1247,1269-1271,1304`
  - Heavy `as any` casts indicate incomplete Drizzle port of shared-partial schema
- **[LR-primary-advantage-002-005](evidence/primary-advantage-002.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/actions/flashcard.ts:1329-1400`
  - `completeDeck` XP-awarding function is entirely commented out
- **[LR-primary-advantage-002-006](evidence/primary-advantage-002.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/actions/flashcard.ts:743-803`
  - `reviewCard` returns pre-update card instead of FSRS-computed `updatedCard`
- **[LR-primary-advantage-002-007](evidence/primary-advantage-002.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/actions/flashcard.ts:988-1000,1131-1140,1209-1221`
  - N+1 query pattern in lesson sentence/word fetchers
- **[LR-primary-advantage-002-008](evidence/primary-advantage-002.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/actions/flashcard.ts:4,36`
  - Unused imports `State` and `redirect`

### Batch 003 (13 findings)

- **[LR-primary-advantage-003-001](evidence/primary-advantage-003.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/actions/test.ts:14-132`
  - Test/admin server actions in `actions/test.ts` lack any authorization
- **[LR-primary-advantage-003-002](evidence/primary-advantage-003.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/actions/question.ts:116`
  - `actions/question.ts:116` operator-precedence bug silently zeroes MC XP multiplier
- **[LR-primary-advantage-003-003](evidence/primary-advantage-003.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/actions/user.ts:43,60-80`
  - `actions/user.ts:43` always-empty `isCompleted` defeats `articleActivityLogs` completion tracking
- **[LR-primary-advantage-003-004](evidence/primary-advantage-003.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/actions/singinAction.ts:6-40`
  - `actions/singinAction.ts` accepts but never uses `callbackUrl` and returns no success branch
- **[LR-primary-advantage-003-005](evidence/primary-advantage-003.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/actions/pratice.ts:67-70`
  - `actions/pratice.ts:67-70` server action self-fetches its own API via `NEXT_PUBLIC_APP_URL`
- **[LR-primary-advantage-003-006](evidence/primary-advantage-003.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/actions/pratice.ts:49-56,110-117`
  - `actions/pratice.ts:49-56,110-117` queries `flashcardDecks` without `schoolId` tenant scope
- **[LR-primary-advantage-003-007](evidence/primary-advantage-003.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/actions/question.ts:89-103`
  - `actions/question.ts:97` unsafe `feedback as string` cast in `userActivity.details`
- **[LR-primary-advantage-003-008](evidence/primary-advantage-003.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(index)/layout.tsx:48`
  - `app/[locale]/(index)/layout.tsx:48` strips user fields to satisfy `UserAccountNav` shape
- **[LR-primary-advantage-003-009](evidence/primary-advantage-003.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/(index)/contact/page.tsx:10`
  - `app/[locale]/(index)/contact/page.tsx` hardcodes personal email in source
- **[LR-primary-advantage-003-010](evidence/primary-advantage-003.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/actions/test.ts:25,38,64-66,82-84,90,101,129`
  - `actions/test.ts` uses unstructured `console.log/error` instead of a structured logger
- **[LR-primary-advantage-003-011](evidence/primary-advantage-003.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/actions/test.ts:14-22`
  - `actions/test.ts:14-22` declares but never uses `article` for permission checks in `generateAudios`
- **[LR-primary-advantage-003-012](evidence/primary-advantage-003.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/actions/signupAction.ts:7-27`
  - `actions/signupAction.ts:24-26` discards the created user object
- **[LR-primary-advantage-003-013](evidence/primary-advantage-003.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(index)/authors/page.tsx:5-12`
  - `app/[locale]/(index)/authors/page.tsx` is a placeholder with no i18n

### Batch 004 (12 findings)

- **[LR-primary-advantage-004-001](evidence/primary-advantage-004.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(index)/page.tsx:201-261`
  - Marketing contact form on home page has no submit handler
- **[LR-primary-advantage-004-002](evidence/primary-advantage-004.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(index)/privacy-policy/page.tsx:1-162`
  - Privacy policy is unforked Reading Advantage copy, not Primary Advantage
- **[LR-primary-advantage-004-003](evidence/primary-advantage-004.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/(index)/privacy-policy/page.tsx:126-130`
  - Privacy policy's COPPA section is generic, not adapted for a primary-student product
- **[LR-primary-advantage-004-004](evidence/primary-advantage-004.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(index)/terms/page.tsx:1-136`
  - Terms of service is unforked Reading Advantage copy
- **[LR-primary-advantage-004-005](evidence/primary-advantage-004.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx:1-168`
  - School-profile settings page exposes create/edit/delete to non-admin users via a student route group
- **[LR-primary-advantage-004-006](evidence/primary-advantage-004.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx:114-116`
  - `handleDelete` only clears local state, never calls the API
- **[LR-primary-advantage-004-007](evidence/primary-advantage-004.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx:1-168`
  - School-profile settings page uses client-side `fetch` instead of a server component + Drizzle query
- **[LR-primary-advantage-004-008](evidence/primary-advantage-004.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/settings/user-profile/page.tsx:78-156`
  - Dead Firebase Auth code in user-profile page (lines 78-156)
- **[LR-primary-advantage-004-009](evidence/primary-advantage-004.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/settings/user-profile/page.tsx:42-46, 64-76, 158-219`
  - `DisplaySettingInfo` accepts a `resetPassword` prop but the corresponding UI is commented out
- **[LR-primary-advantage-004-010](evidence/primary-advantage-004.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/settings/user-profile/page.tsx:52-58`
  - `ChangeRole` rendered to students in development allows self-promotion
- **[LR-primary-advantage-004-011](evidence/primary-advantage-004.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/(student)/student/lesson/[id]/page.tsx:7, 30-67`
  - Lesson route handler queries `assignments` by ID without tenant scoping
- **[LR-primary-advantage-004-012](evidence/primary-advantage-004.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/lesson/[id]/page.tsx:32-76`
  - Lesson route renders any article/assignment ID with only an authentication check

### Batch 005 (18 findings)

- **[LR-primary-advantage-005-001](evidence/primary-advantage-005.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/error.tsx:5-30`
  - Article error boundary never sets HTTP 404 status
- **[LR-primary-advantage-005-002](evidence/primary-advantage-005.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/error.tsx:1`
  - `"use client"` directive on a purely presentational error component
- **[LR-primary-advantage-005-003](evidence/primary-advantage-005.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:48-51`
  - Lowercase role string comparison diverges from reading-advantage
- **[LR-primary-advantage-005-004](evidence/primary-advantage-005.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:58-69`
  - Side effect during render: `saveArticleToFlashcard` called inside the page component
- **[LR-primary-advantage-005-005](evidence/primary-advantage-005.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:75-79`
  - `as unknown as Article & { articleActivityLog: any[] }` defeats type safety
- **[LR-primary-advantage-005-006](evidence/primary-advantage-005.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:84-96,129-131`
  - Dead commented-out `PrintArticle`, `ArticleActions`, and `ChatBotFloatingChatButton` blocks
- **[LR-primary-advantage-005-007](evidence/primary-advantage-005.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx:100-115`
  - Unsafe `[0]` access on `article.sentencsAndWordsForFlashcard`
- **[LR-primary-advantage-005-008](evidence/primary-advantage-005.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/page.tsx:40-53`
  - Unauthenticated access on `student/read` and missing tenant scoping
- **[LR-primary-advantage-005-009](evidence/primary-advantage-005.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/page.tsx:45-53`
  - Hardcoded `limit: "10"` and `offset: "0"` pagination
- **[LR-primary-advantage-005-010](evidence/primary-advantage-005.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/page.tsx:17`
  - Unused import `translateAndStoreSentences`
- **[LR-primary-advantage-005-011](evidence/primary-advantage-005.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(student)/student/reports/page.tsx:6,16-18,24-26`
  - `Reports` page renders the auth error page as a fallback
- **[LR-primary-advantage-005-012](evidence/primary-advantage-005.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/reports/page.tsx:14-22`
  - `Reports` page does not scope `fetchUserActivity` by school/tenant
- **[LR-primary-advantage-005-013](evidence/primary-advantage-005.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/sentences/page.tsx:11-13`
  - `Sentences` page has no auth check and exposes all sentence flashcards to anonymous traffic
- **[LR-primary-advantage-005-014](evidence/primary-advantage-005.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/(student)/student/vocabulary/page.tsx:5-19`
  - `Vocabulary` page is publicly accessible and uses a 6-column TabsList for a single tab
- **[LR-primary-advantage-005-015](evidence/primary-advantage-005.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/[...not-found]/layout.tsx:26`
  - `[...not-found]/layout` hardcodes user fields to empty values
- **[LR-primary-advantage-005-016](evidence/primary-advantage-005.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/[...not-found]/page.tsx:1-50`
  - `[...not-found]/page` is a heavy custom 404 that returns HTTP 200
- **[LR-primary-advantage-005-017](evidence/primary-advantage-005.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/[...not-found]/page.tsx:10-18,33-38`
  - `[...not-found]/page` uses `<button>` + `router.back()` instead of the i18n `<Link>`
- **[LR-primary-advantage-005-018](evidence/primary-advantage-005.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/(student)/student/read/loading.tsx:11`
  - `read/loading.tsx` declares `async function` for a component that performs no awaits

### Batch 006 (11 findings)

- **[LR-primary-advantage-006-001](evidence/primary-advantage-006.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/page.tsx:20-74`
  - Hardcoded placeholder statistics on admin dashboard; no data fetch wired
- **[LR-primary-advantage-006-002](evidence/primary-advantage-006.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/page.tsx:23`
  - Hardcoded English header copy diverges from sibling admin pages that use `getTranslations`
- **[LR-primary-advantage-006-003](evidence/primary-advantage-006.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:205,207-551`
  - Entire student-management UI is commented out behind an early-return placeholder
- **[LR-primary-advantage-006-004](evidence/primary-advantage-006.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:2-52`
  - Mass of unused UI imports on the students page
- **[LR-primary-advantage-006-005](evidence/primary-advantage-006.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:75-104`
  - Hardcoded sample student data with no API call
- **[LR-primary-advantage-006-006](evidence/primary-advantage-006.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:55-72,135-149,187-189`
  - Student interface lacks schoolId; tenant scoping absent for primary-student PII
- **[LR-primary-advantage-006-007](evidence/primary-advantage-006.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:74`
  - Page export name `DashboardPage` is misleading inside the students route
- **[LR-primary-advantage-006-008](evidence/primary-advantage-006.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:107-204`
  - Dead state setters and form handlers behind early return
- **[LR-primary-advantage-006-009](evidence/primary-advantage-006.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx:14`
  - `<TeachersTable />` is commented out; teachers page is an empty placeholder
- **[LR-primary-advantage-006-010](evidence/primary-advantage-006.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx:9-12`
  - Hardcoded English header copy on the teachers page
- **[LR-primary-advantage-006-011](evidence/primary-advantage-006.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx:1,14`
  - Stale `TeachersTable` import on a page that never renders it

### Batch 007 (11 findings)

- **[LR-primary-advantage-007-001](evidence/primary-advantage-007.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:124`
  - Trailing space in upload endpoint URL
- **[LR-primary-advantage-007-002](evidence/primary-advantage-007.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:50,52,87,410,411,412,499,500,504`
  - Use of `any` types for upload state
- **[LR-primary-advantage-007-003](evidence/primary-advantage-007.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:118-121,128-130`
  - Fake progress interval independent of network state
- **[LR-primary-advantage-007-004](evidence/primary-advantage-007.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:82-103,113-127`
  - In-memory CSV parsing loads entire file before upload
- **[LR-primary-advantage-007-005](evidence/primary-advantage-007.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/import-data/page.tsx:124,194-242,434-457`
  - Endpoint mismatched with UI label (classes vs. students/teachers)
- **[LR-primary-advantage-007-006](evidence/primary-advantage-007.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/page.tsx:224`
  - Stray backtick + semicolon at end of admin page.tsx
- **[LR-primary-advantage-007-007](evidence/primary-advantage-007.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/admin/page.tsx:1-25,27,31,32,35`
  - Widespread unused imports and unused destructured vars in admin page.tsx
- **[LR-primary-advantage-007-008](evidence/primary-advantage-007.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/page.tsx:34-35,172`
  - Entire admin page body is a placeholder returning `<div></div>`
- **[LR-primary-advantage-007-009](evidence/primary-advantage-007.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/admin/students/add/page.tsx:29`
  - Unused lucide imports in add student page
- **[LR-primary-advantage-007-010](evidence/primary-advantage-007.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/admin/students/add/page.tsx:38-41,53-65,89-152`
  - Add-student form posts only name + email; no classroom or role selection
- **[LR-primary-advantage-007-011](evidence/primary-advantage-007.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/admin/students/add/page.tsx:1-82,84-179`
  - Add-student form has no client-side tenant/school scoping visible

### Batch 008 (18 findings)

- **[LR-primary-advantage-008-001](evidence/primary-advantage-008.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:268-287`
  - `handleAddStudent` never POSTs to the server; the add flow is purely local
- **[LR-primary-advantage-008-002](evidence/primary-advantage-008.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:302-325`
  - `handleUpdateStudent` never sends a PUT request; edits are silently discarded
- **[LR-primary-advantage-008-003](evidence/primary-advantage-008.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:327-332`
  - `handleDeleteStudent` never sends a DELETE request; the delete is optimistic-only
- **[LR-primary-advantage-008-004](evidence/primary-advantage-008.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:268-279,539-550`
  - Form's `role` field is silently dropped by the API contract
- **[LR-primary-advantage-008-005](evidence/primary-advantage-008.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:539-547`
  - Role select offers "admin" to school-level admins; privilege-escalation surface
- **[LR-primary-advantage-008-006](evidence/primary-advantage-008.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:60-71,148-181`
  - No `schoolId`/tenant scoping in the client interface; tenant context invisible to the admin
- **[LR-primary-advantage-008-007](evidence/primary-advantage-008.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:202-215`
  - Search query triggers a fetch on every keystroke; comment claims debounce but no debounce exists
- **[LR-primary-advantage-008-008](evidence/primary-advantage-008.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:270`
  - `id: Date.now().toString()` is a fragile local ID for new students
- **[LR-primary-advantage-008-009](evidence/primary-advantage-008.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:163-180`
  - `fetchStudents` swallows errors with only `console.error`; no user-visible failure feedback
- **[LR-primary-advantage-008-010](evidence/primary-advantage-008.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:461-555,843-928`
  - Form submit button has no `disabled` and inputs have no `required`; empty submissions silently fail
- **[LR-primary-advantage-008-011](evidence/primary-advantage-008.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:751-783`
  - Delete confirmation uses a generic AlertDialog with no identity check and no second confirmation
- **[LR-primary-advantage-008-012](evidence/primary-advantage-008.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:130-133,148-181`
  - Filter state lives in component state, not URL; refresh drops the filter context
- **[LR-primary-advantage-008-013](evidence/primary-advantage-008.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:445-558,835-930`
  - Save button uses `type="submit"` but the dialog has no `<form>` wrapper; Enter key does not submit
- **[LR-primary-advantage-008-014](evidence/primary-advantage-008.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:171-180,202-209`
  - Statistics recomputed on every fetch; no client-side memoization or cache
- **[LR-primary-advantage-008-015](evidence/primary-advantage-008.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:148-181,207-209`
  - `useEffect` closure race: rapid filter changes can let an older response overwrite a newer one
- **[LR-primary-advantage-008-016](evidence/primary-advantage-008.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:1,110-205`
  - Page has no auth/role guard of its own; relies entirely on layout and API
- **[LR-primary-advantage-008-017](evidence/primary-advantage-008.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:114-120,395-413`
  - Most-common-level default `"A0-"` is a sentinel that displays as a real level on first load
- **[LR-primary-advantage-008-018](evidence/primary-advantage-008.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:74-79,140-146,459-550`
  - Bulk-import-style "Add Student" UI offers no `password` field, but server requires it for primary-student accounts

### Batch 009 (10 findings)

- **[LR-primary-advantage-009-001](evidence/primary-advantage-009.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:81-114`
  - Add-teacher form posts to a route handler via fetch instead of a Next.js Server Action
- **[LR-primary-advantage-009-002](evidence/primary-advantage-009.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:182-213`
  - Add-teacher role select hardcodes only "teacher" and "admin"; misses other roles the system supports
- **[LR-primary-advantage-009-003](evidence/primary-advantage-009.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:107`
  - Free-form `console.error` in client mutation handler violates root AGENTS.md structured-logging guidance
- **[LR-primary-advantage-009-004](evidence/primary-advantage-009.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/admin/teachers/add/page.tsx:81-114`
  - Add-teacher payload omits tenant identifier; relies entirely on `/api/teachers` to derive schoolId from session
- **[LR-primary-advantage-009-005](evidence/primary-advantage-009.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/auth/error/page.tsx:1-9`
  - Auth error page renders hardcoded English; sibling auth/signin uses next-intl
- **[LR-primary-advantage-009-006](evidence/primary-advantage-009.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/auth/error/page.tsx:1-9`
  - Auth error page provides no error context, recovery links, or role-aware messaging
- **[LR-primary-advantage-009-007](evidence/primary-advantage-009.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/[locale]/auth/layout.tsx:18`
  - Auth layout carries a commented Reading Advantage storage URL — fork-divergence evidence
- **[LR-primary-advantage-009-008](evidence/primary-advantage-009.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/layout.tsx:20-46`
  - Root locale layout hardcodes English SEO keywords regardless of locale
- **[LR-primary-advantage-009-009](evidence/primary-advantage-009.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/layout.tsx:33-45`
  - Root locale layout has commented-out PWA manifest and openGraph metadata; PWA install is not supported
- **[LR-primary-advantage-009-010](evidence/primary-advantage-009.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/system/dashboard/page.tsx:1-10`
  - System dashboard header copy is hardcoded English; app-wide pattern uses next-intl

### Batch 010 (15 findings)

- **[LR-primary-advantage-010-001](evidence/primary-advantage-010.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:89,146`
  - License form mutates server response with `any[]` school state and unchecked `school.licenses.length`
- **[LR-primary-advantage-010-002](evidence/primary-advantage-010.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:96-107`
  - Create-license POST has no auth header, CSRF token, or client-side role check
- **[LR-primary-advantage-010-003](evidence/primary-advantage-010.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:182-202,216-230,269-283,371-385`
  - Double `<FormControl>` nesting inside `Select` wrappers
- **[LR-primary-advantage-010-004](evidence/primary-advantage-010.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:47-52,291-311`
  - Description field defined in Zod schema but rendered FormField is fully commented out
- **[LR-primary-advantage-010-005](evidence/primary-advantage-010.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:79-86,116-124`
  - form.reset post-submit sets `subscriptionType: "basic"` but defaultValues on mount does not set it
- **[LR-primary-advantage-010-006](evidence/primary-advantage-010.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:142-150`
  - Schools fetch effect swallows non-OK responses and silently keeps empty state
- **[LR-primary-advantage-010-007](evidence/primary-advantage-010.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/system/licenses/create-licenses/create-license-form.tsx:89,143,146,195`
  - `useState<any[]>` for schools widens the public surface used to drive license creation
- **[LR-primary-advantage-010-008](evidence/primary-advantage-010.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/schools/page.tsx:1-15`
  - `SchoolsPage` renders no school list, only a header and a "Create" dialog trigger
- **[LR-primary-advantage-010-009](evidence/primary-advantage-010.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/test/roles-management.tsx:1-12`
  - `RolesManagement` page renders only a Header and a Separator, no role-management UI
- **[LR-primary-advantage-010-010](evidence/primary-advantage-010.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/test/page.tsx:12-41`
  - `/system/test/page.tsx` mixes Server Actions inside a Server Component `onClick` handler
- **[LR-primary-advantage-010-011](evidence/primary-advantage-010.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/test/article-test-genarate.tsx:13-32`
  - `article-test-genarate.tsx` indexes `result[0].error` without null guard; debug log left in handler
- **[LR-primary-advantage-010-012](evidence/primary-advantage-010.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/system/test/audio-test-word.tsx:33-37, audio-test.tsx:35-39, generate-images.tsx:14-20`
  - All three test buttons (audio-test, audio-test-word, generate-images) have unlabeled inputs
- **[LR-primary-advantage-010-013](evidence/primary-advantage-010.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/test/audio-test.tsx:14-26, audio-test-word.tsx:14-24`
  - `audio-test.tsx` and `audio-test-word.tsx` silently drop error details from server actions
- **[LR-primary-advantage-010-014](evidence/primary-advantage-010.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/system/test/page.tsx:8-9`
  - `test/page.tsx` has dead commented-out `FlashcardGame` import block
- **[LR-primary-advantage-010-015](evidence/primary-advantage-010.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/system/test/generate-images.tsx:9-38`
  - `generate-images.tsx` validates `articleId` only via empty-string truthiness, no client-side Zod

### Batch 011 (8 findings)

- **[LR-primary-advantage-011-001](evidence/primary-advantage-011.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/teacher/layout.tsx:1-16`
  - Teacher layout drops auth + role + license checks present in Reading Advantage
- **[LR-primary-advantage-011-002](evidence/primary-advantage-011.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/teacher/dashboard/page.tsx:1-6`
  - Teacher dashboard renders a static placeholder string
- **[LR-primary-advantage-011-003](evidence/primary-advantage-011.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/teacher/assignments/page.tsx:1-14`
  - Teacher assignments page checks authentication but not role
- **[LR-primary-advantage-011-004](evidence/primary-advantage-011.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/enrollment/page.tsx:49-64,116-119`
  - Client-side enrollment fetch has no schema validation; tenant scoping depends entirely on the server
- **[LR-primary-advantage-011-005](evidence/primary-advantage-011.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/page.tsx:3,7`
  - Unused awaited i18n call in classroom detail page
- **[LR-primary-advantage-011-006](evidence/primary-advantage-011.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/teacher/my-classes/page.tsx:6`
  - Inconsistent i18n key namespaces across teacher pages
- **[LR-primary-advantage-011-007](evidence/primary-advantage-011.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/teacher/my-classes/page.tsx:1-13`
  - `my-classes` and `my-students` pages rely entirely on layout-level auth (now missing)
- **[LR-primary-advantage-011-008](evidence/primary-advantage-011.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/app/[locale]/teacher/class-roster/[classroomId]/enrollment/page.tsx:35,37,52`
  - Enrollment page sends `classroomId` to API without encoding

### Batch 012 (18 findings)

- **[LR-primary-advantage-012-001](evidence/primary-advantage-012.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:16-18`
  - Teacher role check is fully commented out on reports page
- **[LR-primary-advantage-012-002](evidence/primary-advantage-012.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:4,13`
  - `AuthErrorPage` reused as a component from a sibling route
- **[LR-primary-advantage-012-003](evidence/primary-advantage-012.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:23-34`
  - Controller-returned `Response` objects are parsed inline instead of being awaited as data
- **[LR-primary-advantage-012-004](evidence/primary-advantage-012.md)** Critical | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx:18,22-24,29-31`
  - Student-progress page has no authorization for the requested student ID
- **[LR-primary-advantage-012-005](evidence/primary-advantage-012.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx:35`
  - Header interpolates unvalidated `user.name` and a non-i18n literal
- **[LR-primary-advantage-012-006](evidence/primary-advantage-012.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx:47`
  - `user.cefrLevel` is rendered instead of the target student's CEFR level
- **[LR-primary-advantage-012-007](evidence/primary-advantage-012.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/articles/questions/[articleId]/route.ts:25-30`
  - Stale "Progress not Have" error string and `correctCount` truthiness check
- **[LR-primary-advantage-012-008](evidence/primary-advantage-012.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/[articleId]/route.ts:4-8`
  - Article-by-id route ignores the `[articleId]` path parameter
- **[LR-primary-advantage-012-009](evidence/primary-advantage-012.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/generate/route.ts:1-15`
  - Bulk AI generation route has no authentication or rate limit
- **[LR-primary-advantage-012-010](evidence/primary-advantage-012.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/generate/route.ts:9-13`
  - `generate` route returns 404 for any error and uses `any` catch
- **[LR-primary-advantage-012-011](evidence/primary-advantage-012.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/questions/[articleId]/route.ts:6-27`
  - Questions-by-article GET ignores path parameter, requires query string instead
- **[LR-primary-advantage-012-012](evidence/primary-advantage-012.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/questions/[articleId]/route.ts:29-44`
  - Questions POST has no auth and no body validation
- **[LR-primary-advantage-012-013](evidence/primary-advantage-012.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/questions/feedback/route.ts:1-13`
  - Question-feedback route file is dead code (POST handler fully commented out)
- **[LR-primary-advantage-012-014](evidence/primary-advantage-012.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/articles/route.ts:11-12`
  - Generic "Error" string in `/api/articles` catch hides server failures
- **[LR-primary-advantage-012-015](evidence/primary-advantage-012.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/teacher/reports/page.tsx:26-34`
  - `instanceof Response` narrowing on the reports page silently swallows auth errors
- **[LR-primary-advantage-012-016](evidence/primary-advantage-012.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/generate/custom-generate/route.ts:1-13`
  - Custom-generate GET/POST route has no authentication
- **[LR-primary-advantage-012-017](evidence/primary-advantage-012.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/generate/custom-generate/approve/route.ts:1-6`
  - Custom-generate approve route has no authentication on a state-mutating endpoint
- **[LR-primary-advantage-012-018](evidence/primary-advantage-012.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/generate/custom-generate/save/route.ts:1-6`
  - Custom-generate save (draft) route has no authentication on a state-mutating endpoint

### Batch 013 (12 findings)

- **[LR-primary-advantage-013-001](evidence/primary-advantage-013.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/assignments/route.ts:11-13`
  - Assignments `route.ts` (POST) lacks authentication and tenant scoping on a state-mutating endpoint
- **[LR-primary-advantage-013-002](evidence/primary-advantage-013.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/assignments/route.ts:7-9`
  - Assignments `route.ts` (GET) has no authentication, tenant filter, or pagination cap
- **[LR-primary-advantage-013-003](evidence/primary-advantage-013.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/api/assignments/[id]/route.ts:7-12`
  - `assignments/[id]/route.ts` GET delegates to controller with no auth or tenant scoping
- **[LR-primary-advantage-013-004](evidence/primary-advantage-013.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/assignments/[id]/route.ts:14-19`
  - `assignments/[id]/route.ts` POST does not validate body shape before calling the controller
- **[LR-primary-advantage-013-005](evidence/primary-advantage-013.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/assignments/[id]/progress/route.ts:1-9`
  - `assignments/[id]/progress/route.ts` thin handler swallows controller errors
- **[LR-primary-advantage-013-006](evidence/primary-advantage-013.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/assignments/activity/[id]/route.ts:1-9`
  - `assignments/activity/[id]/route.ts` does not enforce tenant scoping on the activity fetch
- **[LR-primary-advantage-013-007](evidence/primary-advantage-013.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:22-23,112-115`
  - `lesson-chatbot/route.ts` has no authentication or rate limit on an LLM-cost-incurring endpoint
- **[LR-primary-advantage-013-008](evidence/primary-advantage-013.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:117-137`
  - `lesson-chatbot/route.ts` collects the full LLM stream and returns a buffered 201, defeating the streaming capability
- **[LR-primary-advantage-013-009](evidence/primary-advantage-013.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:18-19,40-43,71-74`
  - `lesson-chatbot/route.ts` relies on prompt-only enforcement of the comprehension-question blacklist
- **[LR-primary-advantage-013-010](evidence/primary-advantage-013.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:138-149`
  - `lesson-chatbot/route.ts` emits unstructured `console.error` for Zod validation failures
- **[LR-primary-advantage-013-011](evidence/primary-advantage-013.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:7-20`
  - `lesson-chatbot/route.ts` route accepts unbounded `messages` and `passage` payloads
- **[LR-primary-advantage-013-012](evidence/primary-advantage-013.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:4-5`
  - `lesson-chatbot/route.ts` `@/utils/openai` import bypasses the shared AI adapter layer for client construction

### Batch 014 (9 findings)

- **[LR-primary-advantage-014-001](evidence/primary-advantage-014.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/classroom/[id]/route.ts:53-60`
  - DELETE handler's `FAILED_DELETE` catch branch is unreachable dead code
- **[LR-primary-advantage-014-002](evidence/primary-advantage-014.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/classroom/[id]/route.ts:26-49`
  - DELETE handler has no explicit role check; relies on the controller model to return 400 silently
- **[LR-primary-advantage-014-003](evidence/primary-advantage-014.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/classroom/route.ts:14-37`
  - POST body destructured without Zod validation; relies entirely on the controller for shape and permission
- **[LR-primary-advantage-014-004](evidence/primary-advantage-014.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/classrooms/route.ts:43-46`
  - School-admin authorization query reads the wrong table (`userRoles` instead of `schoolAdmins`)
- **[LR-primary-advantage-014-005](evidence/primary-advantage-014.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/classrooms/route.ts:75-110`
  - `studentCount` per classroom is computed via N+1 queries and uses a global student-role set that inflates the count
- **[LR-primary-advantage-014-006](evidence/primary-advantage-014.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/classrooms/route.ts:57`
  - `whereConditions: any[]` defeats Drizzle typing at the multi-tenant boundary
- **[LR-primary-advantage-014-007](evidence/primary-advantage-014.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/classrooms/route.ts:60-64`
  - `whereConditions.push(eq(classrooms.schoolId, userWithRoles.schoolId))` runs even when `schoolId` is `null`
- **[LR-primary-advantage-014-008](evidence/primary-advantage-014.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/debug/auth/route.ts:7-22,54-68`
  - Debug route exposes full role and school-admin profile to any authenticated user, including primary students
- **[LR-primary-advantage-014-009](evidence/primary-advantage-014.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/debug/auth/route.ts:9,12`
  - `console.log` statements leak session and DB user data to production logs

### Batch 015 (34 findings)

- **[LR-primary-advantage-015-001](evidence/primary-advantage-015.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:6-47`
  - `/api/debug/init-roles` POST mutates production data with no authentication
- **[LR-primary-advantage-015-002](evidence/primary-advantage-015.md)** Critical | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:50-89`
  - `/api/debug/init-roles` GET exposes user emails without authentication
- **[LR-primary-advantage-015-003](evidence/primary-advantage-015.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:60-83`
  - `/api/debug/init-roles` GET returns empty `roles` arrays for 4 of 5 sample users
- **[LR-primary-advantage-015-004](evidence/primary-advantage-015.md)** Critical | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/debug/school/route.ts:48-53`
  - `/api/debug/school` exposes ALL schools' licenses to any authenticated user
- **[LR-primary-advantage-015-005](evidence/primary-advantage-015.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/debug/school/route.ts:7-22`
  - `/api/debug/school` is named "debug" but has no admin guard, only a login check
- **[LR-primary-advantage-015-006](evidence/primary-advantage-015.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/debug/school/route.ts:67-73`
  - `/api/debug/school` catch block leaks `details: error` to the client
- **[LR-primary-advantage-015-007](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:62-77`
  - `cards/[cardId]/review` writes FSRS columns to `flashcardCards` that don't exist on the shared schema
- **[LR-primary-advantage-015-008](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:31-56`
  - `cards/[cardId]/review` reads FSRS columns that don't exist on `flashcardCards`
- **[LR-primary-advantage-015-009](evidence/primary-advantage-015.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:106`
  - `cards/[cardId]/review` `xpReward` ternary always returns 15
- **[LR-primary-advantage-015-010](evidence/primary-advantage-015.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:21-27`
  - `cards/[cardId]/review` does not validate the request body
- **[LR-primary-advantage-015-011](evidence/primary-advantage-015.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:118-120`
  - `cards/[cardId]/review` uses `${xpReward}` raw SQL interpolation for XP increment
- **[LR-primary-advantage-015-012](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:42-50`
  - `deck-id` route raw-SQL `flashcard_cards.due` filter references a non-existent column
- **[LR-primary-advantage-015-013](evidence/primary-advantage-015.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:64-73`
  - `deck-id` route silently returns "no due flashcards" when SQL fails
- **[LR-primary-advantage-015-014](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:42-58`
  - `deck-id` route success branch is unreachable because the SQL filter rejects all rows
- **[LR-primary-advantage-015-015](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:40-63`
  - `decks/[deckId]/due` route filters by `card.due` after selecting ALL cards
- **[LR-primary-advantage-015-016](evidence/primary-advantage-015.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:45-59`
  - `decks/[deckId]/due` loads all reviews for ALL cards in DB to find reviews for one deck
- **[LR-primary-advantage-015-017](evidence/primary-advantage-015.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:21-23`
  - `decks/[deckId]/due` `parseInt(searchParams.get("limit"))` has no NaN guard or upper bound
- **[LR-primary-advantage-015-018](evidence/primary-advantage-015.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:74-80`
  - `decks/[deckId]/due` catch hides all errors as a generic 500
- **[LR-primary-advantage-015-019](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:76-104`
  - `sentences-for-cloze` GET handler iterates fields that don't exist on `flashcardCards`
- **[LR-primary-advantage-015-020](evidence/primary-advantage-015.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:97`
  - `sentences-for-cloze` `blanks: []` is hard-coded empty
- **[LR-primary-advantage-015-021](evidence/primary-advantage-015.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:123-166`
  - `sentences-for-cloze` POST has no try/catch wrapper
- **[LR-primary-advantage-015-022](evidence/primary-advantage-015.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:134-150`
  - `sentences-for-cloze` POST does not validate `score` or `timer`
- **[LR-primary-advantage-015-023](evidence/primary-advantage-015.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:168-407`
  - `sentences-for-cloze` helper functions are 240 lines of dead code
- **[LR-primary-advantage-015-024](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:42-52`
  - `sentences-for-matching` raw-SQL `flashcard_cards.due` filter references non-existent column
- **[LR-primary-advantage-015-025](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:50-52`
  - `sentences-for-matching` filters cards by `c.due` and `c.articleId` after the SQL already filtered them
- **[LR-primary-advantage-015-026](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:180-246`
  - `sentences-for-matching` `createVocabularyPairs` iterates fields that don't exist on `flashcardCards`
- **[LR-primary-advantage-015-027](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:249-323`
  - `sentences-for-matching` `createTranslationPairs` iterates fields that don't exist on `flashcardCards`
- **[LR-primary-advantage-015-028](evidence/primary-advantage-015.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:145-175`
  - `sentences-for-matching` POST does not validate `score` or `timer`
- **[LR-primary-advantage-015-029](evidence/primary-advantage-015.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:134-177`
  - `sentences-for-matching` POST has no try/catch wrapper
- **[LR-primary-advantage-015-030](evidence/primary-advantage-015.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:21-23`
  - `sentences-for-matching` `language` query param is cast without validation
- **[LR-primary-advantage-015-031](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:72-124`
  - `sentences-for-matching` GET always returns empty `matchingGames` due to schema mismatch
- **[LR-primary-advantage-015-032](evidence/primary-advantage-015.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:54-70`
  - `sentences-for-matching` GET review-loading is O(N) over all reviews
- **[LR-primary-advantage-015-033](evidence/primary-advantage-015.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:53,75,85,91-99,106-115`
  - All seven files rely on `as any` casts to bypass Drizzle's strict typing for `flashcardCards` schema mismatches
- **[LR-primary-advantage-015-034](evidence/primary-advantage-015.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:31-49`
  - All five flashcard routes accept the path parameter without validating that the deck/card belongs to a tenant (school)

### Batch 016 (18 findings)

- **[LR-primary-advantage-016-001](evidence/primary-advantage-016.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:36-47`
  - Shared-partial Drizzle schema forces `as any[]` client-side filter on `flashcardCards`
- **[LR-primary-advantage-016-002](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:50-60`
  - `cardReviews` table is fully scanned to find one review per card
- **[LR-primary-advantage-016-003](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:77-91`
  - N+1 `articles` select inside the per-card loop
- **[LR-primary-advantage-016-004](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:197-199`
  - POST `/api/flashcard/.../sentences-for-ordering` parses the body without Zod
- **[LR-primary-advantage-016-005](evidence/primary-advantage-016.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:38-39, 81-91`
  - `flashcardCards` and `articles` reads have no `schoolId`/tenant filter
- **[LR-primary-advantage-016-006](evidence/primary-advantage-016.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:2`
  - Unused `isNotNull` import in sentences-for-ordering route
- **[LR-primary-advantage-016-007](evidence/primary-advantage-016.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:9-122, 257`
  - `getPartOfSpeech` is a hardcoded English heuristic that defaults to "noun" and labels plurals as verbs
- **[LR-primary-advantage-016-008](evidence/primary-advantage-016.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:151-162`
  - Same `as any[]` shared-partial Drizzle filter on `flashcardCards`
- **[LR-primary-advantage-016-009](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:165-175`
  - Same O(R) `cardReviews` scan as the sentences-for-ordering route
- **[LR-primary-advantage-016-010](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:192-291`
  - N+1 `articles` select inside the per-card loop (words-for-ordering)
- **[LR-primary-advantage-016-011](evidence/primary-advantage-016.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:254-256`
  - Word-level `audioUrl`/`startTime`/`endTime` are set from card-level fields
- **[LR-primary-advantage-016-012](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:322-325`
  - POST `/api/flashcard/.../words-for-ordering` parses the body without Zod
- **[LR-primary-advantage-016-013](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/flashcard/save/[id]/route.ts:1-28`
  - `/api/flashcard/save/[id]` is a stub that logs the body and returns success
- **[LR-primary-advantage-016-014](evidence/primary-advantage-016.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/lessons/[articleId]/route.ts:60-71`
  - Manual type check in `POST /api/lessons/[articleId]` accepts `NaN` for `progress`
- **[LR-primary-advantage-016-015](evidence/primary-advantage-016.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:34-47, 80-93, 180-200`
  - `GET/PUT/DELETE /api/licenses/[id]` filter only by role, not by school
- **[LR-primary-advantage-016-016](evidence/primary-advantage-016.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:117-120`
  - `subscriptionType.toUpperCase()` plus `as SubscriptionType` plus `as any` cast on the update payload
- **[LR-primary-advantage-016-017](evidence/primary-advantage-016.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:158-163`
  - `Foreign key` error matched by string substring
- **[LR-primary-advantage-016-018](evidence/primary-advantage-016.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:198-204`
  - `DELETE /api/licenses/[id]` is a hard delete with no soft-delete or audit row

### Batch 017 (15 findings)

- **[LR-primary-advantage-017-001](evidence/primary-advantage-017.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/licenses/route.ts:5`
  - Unused `randomBytes` import in licenses POST handler
- **[LR-primary-advantage-017-002](evidence/primary-advantage-017.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/licenses/route.ts:53-63`
  - `as any` cast on Drizzle insert in licenses POST
- **[LR-primary-advantage-017-003](evidence/primary-advantage-017.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/licenses/route.ts:121`
  - `whereConditions: any[]` array defeats type narrowing in licenses GET
- **[LR-primary-advantage-017-004](evidence/primary-advantage-017.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/licenses/route.ts:187-219`
  - DELETE handler accepts license id via query string and does not check school ownership
- **[LR-primary-advantage-017-005](evidence/primary-advantage-017.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/licenses/route.ts:154-168`
  - License GET silently returns zeroed `_count`-equivalent user counts
- **[LR-primary-advantage-017-006](evidence/primary-advantage-017.md)** Critical | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/schools/ranking/route.ts:35-65`
  - GET `/api/schools/ranking` accepts arbitrary `schoolId` and leaks other schools' leaderboards
- **[LR-primary-advantage-017-007](evidence/primary-advantage-017.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/schools/ranking/route.ts:10-33`
  - POST `/api/schools/ranking` uses single shared secret for state-mutating admin endpoint
- **[LR-primary-advantage-017-008](evidence/primary-advantage-017.md)** High | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/schools/route.ts:113-121`
  - Schools GET returns hardcoded zero user/admin counts
- **[LR-primary-advantage-017-009](evidence/primary-advantage-017.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/schools/route.ts:47-51`
  - `as any` cast on Drizzle insert in schools POST
- **[LR-primary-advantage-017-010](evidence/primary-advantage-017.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/app/api/schools/route.ts:22,80`
  - Schools route uses stricter role check than the rest of the admin surface
- **[LR-primary-advantage-017-011](evidence/primary-advantage-017.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/send/route.ts:1-21`
  - `/api/send` route is a dead stub with no auth and no actual email sending
- **[LR-primary-advantage-017-012](evidence/primary-advantage-017.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/send/route.ts:18-20`
  - Catch block returns `{ error }` but `error` is not in scope
- **[LR-primary-advantage-017-013](evidence/primary-advantage-017.md)** Critical | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/students/[id]/assignments/route.ts:1-9`
  - `/api/students/[id]/assignments` has no authentication or role check
- **[LR-primary-advantage-017-014](evidence/primary-advantage-017.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/students/[id]/route.ts:17-29`
  - Student PUT/DELETE controllers allow any admin to mutate cross-tenant students
- **[LR-primary-advantage-017-015](evidence/primary-advantage-017.md)** Critical | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/teachers/assignments/route.ts:1-6`
  - `/api/teachers/assignments` has no authentication or role check

### Batch 018 (12 findings)

- **[LR-primary-advantage-018-001](evidence/primary-advantage-018.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:728`
  - `const roles = await db.select().from(roles)` shadow / TDZ ReferenceError on users CSV upload
- **[LR-primary-advantage-018-002](evidence/primary-advantage-018.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:174-180`
  - `userSchool` lookup queries `users` table by `schoolId` instead of `schools` table
- **[LR-primary-advantage-018-003](evidence/primary-advantage-018.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:269-271`
  - Path traversal in `POST /api/upload/classes` via user-controlled `originalName` segment
- **[LR-primary-advantage-018-004](evidence/primary-advantage-018.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts:6-40`
  - Path traversal in `DELETE /api/upload/csv/cleanup` allows arbitrary file deletion
- **[LR-primary-advantage-018-005](evidence/primary-advantage-018.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts:42-86`
  - Unauthenticated bulk file deletion in `POST /api/upload/csv/cleanup`
- **[LR-primary-advantage-018-006](evidence/primary-advantage-018.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:2-4,261-276,989-993`
  - Direct filesystem writes from a route handler bypass the storage adapter contract
- **[LR-primary-advantage-018-007](evidence/primary-advantage-018.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:752,769,808,938,956,976`
  - `as any` casts on Drizzle inserts defeat migration's type safety across all five batched inserts
- **[LR-primary-advantage-018-008](evidence/primary-advantage-018.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:645,850`
  - `currentUser.schoolId as string` cast lies about UUID → string type
- **[LR-primary-advantage-018-009](evidence/primary-advantage-018.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:874-960`
  - Teacher-upload path assigns teachers to ANY classroom in the school, not ones owned by the importing teacher
- **[LR-primary-advantage-018-010](evidence/primary-advantage-018.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:485-490`
  - Per-row error messages enable email enumeration and account-confirmation oracle
- **[LR-primary-advantage-018-011](evidence/primary-advantage-018.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:738-984`
  - No audit logging for bulk user creation / classroom creation / role assignment
- **[LR-primary-advantage-018-012](evidence/primary-advantage-018.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts:66-71`
  - `cleanup` POST handler returns success even when an individual file delete fails silently

### Batch 019 (18 findings)

- **[LR-primary-advantage-019-001](evidence/primary-advantage-019.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:53-60`
  - `userSchool` lookup reads `users` table by `schoolId` instead of `schools` table
- **[LR-primary-advantage-019-002](evidence/primary-advantage-019.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:152-154`
  - Path traversal in `POST /api/upload/csv` via user-controlled `originalName` segment
- **[LR-primary-advantage-019-003](evidence/primary-advantage-019.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/[id]/route.ts:9-92`
  - PATCH `/api/users/[id]` has no role / owner / school-scope authorization
- **[LR-primary-advantage-019-004](evidence/primary-advantage-019.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/activitylog/[id]/route.ts:5-21`
  - `POST /api/users/activitylog/[id]` is an unauthenticated stub that ignores request body and params
- **[LR-primary-advantage-019-005](evidence/primary-advantage-019.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:324,337`
  - `db.insert(users).values(batch)` lacks `onConflictDoNothing`; duplicate emails 500 the whole upload
- **[LR-primary-advantage-019-006](evidence/primary-advantage-019.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:414,425`
  - `currentUser.schoolId as string` cast lies about UUID → string type
- **[LR-primary-advantage-019-007](evidence/primary-advantage-019.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:324,337,370,426,438,455`
  - `as any` casts on typed Drizzle inserts defeat migration's type safety
- **[LR-primary-advantage-019-008](evidence/primary-advantage-019.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:286-461`
  - No audit logging for bulk user creation / role assignment / classroom binding
- **[LR-primary-advantage-019-009](evidence/primary-advantage-019.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:217-263`
  - Per-row validation errors include raw emails, enabling enumeration oracle
- **[LR-primary-advantage-019-010](evidence/primary-advantage-019.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:2-4,144-159,463-468`
  - Direct filesystem writes from a route handler bypass the storage adapter contract
- **[LR-primary-advantage-019-011](evidence/primary-advantage-019.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/[id]/route.ts:20-21`
  - `PATCH /api/users/[id]` has no Zod validation on request body
- **[LR-primary-advantage-019-012](evidence/primary-advantage-019.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/users/[id]/route.ts:34`
  - `updateData: any` defeats Drizzle's `InferInsertModel` type safety on `users.update`
- **[LR-primary-advantage-019-013](evidence/primary-advantage-019.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/users/me/school/admins/[adminId]/route.ts:87-147`
  - No audit logging when removing a school admin
- **[LR-primary-advantage-019-014](evidence/primary-advantage-019.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/me/school/admins/[adminId]/route.ts:91-92,134-137`
  - Redundant DB queries `otherAdminRoles` and `remainingSchoolRoles` select the same rows
- **[LR-primary-advantage-019-015](evidence/primary-advantage-019.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/app/api/users/me/school/admins/route.ts:94-147`
  - No audit logging when adding a school admin
- **[LR-primary-advantage-019-016](evidence/primary-advantage-019.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/me/school/admins/route.ts:142-146`
  - `roleUpgraded` computed from stale `targetRoleRows` after the upgrade is committed
- **[LR-primary-advantage-019-017](evidence/primary-advantage-019.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:6`
  - Unused imports `or`, `ilike` in `csv/route.ts`
- **[LR-primary-advantage-019-018](evidence/primary-advantage-019.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:463-468`
  - Fire-and-forget `unlink` callback silently swallows delete failures and races request completion

### Batch 020 (9 findings)

- **[LR-PA-020-001](evidence/primary-advantage-020.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/api/users/me/school/route.ts:303-316`
  - Missing owner/admin authorization check on PATCH /api/users/me/school
- **[LR-PA-020-002](evidence/primary-advantage-020.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/api/users/me/school/route.ts:203`
  - `as any` type assertions bypass Drizzle type safety on DB writes
- **[LR-PA-020-003](evidence/primary-advantage-020.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/me/school/route.ts:461-494`
  - Inconsistent schoolId nullification on DELETE when owner lacks admin role
- **[LR-PA-020-004](evidence/primary-advantage-020.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/app/api/users/search/route.ts:26-38`
  - Missing school/tenant scoping on GET /api/users/search
- **[LR-PA-020-005](evidence/primary-advantage-020.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/cloudbuild.yaml:21-25`
  - Commented-out Prisma migration step with no Drizzle replacement in Cloud Build
- **[LR-PA-020-006](evidence/primary-advantage-020.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/cloudbuild.yaml:42-43`
  - Stale Google OAuth secret references in cloudbuild.yaml
- **[LR-PA-020-007](evidence/primary-advantage-020.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/admin-dashboard-header.tsx:63`
  - Hardcoded notification badge count
- **[LR-PA-020-008](evidence/primary-advantage-020.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/admin-overview-charts.tsx:10-34`
  - Production-incomplete mock data in admin dashboard charts
- **[LR-PA-020-009](evidence/primary-advantage-020.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/admin-quick-actions.tsx:70`
  - React key={index} anti-pattern

### Batch 021 (9 findings)

- **[LR-primary-advantage-021-001](evidence/primary-advantage-021.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/admin-recent-activity.tsx:5`
  - Unused `Badge` import
- **[LR-primary-advantage-021-002](evidence/primary-advantage-021.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/admin-recent-activity.tsx:43-97`
  - Admin dashboard renders hardcoded mock activity data in production
- **[LR-primary-advantage-021-003](evidence/primary-advantage-021.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/admin-recent-activity.tsx:190-192`
  - "View All" button has no click handler or navigation
- **[LR-primary-advantage-021-004](evidence/primary-advantage-021.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:43`
  - Hardcoded `monthlyGrowth: 12.5` never fetched from API
- **[LR-primary-advantage-021-005](evidence/primary-advantage-021.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:29-37`
  - Fetch calls never check `response.ok`; non-2xx responses silently produce `undefined` stats
- **[LR-primary-advantage-021-006](evidence/primary-advantage-021.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:47-53`
  - Hardcoded fallback stats mislead admins on API failure
- **[LR-primary-advantage-021-007](evidence/primary-advantage-021.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:46`
  - `console.error` only in catch with no user-facing error feedback
- **[LR-primary-advantage-021-008](evidence/primary-advantage-021.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:29-37`
  - Client-side `fetch()` to API routes from `"use client"` component bypasses backend module pattern
- **[LR-primary-advantage-021-009](evidence/primary-advantage-021.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/admin-stats-cards.tsx:128-133`
  - Skeleton loaders use hardcoded `bg-gray-200` instead of design tokens

### Batch 022 (8 findings)

- **[LR-primary-advantage-022-001](evidence/primary-advantage-022.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:550-571`
  - Article deletion lacks authorization and role check
- **[LR-primary-advantage-022-002](evidence/primary-advantage-022.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:224-290,313-371,402-463,465-534`
  - Article generation, save, and approve lack role-based authorization
- **[LR-primary-advantage-022-003](evidence/primary-advantage-022.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:281,369,461,532`
  - Direct DOM manipulation to bypass React loading state
- **[LR-primary-advantage-022-004](evidence/primary-advantage-022.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:225`
  - Commented-out null check leaves confirmApproval vulnerable to undefined pendingApprovalId
- **[LR-primary-advantage-022-005](evidence/primary-advantage-022.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:215,271,359,450,520`
  - Unstructured console.error logging throughout component
- **[LR-primary-advantage-022-006](evidence/primary-advantage-022.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:488`
  - Variable name `Response` shadows the global Response constructor
- **[LR-primary-advantage-022-007](evidence/primary-advantage-022.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:64-76`
  - Unused StatusConfigMap interface is dead code
- **[LR-primary-advantage-022-008](evidence/primary-advantage-022.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/article-creation.tsx:383,442`
  - Thai comments remain in production code

### Batch 023 (16 findings)

- **[LR-primary-advantage-023-001](evidence/primary-advantage-023.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:105,164,201,273`
  - `Math.random()` class-code generator is not cryptographically secure; same-file sibling `lib/utils.ts` already uses `crypto.getRandomValues` for a different string
- **[LR-primary-advantage-023-002](evidence/primary-advantage-023.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:180-214,502-509`
  - `updateClassroomController` destructures `classroomName` but the page sends `name`; every Edit save returns 400 "Classroom name is required"
- **[LR-primary-advantage-023-003](evidence/primary-advantage-023.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:102-107,147-178`
  - Create body sends `passwordStudents` and `classCode` but the POST route only destructures `{ name, grade, classCode }`; `passwordStudents` is silently dropped
- **[LR-primary-advantage-023-004](evidence/primary-advantage-023.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:180-214,499-535`
  - Edit form sends `passwordStudents` in PATCH body, but the controller destructures only `{ classroomName, grade, description }`; password is silently dropped and `description` is the third unused field
- **[LR-primary-advantage-023-005](evidence/primary-advantage-023.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:103,162,199,337-355`
  - `grade` is sent as a string but the model does `parseInt(data.grade)`; an empty string from the Select placeholder yields `NaN`, failing the integer column insert
- **[LR-primary-advantage-023-006](evidence/primary-advantage-023.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:102-107,147-178,306-356`
  - `passwordStudents` is sent on every Create POST as an empty string, but the form has no input for it; admin sees a `passwordStudents: ""` in the form state with no UI control
- **[LR-primary-advantage-023-007](evidence/primary-advantage-023.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:56-86,110-136,283-291,382-486`
  - No tenant context in the Header; `schoolId` and `school` fields are read into state but never surfaced, so a school admin cannot audit which school's classrooms they are seeing
- **[LR-primary-advantage-023-008](evidence/primary-advantage-023.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:97,110-136,147-178,180-214,216-242,359,544,575`
  - Single `isLoading` boolean drives table fetch, create, edit, and delete; the create button is not disabled while in flight, so a double-click submits two POSTs
- **[LR-primary-advantage-023-009](evidence/primary-advantage-023.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:551-582`
  - Delete confirmation is a single-click destructive action against a classroom that contains primary-age students; no typed-name confirmation, no soft-delete preview, no school scope
- **[LR-primary-advantage-023-010](evidence/primary-advantage-023.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:511-521`
  - Edit dialog's grade field is a free-form `<Input>` accepting any string, but the model does `parseInt()`; non-numeric strings silently coerce to `NaN` and the integer column insert fails
- **[LR-primary-advantage-023-011](evidence/primary-advantage-023.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:98,138-145,278-280,367-379`
  - `searchTerm` filter is purely client-side and not in the URL; refresh drops the search context and the filter cannot be shared via link
- **[LR-primary-advantage-023-012](evidence/primary-advantage-023.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:306-362,499-547,552-580`
  - Dialog body is a `<div>`, not a `<form>`; the `type="submit"` Button does not fire on Enter, and the form has no `onSubmit` handler
- **[LR-primary-advantage-023-013](evidence/primary-advantage-023.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:110-136,278-280`
  - `useEffect` closure over `fetchClassrooms` captures stale state; if `classrooms` is ever moved to props or URL-driven, the empty-deps effect will silently break
- **[LR-primary-advantage-023-014](evidence/primary-advantage-023.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:260-262,436,454`
  - `formatDate` uses no locale; class-code expiration dates and `createdAt` render in the browser's default locale, not the app locale selected via `next-intl`
- **[LR-primary-advantage-023-015](evidence/primary-advantage-023.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:43-53`
  - `Filter` icon and `cn` utility are imported but never used; dead imports
- **[LR-primary-advantage-023-016](evidence/primary-advantage-023.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:456-481`
  - DropdownMenuItems for Edit and Delete have no `aria-label` and the inner icon-only Buttons (line 459-461) provide no accessible name

### Batch 024 (15 findings)

- **[LR-primary-advantage-024-001](evidence/primary-advantage-024.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:111-136,617-720`
  - Server response includes `pagination` but the table only renders the first page; no "load more" or page controls
- **[LR-primary-advantage-024-002](evidence/primary-advantage-024.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:78-84,129,385-435`
  - `averageStudentsPerTeacher` and `activeTeachers` are fetched in the statistics response but never rendered in the UI
- **[LR-primary-advantage-024-003](evidence/primary-advantage-024.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:67-72,120-160`
  - Hand-rolled `Classroom` interface violates the primary-advantage AGENTS.md "Prefer InferSelectModel" rule; `schoolId` and `school` are not in the type
- **[LR-primary-advantage-024-004](evidence/primary-advantage-024.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:87,178-182,374-383`
  - `searchTerm` filter is purely client-side and not URL-driven; refresh drops context and the search cannot be shared
- **[LR-primary-advantage-024-005](evidence/primary-advantage-024.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:101-107,455-511`
  - Add Teacher dialog has no `confirmPassword` field, but `messages/en.json` schema (line 2448) defines `confirmPassword`; fork between form state and i18n schema
- **[LR-primary-advantage-024-006](evidence/primary-advantage-024.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:361-370,668-671`
  - `getRoleBadgeVariant` returns `destructive` (red/danger styling) for the `admin` role; semantically misleading for a UI affordance
- **[LR-primary-advantage-024-007](evidence/primary-advantage-024.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:698-714`
  - Edit and Delete icon-only buttons (lines 700-713) have no `aria-label`; inaccessible to screen readers
- **[LR-primary-advantage-024-008](evidence/primary-advantage-024.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/admin/teachers-table.tsx:696`
  - `teacher.createdAt.toLocaleDateString()` (line 696) uses no locale; dates render in the browser default, not the next-intl locale
- **[LR-primary-advantage-024-009](evidence/primary-advantage-024.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/components/articles/article-card.tsx:19-22,41-43`
  - `articleActivityLog: any[]` in the Props type is a type-safety violation; the `Article` interface has no such field and the activity-log shape is undeclared
- **[LR-primary-advantage-024-010](evidence/primary-advantage-024.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/articles/article-card.tsx:69-80`
  - Hard-coded English disclaimer text addresses "language learners"; for a primary-student app this is a primary-student adaptation risk and an i18n violation
- **[LR-primary-advantage-024-011](evidence/primary-advantage-024.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/articles/article-card.tsx:71`
  - `<AlertCircle width={64} height={64} />` icon on line 71 has no `aria-hidden` or `aria-label`; decorative icon is announced by screen readers
- **[LR-primary-advantage-024-012](evidence/primary-advantage-024.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/articles/article-card.tsx:27-36`
  - `locale as "th" | "cn" | "tw" | "vi"` type assertion lies to TypeScript; adding a new locale silently breaks localized summary
- **[LR-primary-advantage-024-013](evidence/primary-advantage-024.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/article-card.tsx:15,38`
  - Provider Neutrality Rule violation: `getArticleImageUrl` builds a public GCS URL directly, bypassing the shared storage adapter (`storage.getSignedUrl()`)
- **[LR-primary-advantage-024-014](evidence/primary-advantage-024.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/article-card.tsx:38-39,66-68`
  - Dead `imageUrl` variable on line 38 is declared but never rendered; the article image is delegated to `<ArticleContent>`
- **[LR-primary-advantage-024-015](evidence/primary-advantage-024.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/article-card.tsx:17,22,82-87`
  - Dead `<RatingPopup>` block (lines 82-87) and unused `userId` prop (line 22) from a removed rating feature; a "fork" in the wrong direction (feature loss vs Reading Advantage)

### Batch 025 (8 findings)

- **[LR-primary-advantage-025-001](evidence/primary-advantage-025.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/article-content.tsx:637-858`
  - Dead/commented-out code block (~220 lines)
- **[LR-primary-advantage-025-002](evidence/primary-advantage-025.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/article-content.tsx:949`
  - Contraction merge missing RIGHT SINGLE QUOTATION MARK (U+2019)
- **[LR-primary-advantage-025-003](evidence/primary-advantage-025.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/article-content.tsx:536-538`
  - SkipBack/SkipForward buttons have no onClick handlers
- **[LR-primary-advantage-025-004](evidence/primary-advantage-025.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/article-content.tsx:62`
  - Typo: `isPanding` instead of `isPending`
- **[LR-primary-advantage-025-005](evidence/primary-advantage-025.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/article-content.tsx:30`
  - Direct server action call from client component
- **[LR-primary-advantage-025-006](evidence/primary-advantage-025.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/article-select.tsx:47`
  - Direct fetch() to internal API route from client component
- **[LR-primary-advantage-025-007](evidence/primary-advantage-025.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/article-select.tsx:114`
  - Array index used as React key prop
- **[LR-primary-advantage-025-008](evidence/primary-advantage-025.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/articles/article-select.tsx:30-32,39-45`
  - No input validation on URLSearchParams from searchParams

### Batch 026 (11 findings)

- **[LR-026-001](evidence/primary-advantage-026.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:70`
  - Unsafe type cast on question data
- **[LR-026-002](evidence/primary-advantage-026.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:91-96`
  - Level-based validation fragile with undefined/zero level
- **[LR-026-003](evidence/primary-advantage-026.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:92-96,143,215-217`
  - Hardcoded English strings bypass i18n system
- **[LR-026-004](evidence/primary-advantage-026.md)** Critical | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:280-314`
  - AI feedback content rendered without sanitization (XSS risk)
- **[LR-026-005](evidence/primary-advantage-026.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/questions/question-header.tsx:12-21,23-25,35-53`
  - Commented-out activity logging and unused props in QuestionHeader
- **[LR-026-006](evidence/primary-advantage-026.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:27-28,51`
  - Extensive `any` types in MC question content
- **[LR-026-007](evidence/primary-advantage-026.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/questions/mc-question-card.tsx:102`
  - Hardcoded question total of 5 in MC quiz
- **[LR-026-008](evidence/primary-advantage-026.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/questions/mc-question-card.tsx:3,14`
  - Duplicate ActivityType import sources in MCQuestionCard
- **[LR-026-009](evidence/primary-advantage-026.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:122-152`
  - Missing error/loading handling in MC quiz finish submission
- **[LR-026-010](evidence/primary-advantage-026.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/mc-question-card.tsx:82`
  - Unsafe type cast on question data in MCQuestionCard
- **[LR-026-011](evidence/primary-advantage-026.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:136-148,184-189,224-228,234-238`
  - Hardcoded English strings in MC quiz component

### Batch 027 (13 findings)

- **[LR-primary-advantage-027-001](evidence/primary-advantage-027.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/sa-question-card.tsx:21-24`
  - SA question card fetches data server-side with no authorization check
- **[LR-primary-advantage-027-002](evidence/primary-advantage-027.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/questions/sa-question-content.tsx:114-118`
  - Undefined `session` variable in `handleFinishQuiz` will throw ReferenceError
- **[LR-primary-advantage-027-003](evidence/primary-advantage-027.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/questions/sa-question-content.tsx:58,161,165`
  - Typo `isPanding` instead of `isPending`
- **[LR-primary-advantage-027-004](evidence/primary-advantage-027.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/articles/questions/sa-question-content.tsx:87`
  - Hardcoded `preferredLanguage: "en"` ignores multilingual context
- **[LR-primary-advantage-027-005](evidence/primary-advantage-027.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/articles/sentence.tsx:136-137`
  - Hardcoded Thai translation in sentence component ignores user locale
- **[LR-primary-advantage-027-006](evidence/primary-advantage-027.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/word-list.tsx:57`
  - Leftover `console.log(words)` in word-list component
- **[LR-primary-advantage-027-007](evidence/primary-advantage-027.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/articles/word-list.tsx:51`
  - Unused `loading` state variable in word-list and sentence components
- **[LR-primary-advantage-027-008](evidence/primary-advantage-027.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/audio-button.tsx:54`
  - AudioButton polling interval at 5ms is excessively aggressive
- **[LR-primary-advantage-027-009](evidence/primary-advantage-027.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/auth/email-forgot-password-template.tsx:7-12`
  - Email forgot-password template is a non-functional placeholder
- **[LR-primary-advantage-027-010](evidence/primary-advantage-027.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/auth/student-signin-form.tsx:95-104`
  - Student sign-in form bypasses auth adapter with direct fetch to `/api/auth/login`
- **[LR-primary-advantage-027-011](evidence/primary-advantage-027.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/auth/student-signin-form.tsx:100-103`
  - Classroom code sent as plaintext password in student login request
- **[LR-primary-advantage-027-012](evidence/primary-advantage-027.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/auth/teacher-signin-form.tsx:68-71,78,97-106,125-126,129,143,147-148`
  - Teacher sign-in form has hardcoded English strings bypassing i18n
- **[LR-primary-advantage-027-013](evidence/primary-advantage-027.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/auth/teacher-signin-form.tsx:139`
  - Teacher sign-in exposes OAuth URL with API host on client side

### Batch 028 (14 findings)

- **[LR-primary-advantage-028-001](evidence/primary-advantage-028.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/auth/user-reset-pass-form.tsx:18-52`
  - Forgot-password form never sends a real password-reset email; API call is commented out and form unconditionally reports success
- **[LR-primary-advantage-028-002](evidence/primary-advantage-028.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/auth/user-reset-pass-form.tsx:3,57-63,88,98-99`
  - Forgot-password form is hardcoded English; bypasses the `next-intl` translation system used by every other auth screen
- **[LR-primary-advantage-028-003](evidence/primary-advantage-028.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/auth/user-signup-form.tsx:159-169`
  - "Terms of Service" and "Privacy Policy" anchor tags are `<a href="#">` dead links; required-consent legal documents are unreachable
- **[LR-primary-advantage-028-004](evidence/primary-advantage-028.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/auth/user-signup-form.tsx:30,177`
  - `loading` state is declared and read but `setLoading` is never called; "Creating account..." text is unreachable dead state
- **[LR-primary-advantage-028-005](evidence/primary-advantage-028.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/auth/user-signup-form.tsx:36-44,76-140,142-143`
  - Signup form has no parent/guardian consent field; primary-age accounts are created from the same form as teacher accounts
- **[LR-primary-advantage-028-006](evidence/primary-advantage-028.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/change-username-form.tsx:69-77`
  - Error handler in `onSubmit` is empty (all code commented out); failed username updates silently swallow the error and provide no user feedback
- **[LR-primary-advantage-028-007](evidence/primary-advantage-028.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/change-username-form.tsx:20`
  - `useSession` from `@reading-advantage/auth-client` is imported but never used in the component
- **[LR-primary-advantage-028-008](evidence/primary-advantage-028.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/change-username-form.tsx:24-28`
  - Username field only validates `min(5)`; no allowlist, no profanity filter, no impersonation check for primary-student accounts
- **[LR-primary-advantage-028-009](evidence/primary-advantage-028.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/article-records-table.tsx:126`
  - Tailwind typo `captoliza` (line 126) — class does not exist; intended `capitalize` styling is silently no-op
- **[LR-primary-advantage-028-010](evidence/primary-advantage-028.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/article-records-table.tsx:157-175`
  - Status map has no fallback; unknown statuses from the API render as empty cells with no UI signal
- **[LR-primary-advantage-028-011](evidence/primary-advantage-028.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/article-records-table.tsx:150-156`
  - `parseInt(row.getValue("rated"))` produces `NaN` for non-numeric ratings and renders literal "NaN" in the table cell
- **[LR-primary-advantage-028-012](evidence/primary-advantage-028.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/class-activity-chart.tsx:27-44,213-306`
  - All dashboard chart data is hardcoded; admins see fabricated activity metrics regardless of school or data state
- **[LR-primary-advantage-028-013](evidence/primary-advantage-028.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/class-activity-chart.tsx:48,52,56,60,69,72,122,125,159,160,236-237,254-255,273-274,292-293`
  - Hardcoded English chart labels bypass `next-intl`; Thai/Chinese/Vietnamese/Taiwanese users see English dashboard text
- **[LR-primary-advantage-028-014](evidence/primary-advantage-028.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/class-activity-chart.tsx:240-243,258-261,278-281,296-299`
  - Trending delta strings ("+12% from last week", "+8%", "+15%", "-3%") are hardcoded literals; will not update even if the underlying numbers change

### Batch 029 (28 findings)

- **[LR-primary-advantage-029-001](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:94`
  - Tailwind typo `captoliza` in reminder-reread table title cell; first-letter capitalization silently no-op
- **[LR-primary-advantage-029-002](evidence/primary-advantage-029.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:119-120`
  - `parseInt(row.getValue("rated"))` produces `NaN` for missing/non-numeric ratings and renders literal "NaN" in primary-student history table
- **[LR-primary-advantage-029-003](evidence/primary-advantage-029.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:128-138`
  - Status `map` has no fallback; unknown status strings from the API render as empty cells with no UI signal
- **[LR-primary-advantage-029-004](evidence/primary-advantage-029.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/components/dashboard/reminder-reread-table.tsx:57-72`
  - `fetchData` bypasses the shared data layer; every dashboard widget re-implements its own fetch with no caching, no SWR/React Query, no error toast
- **[LR-primary-advantage-029-005](evidence/primary-advantage-029.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:76,90`
  - `lastedLevel` variable in `formatDataForDays` is initialized once and never updated; chart always resets xpEarned to 0 each day, breaking the cumulative-XP narrative
- **[LR-primary-advantage-029-006](evidence/primary-advantage-029.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:122-126,309`
  - Chart stroke references `var(--color-xp)` but `chartConfig.xp.color` is `var(--primary)`; the auto-generated CSS variable is undefined so the line may render with the fallback or be invisible
- **[LR-primary-advantage-029-007](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:104-115,301-304`
  - `CustomTooltip` component (lines 104-115) is defined but never used; the actual chart uses the shadcn `ChartTooltip` primitive
- **[LR-primary-advantage-029-008](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:24-25,37,131`
  - Dead variable `locale = useLocale()` declared but never read; unused imports `useState`, `useTheme`, `cn`
- **[LR-primary-advantage-029-009](evidence/primary-advantage-029.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:194-195`
  - `date-fns` `format` uses English-locale output; Thai/Chinese/Vietnamese/Taiwanese users see English month abbreviations in the date-range picker
- **[LR-primary-advantage-029-010](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-activity-chart.tsx:117`
  - Typo `UserActiviryChartProps` (should be `UserActivityChartProps`) recurs across 3 files in this batch and matches the same typo in other primary-advantage dashboard components
- **[LR-primary-advantage-029-011](evidence/primary-advantage-029.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:14-26`
  - Heatmap day-boundary uses UTC ISO date string; primary-student reading activity at 23:30 local time is bucketed into the wrong day for any non-UTC user
- **[LR-primary-advantage-029-012](evidence/primary-advantage-029.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:30-38`
  - Heatmap activity thresholds (`>20`, `>=10`, `>=1`) are hardcoded; the same thresholds are wrong for any primary-student whose daily activity is consistently outside the assumed range
- **[LR-primary-advantage-029-013](evidence/primary-advantage-029.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:64-68`
  - Heatmap color classes `bg-green-400/500/700` are hardcoded and ignore dark-mode; in `dark:` mode the contrast may be unreadable
- **[LR-primary-advantage-029-014](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-heatmap-chart.tsx:40-44,47,8`
  - Heatmap variable name typo `converDatetoSting` (should be `convertDateToString`, but actually converts to `Date` objects) and `UserActiviryChartProps` typo
- **[LR-primary-advantage-029-015](evidence/primary-advantage-029.md)** Critical | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:53,82`
  - `levels.indexOf(currentLevel)` returns `-1` for unknown CEFR levels; gauge displays a negative value and translation lookup throws at runtime
- **[LR-primary-advantage-029-016](evidence/primary-advantage-029.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:24-44`
  - CEFR levels array `["A0-", "A0", "A0+", ...]` is hardcoded; should come from shared schema to stay in sync with backend enum
- **[LR-primary-advantage-029-017](evidence/primary-advantage-029.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:24-44`
  - Non-standard CEFR sub-levels (`A0-`, `A0+`, `A1-`, ..., `C1+`) are intentional product divergence; the rationale is undocumented
- **[LR-primary-advantage-029-018](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:22`
  - `useTranslations` typed as `string | any`; type annotation lies about the return type and bypasses TypeScript safety
- **[LR-primary-advantage-029-019](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:80`
  - Hardcoded colon `:` separator in "Your level : A1" line breaks RTL locales and locale-specific punctuation
- **[LR-primary-advantage-029-020](evidence/primary-advantage-029.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:32-41,117,121-123`
  - Reading-stats chart labels and `Select` items are hardcoded English; Thai/Chinese/Vietnamese/Taiwanese users see English UI
- **[LR-primary-advantage-029-021](evidence/primary-advantage-029.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:61-65`
  - Triple `as any` cast hides type-system gap; `UserActivityLog` is missing `articleId` / `contentId` / `targetId`
- **[LR-primary-advantage-029-022](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:49,106`
  - Recurring typo `seletedValue` / `setSeletedValue` / `handleSeletedChange`; "seleted" instead of "selected"
- **[LR-primary-advantage-029-023](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-reading-chart.tsx:3,8-9,48`
  - Dead imports `useTheme` (resolvedTheme unused), `CardFooter`, `CardDescription` in reading-stats chart
- **[LR-primary-advantage-029-024](evidence/primary-advantage-029.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:48`
  - Misspelled screen-reader-only text "Expaned" (should be "Expanded") is read aloud by assistive tech
- **[LR-primary-advantage-029-025](evidence/primary-advantage-029.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:34-36`
  - `mostRecentActivity = data[0]` assumes pre-sorted input; no defensive sort, no contract documentation
- **[LR-primary-advantage-029-026](evidence/primary-advantage-029.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:55-79,83-110`
  - Duplicated JSX pattern for "most recent" and "remaining" activities; should be extracted into a subcomponent
- **[LR-primary-advantage-029-027](evidence/primary-advantage-029.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:69,74,100,105`
  - Hardcoded green/orange badge colors ignore dark mode; activity-status badges are hard to read in dark theme
- **[LR-primary-advantage-029-028](evidence/primary-advantage-029.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/user-recent-activity.tsx:62-65,93-96`
  - Dead commented-out JSX blocks duplicate XP-display logic; future maintenance trap

### Batch 030 (8 findings)

- **[LR-primary-advantage-030-001](evidence/primary-advantage-030.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/dashboard/user-xpoverall-chart.tsx:79`
  - Sort comparator uses same date reference for both operands
- **[LR-primary-advantage-030-002](evidence/primary-advantage-030.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/dashboard/user-xpoverall-chart.tsx:90-158`
  - Large dead-code block left in production file
- **[LR-primary-advantage-030-003](evidence/primary-advantage-030.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/flashcards/deck-view.tsx:1`
  - Incorrect file header comment
- **[LR-primary-advantage-030-004](evidence/primary-advantage-030.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/flashcards/deck-view.tsx:127`
  - Un-typed state variable uses `any[]`
- **[LR-primary-advantage-030-005](evidence/primary-advantage-030.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/flashcards/deck-view.tsx:146, 459`
  - Hardcoded strings with inline emoji bypass i18n translation layer
- **[LR-primary-advantage-030-006](evidence/primary-advantage-030.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/flashcards/empty-deck.tsx:31-34, 67-69, 102-105, 165-166, 193, 232-235, 287-290`
  - All UI text in empty-deck.tsx is hardcoded in English with no i18n translation keys
- **[LR-primary-advantage-030-007](evidence/primary-advantage-030.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/flashcards/flashcard-dashboard.tsx:31`
  - Hardcoded English fallback string in async server component
- **[LR-primary-advantage-030-008](evidence/primary-advantage-030.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/flashcards/flashcard-dashboard.tsx:82`
  - Server component passes function prop onClick to Button, violating RSC serialization boundary

### Batch 031 (9 findings)

- **[LR-031-001](evidence/primary-advantage-031.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/flashcards/flashcard-game.tsx:106`
  - Undefined `update`/`session` causes runtime ReferenceError on flashcard completion
- **[LR-031-002](evidence/primary-advantage-031.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/flashcards/flashcard-game.tsx:36`
  - `any[]` type for flashcard cards prop
- **[LR-031-003](evidence/primary-advantage-031.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/flashcards/flashcard-game.tsx:251,254`
  - Hardcoded 500px flashcard height for primary student devices
- **[LR-031-004](evidence/primary-advantage-031.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/icons.tsx:2`
  - Unused `Image` import from next/image
- **[LR-031-005](evidence/primary-advantage-031.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/index/footer.tsx:67`
  - Typo "Provinding" in footer
- **[LR-031-006](evidence/primary-advantage-031.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/index/footer.tsx:40`
  - Placeholder phone number in footer
- **[LR-031-007](evidence/primary-advantage-031.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/index/footer.tsx:92`
  - Stale copyright year in footer
- **[LR-031-008](evidence/primary-advantage-031.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/index/footer.tsx:93`
  - Empty href on copyright anchor tag
- **[LR-031-009](evidence/primary-advantage-031.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/leaderboard.tsx:72`
  - Leaderboard uses `<img>` instead of next/image for rank icons

### Batch 032 (3 findings)

- **[LR-primary-advantage-032-001](evidence/primary-advantage-032.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:524-528`
  - Undefined `session` variable referenced in `handleNext`
- **[LR-primary-advantage-032-002](evidence/primary-advantage-032.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:511`
  - `toggleAudioHints()` called as side effect inside `handleNext`
- **[LR-primary-advantage-032-003](evidence/primary-advantage-032.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:29,74-99`
  - Unused constant `AVAILABLE_LANGUAGES` and unused import `Languages`

### Batch 033 (10 findings)

- **[LR-primary-advantage-033-001](evidence/primary-advantage-033.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:230-234`
  - `update({ user: { ...session?.user } })` references undeclared `session`; runtime ReferenceError blocks completion
- **[LR-primary-advantage-033-002](evidence/primary-advantage-033.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:258-330`
  - Dead `safeCompletionData` object: built on lines 260-266 but never read in completion JSX
- **[LR-primary-advantage-033-003](evidence/primary-advantage-033.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:193-197`
  - Type-safety violation: `flipped: false` set on `FlashcardWord` object, but `FlashcardWord` interface has no `flipped` field
- **[LR-primary-advantage-033-004](evidence/primary-advantage-033.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:199-202`
  - Stale closure: `finalCompleted` reads `completedCards` from before the current setState takes effect
- **[LR-primary-advantage-033-005](evidence/primary-advantage-033.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:202-245`
  - `setGameState(GameState.COMPLETED)` runs synchronously before the async transition resolves; UI shows "completed" while the rating save is in-flight
- **[LR-primary-advantage-033-006](evidence/primary-advantage-033.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:115-119,132,123-128,217`
  - Six dead `useState` hooks: `isSubmitting`, `isDeleting`, `elapsedTime`, `startTime`, `isTimerRunning`, `sessionComplete`
- **[LR-primary-advantage-033-007](evidence/primary-advantage-033.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:15-42`
  - Ten unused imports from `lucide-react` and `next-intl`; bundle-size and maintenance debt
- **[LR-primary-advantage-033-008](evidence/primary-advantage-033.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:129,440-466,620`
  - Hardcoded `"th"` default language for sentence translation; primary-students on `cn`/`tw`/`vi` see a Thai translation on first load
- **[LR-primary-advantage-033-009](evidence/primary-advantage-033.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:153-177`
  - `if (gameState === GameState.COMPLETED) return;` on line 161 is dead: the preceding line 155 just set state to LOADING
- **[LR-primary-advantage-033-010](evidence/primary-advantage-033.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:249-251`
  - `loadGameData` is called from `useEffect` without dependency tracking; re-mounts do not refetch

### Batch 034 (9 findings)

- **[LR-primary-advantage-034-001](evidence/primary-advantage-034.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:206-222`
  - `update({ user: { ...session?.user } })` references undeclared `session`; runtime ReferenceError blocks XP recording on completion
- **[LR-primary-advantage-034-002](evidence/primary-advantage-034.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:435-490`
  - Completed screen renders three hardcoded literals (`20` XP, `5/5` pairs, `count: 1`) instead of the user's actual data
- **[LR-primary-advantage-034-003](evidence/primary-advantage-034.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:208-216`
  - Full XP granted on every completion regardless of correctness; primary-student motivation loop detached from learning outcome
- **[LR-primary-advantage-034-004](evidence/primary-advantage-034.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:82`
  - `const { user } = useSession()` destructures `user` but the value is never read in the component
- **[LR-primary-advantage-034-005](evidence/primary-advantage-034.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:169-176`
  - `response.cards.map((card: any) => ...)` uses `any` instead of the exported `FlashcardCard` type
- **[LR-primary-advantage-034-006](evidence/primary-advantage-034.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:27`
  - Relative import `../../flashcards/deck-view` reaches into a sibling feature directory for a constant; couples `lesson/games/` to `flashcards/`
- **[LR-primary-advantage-034-007](evidence/primary-advantage-034.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:147-149,206-250`
  - Inner `const handleComplete = async () => {...}` on line 207 shadows the outer `handleComplete` on line 147; dead shadow + confused completion-flow
- **[LR-primary-advantage-034-008](evidence/primary-advantage-034.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:158-203,206-250`
  - `t` (from `useTranslations`) is used inside the fetch and auto-complete effects but missing from their dependency arrays
- **[LR-primary-advantage-034-009](evidence/primary-advantage-034.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:85,229-249`
  - `score` state declared on line 85 is incremented on line 239 but never read; pure dead-write

### Batch 035 (7 findings)

- **[LR-primary-advantage-035-001](evidence/primary-advantage-035.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:286-290`
  - `update()` function and `session` variable not in scope (runtime error)
- **[LR-primary-advantage-035-002](evidence/primary-advantage-035.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:39-40`
  - Backend logic in local server actions instead of shared domain package
- **[LR-primary-advantage-035-003](evidence/primary-advantage-035.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:95-100`
  - Hardcoded language mapping duplicates i18n config
- **[LR-primary-advantage-035-004](evidence/primary-advantage-035.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:148`
  - `console.error` instead of structured logging
- **[LR-primary-advantage-035-005](evidence/primary-advantage-035.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:460`
  - `error: any` type in error handler
- **[LR-primary-advantage-035-006](evidence/primary-advantage-035.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:44-93`
  - Hand-rolled interfaces instead of inferred Drizzle types
- **[LR-primary-advantage-035-007](evidence/primary-advantage-035.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:133-137, 187`
  - React hooks best-practice violations

### Batch 036 (8 findings)

- **[LR-036-001](evidence/primary-advantage-036.md)** Critical | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:304-308`
  - Undefined `update` and `session` variables cause runtime crash on game completion
- **[LR-036-002](evidence/primary-advantage-036.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:420,435,464,524,527,709,917`
  - Hardcoded English strings break i18n for multilingual primary students
- **[LR-036-003](evidence/primary-advantage-036.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:138,432,444-456,526`
  - Debug console.log/console.error left in production code
- **[LR-036-004](evidence/primary-advantage-036.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:843-848`
  - HTML5 drag-and-drop has no touch/tablet support
- **[LR-036-005](evidence/primary-advantage-036.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:552`
  - Division by zero in accuracy calculation
- **[LR-036-006](evidence/primary-advantage-036.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:122-126,289-310`
  - Missing exhaustive-deps in useEffect and useCallback hooks
- **[LR-036-007](evidence/primary-advantage-036.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx`
  - No error boundary for primary-student UX
- **[LR-036-008](evidence/primary-advantage-036.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:151-159`
  - Timer continues counting when browser tab is hidden

### Batch 037 (5 findings)

- **[LR-037-001](evidence/primary-advantage-037.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-flashcard-card.tsx:236`
  - Undefined `update` function causes runtime crash
- **[LR-037-002](evidence/primary-advantage-037.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-flashcard-card.tsx:201`
  - Setting non-existent `flipped` property on FlashcardWord
- **[LR-037-003](evidence/primary-advantage-037.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-flashcard-card.tsx:168`
  - Dead logic branch in loadGameData
- **[LR-037-004](evidence/primary-advantage-037.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-flashcard-card.tsx:180,245`
  - console.error in production client code
- **[LR-037-005](evidence/primary-advantage-037.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-flashcard-card.tsx:724`
  - Potential negative remaining count in session stats

### Batch 038 (16 findings)

- **[LR-primary-advantage-038-001](evidence/primary-advantage-038.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx:215-219`
  - `update({ user: { ...session?.user } })` references undeclared `update` and `session`; runtime ReferenceError blocks activity completion
- **[LR-primary-advantage-038-002](evidence/primary-advantage-038.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx:204-247`
  - Auto-complete useEffect fires before the score-incrementing `updateUserActivity` resolves; UI shows "completed" even when the server rejects the activity log
- **[LR-primary-advantage-038-003](evidence/primary-advantage-038.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx:461-471`
  - Hardcoded `20` XP and `5/5` completed count in the completion card; primary-student motivation loop shows static values regardless of actual performance
- **[LR-primary-advantage-038-004](evidence/primary-advantage-038.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx:156-201`
  - Unreachable `gameState === GameState.Playing` branch in fetchGameData effect; data is never reloaded after the user clicks "Start"
- **[LR-primary-advantage-038-005](evidence/primary-advantage-038.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx:179`
  - Biased shuffle using `(arr) => Math.random() - 0.5`; the right column may cluster identical items on one side
- **[LR-primary-advantage-038-006](evidence/primary-advantage-038.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx:73`
  - Dead `user` destructured from `useSession()`; only consumer is the broken spread in `update({ user: { ...session?.user } })`
- **[LR-primary-advantage-038-007](evidence/primary-advantage-038.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/components/lesson/lesson-card.tsx:6,12`
  - `lesson-card.tsx` invokes `getAssignmentById` which is not tenant-scoped; any authenticated user can read any assignment by ID
- **[LR-primary-advantage-038-008](evidence/primary-advantage-038.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-card.tsx:60-62`
  - `assignment as unknown as LessonAssignmentProps` double-cast hides Prisma→Drizzle type-shape mismatch in lesson-card
- **[LR-primary-advantage-038-009](evidence/primary-advantage-038.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-card.tsx:12-14,46`
  - `lesson-card.tsx` has no null-state UI when `assignment` is `null`
- **[LR-primary-advantage-038-010](evidence/primary-advantage-038.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-language-question.tsx:14-23,25-29,59`
  - `lesson-language-question.tsx` declares `Props` interface with `skipPhase` and `onCompleteChange`; neither is wired to the component or its parent
- **[LR-primary-advantage-038-011](evidence/primary-advantage-038.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-language-question.tsx:37,134-143`
  - Dead `loadingPage` state in `lesson-language-question.tsx`; loading branch on line 134 is never rendered
- **[LR-primary-advantage-038-012](evidence/primary-advantage-038.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-language-question.tsx:79-122`
  - `initBotMessage` useEffect has empty `[]` deps; article prop changes do not refetch the initial bot message
- **[LR-primary-advantage-038-013](evidence/primary-advantage-038.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-language-question.tsx:39-77`
  - `handleSendMessage` useCallback missing `t` from deps; uses translation keys in catch branches without re-binding
- **[LR-primary-advantage-038-014](evidence/primary-advantage-038.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-language-question.tsx:174`
  - Suspicious gradient class `from-gray-gray-300` on the chat messages container; Tailwind will silently fail to apply the gradient
- **[LR-primary-advantage-038-015](evidence/primary-advantage-038.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/lesson/lesson-language-question.tsx:47,95`
  - Chatbot fetch uses relative URL `/api/assistant/lesson-chatbot` directly; no internal AI adapter layer per AGENTS.md
- **[LR-primary-advantage-038-016](evidence/primary-advantage-038.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-language-question.tsx:223-227`
  - `<AvatarImage src={"" }>` with literal empty string; relies on `<AvatarFallback>` to render the initial

### Batch 039 (12 findings)

- **[LR-primary-advantage-039-001](evidence/primary-advantage-039.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:101-104`
  - Initial-load progress math uses `Math.ceil(progress / (100/14))`; for tasks 4 and 13 the rounding step restores a task ahead of the user's actual position
- **[LR-primary-advantage-039-002](evidence/primary-advantage-039.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:712`
  - `progress` percentage on the sidebar uses floating-point division then rounded-to-integer width, producing a wrong width for several tasks
- **[LR-primary-advantage-039-003](evidence/primary-advantage-039.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:385-389`
  - `TaskIntroduction` is rendered with `onCompleteChange={() => {}}`; the task tries to notify the parent of completion but the orchestrator discards it
- **[LR-primary-advantage-039-004](evidence/primary-advantage-039.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:65-76`
  - Dead `useRef`s `currentTaskRef` and `isTransitioningRef` declared and updated in effects, but never read anywhere in the file
- **[LR-primary-advantage-039-005](evidence/primary-advantage-039.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:3-9,491-526`
  - Dead `useCallback` import and dead `skipTask` helper; both are referenced in commented-out code but never reachable from the live component
- **[LR-primary-advantage-039-006](evidence/primary-advantage-039.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:78,251-255,647-649`
  - `animate-shake` class referenced on Next button but no `@keyframes shake` or Tailwind config defining the class exists in this app
- **[LR-primary-advantage-039-007](evidence/primary-advantage-039.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:82-147`
  - Initial-load effect closes over `fetchCurrentPhase` from outside the effect; ESLint `react-hooks/exhaustive-deps` would flag this and the body is recreated every render
- **[LR-primary-advantage-039-008](evidence/primary-advantage-039.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:249-345`
  - `nextTask` advances to `newTask = Task + 1` but writes the *post-advance* progress; a server-side failure leaves the local state ahead of the server
- **[LR-primary-advantage-039-009](evidence/primary-advantage-039.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:347-378`
  - `previousTask` does not POST to the server; navigating back is a local-only state change with no server-side revert
- **[LR-primary-advantage-039-010](evidence/primary-advantage-039.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:491-526`
  - `skipTask` would let the user advance without server validation if its body were ever uncommented
- **[LR-primary-advantage-039-011](evidence/primary-advantage-039.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:528-532`
  - Mobile accordion `maxHeight` effect depends only on `isExpanded`; if the inner task list height changes after expand, the accordion stays at the old (truncated) height
- **[LR-primary-advantage-039-012](evidence/primary-advantage-039.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:63,108-114,264,301-303,341-343`
  - `QuizContext` starts a `setInterval` that ticks `timer` on mount and runs unconditionally; the lesson-progress bar starts the timer before the user clicks "Start Lesson"

### Batch 040 (8 findings)

- **[LR-primary-advantage-040-001](evidence/primary-advantage-040.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:208-210`
  - `lesson-task-mcq.tsx` references undefined `update` and `session` variables (ReferenceError)
- **[LR-primary-advantage-040-002](evidence/primary-advantage-040.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:33-37,85-121`
  - `lesson-task-mcq.tsx` contains large commented-out dead code blocks
- **[LR-primary-advantage-040-003](evidence/primary-advantage-040.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:47-48`
  - `lesson-task-mcq.tsx` uses `as any` type escapes on state variables
- **[LR-primary-advantage-040-004](evidence/primary-advantage-040.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:504`
  - `lesson-task-mcq.tsx` renders `<div>` inside `<p>` (invalid HTML)
- **[LR-primary-advantage-040-005](evidence/primary-advantage-040.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx:100-105`
  - `lesson-task-saq.tsx` references undefined `update` and `session` variables (same ReferenceError as 040-001)
- **[LR-primary-advantage-040-006](evidence/primary-advantage-040.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx:44`
  - `lesson-task-saq.tsx` destructures unused `user` from `useSession()`
- **[LR-primary-advantage-040-007](evidence/primary-advantage-040.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx:82`
  - `lesson-task-saq.tsx:82` hardcodes `preferredLanguage: "en"` instead of using dynamic locale
- **[LR-primary-advantage-040-008](evidence/primary-advantage-040.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-card.tsx:15,63`
  - `standalone-lesson-card.tsx` has no error handling for missing article and uses unsafe `as unknown as` type cast

### Batch 041 (10 findings)

- **[LR-primary-advantage-041-001](evidence/primary-advantage-041.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:260-291`
  - `previousTask` never persists regressed progress to the server; refresh reverts to the old phase
- **[LR-primary-advantage-041-002](evidence/primary-advantage-041.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:191,224`
  - `nextTask` captures stale `timer` closure for `timeSpent`; timer continues ticking between function invocation and POST
- **[LR-primary-advantage-041-003](evidence/primary-advantage-041.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:149-156`
  - `startLesson` unconditionally resets `timeSpent` to 0; discards any previously accumulated lesson time
- **[LR-primary-advantage-041-004](evidence/primary-advantage-041.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:260-291`
  - `previousTask` does not pause or manage the timer; inconsistent with `nextTask`'s timer management
- **[LR-primary-advantage-041-005](evidence/primary-advantage-041.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:384-391`
  - `LessonTimer` defined inside component body; `React.memo()` is defeated on every parent re-render
- **[LR-primary-advantage-041-006](evidence/primary-advantage-041.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:85,87,95,153,211,215,223,254,457,540-544,559,594,632`
  - Magic number `14` (total task count) used in 10+ locations without a named constant
- **[LR-primary-advantage-041-007](evidence/primary-advantage-041.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:108,169-173,180,235-239,245,284`
  - `console.error` used in production code instead of structured logging
- **[LR-primary-advantage-041-008](evidence/primary-advantage-041.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:219-243`
  - `nextTask` response body is discarded; no validation that server accepted the progress update
- **[LR-primary-advantage-041-009](evidence/primary-advantage-041.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:82-98`
  - `fetchCurrentPhase` missing validation on `data.userLessonProgress.progress`; `Math.ceil` can produce out-of-range values
- **[LR-primary-advantage-041-010](evidence/primary-advantage-041.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:294-329`
  - `getTaskComponent` passes `article` to some tasks and `articleId` to others; inconsistent prop contract

### Batch 042 (9 findings)

- **[LR-042-001](evidence/primary-advantage-042.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:23`
  - Function name mismatch with file and export
- **[LR-042-002](evidence/primary-advantage-042.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:194`
  - Production console.log of full article object
- **[LR-042-003](evidence/primary-advantage-042.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:40-70`
  - Commented-out audio initialization useEffect
- **[LR-042-004](evidence/primary-advantage-042.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:276-284,287-297,545-589,622-656`
  - Commented-out UI features (highlight toggle, reset button, progress bar, completion status)
- **[LR-042-005](evidence/primary-advantage-042.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:352`
  - Hardcoded Thai translation locale
- **[LR-042-006](evidence/primary-advantage-042.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:1`
  - Missing "use client" directive
- **[LR-042-007](evidence/primary-advantage-042.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:216-225`
  - No audio loading progress or error UI
- **[LR-042-008](evidence/primary-advantage-042.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:95`
  - handleTimeUpdate called manually instead of via event listener
- **[LR-042-009](evidence/primary-advantage-042.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:87-98`
  - Missing isAudioLoaded guard in handlePlayPause

### Batch 043 (11 findings)

- **[LR-043-001](evidence/primary-advantage-043.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:29, 37-67, 205-214, 225-229`
  - `isAudioLoaded` state is permanently `false`; Play button is stuck on "Loading Audio" because the only place that ever sets it to `true` is inside a 31-line commented-out useEffect
- **[LR-043-002](evidence/primary-advantage-043.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:20, 207, 339-342`
  - `lib/storage-config.ts` constructs Google Cloud Storage URLs directly without going through the shared `storage.getSignedUrl()` / `storage.get()` adapter required by AGENTS.md
- **[LR-043-003](evidence/primary-advantage-043.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:207`
  - `getAudioUrl(article.audioUrl || "")` empty-src fallback causes a spurious network request to the bucket root when no audio is attached to the article
- **[LR-043-004](evidence/primary-advantage-043.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:152-163`
  - Recursive `setTimeout` chain in `highlightIntermediateWords` has no cleanup; if the component unmounts mid-animation, `setCurrentWordIndex` fires on a dead component
- **[LR-043-005](evidence/primary-advantage-043.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:69-82`
  - `handleLoadedMetadata` registered on the `timeupdate` event but only assigns `playbackRate`; the listener runs on every audio time tick (~4×/sec) just to update a value that only changes when `readingSpeed` changes
- **[LR-043-006](evidence/primary-advantage-043.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:8, 272`
  - `RotateCcwIcon` imported from `lucide-react` but never used; the only reference is inside the commented-out "Listen Again" button on line 272
- **[LR-043-007](evidence/primary-advantage-043.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:30-33, 41-43`
  - `TaskIntroduction` auto-marks itself complete via `useEffect(() => { onCompleteChange(true); }, [onCompleteChange])`; because both call sites in `lesson-progress-bar.tsx:387` and `standalone-lesson-progress-bar.tsx:298` pass a fresh inline `() => {}`, the effect runs on every parent render
- **[LR-043-008](evidence/primary-advantage-043.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:15-28`
  - `TaskIntroduction` declares its own local `Article` interface with a 7-field subset instead of importing the shared `Article` from `@/types`; the local `translatedSummary` also relaxes required `th`/`vi`/`cn`/`tw` fields to optional, diverging from the shared type
- **[LR-043-009](evidence/primary-advantage-043.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:93-96`
  - `Math.ceil(article.passage.split(" ").length / 20)` read-time estimate is English-only; CJK and Thai articles have no spaces between words, so the estimate is wildly wrong for non-English locales
- **[LR-043-010](evidence/primary-advantage-043.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:106-108`
  - Unsafe type cast `locale as "th" | "vi" | "cn" | "tw"` on line 107 silently allows any locale string; when the active locale is `"en"` (the default) the lookup returns `undefined` and the fallback on line 108 is exercised
- **[LR-043-011](evidence/primary-advantage-043.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-language-questions.tsx:9-13, 53-62`
  - `TaskLanguageQuestions` wrapper has no loading, error, or empty state for the nested `LessonLanguageQuestion` chatbot; if the chatbot throws during its `useEffect`, the entire phase renders an empty container

### Batch 044 (10 findings)

- **[LR-primary-advantage-044-001](evidence/primary-advantage-044.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:80-84`
  - `update()` and `session` are undefined references (compile/runtime error)
- **[LR-primary-advantage-044-002](evidence/primary-advantage-044.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:56-59`
  - Unguarded `.length` access on possibly-undefined word/sentence lists
- **[LR-primary-advantage-044-003](evidence/primary-advantage-044.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:104-118`
  - Feedback lookup table omits score 0 and out-of-range scores
- **[LR-primary-advantage-044-004](evidence/primary-advantage-044.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:130-148`
  - Hardcoded English performance-badge labels bypass i18n
- **[LR-primary-advantage-044-005](evidence/primary-advantage-044.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:87`
  - Raw `console.error` in production component path
- **[LR-primary-advantage-044-006](evidence/primary-advantage-044.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-multiple-choice.tsx:6`
  - Import path references misspelled `pratice/` directory
- **[LR-primary-advantage-044-007](evidence/primary-advantage-044.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-preview-vocabulary.tsx:37-61`
  - Empty `words` array leaves the screen stuck in the loading skeleton
- **[LR-primary-advantage-044-008](evidence/primary-advantage-044.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-preview-vocabulary.tsx:23`
  - Misspelled exported component name `TaskPreviewVocabulaty`
- **[LR-primary-advantage-044-009](evidence/primary-advantage-044.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-sentence-activities.tsx:37-46`
  - Activity fetch has no error handling; failure leaves the screen stuck loading
- **[LR-primary-advantage-044-010](evidence/primary-advantage-044.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-sentence-activities.tsx:39`
  - Component fetches a REST API route directly, bypassing the domain/adapter layer and relying on unverified tenant scoping

### Batch 045 (6 findings)

- **[LR-primary-advantage-045-001](evidence/primary-advantage-045.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-vocabulary-collection.tsx:1`
  - Missing `"use client"` directive in `task-vocabulary-collection.tsx`
- **[LR-primary-advantage-045-002](evidence/primary-advantage-045.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-vocabulary-collection.tsx:148-149`
  - Hardcoded Thai locale in `task-vocabulary-collection.tsx` definition display
- **[LR-primary-advantage-045-003](evidence/primary-advantage-045.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/manage-tab.tsx:180`
  - Invalid Tailwind class `gap-` in `manage-tab.tsx`
- **[LR-primary-advantage-045-004](evidence/primary-advantage-045.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/manage-tab.tsx:69-72`
  - Translation namespace mismatch in `getSimpleDueText` parameter type annotation
- **[LR-primary-advantage-045-005](evidence/primary-advantage-045.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/nav/mobile-nav.tsx:1`
  - Missing `"use client"` directive in `mobile-nav.tsx`
- **[LR-primary-advantage-045-006](evidence/primary-advantage-045.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/task/task-sentence-collection.tsx:20-21`
  - Data model field name typo `sentencsAndWordsForFlashcard`

### Batch 046 (8 findings)

- **[LR-primary-advantage-046-001](evidence/primary-advantage-046.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/nav/new-mobile-nav.tsx:135-140`
  - `MobileLink` double-navigates: `Link` + `router.push` race condition bypasses locale prefixing
- **[LR-primary-advantage-046-002](evidence/primary-advantage-046.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/nav/new-mobile-nav.tsx:89-114`
  - 26-line commented-out tree-rendering block in `MobileNav`
- **[LR-primary-advantage-046-003](evidence/primary-advantage-046.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/nav/sidebar-nav.tsx:65,69,74,81,85,90`
  - `sidebar-nav.tsx` uses pervasive `any` types in helper functions
- **[LR-primary-advantage-046-004](evidence/primary-advantage-046.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/nav/sidebar-nav.tsx:107`
  - `sidebar-nav.tsx:107` uses `window.history.back()` instead of Next.js router
- **[LR-primary-advantage-046-005](evidence/primary-advantage-046.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/nav/user-account-nav.tsx:136-142`
  - `user-account-nav.tsx:138` hardcodes external Google Form URL in a primary-student-facing menu
- **[LR-primary-advantage-046-006](evidence/primary-advantage-046.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/nav/user-account-nav.tsx:17`
  - `user-account-nav.tsx:17` imports `useCurrentUser` but never uses it
- **[LR-primary-advantage-046-007](evidence/primary-advantage-046.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/nav/user-account-nav.tsx:154-159`
  - `user-account-nav.tsx:159` unreachable `setIsLoading(false)` after full-page redirect
- **[LR-primary-advantage-046-008](evidence/primary-advantage-046.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/nav/user-account-nav.tsx:106-130`
  - `user-account-nav.tsx:106-130` role-gated menu items use client-side role without server-side verification hint

### Batch 047 (8 findings)

- **[LR-047-001](evidence/primary-advantage-047.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:524`
  - Undefined `session` variable causes runtime crash
- **[LR-047-002](evidence/primary-advantage-047.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:522`
  - Undefined `update` function causes runtime crash
- **[LR-047-003](evidence/primary-advantage-047.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:142-231`
  - English-only common words filter breaks multilingual cloze generation
- **[LR-047-004](evidence/primary-advantage-047.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:719-722`
  - Regex blank replacement fragile for adjacent/overlapping blanks
- **[LR-047-005](evidence/primary-advantage-047.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:305-359`
  - Distractor generation is English-only
- **[LR-047-006](evidence/primary-advantage-047.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:71-96`
  - Unused `AVAILABLE_LANGUAGES` constant (dead code)
- **[LR-047-007](evidence/primary-advantage-047.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:384-388`
  - `loadSentencesFromDeck` stale closure in useEffect
- **[LR-047-008](evidence/primary-advantage-047.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:664-667`
  - Hardcoded 10-second audio timeout

### Batch 048 (4 findings)

- **[LR-primary-advantage-048-001](evidence/primary-advantage-048.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/matching-game.tsx:41,134,247-251,253`
  - `handleNext` references undefined `update` and `session`, crashes on last game
- **[LR-primary-advantage-048-002](evidence/primary-advantage-048.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/components/pratice/matching-game.tsx:41,134`
  - Direct `@reading-advantage/auth-client` import bypasses internal auth adapter contract
- **[LR-primary-advantage-048-003](evidence/primary-advantage-048.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/matching-game.tsx:23,34,35`
  - Unused lucide imports inflate bundle for the matching game route
- **[LR-primary-advantage-048-004](evidence/primary-advantage-048.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/matching-game.tsx:134`
  - `user` destructured from `useSession()` but never read

### Batch 049 (5 findings)

- **[LR-primary-advantage-049-001](evidence/primary-advantage-049.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:35,110,298-302`
  - `handleNext` references undefined `update` and `session`, crashes on game finish
- **[LR-primary-advantage-049-002](evidence/primary-advantage-049.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:285-304`
  - `handleNext` stale-closure: missing `score`, `timer`, `deckId` in dependency array reports wrong score to server
- **[LR-primary-advantage-049-003](evidence/primary-advantage-049.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:290-296`
  - Score-submission POST has no error handling or response check
- **[LR-primary-advantage-049-004](evidence/primary-advantage-049.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:35,110`
  - Direct `@reading-advantage/auth-client` import bypasses internal auth adapter contract
- **[LR-primary-advantage-049-005](evidence/primary-advantage-049.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:110`
  - `user` destructured from `useSession()` but never read

### Batch 050 (12 findings)

- **[LR-primary-advantage-050-001](evidence/primary-advantage-050.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:39,134,286-291`
  - `handleNext` references undefined `update` and `session`, crashes on game finish
- **[LR-primary-advantage-050-002](evidence/primary-advantage-050.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:273-292`
  - `handleNext` stale-closure: missing `score`, `timer`, `deckId` in dependency array reports wrong score to server
- **[LR-primary-advantage-050-003](evidence/primary-advantage-050.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:278-284`
  - Score-submission POST has no error handling or response check
- **[LR-primary-advantage-050-004](evidence/primary-advantage-050.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:39,134`
  - Direct `@reading-advantage/auth-client` import bypasses internal auth adapter contract
- **[LR-primary-advantage-050-005](evidence/primary-advantage-050.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:134`
  - `user` destructured from `useSession()` but never read
- **[LR-primary-advantage-050-006](evidence/primary-advantage-050.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:136-140`
  - `loadSentencesFromDeck` effect missing `sentences.length` and callback in dependency array
- **[LR-primary-advantage-050-007](evidence/primary-advantage-050.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:206-216`
  - `useEffect` keyed only on `currentSentence?.id` does not re-shuffle when the same sentence changes shape
- **[LR-primary-advantage-050-008](evidence/primary-advantage-050.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:219-248`
  - Answer-check effect missing `currentSentence.words.length` in dependency array
- **[LR-primary-advantage-050-009](evidence/primary-advantage-050.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:408-485`
  - `playHintAudio` stale closure on `currentIndex` can read wrong word's audio timestamps
- **[LR-primary-advantage-050-010](evidence/primary-advantage-050.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:529`
  - Game-complete accuracy calculation divides by zero when `activeSentences.length === 0`
- **[LR-primary-advantage-050-011](evidence/primary-advantage-050.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/progress-bar-xp.tsx:19`
  - Hardcoded "RA." brand label leaks Reading Advantage branding into Primary Advantage UI
- **[LR-primary-advantage-050-012](evidence/primary-advantage-050.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/progress-bar-xp.tsx:12-14`
  - `progressValue` divides by zero when `nextLevelXP` falls back to `0`

### Batch 051 (3 findings)

- **[LR-primary-advantage-051-001](evidence/primary-advantage-051.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/school/school-detail.tsx:123-127`
  - Undefined `update`/`session` references in school delete handler
- **[LR-primary-advantage-051-002](evidence/primary-advantage-051.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/school/school-detail.tsx:330,338,346,356,366,393,403,415,428,465,503,524-540`
  - Hardcoded English labels in license section with inconsistent i18n
- **[LR-primary-advantage-051-003](evidence/primary-advantage-051.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/school/add-admin-dialog.tsx:190`
  - Hardcoded "Add Admin" button text

### Batch 052 (5 findings)

- **[LR-primary-advantage-052-001](evidence/primary-advantage-052.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/school/school-profile-form.tsx:107-110`
  - Undefined `update`/`session` variables in school creation callback
- **[LR-primary-advantage-052-002](evidence/primary-advantage-052.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/shared/change-role.tsx:73-75`
  - Missing Content-Type header in role-change PATCH request
- **[LR-primary-advantage-052-003](evidence/primary-advantage-052.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/shared/change-role.tsx:174-176`
  - Dynamic Tailwind class interpolation prevents JIT compilation
- **[LR-primary-advantage-052-004](evidence/primary-advantage-052.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/shared/change-role.tsx:46-63`
  - Client-side role self-service UI exposed to primary students
- **[LR-primary-advantage-052-005](evidence/primary-advantage-052.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/site-header.tsx:29`
  - Hardcoded brand color in site header

### Batch 053 (10 findings)

- **[LR-primary-advantage-053-001](evidence/primary-advantage-053.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/student-assignment-table.tsx:561-588`
  - AssignmentDetailDialog compares status as number (0,1,2) but data model uses string enum
- **[LR-primary-advantage-053-002](evidence/primary-advantage-053.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/student-assignment-table.tsx:172,179,186,193,281,331,333,337,339,578,580,584,587,601,612,628,651,681`
  - Extensive hardcoded English strings bypassing i18n in student-assignment-table
- **[LR-primary-advantage-053-003](evidence/primary-advantage-053.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/student-assignment-table.tsx:143-157`
  - useDebounce is defined as a custom hook inside the component body
- **[LR-primary-advantage-053-004](evidence/primary-advantage-053.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/student-assignment-table.tsx:708-712,351-354`
  - Status filter sends string "0"/"1"/"2" but column filter expects string enum values
- **[LR-primary-advantage-053-005](evidence/primary-advantage-053.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/student-assignment-table.tsx:479-498`
  - useEffect missing `fetchAssignment` in dependency array
- **[LR-primary-advantage-053-006](evidence/primary-advantage-053.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/student-assignment-table.tsx:554-688`
  - AssignmentDetailDialog component redefined on every render inside parent
- **[LR-primary-advantage-053-007](evidence/primary-advantage-053.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/system/create-school-dialog.tsx:39,44,46`
  - create-school-dialog has hardcoded English text without i18n
- **[LR-primary-advantage-053-008](evidence/primary-advantage-053.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/system/create-school-form.tsx:25-43,89,94-95,101-105,122,126,131-133,150,155-157,175,180-182,196,203`
  - create-school-form has hardcoded English validation messages, placeholders, and labels
- **[LR-primary-advantage-053-009](evidence/primary-advantage-053.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/system/create-school-form.tsx:79-85`
  - create-school-form POSTs to /api/schools with no CSRF or auth token visible
- **[LR-primary-advantage-053-010](evidence/primary-advantage-053.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/system/create-school-form.tsx:88,92`
  - create-school-form response.json() called twice without guard

### Batch 054 (8 findings)

- **[LR-primary-advantage-054-001](evidence/primary-advantage-054.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/system/edit-license-form.tsx:128-170`
  - License edit posts via `fetch` to a route handler instead of a Server Action
- **[LR-primary-advantage-054-002](evidence/primary-advantage-054.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/system/edit-license-form.tsx:99,172-189`
  - School fetch effect uses untyped `any[]` state and a stale/empty dependency array
- **[LR-primary-advantage-054-003](evidence/primary-advantage-054.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/system/edit-license-form.tsx:81,142,238-274`
  - License edit form lets role `ADMIN` reassign `schoolId` across tenants with no tenant scoping
- **[LR-primary-advantage-054-004](evidence/primary-advantage-054.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/system/license-table.tsx:48,76,93`
  - Local `licenses` state shadows the imported Drizzle `licenses` table symbol
- **[LR-primary-advantage-054-005](evidence/primary-advantage-054.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/system/license-table.tsx:105-122,284-298`
  - `fetchLicenses` logic is duplicated inline inside the edit `onSuccess` callback
- **[LR-primary-advantage-054-006](evidence/primary-advantage-054.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/system/license-table.tsx:142-148,236-241`
  - "Copy License" copies the raw license key even though the key column is intentionally hidden
- **[LR-primary-advantage-054-007](evidence/primary-advantage-054.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/assign-button.tsx:37-42`
  - Assignment success toast is hardcoded English, bypassing the component's own i18n
- **[LR-primary-advantage-054-008](evidence/primary-advantage-054.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assign-button.tsx:18-24`
  - `article` prop typed by a lowercase, non-exported interface that shadows domain naming

### Batch 055 (10 findings)

- **[LR-primary-advantage-055-001](evidence/primary-advantage-055.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/assign-form.tsx:107-114`
  - fetchClassrooms has no res.ok guard and no try/catch
- **[LR-primary-advantage-055-002](evidence/primary-advantage-055.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assign-form.tsx:31-38`
  - articleId Zod field has no `.min(1)` while sibling fields do
- **[LR-primary-advantage-055-003](evidence/primary-advantage-055.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assign-form.tsx:32,33,35`
  - Hardcoded English Zod validation messages
- **[LR-primary-advantage-055-004](evidence/primary-advantage-055.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-button.tsx:1-521`
  - Entire component is hardcoded English; no `useTranslations` import
- **[LR-primary-advantage-055-005](evidence/primary-advantage-055.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-button.tsx:117,506-512`
  - `assignedStudentIds` state declared but never updated; submit button always shows "Create"
- **[LR-primary-advantage-055-006](evidence/primary-advantage-055.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-button.tsx:114,215-219,229-231,370-373,446-450`
  - `errors` state never populated; manual error-rendering path is dead code
- **[LR-primary-advantage-055-007](evidence/primary-advantage-055.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/assignment-button.tsx:195-198`
  - `student: any` type erases safety; display fallback exposes student email
- **[LR-primary-advantage-055-008](evidence/primary-advantage-055.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-button.tsx:50,108,131-157`
  - `onUpdate` prop destructured but never invoked in `onSubmit`
- **[LR-primary-advantage-055-009](evidence/primary-advantage-055.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/teacher/assignment-button.tsx:332,413-415`
  - Commented-out i18n calls reveal incomplete migration
- **[LR-primary-advantage-055-010](evidence/primary-advantage-055.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-button.tsx:280`
  - `classroom.id!` non-null assertion on a typed string field

### Batch 056 (4 findings)

- **[LR-primary-advantage-056-001](evidence/primary-advantage-056.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:225-240`
  - Dead code: commented-out fetchArticle function
- **[LR-primary-advantage-056-002](evidence/primary-advantage-056.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:300-302`
  - Missing user-facing error feedback on failure paths
- **[LR-primary-advantage-056-003](evidence/primary-advantage-056.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:216`
  - API endpoint path inconsistency
- **[LR-primary-advantage-056-004](evidence/primary-advantage-056.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:802`
  - Potential student identifier exposure in UI

### Batch 057 (6 findings)

- **[LR-057-001](evidence/primary-advantage-057.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/assignments.tsx:318-319`
  - Fragile pathname parsing extracts classroomId from URL segments
- **[LR-057-002](evidence/primary-advantage-057.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/assignments.tsx:101-115`
  - useDebounce hook defined inside component body
- **[LR-057-003](evidence/primary-advantage-057.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/assignments.tsx:330-335`
  - fetchClassrooms missing error handling and response validation
- **[LR-057-004](evidence/primary-advantage-057.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/assignments.tsx:305-336`
  - Double fetch on initial load when URL contains classroomId
- **[LR-057-005](evidence/primary-advantage-057.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/teacher/class-code-generator.tsx:227-228`
  - Hardcoded Tailwind color class in code generator instructions box
- **[LR-057-006](evidence/primary-advantage-057.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/components/teacher/class-code-generator.tsx:51-59`
  - No backend adapter pattern for API calls

### Batch 058 (6 findings)

- **[LR-058-001](evidence/primary-advantage-058.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/class-roster.tsx:510-513`
  - Disabled Reset button with no-op onClick
- **[LR-058-002](evidence/primary-advantage-058.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/class-roster.tsx:95-97,101,275-299,333-344,346-351,379-420`
  - Commented-out code blocks (dead code)
- **[LR-058-003](evidence/primary-advantage-058.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/class-roster.tsx:111-121`
  - Missing CSRF token on fetch PATCH request
- **[LR-058-004](evidence/primary-advantage-058.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/class-roster.tsx:144,156,171,191,199,353,374,465,480,487,498,501,507,514`
  - Inconsistent i18n: hardcoded English strings
- **[LR-058-005](evidence/primary-advantage-058.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/class-roster.tsx:270,315,327`
  - console.error in production code
- **[LR-058-006](evidence/primary-advantage-058.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/class-roster.tsx:150,160`
  - CSS class typo "captoliza"

### Batch 059 (9 findings)

- **[LR-primary-advantage-059-001](evidence/primary-advantage-059.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:484`
  - Hardcoded English strings break i18n in active roster JSX
- **[LR-primary-advantage-059-002](evidence/primary-advantage-059.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:86`
  - Large commented-out dead-code blocks left in source
- **[LR-primary-advantage-059-003](evidence/primary-advantage-059.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:139-141`
  - useEffect omits fetchClassroomData from dependency array
- **[LR-primary-advantage-059-004](evidence/primary-advantage-059.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:37-53`
  - Unused lucide-react icon imports
- **[LR-primary-advantage-059-005](evidence/primary-advantage-059.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/enhanced-class-roster.tsx:192-223`
  - Client trusts /api/users PATCH for progress reset without visible tenant/role guard
- **[LR-primary-advantage-059-006](evidence/primary-advantage-059.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:23-303`
  - Demo component is unreferenced dead code shipped in app source
- **[LR-primary-advantage-059-007](evidence/primary-advantage-059.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:42`
  - `any`-typed callback parameter
- **[LR-primary-advantage-059-008](evidence/primary-advantage-059.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:43`
  - Leftover console.log debug statements
- **[LR-primary-advantage-059-009](evidence/primary-advantage-059.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/enrollment-demo.tsx:56-300`
  - Demo UI is entirely hardcoded English (no i18n)

### Batch 060 (9 findings)

- **[LR-060-001](evidence/primary-advantage-060.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:244,245,247,269,283,292,293,374,376,402,403,482,497,500,501,504,508,521`
  - Hardcoded English UI strings (no i18n in this component)
- **[LR-060-002](evidence/primary-advantage-060.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:97-99,134-140,169-175`
  - `fetch` calls lack CSRF token and rely on cookie-only auth
- **[LR-060-003](evidence/primary-advantage-060.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:106,158,197`
  - `console.error` calls leak unstructured errors to the browser console
- **[LR-060-004](evidence/primary-advantage-060.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:44,317,424,500-504`
  - Student email PII rendered in unenroll confirmation dialog
- **[LR-060-005](evidence/primary-advantage-060.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:94-111,131-163,166-202`
  - No `AbortController` / cleanup on async fetch calls (race condition on unmount)
- **[LR-060-006](evidence/primary-advantage-060.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:157,196`
  - `catch (error: any)` violates TypeScript strictness
- **[LR-060-007](evidence/primary-advantage-060.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:268-273`
  - Search input has no associated label or `aria-label`
- **[LR-060-008](evidence/primary-advantage-060.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx:349-361,454-470,516-520`
  - Icon-only Unenroll button has no `aria-label`; loading state is not announced
- **[LR-060-009](evidence/primary-advantage-060.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/enrollment-management.tsx`
  - No test file for `enrollment-management.tsx`

### Batch 061 (7 findings)

- **[LR-primary-advantage-061-001](evidence/primary-advantage-061.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/my-classes.tsx:392-442, 559-717, 129-136, 459-482`
  - Google Classroom import feature completely disabled via commented-out code, leaving dead dialog and dead state
- **[LR-primary-advantage-061-002](evidence/primary-advantage-061.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/components/teacher/my-classes.tsx:70`
  - Unused import `classroom_v1` from `googleapis` (line 70)
- **[LR-primary-advantage-061-003](evidence/primary-advantage-061.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/my-classes.tsx:145`
  - Debug `console.log` left in production code (line 145)
- **[LR-primary-advantage-061-004](evidence/primary-advantage-061.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/my-classes.tsx:255, 279, 291, 301`
  - CSS class name typo `captoliza` in multiple elements (lines 255, 279, 291, 301)
- **[LR-primary-advantage-061-005](evidence/primary-advantage-061.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/my-classes.tsx:138-151, 230-232`
  - No loading indicator during initial data fetch (lines 138-151, 230-232)
- **[LR-primary-advantage-061-006](evidence/primary-advantage-061.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/my-classes.tsx:351-354`
  - Archive dropdown action has no onClick handler (line 351-354)
- **[LR-primary-advantage-061-007](evidence/primary-advantage-061.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/my-classes.tsx:76`
  - Direct Radix import instead of shadcn/ui wrapper for Label (line 76)

### Batch 062 (14 findings)

- **[LR-062-001](evidence/primary-advantage-062.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/my-students.tsx:128`
  - Hardcoded CEFR reset value bypasses current level
- **[LR-062-002](evidence/primary-advantage-062.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/my-students.tsx:72-74`
  - Unused type `MyStudentProps`
- **[LR-062-003](evidence/primary-advantage-062.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/my-students.tsx:247`
  - Misleading variable name `payment` for student row data
- **[LR-062-004](evidence/primary-advantage-062.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/my-students.tsx:171,185`
  - CSS class typo `captoliza`
- **[LR-062-005](evidence/primary-advantage-062.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/my-students.tsx:109,147`
  - `console.error` for error logging in production component
- **[LR-062-006](evidence/primary-advantage-062.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/reports.tsx:132,148,157,166,173,181,201,406,421,429`
  - Hardcoded English strings bypass i18n
- **[LR-062-007](evidence/primary-advantage-062.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/reports.tsx:229`
  - Reports table is hardcoded to empty data
- **[LR-062-008](evidence/primary-advantage-062.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/reports.tsx:184,215`
  - Dead `payment` variable name in reports columns
- **[LR-062-009](evidence/primary-advantage-062.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/reports.tsx:197`
  - `process.env.NEXT_PUBLIC_BASE_URL` used for client-side navigation
- **[LR-062-010](evidence/primary-advantage-062.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/reports.tsx:139,151,160,170`
  - CSS class typo `captoliza` in reports
- **[LR-062-011](evidence/primary-advantage-062.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/reports.tsx:103-119,287-302`
  - Unused `calculateAverageLevel` and `fetchXpPerStudents` functions
- **[LR-062-012](evidence/primary-advantage-062.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/student-cefr-level-setter.tsx:34-98`
  - CEFR level descriptions hardcoded in English, not i18n
- **[LR-062-013](evidence/primary-advantage-062.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/student-cefr-level-setter.tsx:107`
  - CEFR setter does not sync `selectedLevel` when `currentCefrLevel` prop changes
- **[LR-062-014](evidence/primary-advantage-062.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/student-cefr-level-setter.tsx:134`
  - Generic error message "FAILED" thrown without context

### Batch 063 (7 findings)

- **[LR-063-001](evidence/primary-advantage-063.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/student-enrollment-button.tsx:51`
  - Hardcoded English `buttonText` default bypasses i18n in enrollment dialog
- **[LR-063-002](evidence/primary-advantage-063.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/student-enrollment-button.tsx:121`
  - `any`-typed catch block erases error context in enrollment flow
- **[LR-063-003](evidence/primary-advantage-063.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/student-unenrollment-button.tsx:73,97,105,108-123,128,137-143`
  - Hardcoded English strings in unenrollment dialog without i18n
- **[LR-063-004](evidence/primary-advantage-063.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:66,145`
  - `any`-typed catch and `studentData` state in teacher progress reports
- **[LR-063-005](evidence/primary-advantage-063.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:151-157`
  - Stale closure risk in `useEffect` calling `fetchStudentData`
- **[LR-063-006](evidence/primary-advantage-063.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:139`
  - No teacher-ownership verification before fetching student data
- **[LR-063-007](evidence/primary-advantage-063.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/teacher/teacher-progress-reports.tsx:98-100`
  - Potential NaN in average XP calculation when student list is empty

### Batch 064 (3 findings)

- **[LR-064-001](evidence/primary-advantage-064.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/ui/collapsible.tsx:7,13,23`
  - `collapsible.tsx` references `React.ComponentProps` without importing `React`
- **[LR-064-002](evidence/primary-advantage-064.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/ui/chart.tsx:82-101`
  - `chart.tsx` injects theme colors via `dangerouslySetInnerHTML`
- **[LR-064-003](evidence/primary-advantage-064.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/ui/calendar-heatmap.tsx:81-82,112-114`
  - `categorizeDatesPerVariant` throws on empty `weightedDates`

### Batch 065 (1 findings)

- **[LR-primary-advantage-065-001](evidence/primary-advantage-065.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/components/ui/copy-button.tsx:10-12`
  - `copyToClipboardWithMeta` discards Promise and silently swallows clipboard failures

### Batch 066 (2 findings)

- **[LR-primary-advantage-066-001](evidence/primary-advantage-066.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/ui/rating.tsx:175-239`
  - Dead code: large commented-out example block in rating component
- **[LR-primary-advantage-066-002](evidence/primary-advantage-066.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/ui/rating.tsx:2`
  - Stale dependency installation comment in rating component

### Batch 067 (4 findings)

- **[LR-primary-advantage-067-001](evidence/primary-advantage-067.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/update-user-license.tsx:55-61`
  - update-user-license: direct client-side fetch bypasses server actions
- **[LR-primary-advantage-067-002](evidence/primary-advantage-067.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/update-user-license.tsx:20`
  - update-user-license: unused `useSession` import
- **[LR-primary-advantage-067-003](evidence/primary-advantage-067.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/components/update-user-license.tsx:31`
  - update-user-license: unused `expired` prop
- **[LR-primary-advantage-067-004](evidence/primary-advantage-067.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/components/update-user-license.tsx:66,79-80,84-85`
  - update-user-license: hardcoded English strings not internationalized

### Batch 068 (1 findings)

- **[LR-068-001](evidence/primary-advantage-068.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/configs/admin-page-config.ts:33`
  - Commented-out permission property in admin sidebar config

### Batch 069 (1 findings)

- **[LR-primary-advantage-069-001](evidence/primary-advantage-069.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/data/A0-story-example.json:223`
  - A0 passage uses adverb "Ideally" outside controlled vocabulary and reading level

### Batch 070 (2 findings)

- **[LR-primary-advantage-070-001](evidence/primary-advantage-070.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/data/A1-story-example.json:322,328`
  - Chapter 4 grammar focus claims comparative "higher" but the passage only uses the base form "high"
- **[LR-primary-advantage-070-002](evidence/primary-advantage-070.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/data/A1-story-example.json:550,556`
  - Chapter 7 grammar focus claims adverb "carefully" but the passage only uses "slowly"

### Batch 071 (1 findings)

- **[LR-primary-advantage-071-001](evidence/primary-advantage-071.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/data/A2-story-example.json:10`
  - Vocabulary entry "dusty" has leading whitespace in globalVocabularyList

### Batch 072 (2 findings)

- **[LR-primary-advantage-072-001](evidence/primary-advantage-072.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/audios/articles/temp.mp3`
  - Committed temp.mp3 binary artifact in data/audios/
- **[LR-primary-advantage-072-002](evidence/primary-advantage-072.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/audios/articles/temp.mp3`
  - Binary file included in line-review inventory with inaccurate line count

### Batch 073 (2 findings)

- **[LR-primary-advantage-073-001](evidence/primary-advantage-073.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/audios/sentences/temp.mp3:1`
  - Binary audio file committed to repository
- **[LR-primary-advantage-073-002](evidence/primary-advantage-073.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/audios/sentences/temp.mp3:1`
  - Non-semantic line count for binary file

### Batch 074 (2 findings)

- **[LR-primary-advantage-074-001](evidence/primary-advantage-074.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/audios/words/temp.mp3:1-3712`
  - Scratch binary `temp.mp3` committed to the repository and unreferenced by code
- **[LR-primary-advantage-074-002](evidence/primary-advantage-074.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/audios/words/temp.mp3:1-3712`
  - Byte-identical duplicate asset across three audio directories

### Batch 075 (11 findings)

- **[LR-primary-advantage-075-001](evidence/primary-advantage-075.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/data/cefr-level-evaluation-prompts.json:4,8,12,16,20,24`
  - `cefr-level-evaluation-prompts.json` copies "secondary students" wording into a primary-targeted app across all 6 CEFR level entries
- **[LR-primary-advantage-075-002](evidence/primary-advantage-075.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/data/level-test.json`
  - `level-test.json` is an orphan file in primary-advantage; reading-advantage's level-test infrastructure consumes it, primary-advantage does not
- **[LR-primary-advantage-075-003](evidence/primary-advantage-075.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/data/cefr-level-evaluation-prompts.json`
  - `cefr-level-evaluation-prompts.json` is an orphan file in primary-advantage; primary-advantage uses `new-level-evaluation-prompts.json` for the same role
- **[LR-primary-advantage-075-004](evidence/primary-advantage-075.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/data/db.json:1-15`
  - `data/db.json` is an empty placeholder with all-empty arrays, exists only in primary-advantage, and is never imported
- **[LR-primary-advantage-075-005](evidence/primary-advantage-075.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/images/temp.jpg`
  - `data/images/temp.jpg` is a 0-byte empty file committed to the repository; identical placeholder exists in reading-advantage
- **[LR-primary-advantage-075-006](evidence/primary-advantage-075.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/data/prompts-ai.ts:61-74`
  - `data/prompts-ai.ts:61-74`: `saqeution_user` is dead code (no importer) and contains a misleading hardcoded `STUDENT'S L1: Thai;` line
- **[LR-primary-advantage-075-007](evidence/primary-advantage-075.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/data/prompts-combined-LA.json:58`
  - `data/prompts-combined-LA.json:58` has a typo: `forvstudents` instead of `for students`
- **[LR-primary-advantage-075-008](evidence/primary-advantage-075.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/data/prompts-combined-LA.json:5,38`
  - `data/prompts-combined-LA.json` has no A0 level entries while sibling fixture files (`level-test.json`, `new-article-prompts.json`, `new-level-evaluation-prompts.json`) do include A0
- **[LR-primary-advantage-075-009](evidence/primary-advantage-075.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/data/cefr-article-prompts.json:7,12,17,22,27,32,42,47,52,57,62,67`
  - `data/cefr-article-prompts.json` hardcodes "second-language readers aged 9-12" across all 12 CEFR level entries, mismatching the primary-student YLE 6-9 range used by the sibling `new-article-prompts.json`
- **[LR-primary-advantage-075-010](evidence/primary-advantage-075.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/data/cefr-article-prompts.json`
  - Two parallel article-prompt fixtures exist with overlapping roles: `cefr-article-prompts.json` (A1-C2, ages 9-12) vs `new-article-prompts.json` (A0-B2, grades 3-6 / YLE-aligned)
- **[LR-primary-advantage-075-011](evidence/primary-advantage-075.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/data/level-test.json:184,191`
  - `data/level-test.json` has distractor options with grammar errors that exceed the target CEFR level or are syntactically broken, undermining the placement test's diagnostic value for primary students

### Batch 076 (1 findings)

- **[LR-primary-advantage-076-001](evidence/primary-advantage-076.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/story-schema.ts:1-179`
  - `data/story-schema.ts` exports schemas that duplicate `lib/zod.ts` names and are never consumed by production code

### Batch 077 (4 findings)

- **[LR-077-001](evidence/primary-advantage-077.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/title-a1.json:1-609`
  - No type/schema contract for story collection JSON
- **[LR-077-002](evidence/primary-advantage-077.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/data/title-a1.json:5`
  - Hardcoded totalStories count must be manually synced
- **[LR-077-003](evidence/primary-advantage-077.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/data/title-a1.json:3-4,7-606`
  - English-only content in i18n-enabled app
- **[LR-077-004](evidence/primary-advantage-077.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/data/title-a1.json:7-606`
  - Repeated character names across unrelated stories

### Batch 078 (1 findings)

- **[LR-078-001](evidence/primary-advantage-078.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/eslint.config.mjs:6`
  - Stale Prisma ignore in ESLint config

### Batch 079 (6 findings)

- **[LR-079-001](evidence/primary-advantage-079.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/lib/calculateLevel.ts:1-52`
  - `calculateLevel.ts` is an entirely dead/commented-out module
- **[LR-079-002](evidence/primary-advantage-079.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/lib/events.ts:1`
  - `events.ts` calls the Vercel Analytics SDK directly and carries shadcn-doc boilerplate event names
- **[LR-079-003](evidence/primary-advantage-079.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/lib/fsrs-service.ts:155`
  - `fsrs-service.processReview` returns an untyped `any` review log
- **[LR-079-004](evidence/primary-advantage-079.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/lib/permissions.ts:84-95`
  - `permissions.ts` permission model expects a relational user shape the session never provides
- **[LR-079-005](evidence/primary-advantage-079.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/lib/permissions.ts:209-231`
  - `canAccessRoute` fails open for unmatched routes
- **[LR-079-006](evidence/primary-advantage-079.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/lib/storage-config.ts:6-20`
  - `storage-config` bypasses the storage adapter and emits unsigned public GCS URLs for student content

### Batch 080 (4 findings)

- **[LR-080-001](evidence/primary-advantage-080.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/lib/utils.ts:51-60`
  - `calculateLevelAndCefrLevel` matches against the activity delta instead of the cumulative XP
- **[LR-080-002](evidence/primary-advantage-080.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/lib/utils.ts:1`
  - React hook `useFormatDate` lives in `lib/utils.ts`, violating AGENTS.md file layout
- **[LR-080-003](evidence/primary-advantage-080.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/lib/zod.ts:399-466`
  - `articleResponseSchema` in `lib/zod.ts` is unused dead code
- **[LR-080-004](evidence/primary-advantage-080.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/lib/zod.ts:68-70`
  - `LAQuestionSchema` is structurally inconsistent with `MCQuestionSchema`/`SAQuestionSchema`

### Batch 081 (2 findings)

- **[LR-primary-advantage-081-001](evidence/primary-advantage-081.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/messages/cn.json:4`
  - `cn` locale label incorrectly shows Traditional Chinese text and Taiwan instead of Simplified Chinese
- **[LR-primary-advantage-081-002](evidence/primary-advantage-081.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/messages/cn.json:859`
  - Blank line in JSON object body between key-value pairs

### Batch 082 (8 findings)

- **[LR-082-001](evidence/primary-advantage-082.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/messages/en.json:95`
  - Typo in i18n key name "anwserError"
- **[LR-082-002](evidence/primary-advantage-082.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/messages/en.json:101`
  - Typo in i18n key name "feedbackwritting"
- **[LR-082-003](evidence/primary-advantage-082.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/messages/en.json:108`
  - Typo in i18n key name "areaforimpovement"
- **[LR-082-004](evidence/primary-advantage-082.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/messages/en.json:396-397`
  - Hard-coded mock data in production translation string
- **[LR-082-005](evidence/primary-advantage-082.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/messages/en.json:1704-1703`
  - cn.json and tw.json have 42 keys under wrong namespace
- **[LR-082-006](evidence/primary-advantage-082.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/messages/en.json:141-145`
  - Stub/placeholder translation values identical to key name
- **[LR-082-007](evidence/primary-advantage-082.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/messages/en.json:669`
  - US-centric content in multi-locale primary-student app
- **[LR-082-008](evidence/primary-advantage-082.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/messages/en.json:100-118`
  - Inconsistent i18n key naming convention in feedbackModal

### Batch 083 (4 findings)

- **[LR-083-001](evidence/primary-advantage-083.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/messages/th.json:104`
  - Incorrect translation for "grammar" key
- **[LR-083-002](evidence/primary-advantage-083.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/messages/th.json:704`
  - Literal mistranslation of "heatmap"
- **[LR-083-003](evidence/primary-advantage-083.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/messages/th.json:1093`
  - Duplicate word in session complete message
- **[LR-083-004](evidence/primary-advantage-083.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/messages/th.json:1186`
  - Garbled/truncated Thai text

### Batch 084 (2 findings)

- **[LR-primary-advantage-084-001](evidence/primary-advantage-084.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/messages/tw.json:376`
  - Simplified Chinese strings inside the Traditional Chinese (`tw`) message catalog
- **[LR-primary-advantage-084-002](evidence/primary-advantage-084.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/messages/tw.json:4`
  - LocaleSwitcher `cn` option mislabeled as "台灣" (Taiwan)

### Batch 085 (4 findings)

- **[LR-085-001](evidence/primary-advantage-085.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/messages/vi.json:4`
  - Locale switcher maps `cn` to Taiwan instead of Mainland China
- **[LR-085-002](evidence/primary-advantage-085.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/messages/vi.json:669`
  - US-centric `us_symbols_landmarks` subgenre translated into Vietnamese
- **[LR-085-003](evidence/primary-advantage-085.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/messages/vi.json:396`
  - Hard-coded "5" in AdminDashboard.alerts.newRegistrations.description
- **[LR-085-004](evidence/primary-advantage-085.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/messages/vi.json:1174`
  - Leading-space typo in `completedDescription` value, copied from English source

### Batch 086 (6 findings)

- **[LR-primary-advantage-086-001](evidence/primary-advantage-086.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/next.config.ts:8`
  - TypeScript build errors suppressed via config
- **[LR-primary-advantage-086-002](evidence/primary-advantage-086.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/next.config.ts:6`
  - React Strict Mode disabled
- **[LR-primary-advantage-086-003](evidence/primary-advantage-086.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/package.json:66`
  - Direct `openai` SDK dependency bypasses AI adapter
- **[LR-primary-advantage-086-004](evidence/primary-advantage-086.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/package.json:20`
  - Direct `@google-cloud/storage` dependency bypasses storage adapter
- **[LR-primary-advantage-086-005](evidence/primary-advantage-086.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/package.json:22,53`
  - Duplicate password-hashing libraries (`bcryptjs` + `@node-rs/argon2`)
- **[LR-primary-advantage-086-006](evidence/primary-advantage-086.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/proxy.ts:108-120`
  - Dead commented-out matcher config in middleware

### Batch 087 (3 findings)

- **[LR-087-001](evidence/primary-advantage-087.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/public/login-image.png`
  - Oversized login background image (1.7 MB)
- **[LR-087-002](evidence/primary-advantage-087.md)** Low | Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/auth/layout.tsx:20`
  - Generic alt text "Image" on login background
- **[LR-087-003](evidence/primary-advantage-087.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/public/login-image.png`
  - Manifest line count mismatch for binary file

### Batch 088 (0 findings)

### Batch 089 (6 findings)

- **[LR-primary-advantage-089-001](evidence/primary-advantage-089.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/classroomController.ts:232`
  - Classroom role checks use inconsistent string casing, blocking legitimate teachers/system
- **[LR-primary-advantage-089-002](evidence/primary-advantage-089.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/classroomController.ts:250`
  - Classroom ownership/tenant scoping never enforced (teacherId always undefined; enroll ignores it)
- **[LR-primary-advantage-089-003](evidence/primary-advantage-089.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/controllers/assignmentController.ts:26`
  - Assignment endpoints lack authentication and tenant scoping; trust frontend classroomId
- **[LR-primary-advantage-089-004](evidence/primary-advantage-089.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/assignmentController.ts:38`
  - Stray debug log left in production path
- **[LR-primary-advantage-089-005](evidence/primary-advantage-089.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/controllers/articleController.ts:153`
  - Article generation/delete/publish lack authorization (and carry dead code)
- **[LR-primary-advantage-089-006](evidence/primary-advantage-089.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/controllers/schoolController.ts:21`
  - School leaderboard accepts caller-supplied schoolId/userId without ownership verification

### Batch 090 (11 findings)

- **[LR-primary-advantage-090-001](evidence/primary-advantage-090.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/studentController.ts:34-51`
  - Controllers reimplement auth boilerplate instead of using `withAuth` middleware
- **[LR-primary-advantage-090-002](evidence/primary-advantage-090.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/server/controllers/studentController.ts:11`
  - Local `validateUser`/`checkAdminPermissions` duplicates shared auth adapter
- **[LR-primary-advantage-090-003](evidence/primary-advantage-090.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/studentController.ts:140-146`
  - Inline regex email validation instead of Zod schema at boundary
- **[LR-primary-advantage-090-004](evidence/primary-advantage-090.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/controllers/studentController.ts:91,106,167,176,194,221,227,247,290,308,342`
  - Free-form `console.log`/`console.error` instead of structured logger
- **[LR-primary-advantage-090-005](evidence/primary-advantage-090.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/controllers/studentController.ts:167-170,194,221-224,247,281-284,308,339`
  - PII in `console.log` of student/teacher identifiers
- **[LR-primary-advantage-090-006](evidence/primary-advantage-090.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/studentController.ts:45-51,119-125,207-213,260-266,321-327`
  - Auth checks are coarse-grained admin-only; no tenant or resource-owner scoping
- **[LR-primary-advantage-090-007](evidence/primary-advantage-090.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/userController.ts:1`
  - Dead import: `NextRequest` unused in `userController.ts`
- **[LR-primary-advantage-090-008](evidence/primary-advantage-090.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/userController.ts:9`
  - `import { error } from "console";` is dead and confusing
- **[LR-primary-advantage-090-009](evidence/primary-advantage-090.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/userController.ts:12-106`
  - `userController.ts` helpers have inconsistent and incomplete auth checks
- **[LR-primary-advantage-090-010](evidence/primary-advantage-090.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/userController.ts:23-36`
  - `handleUpdateUserActivity` silently returns `undefined` for non-MC activity types
- **[LR-primary-advantage-090-011](evidence/primary-advantage-090.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/controllers/teacherController.ts:45-46`
  - `parseInt(searchParams.get("page") || "1")` without explicit radix

### Batch 091 (6 findings)

- **[LR-primary-advantage-091-001](evidence/primary-advantage-091.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/server/models/articleModel.ts:172`
  - Stale Prisma-era comments after Drizzle migration
- **[LR-primary-advantage-091-002](evidence/primary-advantage-091.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/models/articleModel.ts:390`
  - Mid-file ES imports with misleading "lazy import" documentation
- **[LR-primary-advantage-091-003](evidence/primary-advantage-091.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/models/articleModel.ts:394`
  - Unused `ilike` import suppressed via `void` expression
- **[LR-primary-advantage-091-004](evidence/primary-advantage-091.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/articleModel.ts:546-548`
  - Error swallowing in `deleteArticleByIdModel`
- **[LR-primary-advantage-091-005](evidence/primary-advantage-091.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/articleModel.ts:534-538`
  - DB transaction contains non-rollbackable external side effect
- **[LR-primary-advantage-091-006](evidence/primary-advantage-091.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/models/articleModel.ts:350`
  - `any` type used for where conditions array

### Batch 092 (11 findings)

- **[LR-primary-advantage-092-001](evidence/primary-advantage-092.md)** Critical | Fork-specific regression
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:142-240`
  - Pagination-before-filter corruption in `getStudentAssignments`
- **[LR-primary-advantage-092-002](evidence/primary-advantage-092.md)** Critical | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:27-101,337-418`
  - `createAssignment` and `updateUserLessonProgress` lack `schoolId` multi-tenancy scoping
- **[LR-primary-advantage-092-003](evidence/primary-advantage-092.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:374-381`
  - `updateUserLessonProgress` never sets `completedAt` when marking COMPLETED
- **[LR-primary-advantage-092-004](evidence/primary-advantage-092.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:267-327`
  - `getAssignmentById` lacks tenant scoping on assignment and child queries
- **[LR-primary-advantage-092-005](evidence/primary-advantage-092.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:68-74`
  - Dead code: redundant `existingAssignment` guard (Prisma migration artifact)
- **[LR-primary-advantage-092-006](evidence/primary-advantage-092.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:16,29,269`
  - `currentUser()` auth boundary leak into model layer
- **[LR-primary-advantage-092-007](evidence/primary-advantage-092.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:120,296`
  - `getStudentAssignments` and `getAssignmentById` use `any` types
- **[LR-primary-advantage-092-008](evidence/primary-advantage-092.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:420-445,447-475`
  - Inconsistent error handling: `getUserLessonProgress` and `getAssignmentActivityById` silently swallow errors
- **[LR-primary-advantage-092-009](evidence/primary-advantage-092.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:329-335`
  - Mid-file import block violates top-of-file import convention
- **[LR-primary-advantage-092-010](evidence/primary-advantage-092.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:477-479`
  - Bottom-of-file import of `endOfDay` from `date-fns`
- **[LR-primary-advantage-092-011](evidence/primary-advantage-092.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:447-475`
  - `getAssignmentActivityById` does not scope by `assignmentId`

### Batch 093 (15 findings)

- **[LR-primary-advantage-093-001](evidence/primary-advantage-093.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:20,38-41,922-925,929-932,948`
  - Transport coupling: model imports and returns `NextResponse`
- **[LR-primary-advantage-093-002](evidence/primary-advantage-093.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/models/classroomModel.ts:117-185,187-262,264-351`
  - No tenant/school scoping in enrollment and classroom access functions
- **[LR-primary-advantage-093-003](evidence/primary-advantage-093.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/classroomModel.ts:819`
  - `getClassroomWithStudents` references non-existent `classrooms.teacherId` column
- **[LR-primary-advantage-093-004](evidence/primary-advantage-093.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/classroomModel.ts:885,894`
  - `teacherRows[0]?.user` always undefined — destructured fields accessed via wrong property
- **[LR-primary-advantage-093-005](evidence/primary-advantage-093.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:536-592`
  - `deleteClassroom` does not cascade-delete `classroomStudents` and `classroomTeachers` rows
- **[LR-primary-advantage-093-006](evidence/primary-advantage-093.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/models/classroomModel.ts:101-107`
  - System role creates classrooms without `schoolId`
- **[LR-primary-advantage-093-007](evidence/primary-advantage-093.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/models/classroomModel.ts:195-210`
  - `unenrollStudentFromClassroom` skips authorization when `teacherId` is not provided
- **[LR-primary-advantage-093-008](evidence/primary-advantage-093.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:978-985`
  - `Math.random()` used for class code generation
- **[LR-primary-advantage-093-009](evidence/primary-advantage-093.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:37-51`
  - Dead code: `if (classroom)` unreachable after early return
- **[LR-primary-advantage-093-010](evidence/primary-advantage-093.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:298,316,321,325,334,376,753,777`
  - Extensive `any[]` types and `@ts-ignore` suppress type safety
- **[LR-primary-advantage-093-011](evidence/primary-advantage-093.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:420-464`
  - N+1 query pattern in `getAllClassrooms`
- **[LR-primary-advantage-093-012](evidence/primary-advantage-093.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/models/classroomModel.ts:895`
  - `archived: false` with incomplete migration comment
- **[LR-primary-advantage-093-013](evidence/primary-advantage-093.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:22`
  - Unused import `currentUser`
- **[LR-primary-advantage-093-014](evidence/primary-advantage-093.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:69`
  - Unsafe type assertion `data.teacherId as string`
- **[LR-primary-advantage-093-015](evidence/primary-advantage-093.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/classroomModel.ts:319-338,353-355`
  - `notInArrayFn` import placed after usage, with unnecessary `@ts-ignore` comments

### Batch 094 (7 findings)

- **[LR-primary-advantage-094-001](evidence/primary-advantage-094.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/lessonModel.ts:18-41`
  - Standalone lesson article fetch has no tenant/school scoping
- **[LR-primary-advantage-094-002](evidence/primary-advantage-094.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/models/lessonModel.ts:72-90`
  - Progress/activity models trust caller-supplied userId (IDOR)
- **[LR-primary-advantage-094-003](evidence/primary-advantage-094.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/lessonModel.ts:51`
  - Free-form console logging in model error paths
- **[LR-primary-advantage-094-004](evidence/primary-advantage-094.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/schoolModel.ts:241-254`
  - School leaderboard read trusts caller-supplied schoolId with no access check
- **[LR-primary-advantage-094-005](evidence/primary-advantage-094.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/models/schoolModel.ts:253`
  - Unsafe `schoolId as string` cast on optional parameter
- **[LR-primary-advantage-094-006](evidence/primary-advantage-094.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/models/schoolModel.ts:214`
  - Leaderboard JSON written/read with `as any`
- **[LR-primary-advantage-094-007](evidence/primary-advantage-094.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/server/models/schoolModel.ts:385-389`
  - Dead `sql` import retained via `void sql`

### Batch 095 (10 findings)

- **[LR-primary-advantage-095-001](evidence/primary-advantage-095.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/server/models/studentModel.ts:20,309-311,463-465`
  - `bcryptjs` instead of root-AGENTS-mandated Argon2id for password hashing
- **[LR-primary-advantage-095-002](evidence/primary-advantage-095.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/models/studentModel.ts:309-311`
  - `Math.random()` used to auto-generate the initial student password
- **[LR-primary-advantage-095-003](evidence/primary-advantage-095.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/studentModel.ts:309-311,373-374`
  - Auto-generated student password is never returned to the caller
- **[LR-primary-advantage-095-004](evidence/primary-advantage-095.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/studentModel.ts:286-290,313-323`
  - `createStudent` allows non-school-admin callers to insert students with `schoolId = null`
- **[LR-primary-advantage-095-005](evidence/primary-advantage-095.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/studentModel.ts:292-306`
  - `createStudent` classroom-validation only enforces `schoolId` when the caller already has one
- **[LR-primary-advantage-095-006](evidence/primary-advantage-095.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/studentModel.ts:568-575`
  - `deleteStudent` cascade is incomplete; many related tables are not cleaned up
- **[LR-primary-advantage-095-007](evidence/primary-advantage-095.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/studentModel.ts:175-176,186,224,241,244,262,271,282,303,373,376,388,417,429,450-453,522-525,528,539,564,577,580,666`
  - Free-form `console.log` / `console.error` instead of structured logger
- **[LR-primary-advantage-095-008](evidence/primary-advantage-095.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/studentModel.ts:46-51,67,92,189,287,294,391,436,459,542,589`
  - `any[]` typed `whereConditions` arrays defeat Drizzle type-safety
- **[LR-primary-advantage-095-009](evidence/primary-advantage-095.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/models/studentModel.ts:586-668`
  - `getStudentStatistics` fetches the full student list into memory to compute averages and counts
- **[LR-primary-advantage-095-010](evidence/primary-advantage-095.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/models/studentModel.ts:39,48-49,67,166,191,235,278,367,393,516,544,589`
  - Hard-coded "student" role string in 12 places; role changes will silently misroute queries

### Batch 096 (5 findings)

- **[LR-primary-advantage-096-001](evidence/primary-advantage-096.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/teacherModel.ts:196`
  - Dead import: `void drizzleOr` at line 196
- **[LR-primary-advantage-096-002](evidence/primary-advantage-096.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/teacherModel.ts:192`
  - Static imports placed after first use (line 192)
- **[LR-primary-advantage-096-003](evidence/primary-advantage-096.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/models/teacherModel.ts:758-764`
  - Destructive role deletion in `updateTeacher` wipes all user roles
- **[LR-primary-advantage-096-004](evidence/primary-advantage-096.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/server/models/teacherModel.ts:17, 405-406, 605, 739`
  - Direct bcryptjs usage bypassing auth adapter
- **[LR-primary-advantage-096-005](evidence/primary-advantage-096.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/teacherModel.ts:48, 58, 141, 193, 250, 410, 599, 734, 869`
  - Extensive use of `any` types in query building

### Batch 097 (9 findings)

- **[LR-primary-advantage-097-001](evidence/primary-advantage-097.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/userModel.ts:35`
  - `bcrypt.hashSync` blocks the event loop
- **[LR-primary-advantage-097-002](evidence/primary-advantage-097.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/userModel.ts:70-75,105-107,179-181,191-192,211-213`
  - Silent error swallowing in multiple model functions
- **[LR-primary-advantage-097-003](evidence/primary-advantage-097.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/userModel.ts:226,275,302-339,444-459,495,519-537`
  - Extensive `any` type usage bypasses type safety
- **[LR-primary-advantage-097-004](evidence/primary-advantage-097.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/userModel.ts:246-377`
  - In-memory pagination fetches all records then slices
- **[LR-primary-advantage-097-005](evidence/primary-advantage-097.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/userModel.ts:299-358,517-572`
  - Duplicated status/scoring logic between `getUserArticleRecords` and `getUserReminderReread`
- **[LR-primary-advantage-097-006](evidence/primary-advantage-097.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/assistant.ts:13-14,69-74,131-136`
  - Direct AI provider coupling bypasses adapter pattern
- **[LR-primary-advantage-097-007](evidence/primary-advantage-097.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/assistant.ts:45-48,109-112`
  - Synchronous filesystem reads for AI prompt templates
- **[LR-primary-advantage-097-008](evidence/primary-advantage-097.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/utils/auth.ts:23`
  - `SchoolAdmins` field uses PascalCase violating TypeScript conventions
- **[LR-primary-advantage-097-009](evidence/primary-advantage-097.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/auth.ts:183-191`
  - System admin `getUserSchoolIds` returns all school IDs without filtering

### Batch 098 (11 findings)

- **[LR-098-001](evidence/primary-advantage-098.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:52`
  - Sync readFileSync blocks event loop in article-generator
- **[LR-098-002](evidence/primary-advantage-098.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:86`
  - Error throw produces string instead of Error object in article-generator
- **[LR-098-003](evidence/primary-advantage-098.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:71-73`
  - console.log leaks model/params to stdout in article-generator
- **[LR-098-004](evidence/primary-advantage-098.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:45-49`
  - Hardcoded 9-12 age range in CEFR prompts referenced by article-generator
- **[LR-098-005](evidence/primary-advantage-098.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:90-109`
  - Direct Google Text-to-Speech API calls bypass AI adapter in audio-flashcard-generator
- **[LR-098-006](evidence/primary-advantage-098.md)** Critical | Shared package migration blocker
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:91`
  - API key exposed as URL query parameter in audio-flashcard-generator
- **[LR-098-007](evidence/primary-advantage-098.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:129-142`
  - Filesystem write/delete cycle incompatible with serverless in audio-flashcard-generator
- **[LR-098-008](evidence/primary-advantage-098.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:55-64`
  - SSML injection risk via unsanitized sentence text in audio-flashcard-generator
- **[LR-098-009](evidence/primary-advantage-098.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:225-314`
  - Commented-out Firebase Firestore code in audio-flashcard-generator
- **[LR-098-010](evidence/primary-advantage-098.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:89-197`
  - Duplicate sentence/word generation blocks in audio-flashcard-generator
- **[LR-098-011](evidence/primary-advantage-098.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:90,147`
  - No retry logic for external TTS API calls in audio-flashcard-generator

### Batch 099 (8 findings)

- **[LR-primary-advantage-099-001](evidence/primary-advantage-099.md)** High | Fork-specific regression
  - File: `apps/primary-advantage/server/utils/genaretors/audio-generator.ts:494-499`
  - `audio-generator.ts` catch block dereferences `error.response.data`, masking the real error
- **[LR-primary-advantage-099-002](evidence/primary-advantage-099.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/audio-generator.ts:427-439`
  - Direct third-party TTS HTTP call bypasses the internal provider adapter
- **[LR-primary-advantage-099-003](evidence/primary-advantage-099.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/audio-generator.ts:277`
  - Stray production `console.log` of generated sentence content
- **[LR-primary-advantage-099-004](evidence/primary-advantage-099.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/utils/genaretors/audio-generator.ts:38-136,239-283,502-611`
  - Large blocks of dead/commented code and unused sentence splitters
- **[LR-primary-advantage-099-005](evidence/primary-advantage-099.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/utils/genaretors/audio-word-generator.ts:94,118-127`
  - Inconsistent Google TTS API-key env var and unvalidated `timepoints` indexing
- **[LR-primary-advantage-099-006](evidence/primary-advantage-099.md)** Low | Fork-specific regression
  - File: `apps/primary-advantage/server/utils/genaretors/audio-word-generator.ts:156-245`
  - Dead Firestore-era commented functions in `audio-word-generator.ts`
- **[LR-primary-advantage-099-007](evidence/primary-advantage-099.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/utils/genaretors/evaluate-rating-generator.ts:69-71`
  - `evaluateRating` swallows the underlying error and loses all diagnostic context
- **[LR-primary-advantage-099-008](evidence/primary-advantage-099.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/genaretors/evaluate-rating-generator.ts:43-63`
  - Missing system prompt for unknown CEFR level is silently passed as `undefined`

### Batch 100 (21 findings)

- **[LR-100-001](evidence/primary-advantage-100.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:156-458`
  - Massive block of dead commented-out code in image-generator
- **[LR-100-002](evidence/primary-advantage-100.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:1-17`
  - Eight unused imports in image-generator active header
- **[LR-100-003](evidence/primary-advantage-100.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:44-47`
  - OutDir directory created but never written to
- **[LR-100-004](evidence/primary-advantage-100.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:19-35`
  - Unused `passage` parameter in GenerateImageParams
- **[LR-100-005](evidence/primary-advantage-100.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:108-128`
  - Local PNG write / upload / delete cycle fails in serverless
- **[LR-100-006](evidence/primary-advantage-100.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:40-42, 111, 121`
  - Synchronous filesystem calls in async function
- **[LR-100-007](evidence/primary-advantage-100.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:74-86`
  - generateText used to produce image files instead of experimental_generateImage
- **[LR-100-008](evidence/primary-advantage-100.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:110-115`
  - Local image filenames collide when an article is regenerated
- **[LR-100-009](evidence/primary-advantage-100.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:70, 71, 75, 80-85, 89`
  - Magic number 3 hardcoded across the image pipeline
- **[LR-100-010](evidence/primary-advantage-100.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:80-82`
  - storyParts.prompt array indexed without length check
- **[LR-100-011](evidence/primary-advantage-100.md)** Medium | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:76-85`
  - Image prompt has no age targeting for primary students
- **[LR-100-012](evidence/primary-advantage-100.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:55, 98, 130, 142`
  - console.log leaks article ID and attempt counts to stdout
- **[LR-100-013](evidence/primary-advantage-100.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:150`
  - createLogFile path fails on read-only filesystems
- **[LR-100-014](evidence/primary-advantage-100.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:5`
  - `GenrateLAQuestionParams` interface name typo (and sibling pattern)
- **[LR-100-015](evidence/primary-advantage-100.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:18-36`
  - LAQuestionSchema returns single object, MC/SA return arrays
- **[LR-100-016](evidence/primary-advantage-100.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:29`
  - LA generator returns undefined prompts for A0 level
- **[LR-100-017](evidence/primary-advantage-100.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:18-36`
  - LA generator has no error wrapping around question-generator
- **[LR-100-018](evidence/primary-advantage-100.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:28-37`
  - MCQuestionSchema enforces 4 options but user prompt allows 3
- **[LR-100-019](evidence/primary-advantage-100.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:14-22`
  - textual_evidence required by schema but only some prompts mention it
- **[LR-100-020](evidence/primary-advantage-100.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:35`
  - MC generator A0 lookup returns undefined (same root cause as LR-100-016)
- **[LR-100-021](evidence/primary-advantage-100.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:24-42`
  - MC generator has no error wrapping (same pattern as LR-100-017)

### Batch 101 (7 findings)

- **[LR-primary-advantage-101-001](evidence/primary-advantage-101.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/new-generator.ts:226-727`
  - Massive commented-out dead code in new-generator.ts
- **[LR-primary-advantage-101-002](evidence/primary-advantage-101.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/new-generator.ts:21`
  - Unused import `{ se }` from date-fns/locale
- **[LR-primary-advantage-101-003](evidence/primary-advantage-101.md)** Medium | Fork-specific regression
  - File: `apps/primary-advantage/server/utils/genaretors/new-generator.ts:134`
  - persistGeneratedArticle hardcodes ArticleType.FICTION
- **[LR-primary-advantage-101-004](evidence/primary-advantage-101.md)** Low | Shared package migration blocker
  - File: `apps/primary-advantage/server/utils/genaretors/new-generator.ts:88-94`
  - Custom TxLike interface bypasses Drizzle transaction types
- **[LR-primary-advantage-101-005](evidence/primary-advantage-101.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/sentence-translator.ts:175`
  - JSON.parse(JSON.stringify(...)) deep clone bypasses type safety
- **[LR-primary-advantage-101-006](evidence/primary-advantage-101.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/sentence-translator.ts:182`
  - catch (error: any) bypasses typed error handling
- **[LR-primary-advantage-101-007](evidence/primary-advantage-101.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/sentence-translator.ts:194-246`
  - Commented-out dead code in sentence-translator.ts

### Batch 102 (11 findings)

- **[LR-primary-advantage-102-001](evidence/primary-advantage-102.md)** High | Primary-student adaptation risk
  - File: `apps/primary-advantage/server/utils/genaretors/topic-generator.ts:23-24`
  - Topic prompt says "secondary school" instead of "primary school"
- **[LR-primary-advantage-102-002](evidence/primary-advantage-102.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/topic-generator.ts`
  - Directory name typo "genaretors"
- **[LR-primary-advantage-102-003](evidence/primary-advantage-102.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/wordlist-generator.ts:42-44`
  - Error handling throws raw string instead of Error
- **[LR-primary-advantage-102-004](evidence/primary-advantage-102.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/genaretors/wordlist-generator.ts:3,41`
  - Unused openai import and console.log in catch
- **[LR-primary-advantage-102-005](evidence/primary-advantage-102.md)** Medium | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/logging.ts:4-37`
  - Synchronous FS operations and untyped data parameter
- **[LR-primary-advantage-102-006](evidence/primary-advantage-102.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/logging.ts:32`
  - Logging function ignores "problems" logType in summary
- **[LR-primary-advantage-102-007](evidence/primary-advantage-102.md)** High | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/middleware.ts:38-53`
  - Dev-mode API key backdoor in auth middleware
- **[LR-primary-advantage-102-008](evidence/primary-advantage-102.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/utils/middleware.ts:5`
  - Unused jose imports (decodeJwt, jwtVerify)
- **[LR-primary-advantage-102-009](evidence/primary-advantage-102.md)** Low | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/skaffold.yaml:22,48`
  - Skaffold uses generic placeholder service names
- **[LR-primary-advantage-102-010](evidence/primary-advantage-102.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/styles/globals.css:172`
  - animate-glow class references wrong keyframe name
- **[LR-primary-advantage-102-011](evidence/primary-advantage-102.md)** Low | Same root cause as Reading Advantage
  - File: `apps/primary-advantage/types/enum.ts:1-108`
  - TypeScript enums used instead of const objects

### Batch 103 (3 findings)

- **[LR-103-001](evidence/primary-advantage-103.md)** High | Shared package migration blocker
  - File: `apps/primary-advantage/utils/storage.ts:1-2`
  - Direct Google Cloud Storage SDK bypass
- **[LR-103-002](evidence/primary-advantage-103.md)** Medium | Intentional product divergence that needs documentation
  - File: `apps/primary-advantage/types/index.d.ts:64-121`
  - Dual type definitions for Article interfaces
- **[LR-103-003](evidence/primary-advantage-103.md)** Medium | Shared package migration blocker
  - File: `apps/primary-advantage/utils/google.ts:8-17`
  - Direct AI provider SDK instantiation

---
## Severity Distribution

| Severity | Count |
|---|---|
| Critical | 66 |
| High | 177 |
| Medium | 302 |
| Low | 348 |

## Fork-Divergence Distribution

| Category | Count |
|---|---|
| Fork-specific regression | 414 |
| Same root cause as Reading Advantage | 213 |
| Primary-student adaptation risk | 115 |
| Intentional product divergence that needs documentation | 80 |
| Shared package migration blocker | 71 |

## Critical Findings Summary

- **[LR-primary-advantage-003-001](evidence/primary-advantage-003.md)** — Test/admin server actions in `actions/test.ts` lack any authorization
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/actions/test.ts:14-132`
  - Impact: Unauthenticated or low-privilege clients (including any primary student session) can trigger expensive AI generation, modify the public asset bucket, and destroy every article in the database. The des

- **[LR-primary-advantage-006-003](evidence/primary-advantage-006.md)** — Entire student-management UI is commented out behind an early-return placeholder
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/students/page.tsx:205,207-551`
  - Impact: The route `/{locale}/admin/dashboard/students` is effectively a placeholder. There is no way for an admin to list, search, add, edit, or delete primary-student accounts from this page, even though the

- **[LR-primary-advantage-006-009](evidence/primary-advantage-006.md)** — `<TeachersTable />` is commented out; teachers page is an empty placeholder
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/dashboard/teachers/page.tsx:14`
  - Impact: The `/{locale}/admin/dashboard/teachers` route is a placeholder shell. An admin navigating to it sees a title and a separator line and nothing else — there is no way to list, search, add, edit, or dea

- **[LR-primary-advantage-008-001](evidence/primary-advantage-008.md)** — `handleAddStudent` never POSTs to the server; the add flow is purely local
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:268-287`
  - Impact: The "Add Student" dialog is non-functional. An admin who fills in name/email, clicks "Save Student", and watches the dialog close will believe the student was created. On the next render (or page relo

- **[LR-primary-advantage-008-002](evidence/primary-advantage-008.md)** — `handleUpdateStudent` never sends a PUT request; edits are silently discarded
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:302-325`
  - Impact: Critical. Clicking "Save Changes" in the edit dialog (line 925-927) updates the row in the table for a fraction of a second, then the next fetch from the server wipes the change. The admin's edits nev

- **[LR-primary-advantage-008-003](evidence/primary-advantage-008.md)** — `handleDeleteStudent` never sends a DELETE request; the delete is optimistic-only
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/admin/students/page.tsx:327-332`
  - Impact: Critical. Clicking the trash icon → "Delete" in the AlertDialog (lines 773-779) removes the row visually; the next fetch restores it because the server never received the delete. The admin believes th

- **[LR-primary-advantage-010-010](evidence/primary-advantage-010.md)** — `/system/test/page.tsx` mixes Server Actions inside a Server Component `onClick` handler
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/[locale]/system/test/page.tsx:12-41`
  - Impact: The "Test Storage" and "Delete All Articles" buttons render but clicking them does nothing — the inline arrow function is a client closure on a Server Component, so React strips the handler. `deleteAl

- **[LR-primary-advantage-012-004](evidence/primary-advantage-012.md)** — Student-progress page has no authorization for the requested student ID
  - Category: Primary-student adaptation risk
  - File: `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx:18,22-24,29-31`
  - Impact: This is the most severe finding in the batch. A primary-student data exposure path exists because the page lacks a Server Action / route-handler-style authorization wrapper. The page also reads `user.

- **[LR-primary-advantage-012-009](evidence/primary-advantage-012.md)** — Bulk AI generation route has no authentication or rate limit
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/generate/route.ts:1-15`
  - Impact: Any unauthenticated HTTP client can POST `/api/articles/generate` with a body of `{ amountPerGenre: 50 }` and trigger 50+ AI completions, which is both a denial-of-service vector and a direct cost-inc

- **[LR-primary-advantage-012-017](evidence/primary-advantage-012.md)** — Custom-generate approve route has no authentication on a state-mutating endpoint
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/articles/generate/custom-generate/approve/route.ts:1-6`
  - Impact: Any unauthenticated HTTP client can POST to `/api/articles/generate/custom-generate/approve` and publish whatever payload they construct. Combined with finding 016, an attacker could (a) generate an a

- **[LR-primary-advantage-013-001](evidence/primary-advantage-013.md)** — Assignments `route.ts` (POST) lacks authentication and tenant scoping on a state-mutating endpoint
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/assignments/route.ts:11-13`
  - Impact: Primary students are the audience for assignments, and unauthenticated assignment creation is a primary-student adaptation risk (inappropriate or confusing content targeted at primary children) and a 

- **[LR-primary-advantage-013-007](evidence/primary-advantage-013.md)** — `lesson-chatbot/route.ts` has no authentication or rate limit on an LLM-cost-incurring endpoint
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:22-23,112-115`
  - Impact: An unauthenticated client can flood `/api/assistant/lesson-chatbot` with arbitrary prompts, each of which streams a full OpenAI completion. This is a denial-of-wallet attack and a fork-specific regres

- **[LR-primary-advantage-014-004](evidence/primary-advantage-014.md)** — School-admin authorization query reads the wrong table (`userRoles` instead of `schoolAdmins`)
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/classrooms/route.ts:43-46`
  - Impact: A user who is a school admin (via a row in `schoolAdmins`) but does not hold the global `admin` or `system` role is treated as a non-admin by this endpoint. The `if (!isAdmin && schoolAdminRows.length

- **[LR-primary-advantage-015-001](evidence/primary-advantage-015.md)** — `/api/debug/init-roles` POST mutates production data with no authentication
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:6-47`
  - Impact: An unauthenticated attacker can POST to `/api/debug/init-roles` and either (a) re-insert roles that already exist (the `findFirst` check on lines 14-16 prevents duplicates but does not stop repeated P

- **[LR-primary-advantage-015-002](evidence/primary-advantage-015.md)** — `/api/debug/init-roles` GET exposes user emails without authentication
  - Category: Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:50-89`
  - Impact: A primary-student app exposes user emails and role mappings to any unauthenticated HTTP client. Even for the limited 5-row sample, this is a privacy violation (PII + role disclosure). The route name `

- **[LR-primary-advantage-015-004](evidence/primary-advantage-015.md)** — `/api/debug/school` exposes ALL schools' licenses to any authenticated user
  - Category: Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/debug/school/route.ts:48-53`
  - Impact: A primary-age user with any account can read every school's license name, key, and status. This is a critical data-exposure path and likely a billing/contract issue (a school that paid for a license c

- **[LR-primary-advantage-015-007](evidence/primary-advantage-015.md)** — `cards/[cardId]/review` writes FSRS columns to `flashcardCards` that don't exist on the shared schema
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:62-77`
  - Impact: Every card review (the primary-student core learning loop) will 500 because the UPDATE fails. The `cardReviews` insert on lines 80-85 succeeds (the `cardReviews` table does have the right columns in `

- **[LR-primary-advantage-015-008](evidence/primary-advantage-015.md)** — `cards/[cardId]/review` reads FSRS columns that don't exist on `flashcardCards`
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:31-56`
  - Impact: Combined with LR-007 (the broken UPDATE), every review fails. Even if the UPDATE worked, the input to `ts-fsrs` is missing the FSRS state, so the algorithm can't compute the next interval. This is the

- **[LR-primary-advantage-015-012](evidence/primary-advantage-015.md)** — `deck-id` route raw-SQL `flashcard_cards.due` filter references a non-existent column
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:42-50`
  - Impact: Every call to `/api/flashcard/deck-id` will throw a Postgres error at runtime (column does not exist). The route is the entry point used by the deck-selector UI, so the flashcard study flow is broken 

- **[LR-primary-advantage-015-014](evidence/primary-advantage-015.md)** — `deck-id` route success branch is unreachable because the SQL filter rejects all rows
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:42-58`
  - Impact: The success path is dead code at runtime. The UI flow that depends on `deckId` will receive `success: false` and a misleading "no due flashcards" message even when the user has flashcards to study. Co

- **[LR-primary-advantage-015-015](evidence/primary-advantage-015.md)** — `decks/[deckId]/due` route filters by `card.due` after selecting ALL cards
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:40-63`
  - Impact: The `/api/flashcard/decks/[deckId]/due` endpoint always returns an empty `cards` array even when the user has flashcards due. The stats on line 63 still compute correctly (`new/learning/review` counts

- **[LR-primary-advantage-015-019](evidence/primary-advantage-015.md)** — `sentences-for-cloze` GET handler iterates fields that don't exist on `flashcardCards`
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:76-104`
  - Impact: The GET handler always returns `clozeTests: []`. The cloze-test feature is non-functional. This is the same root cause as LR-007 (FSRS / content fields live on `userSentenceRecords`/`userWordRecords`,

- **[LR-primary-advantage-015-024](evidence/primary-advantage-015.md)** — `sentences-for-matching` raw-SQL `flashcard_cards.due` filter references non-existent column
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:42-52`
  - Impact: Every call to `/api/flashcard/decks/[deckId]/sentences-for-matching` returns a 500 because the SQL query fails. The matching-game feature is non-functional.

- **[LR-primary-advantage-015-025](evidence/primary-advantage-015.md)** — `sentences-for-matching` filters cards by `c.due` and `c.articleId` after the SQL already filtered them
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:50-52`
  - Impact: Even if the SQL filter were fixed, the JS-side filter would still reject every card. The matching game always returns `matchingGames: []`. This is the same root cause as LR-019.

- **[LR-primary-advantage-015-026](evidence/primary-advantage-015.md)** — `sentences-for-matching` `createVocabularyPairs` iterates fields that don't exist on `flashcardCards`
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:180-246`
  - Impact: The vocabulary-pair fallback (line 104-115) is unreachable because `createVocabularyPairs` always returns `[]`. Combined with the broken `createTranslationPairs` (LR-027), the matching-game feature ha

- **[LR-primary-advantage-015-027](evidence/primary-advantage-015.md)** — `sentences-for-matching` `createTranslationPairs` iterates fields that don't exist on `flashcardCards`
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:249-323`
  - Impact: Combined with LR-026, the matching-game GET always returns `matchingGames: []`. The matching feature is non-functional.

- **[LR-primary-advantage-015-031](evidence/primary-advantage-015.md)** — `sentences-for-matching` GET always returns empty `matchingGames` due to schema mismatch
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:72-124`
  - Impact: The matching-game feature is completely non-functional. The `Date.now() + Math.random()` ID on lines 96 and 111 is never used because no games are generated.

- **[LR-primary-advantage-015-033](evidence/primary-advantage-015.md)** — All seven files rely on `as any` casts to bypass Drizzle's strict typing for `flashcardCards` schema mismatches
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:53,75,85,91-99,106-115`
  - Impact: This is the root cause of LR-007 through LR-031. Every flashcard feature in this batch is non-functional at runtime. The `as any` casts make the codebase look correct at compile time while silently fa

- **[LR-primary-advantage-017-006](evidence/primary-advantage-017.md)** — GET `/api/schools/ranking` accepts arbitrary `schoolId` and leaks other schools' leaderboards
  - Category: Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/schools/ranking/route.ts:35-65`
  - Impact: Cross-tenant data exposure. A primary-age student signed in to school A can issue `GET /api/schools/ranking?schoolId=<school-B-uuid>` and read the top-5 student names, classroom names, XP totals, and 

- **[LR-primary-advantage-017-013](evidence/primary-advantage-017.md)** — `/api/students/[id]/assignments` has no authentication or role check
  - Category: Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/students/[id]/assignments/route.ts:1-9`
  - Impact: Any unauthenticated HTTP client can `GET /api/students/<any-id>/assignments` and read another student's assignments. Worse, this includes pending/unread assignments the student has not yet seen, which

- **[LR-primary-advantage-017-015](evidence/primary-advantage-017.md)** — `/api/teachers/assignments` has no authentication or role check
  - Category: Primary-student adaptation risk
  - File: `apps/primary-advantage/app/api/teachers/assignments/route.ts:1-6`
  - Impact: Any unauthenticated HTTP client can `GET /api/teachers/assignments` and read every assignment in the database — including titles, descriptions, due dates, the articles they reference, the classrooms t

- **[LR-primary-advantage-018-001](evidence/primary-advantage-018.md)** — `const roles = await db.select().from(roles)` shadow / TDZ ReferenceError on users CSV upload
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/classes/route.ts:728`
  - Impact: The "users uploaded and created successfully" path advertised in `actions/flashcard.ts` and the admin import-data UI (`app/[locale]/admin/import-data/page.tsx`, batch 007) is non-functional. Anyone wh

- **[LR-primary-advantage-018-004](evidence/primary-advantage-018.md)** — Path traversal in `DELETE /api/upload/csv/cleanup` allows arbitrary file deletion
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/cleanup/route.ts:6-40`
  - Impact: An unauthenticated external attacker can delete any file the Next.js process has write access to. Realistic targets: `apps/primary-advantage/.env.local` (denial-of-service via env wipe), `apps/primary

- **[LR-primary-advantage-019-001](evidence/primary-advantage-019.md)** — `userSchool` lookup reads `users` table by `schoolId` instead of `schools` table
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:53-60`
  - Impact: The `schoolInfo` block in the bulk-import response is wrong for every authenticated non-system caller. The `"All imported users have been assigned to this school"` note never appears; downstream UIs t

- **[LR-primary-advantage-019-002](evidence/primary-advantage-019.md)** — Path traversal in `POST /api/upload/csv` via user-controlled `originalName` segment
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/upload/csv/route.ts:152-154`
  - Impact: An authenticated admin/teacher/system caller can write uploaded CSV bytes to any path the Next.js process has write access to via a file named e.g. `..__evilname` or `.._.._apps_.._primary-advantage_.

- **[LR-primary-advantage-019-003](evidence/primary-advantage-019.md)** — PATCH `/api/users/[id]` has no role / owner / school-scope authorization
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/[id]/route.ts:9-92`
  - Impact: Critical privilege escalation. A STUDENT (or unauthenticated browser session holder) can: (a) overwrite any other user's email and password (account takeover), (b) assign themselves the ADMIN role on 

- **[LR-primary-advantage-019-004](evidence/primary-advantage-019.md)** — `POST /api/users/activitylog/[id]` is an unauthenticated stub that ignores request body and params
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/app/api/users/activitylog/[id]/route.ts:5-21`
  - Impact: Two compounding bugs. (1) Any external attacker can spam this endpoint without authentication, and because `data.progress` is `[]`, line 26 in the controller (`data.progress?.filter((p) => p === 0).le

- **[LR-primary-advantage-023-002](evidence/primary-advantage-023.md)** — `updateClassroomController` destructures `classroomName` but the page sends `name`; every Edit save returns 400 "Classroom name is required"
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:180-214,502-509`
  - Impact: Critical. The Edit Classroom dialog (lines 491-549) is completely non-functional. Every admin who tries to rename a classroom or change its grade sees "Failed to update classroom" and no actionable er

- **[LR-primary-advantage-023-004](evidence/primary-advantage-023.md)** — Edit form sends `passwordStudents` in PATCH body, but the controller destructures only `{ classroomName, grade, description }`; password is silently dropped and `description` is the third unused field
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/admin/classrooms-table.tsx:180-214,499-535`
  - Impact: Critical. The Edit dialog's password input (lines 522-534) is fully non-functional. The admin types a new student password, clicks Update, and the next read of the classroom shows the old (or null) pa

- **[LR-026-004](evidence/primary-advantage-026.md)** — AI feedback content rendered without sanitization (XSS risk)
  - Category: Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:280-314`
  - Impact: AI-generated feedback could contain inappropriate, misleading, or excessively long content for primary students. No content moderation layer exists between AI generation and display.

- **[LR-primary-advantage-028-001](evidence/primary-advantage-028.md)** — Forgot-password form never sends a real password-reset email; API call is commented out and form unconditionally reports success
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/auth/user-reset-pass-form.tsx:18-52`
  - Impact: Critical security and trust bug. A primary-age student, parent, or teacher who submits a forgotten-password request receives a "we sent you an email" confirmation but no email is ever sent. They will 

- **[LR-primary-advantage-028-012](evidence/primary-advantage-028.md)** — All dashboard chart data is hardcoded; admins see fabricated activity metrics regardless of school or data state
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/dashboard/class-activity-chart.tsx:27-44,213-306`
  - Impact: Critical. A school admin or system actor who opens the admin dashboard sees fabricated activity metrics that have no relationship to actual school data. They will make decisions (resource allocation, 

- **[LR-primary-advantage-029-015](evidence/primary-advantage-029.md)** — `levels.indexOf(currentLevel)` returns `-1` for unknown CEFR levels; gauge displays a negative value and translation lookup throws at runtime
  - Category: Primary-student adaptation risk
  - File: `apps/primary-advantage/components/dashboard/user-level-indicator.tsx:53,82`
  - Impact: Critical. For a primary-student dashboard, the level indicator is a key motivator. Two failure modes: (a) the gauge silently resets to 0 (visual bug — the student sees "I have no level"); (b) the tran

- **[LR-031-001](evidence/primary-advantage-031.md)** — Undefined `update`/`session` causes runtime ReferenceError on flashcard completion
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/flashcards/flashcard-game.tsx:106`
  - Impact: When a user completes all flashcards in a session, the `handleCardRating` function calls `update(...)` on line 106, which throws `ReferenceError: update is not defined`. The batch review calls on line

- **[LR-primary-advantage-032-001](evidence/primary-advantage-032.md)** — Undefined `session` variable referenced in `handleNext`
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:524-528`
  - Impact: The sentence cloze-test game crashes on the final sentence, preventing the activity log entry and XP award from being recorded. Primary students completing a full cloze-test session receive no progres

- **[LR-primary-advantage-033-001](evidence/primary-advantage-033.md)** — `update({ user: { ...session?.user } })` references undeclared `session`; runtime ReferenceError blocks completion
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:230-234`
  - Impact: Critical. The success path of the final card's rating handler is unreachable in a working state — the ReferenceError thrown by `update({...})` aborts the surrounding `startTransition` callback, so `se

- **[LR-primary-advantage-034-001](evidence/primary-advantage-034.md)** — `update({ user: { ...session?.user } })` references undeclared `session`; runtime ReferenceError blocks XP recording on completion
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx:206-222`
  - Impact: Critical. The success path of the completion handler is unreachable in a working state — the `ReferenceError` thrown by `update({...})` aborts the rest of the inner `handleComplete` callback. `setGame

- **[LR-primary-advantage-035-001](evidence/primary-advantage-035.md)** — `update()` function and `session` variable not in scope (runtime error)
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:286-290`
  - Impact: Runtime crash when user completes the word-ordering game. The `updateUserActivity` call on line 276 succeeds, but then lines 286-290 crash. The crash is unhandled (no try-catch around it), so the user

- **[LR-036-001](evidence/primary-advantage-036.md)** — Undefined `update` and `session` variables cause runtime crash on game completion
  - Category: Same root cause as Reading Advantage
  - File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:304-308`
  - Impact: The game completion flow is broken. Users who finish all sentence groups will see a runtime error instead of the completion screen. For primary students, this is especially disruptive — they complete 

- **[LR-037-001](evidence/primary-advantage-037.md)** — Undefined `update` function causes runtime crash
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-flashcard-card.tsx:236`
  - Impact: The entire flashcard completion flow is broken — users cannot finish a vocabulary flashcard session without hitting a runtime error. This is a primary-student-facing feature that would crash during no

- **[LR-primary-advantage-038-001](evidence/primary-advantage-038.md)** — `update({ user: { ...session?.user } })` references undeclared `update` and `session`; runtime ReferenceError blocks activity completion
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx:215-219`
  - Impact: Critical. The completion branch of the vocabulary matching game (lines 220-247) is unreachable in a working state because the `update` invocation throws as soon as the user finishes all pairs. The use

- **[LR-primary-advantage-040-001](evidence/primary-advantage-040.md)** — `lesson-task-mcq.tsx` references undefined `update` and `session` variables (ReferenceError)
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:208-210`
  - Impact: The `handleFinishQuiz` callback on line 193-217 calls this code path. When a student completes the MCQ quiz and clicks "Finish Quiz", the `startTransition` callback fires `update(...)` on line 208. Th

- **[LR-primary-advantage-040-005](evidence/primary-advantage-040.md)** — `lesson-task-saq.tsx` references undefined `update` and `session` variables (same ReferenceError as 040-001)
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx:100-105`
  - Impact: When a primary student completes the short-answer task, the `onSubmitted` handler (line 70) fires `getFeedback(...)` then calls `update({ user: { ...session?.user } })`. This will throw a `ReferenceEr

- **[LR-primary-advantage-044-001](evidence/primary-advantage-044.md)** — `update()` and `session` are undefined references (compile/runtime error)
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:80-84`
  - Impact: This is a `ReferenceError` at runtime (and a TypeScript "cannot find name 'update'/'session'" compile error). On the success path of `fetchData()` (line 76, when summary data loads) the effect throws,

- **[LR-047-001](evidence/primary-advantage-047.md)** — Undefined `session` variable causes runtime crash
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:524`
  - Impact: Cloze test game completion flow crashes at runtime, preventing score submission and navigation.

- **[LR-047-002](evidence/primary-advantage-047.md)** — Undefined `update` function causes runtime crash
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/cloze-test-game.tsx:522`
  - Impact: Same crash path as LR-047-001 — game completion is broken.

- **[LR-primary-advantage-048-001](evidence/primary-advantage-048.md)** — `handleNext` references undefined `update` and `session`, crashes on last game
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/matching-game.tsx:41,134,247-251,253`
  - Impact: When a primary student finishes the last matching set, `handleNext` reaches the else-branch (line 238), executes the POST to `/api/flashcard/decks/${deckId}/sentences-for-matching` (lines 239-245), an

- **[LR-primary-advantage-049-001](evidence/primary-advantage-049.md)** — `handleNext` references undefined `update` and `session`, crashes on game finish
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:35,110,298-302`
  - Impact: When a primary student completes the final sentence-ordering group, `handleNext` enters the else-branch (line 288), sets `gameComplete`, POSTs the score (lines 290-296), calls `setIsPlaying(false)` (l

- **[LR-primary-advantage-050-001](evidence/primary-advantage-050.md)** — `handleNext` references undefined `update` and `session`, crashes on game finish
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/pratice/order-words-game.tsx:39,134,286-291`
  - Impact: When a primary student completes the final sentence-ordering group, `handleNext` enters the else-branch (line 276), POSTs the score, calls `setIsPlaying(false)`, then throws `ReferenceError: update is

- **[LR-primary-advantage-052-001](evidence/primary-advantage-052.md)** — Undefined `update`/`session` variables in school creation callback
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/school/school-profile-form.tsx:107-110`
  - Impact: School creation succeeds on the server but crashes the client when the role-upgrade path is triggered, leaving the user on a broken page with no feedback. The session stale-matches the old role until 

- **[LR-062-007](evidence/primary-advantage-062.md)** — Reports table is hardcoded to empty data
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/components/teacher/reports.tsx:229`
  - Impact: The teacher Reports page is completely non-functional — it always shows "Empty". This is a critical feature gap for teacher workflows.

- **[LR-080-001](evidence/primary-advantage-080.md)** — `calculateLevelAndCefrLevel` matches against the activity delta instead of the cumulative XP
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/lib/utils.ts:51-60`
  - Impact: The entire student leveling system is effectively frozen at level 1 across the fork. `actions/user.ts:55-58,83-98` and `actions/question.ts:123-126,151-167` both persist `users.level` and `users.cefrL

- **[LR-primary-advantage-092-001](evidence/primary-advantage-092.md)** — Pagination-before-filter corruption in `getStudentAssignments`
  - Category: Fork-specific regression
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:142-240`
  - Impact: Primary students using the assignment list with search or due-date filters see incorrect pagination counts and potentially empty pages. A student on page 2 with a search filter may see zero results ev

- **[LR-primary-advantage-092-002](evidence/primary-advantage-092.md)** — `createAssignment` and `updateUserLessonProgress` lack `schoolId` multi-tenancy scoping
  - Category: Same root cause as Reading Advantage
  - File: `apps/primary-advantage/server/models/assignmentModel.ts:27-101,337-418`
  - Impact: A teacher in school A could create an assignment referencing a classroom/article from school B. A student whose `userId` is reused across schools could see lesson progress from another school. This is

- **[LR-098-005](evidence/primary-advantage-098.md)** — Direct Google Text-to-Speech API calls bypass AI adapter in audio-flashcard-generator
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:90-109`
  - Impact: Provider lock-in to Google TTS. Cannot swap to Azure, Amazon Polly, or another TTS provider without modifying this generator. The same direct-API pattern appears in `audio-generator.ts` and `audio-wor

- **[LR-098-006](evidence/primary-advantage-098.md)** — API key exposed as URL query parameter in audio-flashcard-generator
  - Category: Shared package migration blocker
  - File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:91`
  - Impact: API key leakage via logs. If logs are shipped to a centralized logging service, the key may be exposed to unauthorized parties.
