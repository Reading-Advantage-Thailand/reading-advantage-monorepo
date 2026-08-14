# Finance Operations Phase 2 THB valuation test strategy

## Status and boundary

This document defines the active THB Red slice for
`company_finance_operations_20260810`.

The THB task is `[~]` because Red tests are active. Green production work stays
owner-gated.

The owner or accountant must choose the rate source, rounding policy, and
effective-date policy before Green production use.

This slice must not choose those policies. It must not implement a rate
provider. Future provider access must use an internal Finance port.

## Red command

Run from `packages/backend`:

```bash
../../node_modules/.bin/vitest run \
  src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts \
  --pool=threads --maxWorkers=1
```

The initial Red result must show only missing THB contract or implementation
exports. It must not show collection, fixture, type, or provider failures.

The expected missing exports are:

- `financeThbConversionEvidenceSchema`
- `createFinanceThbValuationPreparer`
- `classifyFinanceThbValuationReplay`

## Contract under test

The future contract must expose strict conversion evidence with these fields:

- `billId`
- `sourceAmountDecimal`
- `sourceCurrency`
- `thbAmountDecimal`
- `conversionRateDecimal`
- `rateEffectiveDate`
- `rateSourceId`

All decimal values must remain strings. Currency values must use uppercase
three-letter codes. The evidence schema must reject unknown keys, numbers,
lowercase codes, and invalid-length codes.

`createFinanceThbValuationPreparer` must accept an injected internal evidence
port. The port returns trusted conversion evidence for one source bill.

The preparer must preserve the exact source amount and source currency. It must
produce a separate exact THB amount.

The preparer must reject incomplete, contradictory, caller-only, and mutated
conversion evidence. It must reject duplicate evidence forms. It must not read
a provider directly.

`classifyFinanceThbValuationReplay` must return replay for unchanged evidence.
It must return conflict for changed conversion evidence.

## Required Red cases

The Red suite must cover:

1. Strict evidence schema behavior for exact decimal strings.
2. USD, EUR, JPY, and XOF source currencies.
3. THB identity conversion with a precise decimal amount.
4. Preservation of every source amount and currency.
5. Numeric source amounts and numeric conversion rates.
6. Lowercase or invalid-length source currencies.
7. Missing THB amount, rate, effective date, or source identity.
8. Contradictory evidence for source identity or currency.
9. A non-identity rate for a THB source bill.
10. A source-identity mismatch.
11. A duplicate conversion-evidence form.
12. Caller-only conversion fields without trusted port evidence.
13. Conversion facts changed before the evidence promise resolves.
14. Defensive output behavior after evidence mutation.
15. Stable replay for unchanged evidence.
16. Conflict for changed rate, effective date, THB amount, or rate source.

The cases use exact decimal strings. They do not encode a provider, rate rule,
rounding rule, or effective-date policy.

## Green boundary

Green work may begin after owner decisions define the rate source, rounding
policy, and effective-date policy.

Green must add the smallest internal port and implementation that satisfy this
strategy. It must preserve source facts and bind conversion evidence.

Green must add fresh correctness and security reviews. It must run the focused
THB suite, Finance baseline suites, typecheck, lint, and diff checks.

Green must not change database migrations, Marketing, Sales, APK, Codecamp, or
worker files.

## Acceptance falsifiers

- A number replaces a decimal string.
- A source amount or currency changes in the result.
- A THB bill uses a non-identity rate.
- A caller-only conversion value is accepted.
- A duplicate conversion-evidence form is accepted.
- A source-identity mismatch is accepted.
- A changed rate returns replay.
- A changed evidence date returns replay.
- A changed THB amount returns replay.
- A changed rate source returns replay.
- A provider import appears in the Finance operation.
