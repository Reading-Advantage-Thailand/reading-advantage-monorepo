# THB replay Green remediation

## Scope

- Track: `company_finance_operations_20260810`
- Phase: Phase 2 — controlled operational imports
- Role: `measure-jr-green`
- `phase_base_sha`: `8fa71b33b79a3090941f884f037564baa0322dbb`
- `role_base_sha`: `590b803dd24e87994ac1def37688b7d9694b5546`
- Source commit: `0e85b4d7e4915d3df62c3f78280debca05fee3ea`

## Delivered behavior

Replay now captures the complete input before reading either operand.
It rejects Proxy and accessor envelopes without reading them.
It validates strict operands and strict nested scopes.
It returns conflict for invalid, unknown, changed, or scope-mismatched operands.
It returns replay only for complete unchanged operands.

## Verification

- The focused THB command passed 60/60 tests.
- The focused Finance regression command passed 23/23 tests.
- Production and test typechecks passed.
- Targeted lint, Prettier, diff, and build commands passed.
- `measure/doctor.sh` failed on unrelated deprecated `[ ]` markers.
- The Finance architecture allowlist test failed on an existing THB barrel import.

## Boundary

The source change modifies only `thb-valuation.ts`.
It does not change committed Red tests.
It does not select a rate source, date rule, or rounding policy.
