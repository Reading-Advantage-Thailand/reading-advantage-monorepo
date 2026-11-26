# THB Review B Red remediation

## Scope

- Track: `company_finance_operations_20260810`
- Phase: Phase 2 — controlled operational imports
- Role: `measure-mid-red`
- `phase_base_sha`: `8fa71b33b79a3090941f884f037564baa0322dbb`
- `role_base_sha`: `9d6b3af2608f0df7733197692a642905953c71f4`
- Task marker: `[~]` before and after this Red work

## Preflight

Both supplied commits resolve. The phase base is an ancestor of the role base.
The checkout is `master` with one worktree.

Existing dirty paths are unrelated user work. I preserved them and staged only
the leased Finance tests, plan, evidence note, and role log.

The requested `thb-review-b-eed2537d3.json` artifact was not present in the
checkout. The available Finance Review B artifacts and THB strategy supplied
the active contract.

No production source changed.

## Red remediation

The THB integration test adds an unknown request-key case. It requires input
rejection before any Company Identity attestor call or evidence-port call.

The architecture test adds valid TypeScript counterexamples for
`ImportEqualsDeclaration`, `globalThis.require`, property-loader aliases, and
equivalent runtime loader access through bracket and Reflect forms.

These cases fail at behavioral assertions. Vitest collects every file and
executes the existing fixtures before reporting the expected guard gaps.

## Verification

1. THB Red command:

   ```text
   CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts --pool=threads --maxWorkers=1
   ```

   Exit 1. The command collected 61 tests, passed 60, and reported 1
   behavior-level failure. The current implementation called the attestor
   once before rejecting the unknown request key.

2. Architecture Red command:

   ```text
   CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/architecture-boundary.test.ts --pool=threads --maxWorkers=1
   ```

   Exit 1. The command collected 11 tests, passed 10, and reported 1
   behavior-level failure. The current guard accepted all five new counterexamples.

3. Finance regression command:

   ```text
   CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/contracts.test.ts src/modules/finance-operations/__tests__/money-history.test.ts src/modules/finance-operations/__tests__/port-boundaries.test.ts src/modules/finance-operations/__tests__/postgres-boundary-exports.test.ts src/modules/finance-operations/__tests__/authorization-audit.test.ts --pool=threads --maxWorkers=1
   ```

   Exit 0. Five files passed with 25 tests.

4. TypeScript checks passed for production and test configurations.
5. Finance ESLint passed.
6. Prettier passed for the changed tests and plan.
7. The scoped `git diff --check` passed.

## Handoff

Jr Green must reject unknown request keys before attestor access. Green must
extend the architecture guard for all listed loader forms without widening
the approved static imports.

Green must preserve the THB owner-policy boundary. Green must not add a
provider, database read, migration, or policy decision.

No phase acceptance claim is made.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete
track: company_finance_operations_20260810
phase: Phase 2 — controlled operational imports
phase_base_sha: 8fa71b33b79a3090941f884f037564baa0322dbb
role_base_sha: 9d6b3af2608f0df7733197692a642905953c71f4
commits: this Red and evidence commit records the leased files
tests_run: THB exit 1 (61 collected, 60 passed, 1 behavior failure); architecture exit 1 (11 collected, 10 passed, 1 behavior failure); Finance regression exit 0 (25/25)
typecheck_result: exit 0; production and test checks passed
lint_result: exit 0; Finance module passed
prettier_result: exit 0; changed tests and plan passed
diff_result: exit 0; scoped diff check passed
files_changed: `packages/backend/src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts`; `packages/backend/src/modules/finance-operations/__tests__/architecture-boundary.test.ts`; `measure/tracks/company_finance_operations_20260810/plan.md`; `measure/tracks/company_finance_operations_20260810/phase2-thb-review-b-red-remediation-20260816.md`; `measure/tracks/company_finance_operations_20260810/orchestration/phase2-thb-review-b-mid-red-role.log`
plan_updates: recorded THB Review B Red guard gaps; the THB task remains [~]
known_failures: unknown request keys still permit one attestor call; the architecture guard still accepts all five new counterexamples
handoff: Jr Green must close the two behavioral guard gaps and rerun the THB, architecture, regression, TypeScript, lint, Prettier, and diff gates
END_MEASURE_AGENT_RESULT
