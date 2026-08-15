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
