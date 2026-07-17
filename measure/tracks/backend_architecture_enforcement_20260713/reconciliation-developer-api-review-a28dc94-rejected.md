# Developer API and Operability Review: Analyzer Reconciliation

## Verdict

**REJECTED**

The frozen reconciliation data subject is exhaustive, deterministic, and
responsibly partitioned, but the current operator API cannot yet be accepted.
The post-reconciliation baseline validator is absent, there is no supported
preview/apply command, the preview report omits required debt-delta fields, and
the apply API can return caller-tampered summary evidence without detecting it.
These are Gate 1 blockers even though the coordinated file transaction itself
has strong acknowledgement, stale-input, rollback, and cleanup behavior.

## Frozen review subject

- Review subject SHA-256:
  `a28dc94b85432cb5fd0c16969cb3a874a2124002467a15f71aba0d1e728a3d60`
- Independently recomputed over exactly `{manifest without reviews, config,
baselines}` using canonical key-sorted JSON: **match**.
- Draft manifest raw SHA-256:
  `b689287574579261a27a5bc0829d9a2907c918f88884465fbd5b70e672f98620`
- Candidate ownership-map raw SHA-256:
  `f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8`
- Candidate database-baseline raw SHA-256:
  `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73`
- Candidate provider-baseline raw SHA-256:
  `7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5`
- Frozen analyzer implementation-tree SHA-256:
  `d9d2647f4103998db9d6b3761b46e375dcbd1ea1186fe0024702681f909019a0`

The draft manifest's `pending-*` reviewer names and repeated-digit evidence
hashes were treated as placeholders and are not accepted review evidence. The
review-subject projection intentionally excludes `reviews`; the final manifest
must replace all four placeholders with the hashes of the real accepted review
artifacts.

## Exhaustive full-set proof

This review inspected every one of the 123 additions, not a sample. A read-only
audit iterated each manifest record, checked its current repository source line,
finding kind, import/resource, resolved target, instance key, disposition,
owner, and rationale. It also compared the complete instance-key set against
all four immutable reports.

| Evidence run         |         Status | Findings |              Errors | Additions | Missing from manifest | Extra in manifest | Removals | Renames |
| -------------------- | -------------: | -------: | ------------------: | --------: | --------------------: | ----------------: | -------: | ------: |
| provenance 3a run A  | analysis-error |      614 | 1 exact named error |       123 |                     0 |                 0 |        0 |       0 |
| provenance 3a run B  | analysis-error |      614 | 1 exact named error |       123 |                     0 |                 0 |        0 |       0 |
| execution d723 run A |    debt-change |      614 |                   0 |       123 |                     0 |                 0 |        0 |       0 |
| execution d723 run B |    debt-change |      614 |                   0 |       123 |                     0 |                 0 |        0 |       0 |

- Provenance report SHA-256, both runs:
  `e6e3ad5827a1af38f44d4f939616375b089ff1bb1f4d8888d34340a4764e0a1c`.
- Execution report SHA-256, both runs:
  `ef006caca16e03e7f92929e15b9d74ac8cc368f225daabb8c8d2717540adf94a`.
- Manifest addition-instance-set SHA-256:
  `ca31831388532413fa00297092fc3eece38ed104b58433ebf590b390dbc65322`.
- Partition: 69 unique production additions plus 54 unique test findings equals
  123 unique additions. There is no overlap, missing instance, or extra
  instance.
- No production addition has a test/fixture path. No covered exception finding
  has a production path. All nine exception paths are exact files with no
  wildcard, directory, or path-traversal syntax.

### Production additions reviewed individually

The 69 production additions are distributed as follows:

- `DURABLE_JOB_DATABASE_BOUNDARY`: 3.
- `AI_PROVIDER_BOUNDARY`: 53.
- `INTEGRATION_PROVIDER_BOUNDARY`: 4.
- `STORAGE_PROVIDER_BOUNDARY`: 9.

Owner totals, which sum to all 69 entries:

- `ai-platform`: 13.
- `domain-platform`: 2.
- `github-integrations`: 4.
- `primary-advantage-platform`: 16.
- `reading-advantage-platform`: 25.
- `science-advantage-platform`: 4.
- `storage-platform`: 4.
- `webhooks-platform`: 1.

Each entry's owner matches its source package/application. Each rationale names
the detected legacy boundary, the accountable owner, and the required adapter
or exact PostgreSQL job-adapter migration. The four internal factory/index
groups under `packages/ai`, `packages/storage`, and
`packages/integrations/github` remain legitimate baseline debt because the
frozen policy permits provider-specific construction only in its exact approved
driver/provider roots; this reconciliation does not broaden those roots.

### Exact exceptions reviewed individually

The nine exact rule/file pairs cover all 54 test-only findings:

| Rule                            | Exact file                                                                | Owner               | Covered findings |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------- | ---------------: |
| `AI_PROVIDER_BOUNDARY`          | `packages/ai/src/__tests__/phase-11-sdk-v2-call-shape.test.ts`            | `ai-platform`       |               10 |
| `AI_PROVIDER_BOUNDARY`          | `packages/ai/src/__tests__/phase-13-adversarial-streamText-await.test.ts` | `ai-platform`       |                8 |
| `AI_PROVIDER_BOUNDARY`          | `packages/ai/src/__tests__/phase-2-mock-provider.test.ts`                 | `ai-platform`       |                3 |
| `AI_PROVIDER_BOUNDARY`          | `packages/ai/src/__tests__/phase-4-google-provider.test.ts`               | `ai-platform`       |               15 |
| `AI_PROVIDER_BOUNDARY`          | `packages/ai/src/__tests__/phase-multimodal-contract.test.ts`             | `ai-platform`       |                4 |
| `AI_PROVIDER_BOUNDARY`          | `packages/ai/src/__tests__/phase-multimodal-unsupported.test.ts`          | `ai-platform`       |                3 |
| `AI_PROVIDER_BOUNDARY`          | `packages/ai/src/__tests__/phase-stream-text-contract.test.ts`            | `ai-platform`       |                9 |
| `DURABLE_JOB_DATABASE_BOUNDARY` | `packages/db/src/__tests__/phase-1-review-jobs-schema.test.ts`            | `database-platform` |                1 |
| `STORAGE_PROVIDER_BOUNDARY`     | `packages/storage/src/__tests__/factory.test.ts`                          | `storage-platform`  |                1 |

Every covered finding resolves to the adapter/driver exercised by that exact
test. The policy candidate is append-only: rules, ownership roots, baseline
paths, and all 102 historical exact exceptions are unchanged; exactly nine
reviewed exceptions are appended. The baseline candidates preserve all 464
historical database entries and 27 historical provider entries byte-for-byte,
then add exactly 3 database and 66 provider entries, yielding 467 and 93.

The strict live candidate validator passed and returned:

```text
manifestSha256=b689287574579261a27a5bc0829d9a2907c918f88884465fbd5b70e672f98620
sourceBaseSha=3a109c879438fd50b369eb2905ddccfb56722d2b
analyzerCommitSha=19af018669873e59bb8b721017d3d91fc1096f83
databaseEntries=467
providerEntries=93
productionAdditions=69
exactExceptionAdditions=9
coveredTestFindings=54
```

## Accepted API properties

- Preview builds one coordinated policy/database/provider transaction and uses
  exact before/after byte hashes.
- The generic plan hash excludes absolute `repoRoot` and destination fields,
  making the acknowledgement token portable across repository locations.
- Apply requires both explicit `acknowledge: true` and the exact expected
  reconciliation plan hash; the generic transaction independently recomputes
  its own plan hash.
- Preview checks analyzer errors, exact finding-set equality, manifest
  validation, analyzer-tree stability, tracked-input stability, and coordinated
  before bytes before returning a plan.
- Apply rechecks the manifest hash, analyzer tree, tracked input snapshot,
  wrapper hash, current destination hashes, and replacement hashes before the
  first write.
- Destinations must be existing regular files, cannot be symlinks, must remain
  inside the real repository root, and must be distinct.
- Staging and backups use exclusive creation. Injected staging, backup, rename,
  readback, and semantic-validation failures attempt reverse-order rollback and
  verify original bytes. Recovery and cleanup failures are retained rather than
  masking the primary error.
- A successful write with incomplete artifact cleanup returns the explicit
  `committed-cleanup-incomplete` state and documents that it is unsafe to retry.
- Focused tests are non-vacuous and Green: 5 files, 48 tests, 0 failures and 0
  skips. Independent TypeScript type-check and ESLint checks passed for all five
  production modules and their five test modules.

## Blocking findings

### High: no analyzer-complete baseline-validation mode

`packages/architecture-enforcement/src/baseline-validation.ts` still runs the
historical direct inventory, calls `proposeDirectViolations`, and validates both
live baselines against only those direct candidates. It does not load the
accepted reconciliation manifest, reconstruct historical baseline bytes from
the manifest proofs, bind the frozen analyzer tree, or run the analyzer-complete
normal checker.

Consequently, after writing the reviewed 467/93 baselines,
`pnpm architecture:baseline:validate` cannot prove the accepted final state and
will treat analyzer-only entries as inconsistent with its direct-only
denominator. This violates the track's required two-mode migration:

1. historical mode while the manifest is absent and the historical hashes are
   exact; and
2. analyzer-complete mode when the manifest exists, validating its proofs,
   final policy/baselines, analyzer tree, exact exceptions, and a clean current
   analyzer run.

The transaction must not be applied until the second mode exists, is tested,
and is used by the existing root validation command.

### High: no supported reconciliation CLI or root command

The root `package.json` exposes `architecture:check`,
`architecture:baseline:update`, and `architecture:baseline:validate`, but no
reconciliation preview/apply command. The architecture package does not export
the reconciliation, manifest, or transaction modules from `src/index.ts`, and
has no reconciliation CLI script. CI and `measure/doctor.sh` therefore cannot
exercise the reviewed preview/apply contract through a stable operator surface.

The production command must:

- default to read-only preview;
- emit only the secret-safe summary, never the preview's absolute paths or full
  replacement contents;
- exit non-zero without explicit acknowledgement for an apply request;
- require an explicit expected reconciliation plan hash;
- distinguish `not-acknowledged`, `committed`,
  `committed-cleanup-incomplete`, and failed-with-recovery states; and
- sanitize cleanup diagnostics so absolute machine paths and raw error objects
  are not emitted into stable CI evidence.

### High: apply can return tampered summary evidence

`applyArchitectureReconciliation` checks only that
`preview.summary.reconciliationPlanHash` equals the preview's top-level plan
hash. It does not rederive or validate the rest of `preview.summary`. After a
valid preview, a caller can mutate `counts`, `rulesetHashes`,
`beforeFileHashes`, `proposedFileHashes`, `manifestHash`, or
`exactExceptionPairs`; the transaction still commits the correct hash-bound
bytes, but apply returns the false caller-supplied summary as accepted evidence.

This does not corrupt the three files, but it breaks the audit contract and can
publish incorrect Gate 1 counts/hashes. Apply must rederive the complete summary
from immutable/hash-bound inputs, or validate a canonical summary hash bound by
the reconciliation plan. Add adversarial tests that mutate each summary field
and require rejection before mutation.

### Medium: preview summary omits explicit removals and renames

The strategy requires preview output to print production additions, covered
test findings, removals, and renames matching the accepted manifest. The current
`ArchitectureReconciliationCounts` reports final domain counts, production
additions, exception additions, and covered test findings, but has no removal or
rename fields. For this subject both values are zero, yet their omission makes
the evidence ambiguous and weakens future operator diagnostics.

Add explicit `removals: 0` and `renames: 0` fields, and preferably database and
provider production-addition counts, to the versioned secret-safe summary and
its human/JSON formatter. Bind those values to the validated manifest/report
comparison rather than hard-coding display text.

## Re-review gate

Developer-API review can change to **ACCEPTED** only after all four blockers are
resolved and independently rerun:

1. the two-mode validator proves the final analyzer-complete state;
2. a stable root preview/apply command exists and has non-vacuous CLI tests;
3. apply rejects or rederives every tampered summary field before mutation;
4. preview JSON/human output includes explicit zero removals and renames and is
   byte-identical across two consecutive runs; and
5. the final manifest replaces all draft review placeholders while preserving
   review subject SHA-256
   `a28dc94b85432cb5fd0c16969cb3a874a2124002467a15f71aba0d1e728a3d60`.
