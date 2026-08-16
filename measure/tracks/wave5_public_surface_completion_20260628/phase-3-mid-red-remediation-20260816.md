# Phase 3 Mid Red Remediation Log

## Contract

- Track: `wave5_public_surface_completion_20260628`
- Phase: `Phase 3: i18n Completeness and Typed Locale Access`
- Phase base SHA: `c312eb71942715a0d12b2df037ac9527323b31c7`
- Role base SHA: `3d09df0ef278ee471ebca894da42eb5588a1e370`
- Review A findings: `RA-P3-001` and `RA-P3-002`

## Red Remediation

- `RA-P3-001` now type-checks every existing Science translator caller.
- The test records the caller inventory before it checks TypeScript diagnostics.
- `RA-P3-002` now renders ContactCTA for en, th, and zh.
- The test verifies ProductCTA interpolation with a real product name.
- The test verifies Sheet screen-reader text for all three locales.
- The test verifies non-empty and distinct locale values for all reviewed messages.
- The test uses the real locale dictionaries instead of key-only sentinels.

## Verification

- PASS: four of five focused tests pass.
- PASS: CTA source guard passes.
- PASS: locale accessor cast guard passes.
- PASS: Thai typo guard passes.
- PASS: CTA interpolation, Sheet text, and locale parity pass.
- FAIL: the Science caller type contract reports 22 locale-key diagnostics.
- FAIL: `hero.comingSoon` is missing from the typed Science message contract at lines 76 and 389.
- FAIL: `targetAudience.heading` and its three audience records are missing from the typed contract.
- FAIL: `waitlist.heading`, `waitlist.description`, and both form keys are missing from the typed contract.
- FAIL: direct www typecheck exits 2 with the same 22 production locale-contract errors.
- FAIL: direct `next build` compiles, then exits 1 on `hero.comingSoon` at `page.tsx:76:20`.
- PASS: the Red test file passes Prettier.

Commands:

```text
CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts --maxWorkers=1
node_modules/.bin/tsc --noEmit -p apps/www-reading-advantage/tsconfig.json
../../node_modules/.bin/next build
../../node_modules/.bin/prettier --write src/__tests__/phase-3-i18n.red.test.ts
```

## Boundary

- This role changed no production source.
- This role changed no configuration, registry, metadata, lockfile, or generated file.
- The focused failure names only the actual Science locale contract incompatibility.
- The plan records the open implementation and verification tasks.

## Green Handoff

- Add the missing Science message contract for every en, th, and zh caller.
- Rerun the focused Red suite after the production locale change.
- Rerun direct typecheck and build diagnostics.
- Do not treat this Red result as Phase 3 Green.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 3: i18n Completeness and Typed Locale Access
phase_base_sha: c312eb71942715a0d12b2df037ac9527323b31c7
role_base_sha: 3d09df0ef278ee471ebca894da42eb5588a1e370
focused_result: 4/5 passed; one failure with 22 Science locale-key diagnostics
exact_failure: Existing Science translator callers use keys absent from ExactMessages: hero.comingSoon; targetAudience.heading; targetAudience.audiences.0-2 title and points.0-3; waitlist.heading; waitlist.description; waitlist.form.placeholder; waitlist.form.button.
files_changed: apps/www-reading-advantage/src/__tests__/phase-3-i18n.red.test.ts; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-3-mid-red-remediation-20260816.md
green_handoff: Add the missing Science locale contract, then rerun the focused suite, direct typecheck, and build.
END_MEASURE_AGENT_RESULT
