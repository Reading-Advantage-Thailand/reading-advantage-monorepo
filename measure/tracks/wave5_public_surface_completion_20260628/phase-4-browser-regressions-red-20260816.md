# Phase 4 Browser Regression Red Evidence

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: Phase 4, Accessibility, Navigation, and Contact
- Findings: UX-P4-001, UX-P4-002, UX-P4-004, UX-P4-005
- Successor-owned finding: UX-P4-003, `www_crm_lead_intake_20260722`
- Phase base SHA: `b4683613d`
- Role base SHA: `b4683613d`
- Role: Mid Red

UX-P4-003 remains successor-owned by `www_crm_lead_intake_20260722`.
This lane adds no form backend or backend contract.

## Red Scope

The new focused test preserves the committed Phase 4 assertions.
It adds four rendered or locale-contract checks:

1. Storytime has five complete FAQ entries in en, th, and zh.
2. Related article cards wrap long content at mobile width.
3. Pricing status text uses an accessible contrast token.
4. Contact eyebrows use an accessible contrast treatment.

The tests use rendered structure and locale data.
They do not inspect production source text.

## Verification

| Command | Result |
|---|---|
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-browser-regressions.red.test.tsx src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx --maxWorkers=1` | Expected Red: 4 browser tests fail by UX finding. The existing Phase 4 suite passes 4/4. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts src/__tests__/phase-3-group-b-types.test.ts --maxWorkers=1 --testTimeout=30000` | 10/10 pass. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | Pass. |
| `../../node_modules/.bin/eslint src/__tests__/phase-4-browser-regressions.red.test.tsx` | Pass. |
| `../../node_modules/.bin/prettier --check src/__tests__/phase-4-browser-regressions.red.test.tsx` | Pass. |
| `git diff --cached --check` on the three leased files | Pass. |

The focused Red names only UX-P4-001, UX-P4-002, UX-P4-004, and UX-P4-005.
Existing Phase 4 assertions pass unchanged.

## Boundary

- Production source was not changed.
- Existing Phase 4 tests were not changed.
- No form backend was invented for UX-P4-003.
- Registry, metadata, configuration, lockfiles, and generated files were not changed.
- Unrelated worktree changes remain untouched.

## Green Handoff

- Add the missing Storytime FAQ entries to en, th, and zh.
- Make related article cards wrap long content at mobile width.
- Add an accessible contrast token to pricing status text.
- Apply an accessible contrast treatment to contact eyebrows.
- Keep UX-P4-003 with `www_crm_lead_intake_20260722`.
- Rerun the focused Red suite and all listed diagnostics.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 4 browser regression remediation
phase_base_sha: b4683613d
role_base_sha: b4683613d
findings: UX-P4-001; UX-P4-002; UX-P4-004; UX-P4-005
successor_owned: UX-P4-003 -> www_crm_lead_intake_20260722
focused_result: 4 browser tests fail by named UX finding; existing Phase 4 tests pass 4/4
regression_result: 10/10 Phase 3 cases pass with the accepted 30-second timeout
files_changed: apps/www-reading-advantage/src/__tests__/phase-4-browser-regressions.red.test.tsx; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-4-browser-regressions-red-20260816.md
green_handoff: Implement UX-P4-001, UX-P4-002, UX-P4-004, and UX-P4-005. Keep UX-P4-003 successor-owned. Rerun all listed diagnostics.
END_MEASURE_AGENT_RESULT
