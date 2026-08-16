# Final Phase 4 Browser Regression Red Evidence

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: Phase 4 browser regression remediation
- Phase base SHA: `fd581f3dc`
- Role base SHA: `fd581f3dc`
- Role: Mid Red
- Findings: mobile blog tag overflow and a missing Reading Advantage message key
- Successor-owned finding: UX-P4-003, `www_crm_lead_intake_20260722`

The requested `phase4-ux-browser-5cb38.json` file was not present at the current HEAD or in the repository history.
The current DOM and source identify the two final findings.

## Red Scope

The focused test preserves all existing Phase 3, Phase 4, and browser tests.
It adds two rendered contracts:

1. Blog article tags and their content stay within a 390px viewport.
2. `pages.products.readingAdvantage.resultsSection.stats.2.value` exists in en, th, and zh and renders text instead of its message key.

The message contract renders the Reading Advantage page with locale-backed translation resolution.
The test fails because all three locale files lack `resultsSection.stats.2`.

## Verification

| Command | Result |
|---|---|
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-browser-regressions-final.red.test.tsx --maxWorkers=1 --testTimeout=30000` | Expected Red: 2/2 final contracts fail. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-browser-regressions-final.red.test.tsx src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx src/__tests__/phase-4-browser-regressions.red.test.tsx src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx --maxWorkers=1 --testTimeout=30000` | Expected Red: 2 final contracts fail; existing Phase 4/browser tests pass 11/11. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts src/__tests__/phase-3-group-b-types.test.ts --maxWorkers=1 --testTimeout=30000` | 10/10 pass. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | Pass. |
| `../../node_modules/.bin/eslint src/__tests__/phase-4-browser-regressions-final.red.test.tsx` | Pass. |
| `../../node_modules/.bin/prettier --check src/__tests__/phase-4-browser-regressions-final.red.test.tsx` | Pass. |
| `git diff --check` on the focused Red scope | Pass. |
| `build-graph update ./graph.db apps/www-reading-advantage/src/__tests__/phase-4-browser-regressions-final.red.test.tsx` | Pass. |

## Boundary

- Production source was not changed.
- Existing Phase 3, Phase 4, and browser tests were not changed.
- No contact form backend or backend contract was added.
- Registry, metadata, configuration, lockfiles, and generated files were not changed.
- Unrelated worktree changes remain untouched.

## Green Handoff

- Add mobile containment classes to the rendered blog article tag container and tag links.
- Add `resultsSection.stats.2.value` and its paired label to en, th, and zh.
- Rerun the focused Red and all listed diagnostics.
- Keep UX-P4-003 successor-owned by `www_crm_lead_intake_20260722`.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 4 final browser regression remediation
phase_base_sha: fd581f3dc
role_base_sha: fd581f3dc
findings: mobile blog tag overflow; missing Reading Advantage resultsSection.stats.2.value message key
successor_owned: UX-P4-003 -> www_crm_lead_intake_20260722
focused_result: 2 final browser contracts fail; existing Phase 4/browser tests pass 11/11; Phase 3 tests pass 10/10
files_changed: apps/www-reading-advantage/src/__tests__/phase-4-browser-regressions-final.red.test.tsx; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-4-browser-regressions-final-red-20260816.md
green_handoff: Implement the two final browser contracts. Keep UX-P4-003 successor-owned. Rerun all listed diagnostics.
END_MEASURE_AGENT_RESULT
