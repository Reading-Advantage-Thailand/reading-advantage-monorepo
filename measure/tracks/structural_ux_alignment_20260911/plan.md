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

- [ ] Task: FR-1 server-side dashboard metrics; delete `useDashboardMetrice`; swap dashboard/reports i18n scopes; merge reports view
- [ ] Task: FR-1 server-side goals fetch; `ActiveGoalsWidget` receives props; `AlertDialog` replaces native confirm
- [ ] Task: FR-2 replace self-HTTP fetches in read and lesson pages with direct domain/DB calls
- [ ] Task: FR-5 lesson page `Promise.all` and error guards
- [ ] Task: FR-3 student-progress role and ownership check
- [ ] Task: FR-4 server-side level-test XP placement
- [ ] Task: FR-6 i18n pass (goals, flashcards, settings, auth, system, sidebar keys, footer, marketing metadata)
- [ ] Task: FR-7 accessibility pass (keyboard support, `role="alert"`, `Link` wrapping, `aria-live`, sidebar back link)
- [ ] Task: FR-8 shell cleanup part 1: `SessionSyncRedirect` destination, `sharedMainNav`, shared guard helper, `disableLeaderboard`
- [ ] Task: FR-8 shell cleanup part 2: theme-wrapper rename, delete dead context/imports, auth layout min-height, i18n routing links, index layout collapse, `user-account-nav` fixes
- [ ] Task: FR-8 page cleanup: workbook-generator decision, `router.refresh()` replacements, per-group `error.tsx`, `Promise.all` fetches, license page ordering, admin guard dedup
- [ ] Task: Run `build-graph update ./graph.db` on all structurally edited files
- [ ] Task: Run new tests until green; run `pnpm turbo run test --filter=reading-advantage`, `check-types`, and `build`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 4 items to done
- [ ] Task: Add middleware session-fetch latency row to `measure/tech-debt.md` with owner confirmation
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
