# Implementation Plan: Primary Loading and State Correctness

Track ID: `primary_loading_state_correctness_20260912`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/primary-advantage/`. Run after `primary_authorization_hardening_20260912`. May run in parallel with tracks 2 and 3.

## Phase 1: Contract & Invariant Definition

- [x] Task: Define fix invariants as automated checks
  - [x] Write static assertions: no `window.location.search` in `StudentCartridgeHost.tsx`; no interpolated `dark:bg-${color}` in `change-role.tsx`; no hardcoded `.th` lookups in the three listed files.
  - [x] Define the static lookup map shape for the change-role colour classes.
  - [x] Confirm the new test file fails (Red).

## Phase 2: Test

- [x] Task: Write failing behavioral tests (Red)
  - [x] Test FR-1: empty collection responses clear loading and do not leave a skeleton.
  - [x] Test FR-2: matching game renders an empty state on an empty response and an error state on rejection.
  - [x] Test FR-4: a duplicate article page still advances the offset; a second in-flight fetch does not start.
  - [x] Test FR-5: ten rapid keystrokes on admin student search produce one request (fake timers).
  - [x] Test FR-11: a failed stats fetch renders an error state, not fallback numbers.
  - [x] Confirm all new tests fail (Red).

## Phase 3: Implement

- [x] Task: FR-1 clear loading flags on early return; move `setLoading(false)` out of `map` callbacks
- [x] Task: FR-2 add empty and error states to matching, word list, and sentence list
- [x] Task: FR-3 pass `mode` from page `searchParams` into `StudentCartridgeHost` (stage only that hunk)
- [x] Task: FR-4 track article offset in a ref so a duplicate page still advances it
- [x] Task: FR-5 debounce admin student search; remove the duplicate mount fetch
- [x] Task: FR-6 hoist the four components declared inside a render body
- [x] Task: FR-7 replace the three hardcoded `.th` lookups and the seven `"th"` defaults with the active locale
- [x] Task: FR-8 replace interpolated Tailwind classes with a static lookup map
- [x] Task: FR-9 call `init()` in `teacher/assignments.tsx`; render the body from `table.getRowModel()`
- [x] Task: FR-10 check `response.ok` in `teacher/assignment-dashboard.tsx`
- [x] Task: FR-11 replace fabricated admin KPI and activity fallbacks with explicit error states
- [x] Task: FR-12 replace `window.location.href` / `reload()` with i18n `router.push` / `router.refresh`
- [x] Task: Run new tests until green; run `pnpm turbo run test --filter=primary-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update `docs/primary-advantage-ux-refactor-plan.md` sections 4.2-4.5 items to done
- [x] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
