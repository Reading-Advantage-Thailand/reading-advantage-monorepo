# Persistent Phase 4 Mobile Blog Overflow Red Evidence

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: Phase 4 browser regression remediation
- Phase base SHA: `c7d0880e9`
- Role base SHA: `c7d0880e9`
- Role: Mid Red
- Finding: related blog card tags expand the body to 490px at a 390px viewport
- Successor-owned finding: UX-P4-003, `www_crm_lead_intake_20260722`

## Observed Browser DOM

- Viewport width: 390px.
- `document.body.scrollWidth`: 490px.
- Related card width: 358px.
- The related card tag `AI Creativity` extends from x 390.734px to x 471.312px.
- The second related card tag extends from x 409.515px to x 490.093px.
- The overflow comes from BlogCard tags, not the article BlogTags wrapper.

## False-Green Cause

The prior test rendered only BlogTags.
It checked class tokens but did not render BlogCard or inspect the tag container structure.
The current BlogCard tag wrapper lacks flex wrapping and min-width or max-width containment.

## Red Scope

The strengthened focused test renders the real BlogTags and BlogCard structures with the observed long tag.
Its detector rejects relevant elements with fixed or min-content widths, nowrap, unbreakable content, or missing containment.
The test also renders a 490px fixed-width nowrap counterexample.
The counterexample passes the detector and reports all four hazard categories.

## Verification

| Command | Result |
|---|---|
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-browser-regressions-final.red.test.tsx --maxWorkers=1 --testTimeout=30000` | Expected Red: the real BlogCard structure fails; the counterexample detector passes. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-browser-regressions-final.red.test.tsx src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx src/__tests__/phase-4-browser-regressions.red.test.tsx src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx --maxWorkers=1 --testTimeout=30000` | Expected Red: 1 focused test fails; existing Phase 4/browser tests pass 11/11. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts src/__tests__/phase-3-group-b-types.test.ts --maxWorkers=1 --testTimeout=30000` | 10/10 pass. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | Pass. |
| `../../node_modules/.bin/eslint src/__tests__/phase-4-browser-regressions-final.red.test.tsx` | Pass. |
| `../../node_modules/.bin/prettier --check src/__tests__/phase-4-browser-regressions-final.red.test.tsx` | Pass. |
| `git diff --check` on the focused Red scope | Pass. |

## Boundary

- Production source was not changed.
- Existing Phase 3, Phase 4, and browser tests were not changed.
- Registry, metadata, configuration, lockfiles, and generated files were not changed.
- UX-P4-003 remains successor-owned by `www_crm_lead_intake_20260722`.
- Unrelated worktree changes remain untouched.

## Green Handoff

- Make the BlogCard tag wrapper wrap at mobile widths.
- Add min-width and max-width containment to the BlogCard tag wrapper and tag elements.
- Preserve breakable content behavior for long tags.
- Rerun the focused Red and all listed diagnostics.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 4 persistent mobile blog overflow remediation
phase_base_sha: c7d0880e9
role_base_sha: c7d0880e9
finding: BlogCard tag DOM expands body to 490px at a 390px viewport
successor_owned: UX-P4-003 -> www_crm_lead_intake_20260722
focused_result: real BlogCard contract fails; 490px fixed-width nowrap counterexample is detected
files_changed: apps/www-reading-advantage/src/__tests__/phase-4-browser-regressions-final.red.test.tsx; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-4-browser-regressions-mobile-overflow-red-20260816.md
green_handoff: Implement BlogCard tag wrapping and containment. Keep UX-P4-003 successor-owned. Rerun all listed diagnostics.
END_MEASURE_AGENT_RESULT
