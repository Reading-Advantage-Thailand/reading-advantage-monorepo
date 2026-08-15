# THB architecture boundary Green correction

## Scope

- Track: `company_finance_operations_20260810`
- Phase: Phase 2 — controlled operational imports
- Role: `measure-jr-green`
- `phase_base_sha`: `8fa71b33b79a3090941f884f037564baa0322dbb`
- `role_base_sha`: `399864a3087287b8435d2b697211245c9cd15085`
- Source commit: `adf96232f`

## Delivered correction

The architecture contract now scans the committed `thb-valuation.ts` module.
It admits only the reviewed `zod.z` and `node:util.types` bindings.
It rejects other utility bindings and retains the existing boundary guards.

## Verification

- The disclosed architecture failure reproduced with 7/8 tests passed and 1 failed.
- The architecture command passed 9/9 tests after the correction.
- The 60-case THB command passed 60/60 tests.
- The focused Finance regression passed 25/25 tests across 5 files.
- Production and test TypeScript checks passed with direct local compiler commands.
- Finance ESLint passed for `src/modules/finance-operations`.
- Prettier check passed for the changed test.
- `git diff --check` passed for the changed test.
- The package `check-types` wrapper was interrupted during an unavailable registry relink.

## Boundary

The source change modified only `architecture-boundary.test.ts`.
No production source or committed THB Red test changed.
No registry, metadata, generated file, graph database, or unrelated dirty path changed.

## Handoff

Review the exact `node:util.types` exception and the counterexamples.
Owner rate-source, effective-date, and rounding decisions remain outside this correction.
