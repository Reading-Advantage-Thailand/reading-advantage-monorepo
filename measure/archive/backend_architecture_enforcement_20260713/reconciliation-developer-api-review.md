# Developer API and Operability Review: Analyzer Reconciliation

Review subject: 47db0663cdcd76d4762ac31518a69f2a481f865262527812b61a85bbbc75e7f3

Verdict: **ACCEPTED**

## Decision

The reviewed reconciliation is complete and operable. The candidate exhaustively
classifies all 123 additions, preserves every historical policy object, and has
no removal or rename. The shared transaction API is exported and documented,
uses a machine-independent acknowledgement hash, binds the full recovery record
before mutation, publishes its visible writer lock atomically from durable
bytes, recovers from a missing or partial redundant journal, and detects source
baseline races. No developer-interface or operability blocker remains.

## Frozen subject and independent hashes

- Reviewed source commit:
  `c512d99998b05df6a45379f3cff948dad4b70db7`. The receipt was rebound after unrelated Measure-only commits advanced the branch; the reviewed report, candidate bytes, and implementation tree remained unchanged.
- Raw `/tmp/arch-reconciliation-review-subject.json` SHA-256:
  `8af4b48085fb64614b34da548e400c98c80d9ad127a3221d616f91883a77dd7e`.
- Declared canonical review-subject SHA-256, independently recomputed twice:
  `47db0663cdcd76d4762ac31518a69f2a481f865262527812b61a85bbbc75e7f3`.
- Reconciliation implementation tree, independently recomputed twice and equal
  to the manifest:
  `c2135e65b015abda8a99f88c50243c366a0e37f710bc3c0d58f667bacae29e6c`.
- Proposed ownership-map raw SHA-256:
  `f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8`.
- Proposed database-baseline raw SHA-256:
  `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73`.
- Proposed provider-baseline raw SHA-256:
  `7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5`.

## Exhaustive classification validation

Both current reports are byte-identical at
`c2fe708c6bee7fb75a1ab665d1adb47290eb4267eaddd12124b7004722594339`.
Each has status `debt-change`, 614 findings, zero parse errors, exactly 123
additions, zero removals, and zero renames.

Every addition was compared field-for-field. The ordered union of manifest
production additions and exception-covered findings equals the report addition
array exactly, including rule, domain, source path, line, column, evidence kind,
import specifier, resolved target, semantic key, and instance key. The 123
identities are unique and partition into 69 production additions and 54 test
findings covered by nine exact rule/file exceptions. There are zero production
paths in the exception partition, zero test/fixture paths in the production
partition, and zero exception-pair mismatches. All 123 source locations exist
and every recorded line is in range.

Production rule totals are 53 `AI_PROVIDER_BOUNDARY`, three
`DURABLE_JOB_DATABASE_BOUNDARY`, four `INTEGRATION_PROVIDER_BOUNDARY`, and nine
`STORAGE_PROVIDER_BOUNDARY`. Owner totals are `ai-platform` 13,
`domain-platform` 2, `github-integrations` 4,
`primary-advantage-platform` 16, `reading-advantage-platform` 25,
`science-advantage-platform` 4, `storage-platform` 4, and
`webhooks-platform` 1.

The candidate preserves all historical database, provider, and exception
objects exactly. It adds three database entries, 66 provider entries, and nine
exact exceptions, producing final counts of 467, 93, and 111.

## Developer API and operability validation

- The transaction operations and contracts, plan and outcome types, recovery
  types, error class, constants, preview/apply/recovery functions, Node adapter,
  reconciliation API, and recovery CLI are public through the package index.
- The reviewed exported functions, classes, interfaces, type aliases, fields,
  and constants have explanatory JSDoc.
- The root `architecture:transaction:recover` script invokes the package
  recovery CLI. Recovery requires explicit `--acknowledge` and the transaction
  ID and fails closed otherwise.
- Both proposal validation and the persisted journal schema enforce a minimum
  of two and maximum of four coordinated documents.
- Reconciliation's three-file write and baseline update's two-file write use the
  same transaction engine and repository-wide lock; no supported writer bypass
  was found.
- The plan hash binds schema version, transaction ID, repository-relative path,
  and exact before/after hashes. It intentionally excludes checkout root,
  canonical absolute destination, device, and inode while retaining the latter
  values for execution-time identity checks. Two real repositories with
  different roots and canonical destinations produced the same plan hash:
  `94da492ccd6b919c2ae99033e465bbd4a0cb5ccc778df70647e045ba76e2d90c`.
- Apply serializes the complete authoritative recovery record, revalidates all
  bound destination identities and bytes, and then publishes the lock before
  any mutation. The Node adapter durably writes a content-addressed candidate
  and atomically hard-links it to the visible exclusive lock, fsyncs the parent,
  and durably removes the candidate. A visible partial recovery record is not a
  reachable publication state.
- Lock and candidate cleanup operate through the previously bound directory
  handles. A real late root-namespace swap left the outside sentinel untouched
  and removed the lock from the originally bound repository.
- Recovery treats the full lock record as authoritative and the journal as
  redundant. Unit coverage exercises absent and partial journals. Independent
  real CLI recovery of a retained-lock/partial-journal state returned
  `recovered-originals`, restored exact original bytes, removed recovery state,
  and exited 0.
- Baseline update hashes the exact serialized source baselines read for
  analysis, compares those hashes with transaction preview `beforeHash` values,
  and fails before lock or write on concurrent source-baseline change. The race
  has direct test coverage.

## Independent command evidence

Fresh commands were run against the exact reviewed source after the final hash
recomputation:

- `../../node_modules/.bin/vitest run --reporter=verbose`: 27 files passed, 210
  tests passed, exit 0.
- `../../node_modules/.bin/tsc --noEmit`: exit 0.
- `../../node_modules/.bin/eslint src/`: exit 0.
- `../../node_modules/.bin/tsc --project tsconfig.build.json`: exit 0.

The previously demonstrated portability, lock-before-journal, partial-journal,
cleanup-binding, and source-baseline race boundaries were specifically retested
against this implementation. The corrected behavior matches the public
contracts and recovery model. The subject is accepted with no remaining
developer-interface finding.
