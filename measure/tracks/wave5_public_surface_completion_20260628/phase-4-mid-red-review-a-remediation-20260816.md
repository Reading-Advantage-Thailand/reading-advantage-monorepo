# Phase 4 Review A Mid Red Remediation

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: Phase 4, Accessibility, Navigation, and Contact
- Findings: RA-P4-002, RA-P4-003, RA-P4-004
- Phase base SHA: `13aa950ab`
- Role base SHA: `13aa950ab`
- Role: Mid Red

The requested `phase4-review-a-f3b1fd371.json` file was not present at the current HEAD.
The three named Review A findings supplied in the handoff define this Red scope.

## Red Changes

The existing Phase 4 assertions remain unchanged.
The Red file adds three rendered DOM contracts:

1. RA-P4-002 requires a focusable, directly named horizontal scrollport.
2. RA-P4-003 rejects raw glyphs as comparison mark accessible names.
3. RA-P4-004 requires a collapsed FAQ panel to leave the accessibility tree.

The new assertions use rendered structure and existing user interaction.
They do not inspect production source text.

## Verification

| Command | Result |
|---|---|
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx --maxWorkers=1` | Expected Red: 3 named assertions fail. The other 3 tests pass. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts src/__tests__/phase-3-group-b-types.test.ts --maxWorkers=1` | 9/10 pass. One existing Science diagnostic times out at five seconds. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | Pass. |
| `../../node_modules/.bin/eslint src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx` | Pass. |
| `../../node_modules/.bin/prettier --check src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx` | Pass. |
| `git diff --cached --check` on the three leased Phase 4 paths | Pass. |

The focused failure output names only RA-P4-002, RA-P4-003, and RA-P4-004.
The output also contains existing React DOM warnings from SVG and localized links.

## Boundary

- Production source was not changed.
- The existing Phase 4 assertions were not changed.
- Registry, metadata, configuration, lockfiles, and generated files were not changed.
- Unrelated worktree changes remain untouched.

## Green-Session Handoff

- Make the horizontal scrollport focusable and give it a direct accessible name.
- Give every comparison mark a localized semantic label that is not a raw glyph.
- Hide collapsed FAQ panels from the accessibility tree while preserving open-panel behavior.
- Rerun the focused Red suite and all listed diagnostics.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 4 Review A remediation
phase_base_sha: 13aa950ab
role_base_sha: 13aa950ab
findings: RA-P4-002; RA-P4-003; RA-P4-004
focused_result: 3 named assertions fail; all existing Phase 4 assertions pass
regression_result: 9/10 Phase 3 cases pass; one existing Science diagnostic times out
files_changed: apps/www-reading-advantage/src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-4-mid-red-review-a-remediation-20260816.md
green_handoff: Implement RA-P4-002, RA-P4-003, and RA-P4-004, then rerun the focused Red suite and all listed diagnostics.
END_MEASURE_AGENT_RESULT
