# Analyzer Reconciliation v2 Strategy

## Scope and status

This document defines the Task 14a strategy for `durable_job_worker_platform_20260713`.
It records the Red and Green plan only.
It records no acceptance decision.

The strategy role owns this file only.
It must not stage, commit, or modify another file.

## Owner decision

Build v2 as a separate policy, baseline, and manifest artifact family.
Keep every accepted v1 byte immutable.

The accepted v1 manifest must retain this exact raw SHA-256:

`4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0`

V2 must not rewrite, rehash, or replace any v1 artifact.
V2 remains a candidate until its artifacts pass validation and fresh Luna reviews pass.
V2 becomes the default only after accepted artifacts and fresh Luna reviews bind the final v2 manifest.

Explicit v1 selection is a first-class compatibility contract.
It must preserve accepted v1 analyzer behavior and output, not only accepted JSON bytes.
Current hardened analyzer logic may run only under v2 where the behavior differs.

## Accepted v1 lineage

The accepted v1 artifact lineage is the Gate 1 checkpoint commit
`4ff2caecf8d38622fa727bddb3e1c763f02a7451`.
The archived Gate 1 verification records these exact raw file hashes.
Do not treat `HEAD` as proof of accepted v1 bytes.

The archived v1 manifest binds `analyzerCommitSha` and
`analyzerImplementationTreeSha256` to the historical analyzer tree.
That binding is historical and must not be rebound to current code.
For the same accepted input snapshot, explicit v1 selection must preserve the accepted findings, diagnostics, ordering, counts, and serialized output.
The v2 manifest binds the current analyzer implementation and v2 implementation and test tree.

| Accepted v1 file                                                               | Required raw SHA-256                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json` | `4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0` |
| `packages/architecture-enforcement/src/config/ownership-map.v1.json`           | `f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8` |
| `packages/architecture-enforcement/src/config/baselines/database.v1.json`      | `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73` |
| `packages/architecture-enforcement/src/config/baselines/provider.v1.json`      | `7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5` |

Before Red, record all four current hashes.
Do not restore drifted v1 policy or baseline files to Gate 1 before Red.
The v1 immutability Red must expose every clean-HEAD mismatch.
After Red records the mismatches, Green restores exact Gate 1 bytes.
Do not repair v1 by editing its JSON by hand.

The accepted baseline lineage contains 467 database entries and 93 provider entries.
Its database ruleset SHA-256 is `44425a89f8db3b6394e4a3c4117ede1154656abea8d0ccaf0f9eb5807e6acbdc`.
Its provider ruleset SHA-256 is `1f26b6b7bd73ab2ce7ca38f182206dd8d41995f566733bd2ef4059d950ad9e67`.

## Clean-HEAD preflight

The current working tree contains six dirty Green files.
Their current hard-coded exception branches violate this target.
Those branches must not survive in a commit.

The recorded clean reference commit is `628468dae86c688d14f5667109e39d1d3ab9b710`.
This commit is not the future `phase_base_sha`.

| Dirty Green file                                                               | Clean-HEAD blob SHA                        | Clean-HEAD raw SHA-256                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------ |
| `packages/architecture-enforcement/src/analyzer.ts`                            | `511b0405240ea51d45e309bf7d1b3049dd07ee5c` | `f64a5b0aa41a02086b03263086aa8dfffc81d80adcf9610ce4e46ba4c65a2391` |
| `packages/architecture-enforcement/src/contracts.ts`                           | `613d9c5c8a69a72e727f42ad2f85c5352decfe3c` | `8ea1ef6f144fa6a0995dc32249e8ccb049bfdd649d89afa086caefa9ca2c3c68` |
| `packages/architecture-enforcement/src/ownership-map.ts`                       | `143f6677ad72c7a959acfad8200bf95cb7acfc81` | `6e6ffcec3dafa2371f0877598f7a2ce6bf7458e55c2561b782b3118cc739d09f` |
| `packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json` | `ced9ab3ef945900a59636894fbd85870b34132f2` | `4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0` |
| `packages/architecture-enforcement/src/config/baselines/database.v1.json`      | `8dfb5612f77cf473f048d38f7c72120e6b9ca281` | `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73` |
| `packages/architecture-enforcement/src/config/ownership-map.v1.json`           | `2b046f0b1fa87a88929fecb496bd08ead396d5e1` | `638ff3e0913e976b54d9c41810180bb4095f01c28289c9867dcc60fed1f3f401` |

The clean-HEAD ownership-map v1 hash differs from the Gate 1 hash.
Its Gate 1 hash is `f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8`.
The Red must report this mismatch.

Before phase-base capture, save the six-file Green patch outside the repository.
Record the patch SHA-256.
Verify the reverse patch applies to the dirty files.
Restore the six files to current `HEAD`.
Verify the forward patch applies without changing files.
Do not stage or commit the saved patch.

Use this sequence:

```bash
ls /tmp/opencode
git diff --binary -- \
  packages/architecture-enforcement/src/analyzer.ts \
  packages/architecture-enforcement/src/contracts.ts \
  packages/architecture-enforcement/src/ownership-map.ts \
  packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json \
  packages/architecture-enforcement/src/config/baselines/database.v1.json \
  packages/architecture-enforcement/src/config/ownership-map.v1.json \
  > /tmp/opencode/durable-job-analyzer-green.patch
sha256sum /tmp/opencode/durable-job-analyzer-green.patch
git apply --check --reverse /tmp/opencode/durable-job-analyzer-green.patch
git restore --source=HEAD -- \
  packages/architecture-enforcement/src/analyzer.ts \
  packages/architecture-enforcement/src/contracts.ts \
  packages/architecture-enforcement/src/ownership-map.ts \
  packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json \
  packages/architecture-enforcement/src/config/baselines/database.v1.json \
  packages/architecture-enforcement/src/config/ownership-map.v1.json
git apply --check /tmp/opencode/durable-job-analyzer-green.patch
```

Restore to current `HEAD`, not to Gate 1, during this preflight.
Do not use the saved patch to restore drifted v1 files before Red.
Green restores exact Gate 1 v1 bytes only after the immutability Red records mismatches.

## Exact v2 tenant-registry exception

The v2 ownership map must contain this exact exception required by the committed Reds:

```json
{
  "schemaVersion": 1,
  "id": "durable-job-tenant-registry-classification",
  "ruleId": "DURABLE_JOB_DATABASE_BOUNDARY",
  "sourcePath": "packages/domain/src/tenant-registry.ts",
  "owner": "domain-platform",
  "rationale": "Mandatory TenantDB classification only; no durable-job queries or mutation."
}
```

This exception applies only to `static-import` evidence.
Query calls, client construction, namespace imports, dynamic imports, CommonJS requires, and re-exports remain findings.

Use the generic ownership-policy evaluator for this scope.
Do not add a separate classification policy record.
Do not add a tenant-registry source-path branch to the analyzer or another generic enforcement module.
Do not add this exception to any v1 file.

The committed hardening tests already cover this behavior.
The relevant commits are `9275d4977` and `ebf4cd435`.
Do not add another analyzer fixture or analyzer-behavior Red suite.

## Minimal Red plan

The Red role may add only these test files and one evidence file:

| File                                                                                     | Required Red contract                                                                                                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/architecture-enforcement/src/__tests__/policy-selection-v2.red.test.ts`        | Reuse existing hardening fixtures to prove immutable v1 output parity, v2 detection, candidate validation, and default v1 selection before acceptance. |
| `packages/architecture-enforcement/src/__tests__/v1-immutability-v2.red.test.ts`         | Compare clean-HEAD bytes with Gate 1 bytes. Expose every v1 mismatch. Reject changed v1 bytes and v1 replacement writes.                               |
| `packages/architecture-enforcement/src/__tests__/reconciliation-manifest-v2.red.test.ts` | Prove strict v2 manifest fields, artifact hashes, canonical ordering, review bindings, and zero baseline entry additions.                              |
| `measure/tracks/durable_job_worker_platform_20260713/analyzer-reconciliation-v2-red.md`  | Record the Red command, named failures, source commit, and exact file hashes.                                                                          |

The Red role must not add `analyzer-policy-selector.json`.
It must not add another fixture suite, baseline entries, a second policy artifact, or an architecture preview suite.

The three Red suites must fail because v2 code or artifacts are absent.
They must not pass because an input set is empty.
They must not fail because of an unrelated import, transform, or environment error.

The named Red failures are:

- explicit v1 selection runs current v2 hardening or changes accepted v1 output;
- policy/version selection is absent or infers v2 from file presence;
- clean-HEAD v1 bytes differ from Gate 1 and the immutability contract does not expose every mismatch;
- changed v1 bytes are accepted or a v2 operation can replace v1 files;
- v2 manifest fields, hashes, ordering, review bindings, or zero-entry deltas are not enforced.

## Minimum Green boundary

Green must add the smallest provider-neutral implementation for the three Red contracts.
Green must not reapply the saved dirty patch.
Green must not preserve hard-coded exception branches that alter v1 behavior.

### Policy and version selection

Add a code selector that accepts `v1`, `v2`, or no policy value.
Add `--policy v1|v2` to architecture check, baseline validation, and reconciliation commands.

Explicit `v1` validates and selects only the accepted v1 artifact family and compatibility behavior.
Explicit `v2` validates the v2 candidate without activating it as the default.
No policy value selects v1 until every v2 acceptance condition passes.
Only then may the no-value path select v2.

The selector must validate the protected v1 manifest SHA on every selection.
It must not infer a policy from the presence of a v2 file.
Human and JSON summaries must identify the selected policy and its candidate or default state.

The policy-selection Red must run the existing hardening fixture inputs under both policies.
For the same fixture inputs, the v1 run must preserve the accepted v1 findings and output.
The v2 run must detect the hardened analyzer cases.
Use the committed fixtures from `packages/architecture-enforcement/src/__tests__/analyzer-hardening.test.ts`.
Do not copy them into a new fixture file or add another fixture suite.

### Immutable v1 output oracle

Derive the v1 output oracle from the Gate 1 analyzer at commit `4ff2caecf8d38622fa727bddb3e1c763f02a7451`.
Run that analyzer against the existing hardening fixture inputs.
Capture findings, diagnostics, ordering, counts, and serialized output exactly.
Embed the resulting expectations in a deep-frozen constant in `policy-selection-v2.red.test.ts`.
Use the same inputs under explicit v1 selection.
Require byte-identical output against the oracle.
Do not create a fixture, snapshot, or separate oracle file.

V1 must use the historical analyzer behavior bound by the archived v1 manifest.
V2 may use current hardened analyzer logic where the v2 policy differs.
No v2-only hardening behavior may execute during explicit v1 selection.

Do not create a selector JSON file.
Keep activation status and its manifest binding in the v2 manifest and owner acceptance receipt.

Red records the mismatches before Green restoration.
Green restores every v1 artifact to its exact Gate 1 bytes.
Green uses the archived Gate 1 lineage.
Green requires all four accepted v1 hashes to match before acceptance.

### V2 artifact family

Green must create only these v2 artifacts:

1. `packages/architecture-enforcement/src/config/ownership-map.v2.json`
2. `packages/architecture-enforcement/src/config/baselines/database.v2.json`
3. `packages/architecture-enforcement/src/config/baselines/provider.v2.json`
4. `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json`

The v2 ownership map preserves the accepted v1 rules, roots, matchers, and existing exceptions.
It adds only the exact tenant-registry exception above.
Its generic evaluator allows that exception only for `static-import` evidence.

The v2 baselines contain the exact accepted v1 entry bytes.
They add no database entry, provider entry, or exception-covered baseline entry.

The v2 manifest must bind:

- the protected v1 manifest SHA-256;
- the archived v1 historical analyzer tree binding as an immutable reference;
- the accepted v1 ownership-map and baseline file hashes;
- the v2 ownership-map and baseline paths with exact-byte hashes;
- the current v2 analyzer implementation tree SHA-256;
- the v2 implementation and test tree SHA-256;
- the ordered analyzer input path-and-byte snapshot SHA-256;
- two byte-identical report SHA-256 values;
- one review subject SHA-256;
- fresh Luna review evidence SHA-256 values;
- empty baseline addition, removal, and rename arrays;
- acceptance status and the final manifest activation binding.

The validator must reject duplicate or unordered arrays.
It must reject changed artifact bytes, wildcard paths, source bodies, secrets, and unbound review records.
The final manifest hash is computed last and never includes itself.

## Zero baseline entry additions

V2 must prove complete entry equality with v1:

```text
ordered(v2.database.entries) == ordered(v1.database.entries)
ordered(v2.provider.entries) == ordered(v1.provider.entries)
```

The comparison must use complete entry bytes.
The v2 manifest must contain these exact values:

```json
{
  "baselineAdditions": [],
  "baselineRemovals": [],
  "baselineRenames": []
}
```

The existing tenant-registry static-import finding remains covered by policy.
The v2 exception must not create a new baseline entry.

The current v2 architecture comparison reports 143 additions.
Those additions keep v2 candidate-only until source migration or false-positive correction removes them.
Do not add those findings to either v2 baseline.

## Hash rules

Hash exact UTF-8 file bytes.
Use lowercase hexadecimal SHA-256 values.
Use `compareStableStrings` for every path and semantic array order.

Compute hashes in this order:

1. Verify the v1 manifest against `4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0`.
2. Verify the accepted v1 ownership-map and baseline hashes.
3. Hash the v2 ownership map and both v2 baselines.
4. Hash the ordered analyzer implementation tree.
5. Hash the ordered v2 implementation and test tree.
6. Hash the ordered analyzer input path-and-byte snapshot.
7. Hash two byte-identical analyzer reports.
8. Build the review subject without review records or acceptance receipts.
9. Hash the review subject and bind it to every fresh Luna review.
10. Hash each exact review evidence file.
11. Serialize the final v2 manifest with stable ordering and one trailing newline.
12. Hash the final v2 manifest bytes last.

No review subject may include mutable review evidence.
No manifest hash may include itself.

## Acceptance and default activation

V2 remains a candidate during Red, Green, hash verification, and review.
Four fresh Luna reviews must inspect the same final v2 review subject.
Each review receipt must include the protected v1 manifest SHA and every v2 artifact hash.

Before default activation, `architecture:check --policy v2` must exit zero and report clean.
It must report zero baseline additions, removals, and renames.
The 143 current additions therefore block v2 default activation until source migration or false-positive correction succeeds.

An owner acceptance receipt must bind the accepted v2 manifest SHA.
The v2 manifest must bind the accepted artifact hashes, zero baseline deltas, review subject, and review evidence.
Only this accepted state may change the no-policy default from v1 to v2.

Task 14a is not accepted until all of these gates pass:

1. The three Red suites fail for the named missing behaviors.
2. Explicit v1 selection matches the immutable Gate 1 output oracle.
3. All v1 artifacts match their exact Gate 1 bytes after Green restoration.
4. Explicit v2 selection passes with a clean zero-delta architecture result.
5. Four Luna reviews inspect one review subject and bind every artifact hash.
6. The owner receipt binds the accepted v2 manifest SHA.

## Phase-base capture

Commit the strategy and plan update together in one strategy-plus-plan commit.
Capture `phase_base_sha` after that commit and before any Red change.

At the capture point:

1. Complete the Clean-HEAD preflight.
2. Confirm the strategy-plus-plan commit is on `master`.
3. Confirm no intended track-owned path is dirty.
4. Preserve unrelated dirty paths.
5. Do not stage unrelated dirty paths.
6. Run `git rev-parse HEAD`.
7. Record the printed value as `phase_base_sha` in orchestrator state.

No v2 Red or Green source commit may precede this capture.
This documentation task does not perform the commit or capture.

## Structural edit gate

After any structural TypeScript edit, update the codebase graph before the next verification.
Structural edits include signature, import, export, schema, and JSX changes.

Use:

```bash
build-graph update ./graph.db <changed-files>
```

This Markdown-only revision does not require a graph update.

## Focused commands

### Accepted v1 byte check

```bash
sha256sum \
  packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json \
  packages/architecture-enforcement/src/config/ownership-map.v1.json \
  packages/architecture-enforcement/src/config/baselines/database.v1.json \
  packages/architecture-enforcement/src/config/baselines/provider.v1.json
```

Record all four outputs before Red proceeds.
The Red must expose each mismatch against the accepted lineage table.
Green must restore exact Gate 1 bytes and rerun this check.

### Red

```bash
CI=true pnpm --filter @reading-advantage/architecture-enforcement exec vitest run \
  src/__tests__/policy-selection-v2.red.test.ts \
  src/__tests__/v1-immutability-v2.red.test.ts \
  src/__tests__/reconciliation-manifest-v2.red.test.ts
```

The Red command must exit non-zero for the named missing v2 behavior.

### Green package gates

```bash
CI=true pnpm --filter @reading-advantage/architecture-enforcement exec vitest run \
  src/__tests__/policy-selection-v2.red.test.ts \
  src/__tests__/v1-immutability-v2.red.test.ts \
  src/__tests__/reconciliation-manifest-v2.red.test.ts \
  src/__tests__/contracts.test.ts \
  src/__tests__/ownership-map.test.ts \
  src/__tests__/analyzer-hardening.test.ts
pnpm --filter @reading-advantage/architecture-enforcement check-types
pnpm --filter @reading-advantage/architecture-enforcement lint
pnpm --filter @reading-advantage/architecture-enforcement build
```

Run these gates after Green restores exact Gate 1 v1 bytes.
The committed hardening tests remain the analyzer behavior gate.
No new analyzer Red suite is required.

### Policy and manifest gates

```bash
pnpm architecture:baseline:validate --policy v1 --format json
pnpm architecture:baseline:validate --policy v2 --format json
pnpm architecture:check --policy v1 --format json
pnpm architecture:check --policy v2 --format json
```

The v1 commands must identify v1.
The v2 commands may identify a candidate before acceptance.
The no-policy command must identify v1 until acceptance and activation.

### Prettier and diff check

```bash
node_modules/.bin/prettier --write \
  measure/tracks/durable_job_worker_platform_20260713/analyzer-reconciliation-v2-strategy.md \
  measure/tracks/durable_job_worker_platform_20260713/plan.md
git diff --check -- \
  measure/tracks/durable_job_worker_platform_20260713/analyzer-reconciliation-v2-strategy.md \
  measure/tracks/durable_job_worker_platform_20260713/plan.md
```

## Non-goals

- Do not accept or rewrite the v1 manifest.
- Do not add database or provider baseline entries.
- Do not add a classification policy record.
- Do not add a source-path branch for tenant-registry behavior.
- Do not change durable-job lifecycle, PostgreSQL schema, migrations, or queue behavior.
- Do not claim v2 acceptance or default activation in this document.

## Current status

The owner decision, accepted v1 lineage, exact exception, minimal Red plan, and activation gates are recorded.
V2 artifacts, Red evidence, Green evidence, fresh Luna reviews, and the acceptance receipt are not recorded here.
