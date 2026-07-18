# Analyzer Reconciliation Security Review

## Review subject

- Frozen review-subject SHA-256: `a28dc94b85432cb5fd0c16969cb3a874a2124002467a15f71aba0d1e728a3d60`
- Reviewed candidate artifacts:
  - `/tmp/arch-reconciliation-draft-manifest.json`
  - `/tmp/arch-reconciliation-draft-policy.json`
  - `/tmp/arch-reconciliation-draft-database.json`
  - `/tmp/arch-reconciliation-draft-provider.json`
- Reviewed immutable analyzer evidence:
  - provenance report SHA-256: `e6e3ad5827a1af38f44d4f939616375b089ff1bb1f4d8888d34340a4764e0a1c` (two byte-identical captures)
  - execution report SHA-256: `ef006caca16e03e7f92929e15b9d74ac8cc368f225daabb8c8d2717540adf94a` (two byte-identical captures)
  - frozen analyzer implementation-tree SHA-256: `d9d2647f4103998db9d6b3761b46e375dcbd1ea1186fe0024702681f909019a0`

## Full-set review method and results

This was an exhaustive review, not a sample. I parsed both immutable report pairs and all four candidate artifacts, keyed every addition by its full `instanceKey`, and compared every finding field against the zero-error execution report. I separately compared the candidate policy and baselines with the historical version-controlled files and inspected the transaction, filesystem adapter, manifest validator, manifest builder, and reconciliation orchestration code and tests.

- The execution comparison contains exactly 123 additions, zero removals, and zero renames. The reconciliation partitions the same 123 unique instances into exactly 69 non-test production baseline entries and 54 test findings covered by nine rule-and-file exceptions. There are no missing, extra, overlapping, or field-mutated findings.
- All 69 production additions were reviewed individually. They comprise 66 provider and three database findings: 53 `AI_PROVIDER_BOUNDARY`, nine `STORAGE_PROVIDER_BOUNDARY`, four `INTEGRATION_PROVIDER_BOUNDARY`, and three `DURABLE_JOB_DATABASE_BOUNDARY`. Every owner matches the source package/application routing, each rationale identifies the legacy boundary and accountable migration owner, and no production path is classified as a test or fixture.
- All 54 covered findings were reviewed individually. The nine exact groups contain 10, 8, 3, 15, 4, 3, 9, 1, and 1 findings respectively. Every covered finding matches its declared rule and exact source path; every path is a test under `__tests__`; and the union is exactly the test partition from the immutable comparison.
- The candidate policy preserves `rules`, `ownershipRoots`, `baselineFiles`, and all 102 historical exceptions exactly, then appends only the nine reviewed test exceptions. Paths are normalized literal file paths with no wildcard or traversal syntax. Thus the frozen candidate adds no production exception and does not weaken production enforcement.
- The candidate baselines preserve all 464 historical database entries and all 27 historical provider entries exactly, then add only the reviewed production entries, producing 467 database and 93 provider entries. Candidate canonical hashes, ruleset hashes, counts, report hashes, implementation-tree hash, and the supplied review-subject hash all recompute successfully.
- `validateAnalyzerReconciliation` accepts the complete frozen candidate and returns 467 database entries, 93 provider entries, 69 production additions, nine exact-exception additions, and 54 covered test findings.
- Candidate content contains credential _identifiers_ such as `environment:OPENAI_API_KEY`, but no credential values, connection strings, private keys, or source bodies. The public summary type emits hashes, counts, rule identifiers, and repository-relative exception paths rather than replacement bytes or the absolute repository root.

## Blocking findings

### SEC-1 — Apply-time destination check has an exploitable TOCTOU window

Severity: high. Status: blocking.

`validatedDestinations` performs lexical containment, final-component `lstat`, regular-file, symlink, and `realpath` checks (`policy-update-transaction.ts:239-272`). Apply then reads and hashes each current destination (`:441-457`), but it does not hold an inode/directory handle or otherwise prevent the destination from changing between that read and later backup/rename operations. The subsequent backup captures whatever bytes happen to exist at copy time, not necessarily the previewed original bytes.

I reproduced this with the production Node filesystem adapter in an isolated `/tmp` directory. The injected filesystem changed the first destination immediately after its apply-time hash read. The operation still returned:

```json
{
  "result": {
    "state": "committed",
    "planHash": "65a03c0a55d851626aef2b0a011744b5f326967cd0a9161cf8da285fd4a5e303"
  },
  "finalA": "new-a"
}
```

A second reproduction injected failure on the second commit rename. Rollback restored the raced bytes instead of the previewed original and consumed the backup holding those raced bytes; no artifact retained the previewed original:

```json
{
  "failure": true,
  "verificationErrors": 1,
  "finalA": "concurrent-change",
  "artifacts": ["a", "b", "c"]
}
```

The code correctly detects the failed original-byte verification (`policy-update-transaction.ts:373-391`), but detection is not recovery. This violates the transaction's reviewed-original and recoverability guarantees.

Required remediation:

1. Bind validation, backup, and replacement to stable directory/file handles using no-follow semantics where the platform supports them, or take an exclusive repository transaction lock that all supported writers honor and revalidate inode/device/metadata immediately before each mutation.
2. Create and hash-verify recovery copies from the exact previewed originals before accepting any later destination state. Never overwrite or consume the last verified-original recovery artifact until the entire commit and post-write validation succeeds.
3. Add real-filesystem adversarial tests for a destination swap after the apply hash read, a parent-directory symlink/swap, and rollback after either race. The required assertion is either a fail-closed pre-mutation outcome or restoration of the exact previewed bytes with a retained recovery artifact.

### SEC-2 — Accepted review evidence is not bound to this review subject

Severity: high for audit integrity. Status: blocking.

The manifest review record contains only `role`, free-form `reviewer`, literal `result: "accepted"`, and an arbitrary 64-hex `evidenceSha256` (`reconciliation-manifest.ts:147-154`). The validator requires four unique roles but does not carry or verify the review-subject hash, does not identify an evidence path, and does not load/hash the evidence artifact (`:285-303`). Consequently, an evidence hash from a different reconciliation subject—or even a fabricated digest—satisfies the runtime contract. The draft demonstrates this structurally with placeholder repeated-digit hashes while the full validator still succeeds.

Required remediation:

1. Bind every review record to the computed `reviewSubjectSha256` (or add one top-level subject binding that all four records explicitly attest to).
2. Add a normalized repository-relative `evidencePath` for each role and have the permanent validator read the artifact, verify its SHA-256, verify the exact subject hash and verdict inside it, and reject missing or duplicate evidence paths.
3. Reject placeholder reviewers/digests and make `accepted` contingent on the verified evidence content rather than a schema literal alone.

## Residual hardening observations

- Exact exceptions are deliberately rule-and-file scoped, not instance scoped (`ownership-map.ts:193-204`). The frozen nine groups cover exactly the declared 54 findings today, but future findings for the same rule in those test files will also be allowed. This does not weaken production enforcement, but a post-reconciliation guard should fail if an exception's live covered-instance set differs from the reviewed manifest set.
- Reproduction report and source-path-set hashes are recorded in the manifest, while the permanent validator validates their shape/equality but does not ingest the immutable reports or recompute their source sets. Store the canonical reports/path inventories as durable evidence and make permanent validation hash and parse them; otherwise later auditors can verify only assertions about ephemeral `/tmp` files.
- Cleanup errors expose absolute transaction artifact paths through `RepositoryTransactionArtifactError.path`. Ensure any human/JSON CLI projection redacts the repository root and serializes error codes rather than arbitrary filesystem error text.

## Verdict

**REJECTED**

The frozen 123-addition classification, ownership, narrow test-only exception set, and candidate hashes are internally complete and correct. The reconciliation must not be applied until SEC-1 and SEC-2 are fixed and independently re-reviewed against a newly frozen subject hash.
