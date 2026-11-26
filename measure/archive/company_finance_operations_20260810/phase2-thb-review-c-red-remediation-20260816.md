# THB Review C Red remediation

## Scope

- Track: `company_finance_operations_20260810`
- Phase: Phase 2 — controlled operational imports
- Role: `measure-mid-red`
- `phase_base_sha`: `8fa71b33b79a3090941f884f037564baa0322dbb`
- `role_base_sha`: `b4683613dd05c241fc525e886b75e1ff363cb9f3`
- Task marker: `[x]` for implementation; acceptance remediation remains Red

## Preflight

Both supplied commits resolve. The phase base is an ancestor of the role base.
The checkout is `master` with one worktree.

Review C artifact `thb-review-c-cac10174c.json` reports THB-C-001,
THB-C-002, and THB-C-003. Its Finance-path findings apply at the requested
role base.

Existing dirty paths are unrelated user work. I preserved them and leased only
the THB Red tests, Finance plan and strategy, and Red evidence and log files.

No production source changed.

## Red remediation

The integration test adds a complete validated public Company Identity receipt.
Finance must accept it without a second authority verification.

The tests add own `__proto__` keys to request, evidence, and replay operands.
Requests must fail before attestor and evidence access. Evidence must fail
strict validation. Replay must return conflict.

The existing ordinary unknown-key tests remain unchanged.

## Strategy reconciliation

The strategy now records the THB implementation as complete. It records active
acceptance remediation separately. Owner rate-source, rounding, and
effective-date decisions remain deferred.

## Verification

1. THB Red command:

   ```text
   CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts --pool=threads --maxWorkers=1
   ```

   Exit 1. The command collected 65 tests, passed 61, and reported 4
   behavior-level failures. The failures cover public receipt compatibility,
   request capture, evidence capture, and replay capture.

2. Architecture command:

   ```text
   CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/architecture-boundary.test.ts --pool=threads --maxWorkers=1
   ```

   Exit 0. Eleven tests passed.

3. Finance regression command:

   ```text
   CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/contracts.test.ts src/modules/finance-operations/__tests__/money-history.test.ts src/modules/finance-operations/__tests__/port-boundaries.test.ts src/modules/finance-operations/__tests__/postgres-boundary-exports.test.ts src/modules/finance-operations/__tests__/authorization-audit.test.ts --pool=threads --maxWorkers=1
   ```

   Exit 0. Five files passed with 25 tests.

4. Production and test TypeScript checks passed.
5. Finance ESLint passed.
6. Prettier passed for the changed tests, plan, strategy, and evidence note.
7. The scoped `git diff --check` passed.

## Handoff

Jr Green must accept the complete public Company Identity receipt without
duplicating authority verification. Green must preserve the attestor boundary.

Green must preserve strict unknown-key behavior for ordinary and own
`__proto__` keys. Green must keep owner policy decisions deferred.

No phase acceptance claim is made.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete
track: company_finance_operations_20260810
phase: Phase 2 — controlled operational imports
phase_base_sha: 8fa71b33b79a3090941f884f037564baa0322dbb
role_base_sha: b4683613dd05c241fc525e886b75e1ff363cb9f3
commits: this Red and evidence commit records the leased files
tests_run: THB exit 1 (65 collected, 61 passed, 4 behavior failures); architecture exit 0 (11/11); Finance regression exit 0 (25/25)
typecheck_result: exit 0; production and test checks passed
lint_result: exit 0; Finance module passed
prettier_result: exit 0; changed tests, plan, strategy, and evidence note passed
diff_result: exit 0; scoped diff check passed
files_changed: `packages/backend/src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts`; `packages/backend/src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts`; `measure/tracks/company_finance_operations_20260810/plan.md`; `measure/tracks/company_finance_operations_20260810/test-strategy-phase2-thb.md`; `measure/tracks/company_finance_operations_20260810/phase2-thb-review-c-red-remediation-20260816.md`; `measure/tracks/company_finance_operations_20260810/orchestration/phase2-thb-review-c-mid-red-role.log`
plan_updates: recorded THB-C-001, THB-C-002, and THB-C-003 remediation; implementation remains [x] and owner policies remain deferred
known_failures: public receipt compatibility and own `__proto__` capture gaps remain intentionally Red
handoff: Jr Green must close the public receipt and `__proto__` gaps, then rerun all listed gates
END_MEASURE_AGENT_RESULT
