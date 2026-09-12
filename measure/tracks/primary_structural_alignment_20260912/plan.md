# Implementation Plan: Primary Structural Alignment

Track ID: `primary_structural_alignment_20260912`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/primary-advantage/`. Optional. Run after `primary_component_deduplication_20260912` to avoid merge conflicts on shared components.

## Phase 1: Contract & Schema Definition

- [ ] Task: Define domain-migration and a11y contracts
  - [ ] List the 33 API routes that still import `@reading-advantage/db` directly. This list is the migration checklist.
  - [ ] Define the TenantDB + `assertCan` handler shape that each migrated route must match. Use the existing `app/api/v1/apk/*` routes as the model.
  - [ ] Write static tests (Red): `app/api` still has direct `@reading-advantage/db` imports outside apk/host-proof; no `error.tsx` exists outside `student/read`; `audio-button.tsx` puts `onClick` on an SVG.
  - [ ] Define the `ProgressBar` keep-or-delete decision as an owner note in this plan before implementation.

## Phase 2: Test

- [ ] Task: Write failing tests (Red)
  - [ ] A teacher from school A cannot read school B data through a migrated user-progress route (extends Track 1 coverage onto TenantDB).
  - [ ] Route-group `error.tsx` is imported by the App Router for teacher and admin segments.
  - [ ] `AudioButton` is a `<button>` with an accessible name.
  - [ ] Sentence-order games expose a keyboard path (click or arrow key).
  - [ ] Confirm all new tests fail (Red).

## Phase 3: Implement

- [ ] Task: FR-1 migrate the 33 API routes onto `createTenantDB` and `assertCan`, route by route
- [ ] Task: FR-2 move the four `useEffect` data fetches to their server pages
- [ ] Task: FR-3 add one `error.tsx` per route group and one `global-error.tsx`; fix the read-page 404-for-every-error copy
- [ ] Task: FR-4 accessibility pass (17 clickable elements, 13 icon-only buttons, `AudioButton`, form `role="alert"`, `aria-live`, sentence-order keyboard path)
- [ ] Task: FR-5 remaining i18n and locale-loss fixes (licence/school/games/APK/footer strings; locale-aware sign-in redirects and links; marketing metadata)
- [ ] Task: FR-6 render `ProgressBar` with real XP and fix the level lookup, or delete it
- [ ] Task: Run `build-graph update ./graph.db` on all structurally edited files
- [ ] Task: Run new tests until green; run test suite, `check-types`, and `build`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/primary-advantage-ux-refactor-plan.md` Track 6 items to done
- [ ] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
