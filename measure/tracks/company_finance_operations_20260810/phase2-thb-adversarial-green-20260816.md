# THB-ADV-001 Green evidence

## Scope

- Track: `company_finance_operations_20260810`
- Phase: Phase 2 — controlled operational imports
- Role: `measure-jr-green`
- `phase_base_sha`: `8fa71b33b79a3090941f884f037564baa0322dbb`
- `role_base_sha`: `3d66149bf`
- Source commit: `0adff98cc`

## Delivered correction

The THB identity check now compares the decimal coefficient with ten to the decimal scale.
It accepts `1`, `1.0`, and `1.00` as the same numeric rate.
It preserves exact source amount spelling and exact THB amount equality.
The existing decimal schema still rejects malformed rates.
Non-one rates still return the conversion evidence conflict.

## Verification

- The adversarial and full THB command passed 94/94 tests across three files.
- The architecture command passed 11/11 tests.
- The focused Finance regression passed 25/25 tests across five files.
- Production and test TypeScript checks passed.
- Finance ESLint passed.
- Prettier passed for `thb-valuation.ts`.
- The Finance build passed.
- The scoped diff check passed.
- The committed adversarial test file remains unchanged.
- Owner rate-source, rounding, and effective-date decisions remain deferred.
- No phase acceptance claim is made.

## Handoff

Review should verify numeric identity handling and exact THB amount preservation.
The owner-gated Finance policy status remains unchanged.
