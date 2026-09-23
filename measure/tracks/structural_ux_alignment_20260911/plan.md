# Implementation Plan: Reading Structural UX Alignment

Track ID: `structural_ux_alignment_20260911`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/reading-advantage/`. Run after `component_deduplication_20260911` to avoid merge conflicts on shared components.

## Phase 1: Contract & Schema Definition

- [ ] Task: Define server-data contracts
  - [ ] Zod schemas for the dashboard metrics response and goals props passed from server pages.
  - [ ] Contract for the server-side level-test placement endpoint: answers in, placement out.
  - [ ] `SessionSyncRedirect` `destination` prop contract; `sharedMainNav` export shape; shared auth/expiry guard helper signature.
  - [ ] Write static tests: no `useDashboardMetrice` import remains, no self-HTTP fetch in read/lesson pages, no `window.location.reload` in the three listed files (Red).

## Phase 2: Test

- [ ] Task: Write failing tests (Red)
  - [ ] Dashboard server page passes metrics props; no client fetch on mount.
  - [ ] Student-progress page rejects a teacher from another school (403/redirect).
  - [ ] Level-test endpoint computes placement server-side from posted answers.
  - [ ] Teacher layout passes `disableLeaderboard`; `AppLayout` skips the leaderboard fetch when set.

## Phase 3: Implement

- [x] Task: FR-1 server-side dashboard metrics; delete `useDashboardMetrice`; swap dashboard/reports i18n scopes; merge reports view `d275693`
- [x] Task: FR-1 server-side goals fetch; `ActiveGoalsWidget` receives props; `AlertDialog` replaces native confirm `d275693`
- [x] Task: FR-2 replace self-HTTP fetches in read and lesson pages with direct domain/DB calls `c363b21`
- [x] Task: FR-5 lesson page `Promise.all` and error guards `7db9992`
- [x] Task: FR-3 student-progress role and ownership check `62ae099`
- [x] Task: FR-4 server-side level-test XP placement `afb45de`
- [x] Task: FR-6 i18n pass (goals, flashcards, settings, auth, system, sidebar keys, footer, marketing metadata) `d7d1778` `461d92b`
- [x] Task: FR-7 accessibility pass (keyboard support, `role="alert"`, `aria-live`, sidebar back link, visible save-to-flashcard button) `4af49b6` (deferred: games catalog card `Link` wrapping — blocked by APK track's uncommitted files)
- [x] Task: FR-8 shell cleanup part 1: `SessionSyncRedirect` destination, `sharedMainNav`, shared guard helper, `disableLeaderboard` `1d4ab96` `f95125d`
- [x] Task: FR-8 shell cleanup part 2: theme-wrapper rename, delete dead context/imports, auth layout min-height, i18n routing links, index layout collapse, `user-account-nav` fixes `f95125d` `58746bb`
- [x] Task: FR-8 page cleanup: workbook-generator decision (added to sidebar; owner review pending), `router.refresh()` replacements, per-group `error.tsx`, `Promise.all` fetches, license page ordering, admin guard dedup `58746bb`
- [x] Task: FR-9 hotfix `parseActivityType` case-mismatch regression with a regression test (amendment; discovered during FR-4) `22f3dc292`
- [x] Task: Review repairs round 1 — close plan-review findings: POST XP authority, async staff-scope helper, page ADMIN school scope, placement server-owned XP `d275693`-range plus working-tree repairs committed as `89dda10d`
- [x] Task: Review repairs round 2 — close review-b F-B1..F-B4: PUT XP authority, placement assessment planting block + schema re-validation, staff scope on user GET/DELETE handlers, PATCH xp removal `14605390d` `01e63f659` (9 tests, TDD Red first)
- [x] Task: Review repairs round 3 — close review-c F-C1..F-C4: self role promotion block, client level/cefr/expired_date/license_id drop, `updateUserData` staff gate, reset flows rerouted to `/reset-all-progress` with classroom-teacher scope `a7d7ba4b` (22 targeted tests)
- [x] Task: Review repairs round 4 — close review-d F-D1/F-D6/F-D8: ADMIN role ceiling (no SYSTEM grant), `updateUserData` same-school scope for ADMIN, self-email persistence test `bf40558da` (26 targeted tests)
- [x] Task: Re-run independent review on the security repairs (workflow Step 4.2) — Reviews B/C/D run; F-B1..F-B4, F-C1..F-C4, F-D1/F-D6/F-D8 all CLOSED. Remaining findings (client-derived XP in game/flashcard/question controllers, fake-target farming, license scope, getAllUsers exposure) are pre-existing platform-wide trust issues recorded in `measure/tech-debt.md` and planned in `docs/reading-advantage-deferred-items-plan.md` — outside this track's scope
- [x] Task: Run `build-graph update ./graph.db` on all structurally edited files `bf2f528` `efc941c` `3614844`
- [x] Task: Run new tests until green (984 passed, 2 known pre-existing failures; zero new tsc errors)
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) — PASSED 2026-09-23: session S5 checks S5.16-S5.20 (owner manual verification run 2026-09-23): dashboard view and goals page server-fetch their data (useDashboardMetrice deleted) — residual client fetches from sidebar-goals-widget and activity-timeline remain, both outside FR-1's listed files, filed as findings; cross-school student-progress redirects to /teacher/dashboard while own-school renders; placement XP is server-computed (bogus client xp stripped by Zod, 400 without a server-stored assessment); Thai locale renders the goals page and signin labels in Thai after the i18n hotfix (3f85a13a4); keyboard access works on matching and game cards, sign-in errors carry role=alert, level-test messages carry aria-live=polite. Confirmed by explicit product-owner yes on 2026-09-23.

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 4 items to done
- [ ] Task: Add middleware session-fetch latency row to `measure/tech-debt.md` with owner confirmation
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
