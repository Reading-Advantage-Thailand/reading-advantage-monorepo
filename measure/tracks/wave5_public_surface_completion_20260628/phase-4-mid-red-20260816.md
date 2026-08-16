# Phase 4 Mid Red Evidence

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: Phase 4, Accessibility, Navigation, and Contact
- Phase base SHA: `9d6b3af2608f0df7733197692a642905953c71f4`
- Role base SHA: `9d6b3af2608f0df7733197692a642905953c71f4`
- Role: Mid Red

## Red Scope

The new test file covers four Phase 4 contracts:

1. The mastery graph has an image role, an accessible name, and a polite live status.
2. Reviewed components expose navigation names, state relationships, icon labels, and safe disabled pagination.
3. Services exists in the shared primary navigation and each locale navigation contract.
4. Contact surfaces use one central support contact contract and one support email.

The tests inspect rendered DOM, user interaction, locale data, and submitted contact behavior.

## Verification

| Command | Result |
|---|---|
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx --maxWorkers=1` | Expected Red: 4 tests fail with 19 missing-contract assertions. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts src/__tests__/phase-3-group-b-types.test.ts --maxWorkers=1` | 9/10 pass. One existing Science diagnostic times out at five seconds. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | Pass. |
| `../../node_modules/.bin/eslint src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx` | Pass. |
| `../../node_modules/.bin/prettier --check src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx` | Pass. |
| `git diff --check -- apps/www-reading-advantage/src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx measure/tracks/wave5_public_surface_completion_20260628/plan.md` | Pass. |

The Red output includes existing React DOM warnings from the graph SVG and localized links.

## Boundary

- Production source was not changed.
- Registry, metadata, configuration, lockfiles, and generated files were not changed.
- Unrelated worktree changes remain untouched.

## Green Handoff

- Add graph ARIA attributes and a polite caption live region.
- Remediate the reviewed component accessibility contracts.
- Add Services to the shared navigation and all locale navigation arrays.
- Add `src/config/contact.ts` with the central contact contract.
- Route contact surfaces and the contact form to the shared contact contract.
- Rerun the Phase 4 Red suite, the Phase 3 regression, TypeScript, lint, Prettier, and diff checks.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 4 Accessibility, Navigation, and Contact
phase_base_sha: 9d6b3af2608f0df7733197692a642905953c71f4
role_base_sha: 9d6b3af2608f0df7733197692a642905953c71f4
focused_result: 4 Phase 4 tests fail with 19 expected missing-contract assertions
regression_result: 9/10 Phase 3 cases pass; one existing Science diagnostic times out
files_changed: apps/www-reading-advantage/src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-4-mid-red-20260816.md
green_handoff: Implement the four Phase 4 contracts, then rerun the focused Red suite and all listed diagnostics.
END_MEASURE_AGENT_RESULT
