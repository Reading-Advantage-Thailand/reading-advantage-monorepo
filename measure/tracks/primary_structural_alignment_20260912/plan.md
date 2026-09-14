# Implementation Plan: Primary Structural Alignment

Track ID: `primary_structural_alignment_20260912`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/primary-advantage/`. Optional. Run after `primary_component_deduplication_20260912` to avoid merge conflicts on shared components.

## Phase 1: Contract & Schema Definition

- [x] Task: Define domain-migration and a11y contracts
  - [x] List the 33 API routes that still import `@reading-advantage/db` directly. This list is the migration checklist.
  - [x] Define the TenantDB + `assertCan` handler shape that each migrated route must match. Use the existing `app/api/v1/apk/*` routes as the model.
  - [x] Write static tests (Red): `app/api` still has direct `@reading-advantage/db` imports outside apk/host-proof; no `error.tsx` exists outside `student/read`; `audio-button.tsx` puts `onClick` on an SVG.
  - [x] Define the `ProgressBar` keep-or-delete decision as an owner note in this plan before implementation.

## Phase 2: Test

- [x] Task: Write failing tests (Red)
  - [x] A teacher from school A cannot read school B data through a migrated user-progress route (extends Track 1 coverage onto TenantDB).
  - [x] Route-group `error.tsx` is imported by the App Router for teacher and admin segments.
  - [x] `AudioButton` is a `<button>` with an accessible name.
  - [x] Sentence-order games expose a keyboard path (click or arrow key).
  - [x] Confirm all new tests fail (Red).

## Phase 3: Implement

- [x] Task: FR-1 migrate the 33 API routes onto `createTenantDB` and `assertCan`, route by route. Actual: 24 route files (the original 33 count predated track 5's three debug-route deletions and routes already on TenantDB). First pass on 2026-09-13 wrapped queries but left the barrel import and skipped assertCan — a rename, not a migration. Second pass same day completed it: tables import from `@reading-advantage/db/schema`, operators from `drizzle-orm`, and the live handle comes only from domain-owned `getTenantDB`/`getUnscopedDB`; `assertCan` is wired per route with permissions codifying existing gates. Exception: `schools/ranking` POST is gated by the `x-access-key` header with no user context, so no assertCan there. The invariant test now matches the `/client` subpath and its baseline is empty.
- [x] Task: FR-2 move the four `useEffect` data fetches to their server pages. Actual: 3 of 4 converted (school-profile, class-roster enrollment, student/assignments page 1). `admin/students` stays client-side — its fetches are search/filter-driven and pinned by tests; `article-select` was already compliant (server page fetch plus scroll-triggered load-more).
- [x] Task: FR-3 add one `error.tsx` per route group and one `global-error.tsx`; fix the read-page 404-for-every-error copy
- [x] Task: FR-4 accessibility pass (22 clickable elements, 10 live icon-only buttons, `AudioButton`, form `role="alert"`, `aria-live`, sentence-order keyboard path)
- [x] Task: FR-5 remaining i18n and locale-loss fixes (licence/school/games/APK/footer strings; RPG hardcoded labels; locale-aware sign-in redirects, links, and logout; marketing metadata; teacher dashboard placeholder)
- [x] Task: FR-6 render `ProgressBar` with real XP and fix the level lookup, or delete it. Owner note (2026-09-13): DELETE branch taken. `progress-bar-xp.tsx` was imported but never rendered, and its level lookup was wrong; dead code under YAGNI. File, import, and `disableProgressBar` plumbing deleted; fake-zero XP props removed from three layouts so real session values flow.
- [x] Task: Run `build-graph update ./graph.db` on all structurally edited files
- [x] Task: Run new tests until green; run test suite, `check-types`, and `build`. Final state 2026-09-13: 493/493 tests pass (69 files), `check-types` shows 17 pre-existing APK errors only, `pnpm build` exits 0.
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update `docs/primary-advantage-ux-refactor-plan.md` Track 6 items to done
- [x] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
