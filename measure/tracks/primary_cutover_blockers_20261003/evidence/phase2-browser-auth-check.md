# Phase 2 browser and HTTP check: authorization and broken-UX tracks

Date: 2026-10-04. App: apps/primary-advantage, `next dev` on port 3000, local Postgres, seeded QA users.
Method "HTTP" means real requests with real session cookies from `POST /api/auth/login`.
Method "Browser" means Chromium (Playwright, channel chrome) with a logged-in context.

## Authorization hardening (primary_authorization_hardening_20260912)

| AC | Method | Result | Evidence | Fix commit |
|---|---|---|---|---|
| AC-1 | HTTP | PASS | PATCH /api/users/[id]: anon 401. Student self role->SYSTEM 403, student sets other password 403, student self xp 403. Teacher sets other password 403. Admin-A on school-B user 404. Admin self role 403. Bad body 400. | none needed |
| AC-2 | HTTP | PASS | Anon gets 401 on all five routes. Student and teacher get 403 on articles/generate and csv cleanup. Admin gets 400 for amountPerGenre 9999 and for fileName `../package.json`. Student on another user's activitylog id 403. Note: lesson-chatbot and GET /api/articles return 200/201 for any signed-in role by design (student lesson tool and catalogue). | none needed |
| AC-3 | Static plus unit tests | PARTIAL | `actions/test.ts` and `actions/article.ts` call `requireToolingAccess()` first (admin/system only); tests `actions/__tests__/test-actions.authorization.test.ts` and `article-actions.authorization.test.ts` pass. Browser replay not possible: the action ids live only in /system/test chunks, and no SYSTEM login exists (qa-system has no credential account; seed script does not create one). | none needed |
| AC-4 | Browser/HTTP | PASS | Student POST to the `updateUserActivity` action (page /en/student/lesson/[id]) with `{"xpEarned":99999}` in the data: xp_logs row of 15 (SENTENCE_FLASHCARDS table value), users.xp 15. Signature has no xpEarned. Anon request redirected to sign-in by the proxy. | none needed |
| AC-5 | HTTP and Browser | PASS | Teacher-A: article-records and reminder-reread for school-B student 403; school-A student 200. User search returns only school-A users. Student gets 403 on search. Assignment of school B returns 500 (denied, body has no data) for teacher-A, admin-A, student-A; own school 200. Browser: teacher-A /teacher/student-progress/[B student] shows the "Authentication Error" page, own student shows progress. Note: assignment denial is 500, not 403. | none needed |
| AC-6 | Browser | PASS | Student on /en/teacher/my-classes, /en/admin, /en/system/test lands on /en/unauthorized with the page text. Anon wrong URL /en/does/not/exist shows the 404 page, no redirect. | none needed |
| AC-7 | Browser | PASS | Teacher and admin on /en/student/read land on /en/unauthorized. Student reaches /en/student/read. Role-policy test in repo passes. | none needed |
| AC-8 | Vitest | PASS | `pnpm exec vitest run`: 96 files, 587 tests pass. | none |

## Broken UX fixes (primary_broken_ux_fixes_20260912)

| AC | Method | Result | Evidence | Fix commit |
|---|---|---|---|---|
| AC-1 | Static | PASS (not browser-checked) | In cn.json and tw.json `VocabularyMatching` and `Introduction` exist under `Lesson`, not at the root. No lesson page could be rendered in cn: the one tried returned 500 for a fake lesson id. | none needed |
| AC-2 | Browser | PASS | Admin on /en/admin lands on /en/admin/dashboard with content. | none needed |
| AC-3 | grep | PASS | No `flexl-1` or `captoliza` in app or components. | none needed |
| AC-4 | grep and Browser | PASS | No `dashboard/reports`, `admin/settings`, or `/pricing` link in source. Home page has no such link. | none needed |
| AC-5 | grep | PASS | No `act` import in student-assignment-table.tsx. | none needed |
| AC-6 | grep | PASS | No `from "console"` import in app, components, server, lib, actions. | none needed |
| AC-7 | Browser | PASS | Footer shows "© 2026", one email admin@reading-advantage.com, no phone, no "Provinding". | none needed |

## Defect found outside the two tracks

Every signed-in page returned HTTP 500 after commit b3bf3ef0e. `lib/permissions.ts` (used by client component `sidebar-nav.tsx`) imported the `@reading-advantage/auth` barrel. That barrel pulls `@node-rs/argon2` and `postgres` into the browser bundle ("Module not found: fs, net, tls").
Fix: new client-safe export `@reading-advantage/auth/roles`; `lib/permissions.ts` imports from it. Test: `lib/__tests__/permissions-client-safe.test.ts` (failed first, passes now). Fix commit: 590435b65. After the fix, student, teacher, and admin pages render.

## Limits

- Server actions in `actions/test.ts` and `generateArticle*` were not replayed in a browser (no SYSTEM credential).
- cn/tw lesson screens were not rendered.
- QA data added to the local DB: two assignments (ids aaaaaaaa-0000-4000-8000-00000000000a and ...0b), one xp_logs row for qa-student-a1.
- After the fix, `pnpm dev` tried a full install (package.json of packages/auth changed). The app ran with `node_modules/.bin/next dev` instead. Run `pnpm install` once on a networked machine.
