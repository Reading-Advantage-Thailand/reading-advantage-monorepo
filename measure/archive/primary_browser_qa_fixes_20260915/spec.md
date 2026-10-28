# Spec — Primary Browser QA Fixes

Track ID: `primary_browser_qa_fixes_20260915`
Type: bug

## Context

The 2026-09-15 parallel browser QA sweep (`measure/qa/browser-20260915/`) tested
primary-advantage end to end with six vision-capable subagents. It found several
real defects. This track fixes them.

## Functional Requirements

- FR-1 (P0): Student class-code sign-in does not crash. Component reads the flat
  API response fields; entering a class code at `/en/auth/signin` renders the
  student picker correctly. (T2: `student.student.email` TypeError.)
- FR-2 (P0): Article/lesson read view does not crash on articles with missing
  fields. `null.split` in `ArticleContent`/`TaskIntroduction` is guarded.
  Downstream quiz and AI chat become reachable. (T2.)
- FR-3 (Critical): Student sidebar links navigate on mouse click and keyboard
  Enter — no dead `href="#"`. Confirm T6's finding by real click first; T2's
  nav pass used direct URL loads. (T6.)
- FR-4: `Sidebar.games` (and any sibling missing keys) added to `messages/en.json`
  and `messages/th.json`; no raw key renders; no MISSING_MESSAGE console errors.
  (T2, T3, T6.)
- FR-5: Admin management APIs (`/api/teachers`, `/api/students`, `/api/classrooms`)
  authorize ADMIN-role users from the `users.role` session, not only the legacy
  `user_roles`/`school_admins` join tables. Keep tenant scoping. Fix the latent
  `getTeachers` school-filter gap. (T4.)
- FR-6: Realm Carver does not hard-fail when saved sentence cards expand past
  100 words — truncate or paginate host-side, or raise the cap with a guard.
  (T3; cap at `realm-carver.ts:554`.)
- FR-7: Locale toggle button navigates between /en and /th (T5).
- FR-8: Admin Import Data page routes the students tab to `/api/upload/csv`
  (fix the trailing-space fetch URL) and shows its summary counts; classes tab
  keeps posting to `/api/upload/classes`. (T1.)

## Non-goals

- No visual redesign. No new features. No framework upgrades.
- GCS image ORB blocking in headless browsers is a local-env artifact — no fix.
- T6's Moderate/Minor a11y items (skip link, landmarks, contrast) are recorded
  for a later a11y track; only FR-3 (dead links) is in scope here.

## Acceptance Criteria

- Each FR has a regression test (Vitest for logic, behavioral RTL where a
  component changes) and passes in the browser where the original QA case
  failed.
- `pnpm --filter primary-advantage test` green; tsc shows only the 17
  pre-existing APK errors; ESLint 0 errors.
- Browser re-verification of FR-1..FR-8 against http://localhost:3000.
