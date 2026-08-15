# THB replay Red remediation

## Scope

- Track: `company_finance_operations_20260810`
- Phase: Phase 2 — controlled operational imports
- Role: `measure-mid-red`
- `phase_base_sha`: `8fa71b33b79a3090941f884f037564baa0322dbb`
- `role_base_sha`: `58f82e936dc95796ded9158492e98999f487fe1d`
- Task marker: `[~]` before and after this Red work.

## Preflight

Both supplied commits resolve. The phase base is the phase scope baseline. The
role base was HEAD when this role started. The checkout is `master` with one
worktree.

The relevant dirty paths were the THB Red test and Finance plan. Generated or
ignorable paths were `.opencode/goals/**`, Codecamp reports and test results,
and `apps/advantage-games/test-results/`. Durable-job and Mastery Runtime
paths were unrelated user work. All other lanes remained untouched.

## Red remediation

Valid replay fixtures now include the required company-first `scope`. The
amended test adds thirteen adversarial replay cases. They cover empty,
incomplete, malformed, unknown-key, company-scope, school-scope, getter,
Proxy, and post-call mutation inputs.

The test keeps the existing trusted replay contract. It requires `conflict`
with `conversion-evidence-mismatch` for invalid or changed replay operands.
It does not choose a rate source, rounding policy, or Thai accounting policy.

## Verification

The exact focused Red command ran from `packages/backend`:

```text
../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts --pool=threads --maxWorkers=1
```

It exited 1 after collecting 60 tests. It reported 47 passes and 13 expected
failures. The existing 25 multi-currency cases and 22 integration cases
passed. The new failures show replay where conflict is required, or show
getter and Proxy access.

Finance lint and the THB Prettier check exited 0. The backend test typecheck
has two unrelated errors in `postgres16-enqueue-retry-replay.red.test.ts`
at lines 900 and 947. Both report `Expected 5 arguments, but got 1`.

## Handoff

Green must harden replay classification with strict operand validation and
defensive snapshot behavior. Green must preserve the company-first scope and
the existing trusted evidence contract. Owner decisions remain required
before Green valuation policy work.

No production, migration, provider, policy, or integration test file changed.
No phase acceptance claim is made.
