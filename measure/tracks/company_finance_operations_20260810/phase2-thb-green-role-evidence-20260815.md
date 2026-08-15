# Finance THB Green role evidence

## Scope

- Track: `company_finance_operations_20260810`
- Phase: `Phase 2 — controlled operational imports`
- Role: Finance Green implementation owner
- Immutable phase base: `0fe4bef13c1c996ee6c46ce51b9c3ed0594314d1`
- Role base: `b0d8bd7e29327a431952db7d06aa2c010f6547ba`
- Implementation commit: `4c329d91066e809d2cef0b453a0e752b043b1d6a`

## Delivered behavior

The implementation adds strict THB conversion evidence validation.
It validates immutable request and dependency snapshots.
It calls the Company Identity attestor before evidence access.
It preserves source amounts and currencies.
It uses exact decimal arithmetic and THB identity conversion.
It classifies changed conversion evidence as a conflict.

## Verification

- THB Red command: 47/47 tests passed.
- Company Identity attestor command: 83/83 tests passed.
- Focused Finance regression command: 23/23 tests passed.
- Backend typecheck passed.
- Focused lint passed.
- Prettier and scoped diff checks passed.
- Backend build passed.
- `measure/doctor.sh` failed on unrelated deprecated `[ ]` markers.

## Files

- Added `packages/backend/src/modules/finance-operations/thb-valuation.ts`.
- Updated `packages/backend/src/modules/finance-operations/index.ts`.

## Handoff

The THB task is marked `[x]` with the implementation SHA.
No task is marked `[b]` by this role.
Rate source, effective date, and rounding identifiers remain opaque trusted evidence.
No phase acceptance is claimed.

MEASURE_AGENT_RESULT
role: jr-green
status: complete
track: company_finance_operations_20260810
phase: Phase 2 — controlled operational imports
commits: 4c329d910, 14ba6e147
tests_run: ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts --pool=threads --maxWorkers=1 passed 47/47; measure/doctor.sh failed only on deprecated [ ] markers in unrelated plans.
files_changed: packages/backend/src/modules/finance-operations/thb-valuation.ts; packages/backend/src/modules/finance-operations/index.ts; measure/tracks/company_finance_operations_20260810/phase2-thb-green-role-evidence-20260815.md.
plan_updates: The Phase 2 THB task is marked [x] with source commit 4c329d910.
known_failures: measure/doctor.sh fails on deprecated [ ] markers in unrelated plans.
handoff: Review the THB implementation. The immutable phase base is 0fe4bef1324bd33af7477d9c0269ed29a5b26bca. The final Green head is 14ba6e1477d4bf3130be4882d527ad551e2736ad.
END_MEASURE_AGENT_RESULT
