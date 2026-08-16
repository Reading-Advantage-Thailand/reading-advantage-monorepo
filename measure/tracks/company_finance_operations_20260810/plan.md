# Implementation plan

## Phase 1 — policy-neutral foundation

- [x] Task: Define bounded contracts, internal ports, and schema for the operational records/evidence in `spec.md`; write Red tests for exact money/currency, idempotency, immutable history, authorization, audit, provenance, and cross-database/provider isolation. Accepted with evidence in `phase1-foundation-acceptance-20260810.md` in commit `3b3a128ea381f8fff0c6e1136894fd39228eaff9`.
- [x] Task: Implement the minimum domain/backend contracts and persistence behind the Red tests. Accepted with evidence in `phase1-persistence-acceptance-20260811.md` in commit `c5ecf18b0830c8702602f9f5f33415c7b3e92d66`.
- [x] Task: Add behavior-level contract tests and adapters for the Company Identity attestor, authorized private-evidence reads, and scope/digest-bound durable outbox projector required by the historical private-evidence MVP. Source commit `48470311d4f6b06b7e9ebcce7ba1f380444f0a79` (with Git note evidence).

  Final Task 3 acceptance evidence (2026-08-13):

  - Accepted sorted 32-path manifest: `a078f65cdea002b7ff0b1284c75314d44151877b80e172fe1ca1e914202d7875`.
  - Review A: ACCEPT, bound to manifest `a078f65c`.
  - Security Review B: ACCEPT, bound to manifest `a078f65c`.
  - Focused bind/digest suites: 2 files, 115/115 tests. Backend: 24 files, 318/318 tests. Storage: 8 files, 74/74 tests. DB: 3 files, 31/31 tests.
  - Backend, Storage, and DB typechecks, targeted lint, and `git diff --check` passed.
  - PostgreSQL 16 `migration-upgrade.integration` passed 1/1. Backend live suites passed 4 files, 4/4 tests, using a disposable least-privilege database; cleanup verification found 0 remaining temporary databases and 0 remaining temporary roles.
  - Historical `0002` SQL and snapshot remain byte-immutable with exact SHA-256 hashes `f0535ed5dd6eab2d74818cc0fca6fa964338f5d3fe3bd0ed392810b09a0d913a` and `567a39b4adad21847a64d020e2fb8c64bd33b5407cd29c2bd68430588aa10e14`. The additive/journaled `0003_finance_attestation_audit_metadata` migration and `meta/0003_snapshot.json` carry the exact doctor sentinel, which was validated.
  - The Phase 2 aggregate stayed intentionally Red and was excluded from Task 3 acceptance. No Phase 1 checkpoint is recorded because the CRM/Tutor source-owner task remains blocked.

  Maintenance evidence (2026-08-13; post-acceptance, no status change):

  - Maintenance source commit `da3ce21916a170ea9029efe1c449ea39395a36ba` contains the exact 3-path portable audit-boundary repair; its canonical committed-content aggregate is `90a9e3251d83f2f67b2f407b50e2b63e6dfc814198aac48be94cd18be1c38854`. Final correctness Review A and Security Review B are both ACCEPT, bound to these stable hashes; the loader/shadow matrix passed 40/40.
  - Maintenance evidence passed Backend 127 tests with 1 live-PostgreSQL environment skip, DB 31/31, Storage 48/48, and the architecture guard 7/7. Production typechecks, exact strict typecheck, targeted lint, Prettier, `git diff --check`, and metadata/repository parity passed.
  - Immutable `0002` hashes and additive/journaled `0003_finance_attestation_audit_metadata` linkage are unchanged; no migration changed.
  - Finance maintenance removed the exact 3 architecture additions attributable to original Task 3. The current separate checker remains globally Red: `files=4247`, `findings=697`, `parseErrors=0`, additions 137, removals 0, renames 21. No global architecture or doctor Green claim is made.
  - Shared graph/generated refresh commit `390448dd2` is post-maintenance freshness evidence: 71-path hash `40df25b062d742ccb715e301b4a2914a079473575e504733de7dae7d70a2fb0d` and Finance subset hash `29ff5a83a30df7917e088b2257eed22f3fd6d64692c2efd14a0fe18da5150dc6`. The whole-graph audit timed out/was terminated with exit 130, and `measure/doctor.sh` remains Red on 80 deprecated `[ ]` markers across nine unrelated plans; this is not structural Green evidence.
  - Task 3 remains `[x]`. CRM/Tutor and Phase 2/3 blockers are unchanged, and no phase checkpoint is recorded.

- [b] Task: Add live CRM and Tutor owner contracts after their source owners accept the source-native contracts. — deferred:crm-tutor-source-owners

## Phase 2 — controlled operational imports

- [x] Task: Implement controlled imports through owner-attested historical private-evidence packets. Source commit `1d0ffd568`.

  Final Task 1 evidence (2026-08-14):

  - Initial Review A passed at `be84ff474`. Its receipt is `phase2-review-a-correctness-result.json`.
  - Initial Review B failed at `be84ff474`. Its receipt is `phase2-review-b-security-result.json`.
  - Review B v2 failed at `1129427`. Its receipt is `phase2-review-b-security-result-v2.json`.
  - Commit `0b29d8bf3` preserves these superseded receipts and their role logs.
  - Final Review A v2 and Review B v2 passed against manifest `0d16c57d`.
  - Commit `1d0ffd568` contains the reviewed source and test bytes.
  - The final artifacts record 304 Finance tests and 170 focused tests passed.
  - They record 20 Company Identity tests and 25 private-storage tests passed.
  - The recorded type, build, lint, format, diff, and graph checks passed.

- [x] Task: Add exact THB valuations for bills in each source currency. Preserve every source amount and currency. Source commits `4c329d91066e809d2cef0b453a0e752b043b1d6a` and `0e85b4d7e4915d3df62c3f78280debca05fee3ea`.

  The verified packet must bind the THB amount, rate, effective date, and rate source.
  The owner or accountant must select the rate source and rounding policy.

  Current Red scope (2026-08-14):

  - Start with Red tests for non-THB bills, THB bills, and multiple currencies.
  - Preserve every exact original amount and its source currency.
  - Add a separate exact THB-equivalent field for each accepted bill.
  - Bind the THB value and conversion evidence to the verified packet.
  - Reject missing, duplicate, contradictory, or caller-only conversion data.
  - Use decimal arithmetic and an explicit rounding policy.
  - Keep rate-provider access behind an internal port if a provider is required.
  - Run fresh correctness and security reviews against the final implementation.

  Red strategy: `test-strategy-phase2-thb.md`. Red command:
  `../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts --pool=threads --maxWorkers=1` from `packages/backend`. Initial Red failures must name only missing THB contract or implementation exports.

  Handoff: `phase2-multi-currency-thb-handoff-20260814.md`. The completed trust-binding source commit is `1d0ffd568`.

  Attestor evidence (2026-08-14):

  - Red commit `273ef311f` defined authority, ledger, audit, digest, replay, proxy, signer, and mutation controls.
  - Green commit `08acca162` passed the 83-case THB suite.
  - Company Identity passed 20/20. The database allowlist passed 4/4. The security batch passed 11/11.
  - Correctness Review A and Security Review B accepted manifest `86663871501a8fd3ff492244c933b5015c90e0703433ac9886a98602e0018d2c`.
  - This evidence completes only the policy-approval attestor boundary.
  - Rate-source selection, rounding policy, and exact THB valuation remain owner-gated.

  Finance Red alignment evidence (2026-08-15): the two-file Red command now
  runs the accepted Company Identity attestor boundary before future valuation
  evidence access. It uses only the attestor-returned decision identity and
  content digest. It keeps rate, effective-date, and rounding identifiers
  opaque.

  - The bounded Finance command ran 47 tests and produced 47 intentional Red failures: 25 multi-currency cases and 22 attestor-integration cases.
  - Every failure names only `financeThbConversionEvidenceSchema`, `createFinanceThbValuationPreparer`, or `classifyFinanceThbValuationReplay`.
  - The Company Identity attestor command remained Green at 83/83 tests.
  - The backend test typecheck, targeted Finance lint, Prettier check, and scoped diff check passed.
  - No production, provider, database, or migration file changed. The THB task remains `[~]`; owner decisions remain required before Green valuation work.

  Green implementation evidence (2026-08-15):

  - Commit `4c329d91066e809d2cef0b453a0e752b043b1d6a` adds the provider-neutral Finance THB valuation preparer and public barrel export.
  - The canonical two-file THB command passed 47/47 tests. The Company Identity attestor command passed 83/83 tests.
  - Focused Finance regression tests passed 23/23. Backend typecheck, focused lint, Prettier, scoped diff check, and backend build passed.
  - `measure/doctor.sh` remains red only for deprecated `[ ]` markers in unrelated active plans. No phase acceptance is claimed.

- [b] Task: Pilot one reconciled month and one billing packet through owner-attested private-evidence packets. — deferred:finance-owner-data

  The pilot must prove authorization, audit, rollback, replay, and conflict behavior.
  An authorized owner must supply the pilot month and packet.

  Historical Red chronology (2026-08-12): the Phase 2 aggregate remained intentionally Red because `controlled-imports.ts` and the historical import operations do not exist. Its compiler AST fixture, source-owner guard, and missing-source boundary guard passed; the remaining expected failures were excluded from Phase 1 Task 3 acceptance.

  Phase 2 admission (2026-08-13): the Red contract was re-verified against `13565ae7`. 20 behavior tests fail because the six required `ControlledImportsModule` exports do not exist; 4 guard tests pass (AST fixtures and deferred-source checks). The Phase 1 baseline (98 tests across 6 finance-operations files, 20 company-identity tests, 25 storage tests) is green. No real external blocker exists for Task 1. The `phase_base_sha` is captured at the post-strategy repair commit per `test-strategy-phase2.md`.

  Mid-Red evidence (2026-08-13; phase base `7ef48d2d2929c67dfd70c899a4710b77808637b9`): the two source guards now skip only when `controlled-imports.ts` is absent and inspect the real source when it exists. The Red test retains all six required exports, envelope lookalike rejection, forbidden policy fields, source-isolation AST fixtures, replay/conflict, immutable correction, durable identity, atomic acceptance/rollback, and historical pilot boundaries. It adds falsifiers for the forbidden `tax-invoice` status, invalid pilot packet versions, retained correction scope, and the full provider/database/runtime boundary matrix.

  - Canonical Red command: `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts` — exit 1; collection succeeded; 24 tests ran; 20 failed and 4 passed.
  - Expected behavior failures: `prepareControlledImportBatch` was undefined in 8 tests; `runHistoricalPrivateEvidencePilot` was undefined in 1; `classifyControlledImportBatchReplay` was undefined in 1; `prepareControlledImportCorrection` was undefined in 1; `createControlledImportJobIdentity` was undefined in 1; `acceptControlledImportBatch` was undefined in 8 tests, including 3 parameterized rollback cases.
  - Passing guards: the provider/database/runtime/raw-SQL AST matrix, the absent-source deferred-owner guard, the synthetic deferred-owner marker matrix, and the absent-source compiler-boundary guard.
  - Phase 1 focused baseline: backend 134/134 tests across 11 files, Company Identity 20/20 tests across 2 files, and Storage 25/25 tests across 1 file.
  - The backend typecheck and focused lint commands were not used as Mid-Red gates. A later attempt started a workspace install and timed out on unavailable registry downloads; no role-owned test failure came from that attempt.

  Mid-Red remediation evidence (2026-08-13; phase base `7ef48d2d2929c67dfd70c899a4710b77808637b9`; role base `042dd8887f986d08d8f5c71ddfe752dd91b0e2c3`): the Phase 1 architecture contract now lists `controlled-imports.ts` as a reviewed foundation source and scans it when the Green implementation creates it. The contract retains the provider, database, filesystem, network, process, dynamic-loading, cross-package, and source-owner guards. The Red behavior contract remains unchanged and remains genuinely Red because the six required exports do not exist.

  - Architecture boundary remediation test: `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/architecture-boundary.test.ts` — exit 0; 8/8 tests passed.
  - Canonical Red command: `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts` — exit 1; collection succeeded; 24 tests ran; 20 expected behavior tests failed and 4 source guards passed.
  - The architecture test passes at the phase base because the production module is absent and the admission assertion checks only the reviewed allowlist. It does not provide Phase 2 implementation evidence.
  - No production source changed. Task 1 remains `[~]`; the pilot task remains `[b]` with `deferred:phase2`.

  Mid-Red Review B remediation evidence (2026-08-13; phase base `7ef48d2d2929c67dfd70c899a4710b77808637b9`; role base `be84ff474fa872dd0eab0b64038869e67e2c1e34`): the new `controlled-imports-phase2-review-b.red.test.ts` suite is a separate security-remediation Red gate. It uses the accepted Phase 1 Company Identity and private-evidence command boundaries as injected fakes. It does not use live CRM or Tutor adapters.

  - Review B Red command: `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2-review-b.red.test.ts --pool=threads --maxWorkers=1` — exit 1; collection succeeded; 26 tests ran and 26 failed.
  - Expected behavior failures: 4 accepted-envelope trust and company/school binding tests did not reject caller-controlled evidence; 3 malformed authorization-result cases returned `accepted`; 2 caller-built or mutated plan cases reached the repository and returned `accepted`; 10 document and nested-fact grammar cases accepted unreviewed fields; 1 unknown document kind, 1 unknown nested-key case, and 1 payroll/source-tax key case were accepted; 2 ambiguity-group counterexamples returned the wrong status; 1 duplicate payroll voucher identity was accepted; and 1 blocked-pilot case returned `accepted`.
  - The existing Phase 2 behavior suite remains a separate implementation baseline: `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts --pool=threads --maxWorkers=1` — exit 0; 24/24 tests passed. This result does not clear the Review B security gate.
  - Phase 1 regression baselines: Finance Operations 11 files and 135/135 tests passed; Company Identity 2 files and 20/20 tests passed; Storage 1 file and 25/25 tests passed. All commands used `--pool=threads --maxWorkers=1`.
  - No test in the new Review B suite passed at the role base. The failures are behavior-level mismatches, not collection or fixture failures. Task 1 remains `[~]`; the pilot task remains `[b]` with `deferred:phase2`.

  Mid-Red pilot contract correction (2026-08-13; phase base `7ef48d2d2929c67dfd70c899a4710b77808637b9`; role base `2d7f6c8e9fc2ae4a2cf6de287c6c915070f1c02a`): the old Phase 2 pilot assertion required `accepted`, `replay`, or `conflict`, which contradicted the blocked Task 2 pilot and Review B. The test-owned contract now permits an absent public pilot helper. If the helper exists, it must return only `not-admitted` or `blocked`, the exact packet version, and zero live adapters. Invalid packet versions remain rejected. The 26 Review B tests remain unchanged. Task 1 remains `[~]`; Task 2 remains `[b]` with `deferred:phase2`.

  - Corrected Phase 2 Red command: `../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts --pool=threads --maxWorkers=1` from `packages/backend` — exit 1; 24 tests ran; 23 passed and 1 failed. The only failure is the current production pilot result returning `accepted`.
  - Review B Red command: `../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2-review-b.red.test.ts --pool=threads --maxWorkers=1` from `packages/backend` — exit 1; 26 tests ran; 0 passed and 26 failed. The pilot assertion now uses the blocked contract and still fails because production returns `accepted`; the remaining Review B security findings also remain Red.
  - Phase 1 Finance Operations baseline: 11 files and 135/135 tests passed with the local Vitest binary and `--pool=threads --maxWorkers=1`.
  - The blocked Green role log now has a valid `MEASURE_AGENT_RESULT` block with role, status, track, phase, commits, tests, files, plan updates, known failures, handoff, and end marker. No production source changed.

  Mid-Red trusted-preparation fixture correction (2026-08-13; phase base `7ef48d2d2929c67dfd70c899a4710b77808637b9`; role base `8761194cb8e80eb26c58bd88cbcf75c3160e9fb1`): every accepted normalization fixture now obtains a genuine preparation from the real Phase 1 `createHistoricalPrivateEvidenceImportCommand` with injected Company Identity and private-evidence binding fakes. The helper verifies both boundary calls and the returned packet/evidence bindings. Remaining direct `normalizationInput(...)` uses are intentional rejection fixtures for lookalikes, raw payloads, and envelope or evidence mismatches. The Review B caller-fabrication test remains unchanged and remains a separate security Red gate.

  - Phase 2 Red command: `../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts --pool=threads --maxWorkers=1` from `packages/backend` — exit 1; collection succeeded; 24 tests ran, 23 passed, and 1 failed. The only failure is the expected blocked-pilot assertion because the current production helper returns `accepted`.
  - Review B Red command: `../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2-review-b.red.test.ts --pool=threads --maxWorkers=1` from `packages/backend` — exit 1; collection succeeded; 26 tests ran, 0 passed, and 26 failed. Failures remain behavior-level trusted-preparation, grammar, authorization, ambiguity, duplicate-identity, and blocked-pilot findings.
  - No production source changed. Task 1 remains `[~]`; Task 2 remains `[b]` with `deferred:phase2`.

  Mid-Red receipt recheck (2026-08-13; phase base `7ef48d2d2929c67dfd70c899a4710b77808637b9`; role base `22b4959dedb0462a7e0a0ffb912cec3d2a59125c`):

  - Review B Red command: `../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/controlled-imports-phase2-review-b.red.test.ts --pool=threads --maxWorkers=1` from `packages/backend` — exit 1; collection succeeded; 33 tests ran, 26 passed, and 7 failed.
  - The seven remaining failures are trusted packet fact binding, preparation-symbol forgery, frozen caller-built plans, unknown repository fields, malformed repository status, sanitized authorization-failure audit, and the bounded decimal limit.
  - `git diff --check -- packages/backend/src/modules/finance-operations/__tests__/controlled-imports-phase2-review-b.red.test.ts packages/backend/src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts measure/tracks/company_finance_operations_20260810/plan.md` — exit 0.
  - Task 1 remains `[~]`; Task 2 remains `[b]` with `deferred:phase2`; no production source changed.

  THB Red remediation evidence (2026-08-15; phase base `8fa71b33b79a3090941f884f037564baa0322dbb`; role base `58f82e936dc95796ded9158492e98999f487fe1d`):

  - The valid replay fixtures now include the required company-first `scope`.
  - New replay cases require complete strict operands and conflict on empty,
    incomplete, malformed, unknown-key, company-scope, school-scope, getter,
    Proxy, and post-call mutation inputs.
  - The focused THB command exited 1 after collecting 60 tests. It reported 47
    passes and 13 intentional new replay failures. The existing 25 multi-currency
    preparer/replay cases and 22 integration cases passed. Each new failure shows
    the current classifier returning `replay` where `conflict` is required, or
    reading a getter or Proxy envelope.
  - Backend test typecheck exited 2 on unchanged `src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts` lines 900 and 947 (`Expected 5 arguments, but got 1`). The targeted Finance lint, Prettier check, and scoped diff check exited 0.
  - No production, migration, provider, policy, or integration test file changed.
  - The THB task remains `[~]` pending the owner-gated Green implementation.
  - The role note is `phase2-thb-replay-red-remediation-20260815.md`; the role log is `orchestration/phase2-thb-replay-mid-red-role.log`.

  Green replay remediation evidence (2026-08-15):

  - Commit `0e85b4d7e4915d3df62c3f78280debca05fee3ea` validates complete replay operands before comparison.
  - The focused THB command passed 60/60 tests.
  - The focused Finance regression command passed 23/23 tests.
  - Production and test typechecks, targeted lint, Prettier, diff, and build commands passed.
  - `measure/doctor.sh` remains red on unrelated deprecated `[ ]` markers.

  Architecture boundary Green correction evidence (2026-08-16; phase base `8fa71b33b79a3090941f884f037564baa0322dbb`; role base `399864a3087287b8435d2b697211245c9cd15085`):

  - Source commit `adf96232f` admits the reviewed `thb-valuation.ts` module.
  - The contract allows only `zod.z` and `node:util.types` from external modules.
  - Unapproved utility bindings, namespaces, and `node:fs` remain rejected by counterexamples.
  - The architecture command passed 9/9 tests.
  - The 60-case THB command passed 60/60 tests.
  - The focused Finance regression passed 25/25 tests across 5 files.
  - Production and test TypeScript checks, Finance lint, Prettier, and `git diff --check` passed.
  - The package `check-types` wrapper was interrupted during an unavailable registry relink; direct local compiler checks passed.
  - The correction note is `phase2-thb-architecture-boundary-green-20260816.md`; the role log is `orchestration/phase2-thb-architecture-boundary-jr-green-role.log`.
  - The remediation note is `phase2-thb-replay-green-remediation-20260815.md`; the role log is `orchestration/phase2-thb-replay-jr-green-role.log`.

  Architecture boundary Review A remediation evidence (2026-08-16; source commit `22b99787f`; phase base `8fa71b33b79a3090941f884f037564baa0322dbb`; role base `63da03a0e27e0c696df44f2a0285973b269d1cfd`):

  - Dynamic imports now fail closed, including approved `node:util` and `zod` modules.
  - Approved external named exports use the exact binding allowlist.
  - Export-all and namespace exports from approved modules now fail closed.
  - The static `node:util.types` and `zod.z` imports remain admitted.
  - The architecture command passed 10/10 tests.
  - The 60-case THB command passed 60/60 tests.
  - The focused Finance regression passed 25/25 tests across 5 files.
  - Production and test TypeScript checks, Finance lint, Prettier, and scoped diff checks passed.
  - An initial test typecheck found one new optional-module-specifier error; the final typechecks passed after narrowing.
  - The remediation note is `phase2-thb-architecture-review-a-remediation-20260816.md`; the role log is `orchestration/phase2-thb-architecture-review-a-jr-green-role.log`.

  THB Review B Red remediation evidence (2026-08-16; phase base `8fa71b33b79a3090941f884f037564baa0322dbb`; role base `9d6b3af2608f0df7733197692a642905953c71f4`):

  - The THB integration Red test now requires zero attestor calls for an unknown request key.
  - The architecture Red test now rejects ImportEqualsDeclaration and property-based runtime loader aliases.
  - The loader cases include `globalThis.require`, bracket access, Reflect access, and equivalent aliases.
  - The THB command collected 61 tests. It passed 60 tests and failed 1 expected behavior assertion.
  - The failure showed one attestor call before unknown-key rejection. Collection and fixtures succeeded.
  - The architecture command collected 11 tests. It passed 10 tests and failed 1 expected behavior assertion.
  - The failure showed that the current guard accepts all five new loader counterexamples.
  - The Finance regression command passed 25 tests across 5 files.
  - Production and test TypeScript checks, Finance lint, Prettier, and the scoped diff check passed.
  - No production, provider, database, migration, configuration, registry, metadata, or generated file changed.
  - The requested `thb-review-b-eed2537d3.json` artifact was not present in the checkout.
  - The Red evidence note is `phase2-thb-review-b-red-remediation-20260816.md`; the role log is `orchestration/phase2-thb-review-b-mid-red-role.log`.

  THB Review B Green remediation evidence (2026-08-16; source commit `17fde3ac8`; phase base `8fa71b33b79a3090941f884f037564baa0322dbb`; role base `1d34c826bbc361e1b437529b84ffc9a8249f4bd1`):

  - The strict request schema rejects unreviewed keys before attestor or evidence calls.
  - Caller-only conversion fields remain rejected after attestor access.
  - ImportEqualsDeclaration, globalThis property loaders, bracket loaders, Reflect loaders, and aliases fail closed.
  - The committed Red counterexamples and expectations remain unchanged.
  - The THB command passed 61/61 tests.
  - The architecture command passed 11/11 tests.
  - The focused Finance regression passed 25/25 tests across 5 files.
  - Production and test TypeScript checks, Finance lint, Prettier, and scoped diff checks passed.
  - The Green evidence note is `phase2-thb-review-b-green-remediation-20260816.md`; the role log is `orchestration/phase2-thb-review-b-jr-green-role.log`.

## Phase 3 — close and accountant exchange

- [b] Task: Implement close controls and accountant packs after the required written policy decisions and pilot acceptance. — deferred:accountant-owner-decisions
- [b] Task: Release Finance Operations after Company Admin access and all integration reviews pass. — deferred:company-admin-owner
