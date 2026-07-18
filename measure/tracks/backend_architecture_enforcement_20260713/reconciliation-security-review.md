# Analyzer Reconciliation Defensive Reliability Review

Review subject: 47db0663cdcd76d4762ac31518a69f2a481f865262527812b61a85bbbc75e7f3

Reviewed source commit: `c512d99998b05df6a45379f3cff948dad4b70db7`

Date: 2026-07-17

## Scope and method

This neutral reliability review inspected the complete frozen reconciliation subject and current committed implementation. It evaluated stable repository path binding, atomic publication of the complete recovery record, supported-writer serialization, deterministic all-old/all-new recovery, redundant-journal interruption handling, bound-handle cleanup after a late repository-root name replacement, corrupt-byte retention, acknowledgement requirements, candidate hashes, and the exhaustive 123-addition classification. The receipt was rebound after unrelated Measure-only commits advanced the branch; the report, candidate bytes, reviewed implementation paths, and implementation-tree hash remained unchanged.

## Immutable evidence

- The review subject independently recomputes to `47db0663cdcd76d4762ac31518a69f2a481f865262527812b61a85bbbc75e7f3` from the manifest without reviews and the complete proposed policy/database/provider objects.
- The reconciliation implementation-and-test tree independently recomputes to `c2135e65b015abda8a99f88c50243c366a0e37f710bc3c0d58f667bacae29e6c` over all 19 frozen paths.
- Two current reports are byte-identical at SHA-256 `c2fe708c6bee7fb75a1ab665d1adb47290eb4267eaddd12124b7004722594339`. Each contains 614 findings, 123 additions, zero removals, zero renames, and zero parse errors.
- The addition-set SHA-256 is `ca31831388532413fa00297092fc3eece38ed104b58433ebf590b390dbc65322`.
- All additions are uniquely and exhaustively partitioned: 69 production entries plus 54 test findings, with no overlap, exactly equal the report's 123-instance set. Production counts are 53 `AI_PROVIDER_BOUNDARY`, nine `STORAGE_PROVIDER_BOUNDARY`, four `INTEGRATION_PROVIDER_BOUNDARY`, and three `DURABLE_JOB_DATABASE_BOUNDARY`. Nine literal rule/path exceptions cover exactly 10, 8, 3, 15, 4, 3, 9, 1, and 1 test findings.
- Proposed raw file SHA-256 values match the subject: policy `f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8`, database `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73`, and provider `7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5`.

## Reliability findings

No blocking finding remains.

- Transaction parents are opened with `O_DIRECTORY | O_NOFOLLOW`, mutations are translated through stable `/proc/self/fd/<fd>/...` paths, and path assertions compare current and bound directory device/inode identities. Canonical containment, regular-file status, destination identity, and original bytes are revalidated before publication and commit.
- The complete strict recovery record is first written to a private candidate, the candidate file and directory are synced, and an atomic exclusive hard link publishes the repository-wide lock. The lock target therefore never exposes partial record bytes, and concurrent supported writers serialize on the exclusive link target.
- The redundant journal is not authoritative. Recovery reads and validates the fully published lock record, binds fresh no-follow handles, verifies the lock bytes again, and deterministically recovers when the journal is absent or contains partial bytes.
- Existing subprocess cases terminate after lock publication, each of three stage writes, each of three backup copies, each of three commit renames, and redundant-journal cleanup. Fresh recovery returns exact all-old or all-new validated state and removes artifacts only after verification.
- Cleanup removes the journal and lock while repository handles remain bound. The late root-name replacement test proves the real bound lock is removed, the outside sentinel is unchanged, and committed candidate bytes remain in the original bound repository tree.
- Unknown destination bytes or corrupt recovery backups fail closed with the authoritative lock and recovery artifacts retained. Semantic validation is required before finalizing an all-new recovered state.
- Normal apply requires acknowledgement plus the exact recomputed preview hash. Recovery requires acknowledgement and the exact transaction identifier. The production recovery CLI enforces both, rejects unsupported/incomplete options, validates policy and baseline schemas/domains, and returns a stable non-zero error result.
- Routine baseline updates and reconciliation both use the same generic locked transaction engine; the baseline writer also rejects a baseline changed after analysis rather than overwriting it.

## Commands and results

- `git show --stat --oneline --decorate --no-renames 2f1f2180` — inspected the final atomic-publication commit.
- `git diff --check 2f1f2180^ 2f1f2180` — passed.
- Independent Python canonical-JSON recomputation — implementation tree and subject hashes matched exactly.
- Independent Python enumeration of `productionAdditions`, `exactExceptionAdditions[].coveredFindings`, and current report additions — complete disjoint 69 + 54 = 123 partition matched exactly.
- `sha256sum /tmp/arch-current-head-a.json /tmp/arch-current-head-b.json /tmp/arch-reconciliation-draft-policy.json /tmp/arch-reconciliation-draft-database.json /tmp/arch-reconciliation-draft-provider.json` — duplicate reports and all three candidate hashes matched.
- `node_modules/.bin/vitest run --root packages/architecture-enforcement` at HEAD `2f1f2180` — 27 files and 210 tests passed.
- `../../node_modules/.bin/tsc --noEmit` — passed.
- `../../node_modules/.bin/eslint src/` — passed.
- `../../node_modules/.bin/tsc --project tsconfig.build.json` — passed.

## Decision

The frozen subject is internally consistent, its candidate set is exhaustively reviewed, and the committed transaction/recovery implementation satisfies the requested defensive reliability properties with passing real-filesystem and fresh-process evidence.

Verdict: **ACCEPTED**
