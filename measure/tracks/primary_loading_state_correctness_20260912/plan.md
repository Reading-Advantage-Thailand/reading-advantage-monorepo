# Implementation Plan: Primary Loading and State Correctness

Track ID: `primary_loading_state_correctness_20260912`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/primary-advantage/`. Run after `primary_authorization_hardening_20260912`. May run in parallel with tracks 2 and 3.

## Phase 1: Contract & Invariant Definition

- [ ] Task: Define fix invariants as automated checks
  - [ ] Write static assertions: no `window.location.search` in `StudentCartridgeHost.tsx`; no interpolated `dark:bg-${color}` in `change-role.tsx`; no hardcoded `.th` lookups in the three listed files.
  - [ ] Define the static lookup map shape for the change-role colour classes.
  - [ ] Confirm the new test file fails (Red).

## Phase 2: Test

- [ ] Task: Write failing behavioral tests (Red)
  - [ ] Test FR-1: empty collection responses clear loading and do not leave a skeleton.
  - [ ] Test FR-2: matching game renders an empty state on an empty response and an error state on rejection.
  - [ ] Test FR-4: a duplicate article page still advances the offset; a second in-flight fetch does not start.
  - [ ] Test FR-5: ten rapid keystrokes on admin student search produce one request (fake timers).
  - [ ] Confirm all new tests fail (Red).

## Phase 3: Implement

- [ ] Task: FR-1 clear loading flags on early return; move `setLoading(false)` out of `map` callbacks
- [ ] Task: FR-2 add empty and error states to matching, word list, and sentence list
- [ ] Task: FR-3 pass `mode` from page `searchParams` into `StudentCartridgeHost` (stage only that hunk)
- [ ] Task: FR-4 track article offset in a ref so a duplicate page still advances it
- [ ] Task: FR-5 debounce admin student search; remove the duplicate mount fetch
- [ ] Task: FR-6 hoist the four components declared inside a render body
- [ ] Task: FR-7 replace the three hardcoded `.th` lookups and the seven `"th"` defaults with the active locale
- [ ] Task: FR-8 replace interpolated Tailwind classes with a static lookup map
- [ ] Task: FR-9 call `init()` in `teacher/assignments.tsx`; render the body from `table.getRowModel()`
- [ ] Task: FR-10 check `response.ok` in `teacher/assignment-dashboard.tsx`
- [ ] Task: Run new tests until green; run `pnpm turbo run test --filter=primary-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/primary-advantage-ux-refactor-plan.md` sections 4.2-4.5 items to done
- [ ] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
