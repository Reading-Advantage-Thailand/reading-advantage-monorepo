# Analyzer Reconciliation v2 Strategy

## Scope and status

This document defines the Task 14a strategy for `durable_job_worker_platform_20260713`.
It records the Red and Green plan only.
It records no acceptance decision.

This correction owns this strategy file and the track plan only.
It must not stage, commit, or modify another file.

## Owner decision

Build v2 as a separate policy, baseline, and manifest artifact family.
Keep every accepted v1 byte immutable.

The accepted v1 manifest must retain this exact raw SHA-256:

`4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0`

V2 must not rewrite, rehash, or replace any v1 artifact.
V2 remains a candidate until its artifacts pass validation and fresh Luna reviews pass.
V2 becomes the default only after the validated committed manifest records accepted artifacts, fresh Luna reviews, and an owner receipt.

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

The completed preflight saved the six Green files outside the repository.
The saved versions contained hard-coded exception branches that violate this target.
Those branches must not survive in a commit.

The recorded clean reference commit is `628468dae86c688d14f5667109e39d1d3ab9b710`.
This commit is not the future `phase_base_sha`.

| Green file                                                                     | Clean-HEAD blob SHA                        | Clean-HEAD raw SHA-256                                             |
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

The completed preflight record is:

- saved patch: `/tmp/opencode/durable-job-analyzer-green.patch`;
- saved patch SHA-256: `3ae3d00787c8a071410adb9cb9d143a7b40997602dc551d35f6158942e1ad86d`;
- reverse apply check: verified before restoration;
- restoration: all six files restored to current `HEAD`;
- current state: all six files are clean;
- forward apply check: passes against the clean tree;
- reverse apply check: not expected against the clean tree;
- saved patch: not staged or committed.

The clean files remain at `HEAD` before Red.
Red must expose the ownership-map mismatch against Gate 1.
Green restores exact Gate 1 v1 bytes only after Red records mismatches.

## Audited Red lease

The saved Red patch is `/tmp/opencode/analyzer-v2-red-lease.patch`.
Its SHA-256 is `7310e61e7343ba25e21a48246d4fb32af4139e0250779906299b6d377b81f4e`.
The patch is evidence only and must not be staged or committed.

The patch records the prior Red base `310847b15f9a2f59982208bdae1581ca605b6674`.
That base is obsolete after this correction.
Capture a new phase base after this correction and before applying the Red patch.

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
Do not add another fixture set or analyzer-behavior Red suite.
The approved helper extracts the existing fixture set without adding inputs.

## Minimal Red plan

The Red role may add these test files, one shared test-input helper, and one
evidence file:

| File                                                                                     | Required Red contract                                                                                                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/architecture-enforcement/src/__tests__/policy-selection-v2.red.test.ts`        | Reuse existing hardening fixtures to prove immutable v1 output parity, v2 detection, candidate validation, and default v1 selection before acceptance. |
| `packages/architecture-enforcement/src/__tests__/v1-immutability-v2.red.test.ts`         | Compare clean-HEAD bytes with Gate 1 bytes. Expose every v1 mismatch. Reject changed v1 bytes and v1 replacement writes.                               |
| `packages/architecture-enforcement/src/__tests__/reconciliation-manifest-v2.red.test.ts` | Prove strict v2 manifest fields, artifact hashes, canonical ordering, review bindings, and zero baseline entry additions.                              |
| `packages/architecture-enforcement/src/__tests__/fixtures/analyzer-hardening-inputs.ts`  | Export the existing hardening source paths and source bytes without assertions or test registration.                                                   |
| `measure/tracks/durable_job_worker_platform_20260713/analyzer-reconciliation-v2-red.md`  | Record the Red command, named failures, source commit, and exact file hashes.                                                                          |

The Red role must not add `analyzer-policy-selector.json`.
It may modify `analyzer-hardening.test.ts` only to consume the shared helper.
That refactor must preserve every existing assertion and expected result.
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
Move their exact source paths and source bytes into the approved shared helper.
Import that helper from both Red suites.
Do not duplicate those inputs or add another fixture suite.

### Immutable v1 output oracle

Derive the v1 output oracle from the Gate 1 analyzer at commit `4ff2caecf8d38622fa727bddb3e1c763f02a7451`.
Run that analyzer against the existing hardening fixture inputs.
Capture findings, diagnostics, ordering, counts, and serialized output exactly.
Embed the resulting expectations in a deep-frozen constant in `policy-selection-v2.red.test.ts`.
Use the same inputs under explicit v1 selection.
Require byte-identical output against the oracle.
Do not create a snapshot or separate oracle file.

V1 must use the historical analyzer behavior bound by the archived v1 manifest.
V2 may use current hardened analyzer logic where the v2 policy differs.
No v2-only hardening behavior may execute during explicit v1 selection.

Do not create a selector JSON file.
Keep activation status and its manifest binding in the v2 manifest and owner acceptance receipt.

The selector accepts only `v1`, `v2`, or no policy.
It rejects every other policy value.
Every selection result exposes `status`, `defaultPolicy`, and `manifestSha256`.
These fields come from the validated committed manifest, not from the request or candidate bytes.
Explicit v1, explicit v2, and no-policy results expose the same committed-manifest status and hash.
The accepted v1 artifact hashes remain internal constants.

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
- acceptance status, default policy, and owner receipt path/hash binding.

The validator must reject duplicate or unordered arrays.
It must reject changed artifact bytes, wildcard paths, source bodies, secrets, and unbound review records.

The v2 manifest must use these exact review and acceptance bindings:

- `reviewSubjectSha256` is the SHA-256 of canonical protected manifest fields;
- the review subject excludes `reviews`, `acceptance`, `reviewSubjectSha256`, and itself;
- each review evidence file binds `role`, `reviewer`, `result`, `reviewSubjectSha256`, `v1ManifestSha256`, the exact v2 artifact references, and three empty baseline-delta arrays;
- each manifest review record stores the evidence path and exact evidence SHA-256;
- the owner receipt binds `ownerId`, `reviewSubjectSha256`, `v1ManifestSha256`, the exact v2 artifact references, and three empty baseline-delta arrays;
- accepted `acceptance.ownerBinding` stores the owner receipt path, owner receipt SHA-256, and owner review subject;
- the owner receipt must not bind the final manifest SHA-256.

Candidate review records form an ordered prefix of the four required roles:
`adversarial-testing`, `correctness`, `developer-api`, and `security`.
Candidate status requires `defaultPolicy: "v1"` and no owner binding.
Accepted status requires all four reviews, `defaultPolicy: "v2"`, and a valid owner binding.
Use one evidence path for each role under
`measure/tracks/durable_job_worker_platform_20260713/reviews/`.
Use `measure/tracks/durable_job_worker_platform_20260713/owner-receipt.json` for the owner receipt.

The final manifest hash is computed last.
Its hash is not an input to the review subject or owner receipt.

The exact v2 artifact references exclude the v2 manifest itself.
They contain the v2 ownership map and the two v2 baselines.
The complete write set also contains the v2 manifest.
The manifest must not create a self-reference through its artifact list.

### Policy-aware writes

Policy-aware writes accept only `policyVersion: "v2"` and this complete destination set:

1. `packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json`
2. `packages/architecture-enforcement/src/config/ownership-map.v2.json`
3. `packages/architecture-enforcement/src/config/baselines/database.v2.json`
4. `packages/architecture-enforcement/src/config/baselines/provider.v2.json`

An exact v2 dry run is allowed and must apply no bytes.
Invalid dry and non-dry requests must fail before any write.
Reject v1, partial, mixed, unknown, wildcard, traversal, and other non-exact destination sets.
Rejected requests must preserve every v1 byte.

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
8. Build the review subject from protected manifest fields only.
9. Exclude reviews, acceptance, `reviewSubjectSha256`, and itself from that subject.
10. Hash the review subject and bind it to every fresh Luna review and the owner receipt.
11. Hash each exact review evidence file and the owner receipt.
12. Serialize the final v2 manifest with stable ordering and one trailing newline.
13. Hash the final v2 manifest bytes last.

No review subject may include mutable review evidence.
No manifest hash may include itself.

## Acceptance and default activation

V2 remains a candidate during Red, Green, hash verification, and review.
Four fresh Luna reviews must inspect the same final v2 review subject.
Each review evidence file must include its role, reviewer, result, review subject, protected v1 manifest hash, exact v2 artifact references, and zero deltas.
The manifest must record each evidence path and evidence hash.

Before default activation, `architecture:check --policy v2` must exit zero and report clean.
It must report zero baseline additions, removals, and renames.
The 143 current additions therefore block v2 default activation until source migration or false-positive correction succeeds.

The owner receipt must bind `ownerId`, the owner review subject, the protected v1 manifest hash, exact v2 artifact references, and zero deltas.
The accepted manifest must bind the owner receipt path, owner receipt hash, and owner review subject.
The owner receipt must not bind the final manifest SHA.
Only this accepted state may change the no-policy default from v1 to v2.

Task 14a is not accepted until all of these gates pass:

1. The three Red suites fail for the named missing behaviors.
2. Explicit v1 selection matches the immutable Gate 1 output oracle.
3. All v1 artifacts match their exact Gate 1 bytes after Green restoration.
4. Explicit v2 selection passes with a clean zero-delta architecture result.
5. Four Luna reviews inspect one review subject and bind every artifact hash.
6. The accepted manifest binds the owner receipt path/hash and owner review subject.

## Phase-base capture

Commit the strategy and plan update together in one strategy-plus-plan commit.
Capture a new `phase_base_sha` after that correction commit while the Red files are absent.
Do not reuse `310847b15f9a2f59982208bdae1581ca605b6674`.
Do not apply the saved Red patch before this capture.

At the capture point:

1. Complete the Clean-HEAD preflight.
2. Confirm the strategy-plus-plan commit is on `master`.
3. Confirm the three Red suites, shared helper, and Red evidence file are absent.
4. Confirm no intended track-owned path is dirty.
5. Preserve unrelated dirty paths.
6. Do not stage unrelated dirty paths.
7. Run `git rev-parse HEAD`.
8. Record the printed value as `phase_base_sha` in orchestrator state.

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
