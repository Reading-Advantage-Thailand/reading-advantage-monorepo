# Specification: Reading Structural UX Alignment

Track ID: `structural_ux_alignment_20260911`. Type: chore (structural refactor). App: `apps/reading-advantage`.

## Overview

The 2026-09-11 UX audit found structural problems that need dedicated work: client-side metric fetches behind decorative skeletons, internal self-HTTP fetches from server components, missing role checks, client-computed placement XP, and i18n and accessibility gaps. Evidence: `docs/reading-advantage-ux-refactor-plan.md` Phase 4 and section 6. This track aligns the app with the monorepo architecture rules. No new dependencies.

## Functional Requirements

### FR-1: Move dashboard and goals data to the server

- `hooks/student/useDashboardMetrice.ts` fires five fetches in `useEffect`. Fetch the metrics in the server page and pass props. Delete the hook.
- Fetch goals on the server in the goals page and in `ActiveGoalsWidget`. Pass props. The existing `Suspense` skeletons then cover real data.
- Merge `student/reports/page.tsx` into the dashboard page or extract one shared view. Swap the swapped i18n scopes (`pages.student.reportpage`) between dashboard and reports.

### FR-2: Replace internal self-HTTP fetches with direct calls

Server components currently fetch their own app over HTTP: `student/read/[articleId]/page.tsx`, `student/lesson/[articleId]/page.tsx` lines 40-49. Replace with direct domain or DB calls per the existing domain-layer migration pattern. Guard `response.ok` where any fetch remains during transition.

### FR-3: Add the missing student-progress role check

`teacher/student-progress/[studentId]/page.tsx` lacks a role and ownership check. Mirror the check in `teacher/reports/[classroomId]/page.tsx`.

### FR-4: Move level-test XP authority to the server

The client computes and POSTs its own placement XP. Move the computation server-side. The client sends answers; the server returns the placement. Record the trust-boundary change in this spec's notes when implemented.

### FR-5: Fix lesson page fetch behavior

In `student/lesson/[articleId]/page.tsx`, run the article and classroom lookups in `Promise.all` where they remain, and guard failures with a real error state.

### FR-6: i18n pass

Replace hardcoded English with existing i18n scopes in: goals pages, flashcards, settings, auth pages (`signin/page.tsx` lines 29-33, `signin-error-handler.tsx` lines 20-34), and system pages. Add the missing admin and system sidebar keys. Fix the footer: wrong external link, fake phone number, hardcoded 2024 year, conflicting contact email. Add per-page `metadata` to marketing pages.

### FR-7: Accessibility pass

- Keyboard support for matching cards, clickable `TableRow` elements, game cards, and context-menu-only actions (save to flashcard, translate).
- Add `role="alert"` to form error containers (`user-signin-form.tsx` lines 73-75). Fix SVG attribute casing in the reset form.
- Wrap games catalog card content in a real `Link`. Delete both click handlers.
- Add `aria-live="polite"` to the level-test message list.
- Replace `window.history.back()` in the sidebar with a real link.

### FR-8: Shell and navigation cleanup

- `SessionSyncRedirect`: add a `destination` prop; send teachers to `/teacher/my-classes`.
- Export one `sharedMainNav` from the index config; spread it in the other four nav configs.
- Extract the repeated auth and expiry guard into one helper used by the four layouts and `AppLayout`.
- Pass `disableLeaderboard` in the teacher layout so the student leaderboard is not fetched on teacher pages.
- Rename `theme-warpper.tsx` to `theme-wrapper.tsx` and update its two imports.
- Delete the unused `userRole-context.tsx` and the dead `ProgressBar` import.
- Replace the fixed `h-[800px]` auth layout with a min-height.
- Use the `Link` and `useRouter` from `@/i18n/routing` in auth pages. Replace `window.location.href = "/"` in `user-signin-form.tsx` line 27 with `router.push` plus `router.refresh`.
- Collapse the three near-identical branches in `(index)/layout.tsx` into one return.
- In `user-account-nav.tsx`, compute `daysLeft` with `useMemo` and guard the expiry badge behind a set `expired_date`.
- Decide `workbook-generator`: add it to the sidebar config or delete the route.
- Replace `window.location.reload()` with `router.refresh()` in `class-detail-dashboard.tsx`, `useClassroomActions.ts`, and `deck-view.tsx`. Replace native `confirm()` in goals with the existing `AlertDialog`.
- Add one `error.tsx` per route group.
- Parallelize sequential fetches with `Promise.all` in `admin/reports/page.tsx`, `system/schooldashboard/page.tsx`, and `create-new-student/page.tsx`. Run the auth check before the data fetch in `system/license/page.tsx`; add delete confirmation and null `expiresAt` guard.
- Remove per-page role guards that duplicate the admin layout guard. Keep one failure mode: redirect.

### FR-9: Hotfix the `parseActivityType` regression (amendment 2026-09-11)

Discovered during FR-4 implementation. `parseActivityType` in `server/controllers/user-controller.ts` (introduced in `975816594`) uppercases the input and compares against lowercase enum values. It returns null for every activity type. `POST /api/v1/users/:id/activitylog` has returned 400 for all clients since 2026-09-08. This breaks quiz XP awards app-wide. Fix the comparison. Add a regression test that proves a valid activity type passes.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Application code must not bypass the domain layer per AGENTS.md. Internal HTTP self-fetch removal moves toward `assertCan` and TenantDB patterns.
- NFR-3: Middleware session-fetch latency is out of scope; record it in `measure/tech-debt.md`.
- NFR-4: Run `build-graph update ./graph.db <files>` after structural edits.

## Acceptance Criteria

- AC-1: Dashboard and goals render server-fetched data; no metric or goals fetch fires in the browser on load.
- AC-2: No server component fetches its own app over HTTP in the read and lesson pages.
- AC-3: A teacher cannot open another school's student-progress page.
- AC-4: Placement XP is computed on the server; the client cannot set its own XP.
- AC-5: No hardcoded English strings remain in the listed scopes for `en` and `th` locales.
- AC-6: Matching cards, table rows, game cards, and save/translate actions are keyboard-reachable.
- AC-7: Teacher pages issue no student-leaderboard fetch.
- AC-8: `pnpm turbo run test --filter=reading-advantage`, `check-types`, and `build` pass.

## Implementation Notes

- FR-4 trust boundary (implemented 2026-09-12): placement XP authority moved to the server. The client now posts only the AI assessment (`level`, `sublevel`, and metadata) to `POST /api/v1/level-test/placement`, Zod-validated in `level-test-controller.ts`. The server computes `systemXp` via `cefrToSystemXp` (moved to `lib/utils.ts`), records the `LEVEL_TEST` activity and XP log, sets the user's XP/level, and returns the placement. Client-sent XP values are ignored. The previous flow let the browser compute and POST its own placement XP through `/api/v1/users/:id/activitylog`.

## Out of Scope
- Framework upgrades. Version policy forbids them.
- Rewriting the 294 legacy API routes. This track touches only the client usage listed above.
- Signup/CTA copy realignment beyond the footer and auth i18n fixes. Owner decision required first.
- Middleware session-fetch redesign. Tracked as tech debt.
