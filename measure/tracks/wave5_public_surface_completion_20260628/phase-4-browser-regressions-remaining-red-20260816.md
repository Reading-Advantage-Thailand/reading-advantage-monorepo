# Phase 4 Remaining Browser Regression Red Evidence

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: Phase 4 browser regression remediation
- Findings: mobile blog article width overflow; pricing table keyboard access; pricing hero contrast
- Successor-owned finding: UX-P4-003, `www_crm_lead_intake_20260722`
- Phase base SHA: `f76f2f523`
- Role base SHA: `f76f2f523`
- Role: Mid Red

The requested `phase4-ux-browser-1cb0018e3.json` file was not present at the current HEAD.
The three remaining findings in the handoff define this Red scope.

UX-P4-003 remains successor-owned by `www_crm_lead_intake_20260722`.
This lane adds no contact form backend or backend contract.

## Red Scope

The new focused test preserves all existing Phase 4 tests.
It adds three rendered contracts:

1. Related article content stays inside a 390px card.
2. The pricing table has a focusable, directly named scrollport or equivalent controls.
3. Pricing hero text uses WCAG-AA contrast tokens.

The tests use rendered structure and a 390px viewport setup.
They do not inspect production source text.

## Verification

| Command | Result |
|---|---|
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx src/__tests__/phase-4-browser-regressions.red.test.tsx src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx --maxWorkers=1` | Expected Red: 3 remaining browser tests fail. Existing browser and Phase 4 suites pass 8/8. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts src/__tests__/phase-3-group-b-types.test.ts --maxWorkers=1 --testTimeout=30000` | 10/10 pass. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | Pass. |
| `../../node_modules/.bin/eslint src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx` | Pass. |
| `../../node_modules/.bin/prettier --check src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx` | Pass. |
| `git diff --cached --check` on the three leased files | Pass. |

The focused Red names only the three remaining browser findings.
Existing Phase 4 assertions pass unchanged.

## Boundary

- Production source was not changed.
- Existing Phase 4 tests were not changed.
- No contact form backend was invented for UX-P4-003.
- Registry, metadata, configuration, lockfiles, and generated files were not changed.
- Unrelated worktree changes remain untouched.

## Green Handoff

- Contain related article cards and content at 390px width.
- Make the pricing table keyboard accessible through a named focusable scrollport or equivalent controls.
- Apply WCAG-AA contrast tokens to pricing hero text.
- Keep UX-P4-003 successor-owned by `www_crm_lead_intake_20260722`.
- Rerun the focused Phase 4/browser suites and all listed diagnostics.

## Green Verification

- Green commit: `0e8e3e24c`.
- Related article tags wrap at narrow widths.
- The pricing table scrollport has keyboard focus and an accessible name.
- The pricing hero uses `text-slate-900` and `text-slate-700` for dark text.
- Focused Phase 4/browser tests pass 11/11.
- Phase 3 and HeroSection tests pass 14/14.
- TypeScript, ESLint, Prettier, direct Next production build, and diff checks pass.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 4 remaining browser regression remediation
phase_base_sha: f76f2f523
role_base_sha: f76f2f523
findings: mobile blog article width overflow; pricing table keyboard access; pricing hero contrast
successor_owned: UX-P4-003 -> www_crm_lead_intake_20260722
focused_result: 3 remaining browser tests fail; existing browser and Phase 4 suites pass 8/8
files_changed: apps/www-reading-advantage/src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-4-browser-regressions-remaining-red-20260816.md
green_handoff: Implement the three remaining browser contracts. Keep UX-P4-003 successor-owned. Rerun all listed diagnostics.
END_MEASURE_AGENT_RESULT
