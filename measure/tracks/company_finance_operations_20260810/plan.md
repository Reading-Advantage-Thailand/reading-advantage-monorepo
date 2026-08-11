# Implementation plan

## Phase 1 — policy-neutral foundation

- [x] Task: Define bounded contracts, internal ports, and schema for the operational (commit `3b3a128ea381f8fff0c6e1136894fd39228eaff9`)
  records/evidence in `spec.md`; write Red tests for exact money/currency,
  idempotency, immutable history, authorization, audit, provenance, and
  cross-database/provider isolation. This is the only executable task in this
  scaffold; do not encode Thai policy. Accepted with evidence in
   `phase1-foundation-acceptance-20260810.md` in commit
   `3b3a128ea381f8fff0c6e1136894fd39228eaff9`.
- [x] Task: Implement the minimum domain/backend contracts and persistence behind the (commit `c5ecf18b0830c8702602f9f5f33415c7b3e92d66`)
  Red tests. Depends on the foundation contracts and failing-test assertions
  from the preceding task. Accepted with evidence in
   `phase1-persistence-acceptance-20260811.md` in commit
   `c5ecf18b0830c8702602f9f5f33415c7b3e92d66`.
- [~] Task: Add behavior-level contract tests and adapters for the Company (commit `98d111bdf1c4eea2d2b6980d884ad97250f03cb2`)
  Identity attestor, authorized private-evidence reads, and a scope/digest-bound
  durable outbox projector required by the historical private-evidence MVP.
  Depends on the completed foundation task and the accepted boundary in
  `historical-private-evidence-mvp-decision-20260811.md`.

  Green implementation evidence:
  `98d111bdf1c4eea2d2b6980d884ad97250f03cb2` adds the Company Identity Finance
  attestor and commits the reviewed private-read, packet, and durable-projector
  boundaries. The A targeted command passed with 7 tests. B passed with 25
  tests, C with 9 tests, D with 39 tests, and the protocol safety suite with
  13 tests. The live PostgreSQL suites skipped because no disposable URL was
  set, as `test-strategy.md` permits. The Phase 2 aggregate remains
  intentionally Red. Backend package typecheck failures are in unrelated
  Standard Pack and Planned Game Intake tests. Doctor marker failures are in
  unrelated active tracks. This evidence does not claim package-wide typecheck
  or doctor success.

  Test strategy applicability: the canonical Red/Green/closeout gates, risk
  classes, anti-pattern coverage, intentionally-red aggregate handling
  (`controlled-imports-phase2.red.test.ts` must stay red), source-isolation
  gates, and review applicability for this task are defined in
  `test-strategy.md`. The Task 3 `phase_base_sha` is captured at the
  strategy commit, not at the persistence checkpoint `c5ecf18b`.

   Mid Red evidence (2026-08-11): the phase scope uses
   `phase_base_sha=c93f3a84fcd72c3559e81fdbe7c9ac761d993f35`. The dispatch role
   base is `role_base_sha=745236b4f8239571b4633f7aaadf302faad93d10`. The A
   attestor command exits 1 because the public Company Identity barrel lacks
   `createFinanceCompanyIdentityAttestor`; seven assertions fail at that
   missing export. This is an implementation Red, not an environment Red.

   The B, C, and D commands exit 0 on the dirty candidate production tree with
   25/25, 9/9, and 39/39 tests passing. These are candidate-green boundaries,
   not accepted Green evidence. The protocol-safety command exits 0 with
   13/13 tests passing. The two live PostgreSQL tests exit 0 with two tests
   skipped because `COMPANY_IDENTITY_PG_TEST_URL` and
   `COMPANY_IDENTITY_INTEGRATION_DATABASE_URL` are unset. The metadata allowlist
   command exits 0 with 2/2 tests passing. The source-isolation guards exit 0
   with 6/6 tests passing. The Phase 2 aggregate remains intentionally Red and
   is not part of this task's Green gate.

   The Red commit owns only the focused A-E test files and this plan. Candidate
   production, Accounts, migration, metadata, package, lockfile, decision,
   specification, Mastery, and `.opencode` changes remain unstaged.

   Adversarial evidence (2026-08-11): the Measure adversarial-testing
   subagent added two narrowly-scoped test files that close gaps in the
   A, B, C, and D red contracts without touching the dirty production
   tree. `packages/backend/src/modules/company-identity/__tests__/finance-task3-adversarial.test.ts`
   adds 19 behavior-level tests: A-boundary `authentication-failed`
   secret-safe audit (1), audit-call-count and deep immutability (1),
   empty `appRoleIds` role-not-accepted denial (1), C-boundary non-UUID
   jobId rejection (1), corrupt stored-receipt rejection (1), idempotency
   key version-tag + length-prefix invariant (1), result and receipt
   deep-freeze (1), D-boundary extra envelope fields rejected
   (`authorization`, `evidence`, `binding`, `result`, `packetDigest` —
   5 parameterized cases), result-envelope deep-freeze (1), packet
   unchanged-by-value (1), fact-array boundary
   (0/1/128/129) (1), and attestor `evidence` strictObject validation
   with empty `appRoleIds` (1). `packages/storage/src/__tests__/finance-task3-adversarial.test.ts`
   adds 10 behavior-level tests: maxBytes-1 acceptance (1),
   maxBytes+1 rejection and no-digest (1), empty payload acceptance
   (1), driver-throw propagation (1), byte-copy isolation (1),
   AbortSignal forwarding (1), signal-aborted driver throw (1),
   provider-metadata stripping (1), `deny` authorize decision (1),
   content-type passthrough (1). Both live PostgreSQL
   `postgres-login-atomic.integration.test.ts` and
   `postgres-exchange.integration.test.ts` pass on a disposable
   `postgresql://cid_mig_a1b2c3d4:test@127.0.0.1:5432/company_identity_test_20260811_a1b2c3d4e5f60718`
   database (no shared/product DBs touched). The Phase 2 aggregate
   `controlled-imports-phase2.red.test.ts` remains intentionally red
   (20/21 tests still fail; the single passing test is the AST boundary
   walker). Architecture boundary, port boundary, and metadata allowlist
   tests remain green. No production, Accounts, Mastery, DB migration,
   storage driver, package.json, or lockfile was edited.

    Review B remediation Mid Red evidence (2026-08-11): Task 3 returned to
    `[~]` before work. The immutable phase scope is
    `phase_base_sha=c93f3a84fcd72c3559e81fdbe7c9ac761d993f35`. The supplied
    role base is `role_base_sha=2c0295af41a5ede1067bebea158c3c8cf1115d18`.

    Dirty-path classification preserved unrelated work. The owned paths are
    this plan and the Finance test paths listed below. `.opencode/goals/**`
    is generated or ignorable state. Admin, APK, Mastery, lockfile, Sales,
    Finance specification, Finance decision, Finance source, and Phase 2
    candidate paths remain untouched user work.

    New Red tests cover B1 trusted server-generated event/request/correlation
    IDs and time plus credential injection; B2 the durable Company Identity
    audit adapter; B3 the Storage-reader to Finance-binding adapter and source
    isolation; B4 concurrent claim/CAS and one enqueue; B5 isolated migrations
    with one active internal company; B6 owner maxBytes; B7 malformed driver
    results and sanitized errors; B8 claims and policy versions; and B9 the
    maximum-length outbox identity.

    The following targeted commands are implementation Red. Each command
    exits 1 because the current production tree lacks the reviewed behavior.

    - `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/company-identity/__tests__/finance-task3-review-b.red.test.ts`
      exits 1: 3 tests fail. B1 receives caller audit IDs and time, B8 lacks
      `policyVersion` in the decision, and B2 lacks the durable adapter export.
    - `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/historical-private-evidence-binding-adapter.red.test.ts`
      exits 1: 2 tests fail. The production binding adapter export and source
      are absent.
    - `CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/durable-job-projector-review-b.red.test.ts`
      exits 1: 2 tests fail. The concurrent case enqueues twice instead of
      once. The maximum identity case raises `FINANCE_DURABLE_REQUEST_INVALID`.
    - `CI=true pnpm --filter @reading-advantage/storage exec vitest run src/__tests__/finance-task3-review-b.red.test.ts`
      exits 1: 5 tests fail. The owner ceiling is ignored, malformed driver
      results are accepted or raise `TypeError`, and provider errors keep their
      internal message.

    B5 has explicit live PostgreSQL evidence. With both database variables
    unset, the live command exits 0 with 3 skipped tests. This is the allowed
    environment gate. Against a disposable
    `company_identity_test_<digits>_<hex>` database and least-privilege
    migration role, the same command exits 1 with 2 tests passed and 1 test
    failing only because the durable Company Identity Finance audit adapter is
    absent. The migration lock, one-active-company setup, login rollback, and
    exchange rollback all reach their assertions without migration races or
    active-company invariant failures.

    B5 live command:
    `COMPANY_IDENTITY_PG_TEST_URL=<disposable> CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/company-identity/__tests__/postgres-finance-task3.integration.test.ts src/modules/company-identity/__tests__/postgres-login-atomic.integration.test.ts src/modules/company-identity/__tests__/postgres-exchange.integration.test.ts`

    Owned Red test paths:
    `packages/backend/src/modules/company-identity/__tests__/finance-task3-review-b.red.test.ts`,
    `packages/backend/src/modules/company-identity/__tests__/postgres-finance-task3.integration.test.ts`,
    `packages/backend/src/modules/company-identity/__tests__/postgres-task3-test-support.ts`,
    `packages/backend/src/modules/company-identity/__tests__/postgres-login-atomic.integration.test.ts`,
    `packages/backend/src/modules/company-identity/__tests__/postgres-exchange.integration.test.ts`,
    `packages/backend/src/modules/finance-operations/__tests__/historical-private-evidence-binding-adapter.red.test.ts`,
    `packages/backend/src/modules/finance-operations/__tests__/durable-job-projector-review-b.red.test.ts`,
    and `packages/storage/src/__tests__/finance-task3-review-b.red.test.ts`.

    `git diff --check` exits 0. Focused ESLint exits 0 for the owned backend
    and storage tests. No production source changed. The task remains `[~]`
    because the Red failures identify missing implementation, not environment.
- [b] Task: Add live CRM `CustomerBillingCatalogPort` and Tutor
  `TutorFinancialExportPort` owner contracts and adapters only after those
  source owners exist and accept source-native identities, versions, evidence,
  and payload schemas. Finance normalization must remain downstream.

## Phase 2 — controlled operational imports

- [b] Task: Implement idempotent historical private-evidence packets,
  payroll-summary imports, historical school-billing snapshots, evidence
  references, and correction/supersession flow. Depends on the accepted
  Company Identity, private-read, and durable-outbox boundaries above; it must
  not read live CRM or Tutor data.
- [b] Task: Pilot one reconciled historical month and one historical billing
  packet with authorization, audit, rollback, and duplicate/conflict evidence.
  Depends on the historical import operations and accepted packet-attestation
  boundary above.

## Phase 3 — close and accountant exchange

- [b] Task: Implement close-period controls and versioned accountant export packs only
  after written decisions for Thai invoice/tax/VAT/WHT, classification, close,
  retention, correction, and pack policy (system-map R7). Depends on the pilot,
  accountant acceptance, and all relevant source contracts.
- [b] Task: Release Finance Operations access only after Company Admin role mapping,
  revocation, audit evidence, and the finalization gate are accepted. Depends on
  system-map R2, the completed policy decisions, and review evidence for every
  integration boundary.
