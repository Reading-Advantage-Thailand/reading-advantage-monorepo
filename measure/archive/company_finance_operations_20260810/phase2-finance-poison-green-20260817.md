# Finance Poison Evidence

## Scope

Source commit: `8b89be27f56b3fbf49ba5fdd224de3eccecd6f8d`.

Red commit: `b0b77862c7484135951b67d5eedebc8d512d92db`.

The source diff changes only `packages/backend/src/modules/company-identity/finance-thb-policy-approval.ts`.

The source diff adds 3 lines and removes 2 lines.

The candidate source commit preserves the Red test bytes from `b0b77862c7484135951b67d5eedebc8d512d92db`.

## Source behavior

- Lines 296-306 accept records with `Object.prototype` or a null prototype.
- Lines 374-384 enumerate every own key and reject symbol keys.
- Line 381 creates a null-prototype capture record.
- Line 383 copies each own string key into that record.
- This preserves an own `__proto__` key for strict schema rejection.
- The null-prototype destination blocks the `Object.prototype` setter.
- The attestor captures authority results at lines 954-961.
- The attestor captures ledger results at lines 1012-1019.
- The validator accepts valid null-prototype authority and ledger records.
- The validator returns stable errors and safe audit output for poison records.

Review B records a null-prototype allow probe and no prototype pollution.

The source change implements boundary capture only. It does not implement a policy decision.

## Primary precommit checks

Review A records these results against the source and Red blobs:

```text
CI=true ../../node_modules/.bin/vitest run src/modules/company-identity/__tests__/finance-thb-policy-approval-attestation.red.test.ts --pool=threads --maxWorkers=1
PASS — 1 file and 91 tests passed.

CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts --pool=threads --maxWorkers=1
PASS — 2 files and 65 tests passed.

../../node_modules/.bin/tsc --noEmit
PASS — backend production typecheck passed.

../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json
PASS — backend test typecheck passed.

../../node_modules/.bin/eslint src/modules/company-identity/finance-thb-policy-approval.ts src/modules/company-identity/__tests__/finance-thb-policy-approval-attestation.red.test.ts
PASS — focused Company Identity lint passed.

../../node_modules/.bin/prettier --check src/modules/company-identity/finance-thb-policy-approval.ts src/modules/company-identity/__tests__/finance-thb-policy-approval-attestation.red.test.ts
PASS — reviewed Company Identity files match Prettier.
```

Review B recorded this expanded check:

```text
CI=true ../../node_modules/.bin/vitest run src/modules/company-identity/__tests__/finance-thb-policy-approval-attestation.red.test.ts src/modules/company-identity/__tests__/protocol-safety.red.test.ts src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts src/modules/finance-operations/__tests__/thb-adversarial.test.ts --pool=threads --maxWorkers=1 --testTimeout=15000
PASS — 5 files and 198 tests passed.

CI=true ../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/architecture-boundary.test.ts --pool=threads --maxWorkers=1 --testTimeout=15000
PASS — 11 tests passed.

../../node_modules/.bin/tsc --noEmit -p tsconfig.json && ../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json
PASS — production and test typechecks passed.

git diff --check b0b77862c7484135951b67d5eedebc8d512d92db..8b89be27f56b3fbf49ba5fdd224de3eccecd6f8d -- packages/backend/src/modules/company-identity/finance-thb-policy-approval.ts
PASS — the exact candidate source diff has no whitespace errors.
```

The package wrapper attempted registry relinking and timed out with exit 124.
Direct local checks passed.

## Review verdicts

Review A artifact: `finance-poison-review-a-8b89be27.json`.

- Verdict: `PASS`.
- Findings: none.
- Final current-HEAD acceptance: withheld.
- Review A changed no production source.

Review B artifact: `finance-poison-review-b-8b89be27f.json`.

- Verdict: `PASS`.
- Blocking findings: none.
- Non-blocking findings: none.
- Completion claim: none.
- Review B changed no production source.

Current HEAD at evidence time: `c7a4d9bf8f6e59d2cac228ba929c53f2f3af58c2`.

The review artifacts audited source commit `8b89be27f56b3fbf49ba5fdd224de3eccecd6f8d`.

## Policy decision gates

The owner must select the rate source.

The owner must select the rounding policy.

The owner must select the effective date.

An owner must provide pilot data.

The owner must select tax policy.

The owner must select close policy.

Company Admin must authorize release.

This evidence makes no phase or track completion claim.

MEASURE_AGENT_RESULT
role: bounded responsible Green implementer
status: complete
track: company_finance_operations_20260810
phase: Phase 2 — controlled operational imports
commits: source=8b89be27f56b3fbf49ba5fdd224de3eccecd6f8d; red=b0b77862c7484135951b67d5eedebc8d512d92db
current_head_at_evidence: c7a4d9bf8f6e59d2cac228ba929c53f2f3af58c2
current_head_acceptance: withheld
tests_run: Review A 91 and 65 tests; Review B 198 tests and 11 architecture tests; direct typechecks passed; lint and Prettier passed
files_changed: measure/tracks/company_finance_operations_20260810/phase2-finance-poison-green-20260817.md
plan_updates: none
known_failures: The package wrapper timed out with exit 124 during registry relinking; direct local checks passed.
handoff: Review evidence is recorded. Policy decision gates remain with the owner. This evidence makes no phase or track completion claim.
END_MEASURE_AGENT_RESULT
