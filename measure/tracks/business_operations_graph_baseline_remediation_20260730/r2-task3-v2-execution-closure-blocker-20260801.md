# R2 Task 3 v2 — Execution-Closure Blocker (2026-08-01)

## Status

**BLOCKED — R1 v2 execution-closure defect.**

This is not a product-code finding and it does not claim that the Accounts
security matrix, its helper, or Task 3 acceptance exists. The Task 3 marker,
all successor markers, Finance, and historical Task 3 artifacts remain
unchanged.

## Frozen-source execution

The only source used was a newly materialized external copy of the accepted v2
archive:

- archive: r1-task2-source-and-graph-v2-20260801/snapshot.archive.json
  (e5a638e11ed57cfe6750cbe60e5ab31cbdcb0fd4ff3000458bae7168f868332e);
- manifest: r1-task2-source-and-graph-v2-20260801/snapshot.manifest.json
  (ec848eaacce6eef4450434217ee7199c9c98ec44edc5496fa6f57f289eb1ae85);
- materialization bracket: 6,868 entries, entry and denominator digest
  b56371e0b0e6b6a45fbbbea52274828b7750031ea2566673229cfbca9750d9a7;
- setup command: pnpm install --offline --frozen-lockfile, exit 0.

No shared-worktree files, build products, live node_modules, or source
overlays were linked or copied into that materialization. The successful
offline setup receipt is:

| Stream | Path | SHA-256 | Bytes |
| --- | --- | --- | ---: |
| stdout | r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/dependency-install.stdout.txt | a0db37399a1b596c32947727da86481b5fef13cb4d01595ef09e6660d3899839 | 1,979 |
| stderr | r2-task3-accounts-security-matrix-v2-20260801/gate-receipts/dependency-install.stderr.txt | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 0 |

## Required FR4 gate receipts

All four commands were executed from the external materialization after the
successful offline installation. Each nonzero exit is preserved as a failed
gate; none is relabeled as a product or package pass.

| Command | Exit | Result | stdout receipt | stderr receipt |
| --- | ---: | --- | --- | --- |
| CI=true pnpm --filter accounts test | 1 | FAIL | gate-receipts/fr4-01-accounts-test.stdout.txt — 42d27a16b6ec0efa3b2c7b8716c7bac943c93e8ad8e36e59ab65c83275767813 (1,473 bytes) | gate-receipts/fr4-01-accounts-test.stderr.txt — d765eef440f88328dd3f25e092ccb7c563fdfb58c872ec0fec313ae066897174 (3,763 bytes) |
| CI=true pnpm --filter accounts check-types | 2 | FAIL | gate-receipts/fr4-02-accounts-check-types.stdout.txt — fceb4ea04ca91e789a77bef7bc4bf8798df68fd916797c39fe9dda4542fe205e (4,629 bytes) | gate-receipts/fr4-02-accounts-check-types.stderr.txt — 019ee0ae4ac8134be8472c4a3cf36456e1093137ed1f578a6ebe32cb04935a9f (53 bytes) |
| CI=true pnpm --filter @reading-advantage/backend test | 1 | FAIL | gate-receipts/fr4-03-backend-test.stdout.txt — a2ff7dcc5d145447bd389103fcc6558b5e9152b2f40bbcdfa5f8ab066f95b97a (1,489 bytes) | gate-receipts/fr4-03-backend-test.stderr.txt — 01b2954ba402aafab68374660ffc7f7ea3dc025f57bf31d4e6a3e06a751c0727 (5,317 bytes) |
| CI=true pnpm --filter @reading-advantage/backend check-types | 2 | FAIL | gate-receipts/fr4-04-backend-check-types.stdout.txt — c548a24e7d81c6a09cc4ba72d97ebfb8ce22c46c08a01ecf53e8d15d889b2d9f (852 bytes) | gate-receipts/fr4-04-backend-check-types.stderr.txt — 019ee0ae4ac8134be8472c4a3cf36456e1093137ed1f578a6ebe32cb04935a9f (53 bytes) |

## Reproduced frozen-input failures

The failures show that the accepted source archive cannot execute its own
Accounts/backend package gates without inputs outside its frozen denominator:

- Accounts test loading fails to resolve the archived workspace entries
  @reading-advantage/backend and @reading-advantage/auth; its
  production-readiness suite also cannot open
  apps/accounts/cloudbuild.yaml.
- Accounts type checking cannot resolve the archived backend, auth, and DB
  workspace entries.
- Backend test loading cannot resolve @reading-advantage/db; its
  company-identity migration test cannot open
  packages/db/drizzle/0043_codecamp_company_principal_sync.sql.
- Backend type checking cannot resolve @reading-advantage/db.

The v2 manifest independently confirms that all of the following are absent:

- apps/accounts/cloudbuild.yaml;
- packages/db/drizzle/0043_codecamp_company_principal_sync.sql;
- packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql.

The archive does contain
packages/db/src/company-identity/__tests__/privileges-audit.integration.test.ts
and packages/db/src/company-identity/doctor.ts, but the latter cannot stand
in for the missing immutable-audit migration source. The required matrix
contract needs a source-bound citation to the exact SQL control, and inventing
that citation would violate the v2-only evidence boundary.

## Why no Green candidate is valid

Using the shared checkout's package outputs, live root node_modules, missing
Cloud Build fixture, migration, or immutable-audit SQL would turn these into
mixed-source results. Adding an invented SQL citation would similarly make the
security matrix claim evidence absent from the accepted v2 archive.

Therefore the correct disposition is an R1 v2 execution-closure defect:
recapture or otherwise authorize a complete frozen source/runtime evidence
boundary before rerunning Task 3's Green contract. Until then, all four FR4
gates are blocked and no Task 3 matrix acceptance can be claimed.
