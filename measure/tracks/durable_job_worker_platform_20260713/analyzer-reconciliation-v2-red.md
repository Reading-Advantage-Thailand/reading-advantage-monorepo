# Coding v2 Red Evidence

## Scope

This lease implements Coding v2 Red only.

Phase base: `f09c14f147ed4e9a0517167e6c37da7d64134ccf`.

Gate 1 analyzer source: `4ff2caecf8d38622fa727bddb3e1c763f02a7451`.

The lease changed no production source.
It changed no APK path.
It changed no unrelated dirty path.

Changed paths are:

```text
packages/architecture-enforcement/src/__tests__/analyzer-hardening.test.ts
packages/architecture-enforcement/src/__tests__/fixtures/analyzer-hardening-inputs.ts
packages/architecture-enforcement/src/__tests__/policy-selection-v2.red.test.ts
packages/architecture-enforcement/src/__tests__/v1-immutability-v2.red.test.ts
packages/architecture-enforcement/src/__tests__/reconciliation-manifest-v2.red.test.ts
measure/tracks/durable_job_worker_platform_20260713/analyzer-reconciliation-v2-red.md
```

The shared helper contains 13 source paths.
It contains one direct-origin source and 12 durable-access sources.
The hardening suite retains both tests and every existing assertion.

## Preflight and immutable hashes

The phase-base preflight found all six Green source paths clean.
The saved external Green patch remains outside the repository.

```text
Saved patch: /tmp/opencode/durable-job-analyzer-green.patch
Patch SHA-256: 3ae3d00787c8a071410adb9cb9d143a7b40997602dc551d35f6158942e1ad86d
```

The accepted v1 manifest SHA-256 is:

```text
4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0
```

The accepted v1 artifact hashes and current clean-HEAD hashes are:

| Artifact                          | Gate 1 SHA-256                                                     | Current clean-HEAD SHA-256                                         |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `analyzer-reconciliation.v1.json` | `4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0` | `4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0` |
| `ownership-map.v1.json`           | `f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8` | `638ff3e0913e976b54d9c41810180bb4095f01c28289c9867dcc60fed1f3f401` |
| `baselines/database.v1.json`      | `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73` | `8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73` |
| `baselines/provider.v1.json`      | `7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5` | `7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5` |

The v1 Red therefore exposes the clean-HEAD ownership-map drift.

The Gate 1 output oracle uses the shared inputs.
The direct-origin oracle contains three findings and zero diagnostics.
The durable-access oracle contains five findings and zero diagnostics.

The exact serialized oracle hashes are:

| Input set       | Findings | Diagnostics | Serialized output SHA-256                                          |
| --------------- | -------: | ----------: | ------------------------------------------------------------------ |
| `directOrigins` |        3 |           0 | `2b5ea6ed3e9225df6eb81febec4d642d251f86733420193a1d9907eadd96c301` |
| `durableAccess` |        5 |           0 | `8e8ebf399ca419bf271b888a1f0f30c528e85906b0c15bf258e9160d14f11de5` |

The public selector accepts only explicit `v1`, explicit `v2`, or no policy.
Explicit selection returns the requested policy.
No-argument selection returns only candidate/default-v1 or accepted/default-v2.
Both policy probes apply the existing direct-origin matcher to the selected config.
Both analyzer probes pass `policyVersion` through the expected analyzer options shape.
The v1 validator receives only `repoRoot`.
The v1 validator positive case reads every Gate 1 artifact with `git show`.
The v1 suite copies all four artifacts before validation.
The write-guard probe uses exact v1 and v2 destination paths, with no destination version argument.
Both modes reject partial, mixed, unknown, wildcard, traversal, and complete v1 destination sets.
The guard compares v1 bytes before and after every rejected operation.
The v2 validator receives `{ repoRoot, manifest }`.
Validator success requires `{ valid: true }`.
The manifest suite computes review subjects from protected fields without reviews, acceptance, or self-reference.
Review evidence includes reviewer, result, and zero baseline-delta arrays.
The manifest suite checks ordering, wildcard paths, source bodies, secrets, tampered bindings, evidence bytes, lifecycle states, review prefixes, and owner receipts.
Generated review records use four distinct evidence hashes.
Temporary review and owner-receipt files are built under `/tmp/opencode/architecture-v2-red`.

## Red command

Command:

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red CI=true pnpm --filter @reading-advantage/architecture-enforcement exec vitest run src/__tests__/policy-selection-v2.red.test.ts src/__tests__/v1-immutability-v2.red.test.ts src/__tests__/reconciliation-manifest-v2.red.test.ts
```

Result: exit `1`.

The run executed three files and ten tests.
It reported zero passed tests and ten failed tests.
It reported no transform, import, or environment failure.

The ten failed tests were:

1. `policy-selection-v2.red.test.ts` — preserves the Gate 1 v1 findings, diagnostics, ordering, counts, and bytes.
2. `policy-selection-v2.red.test.ts` — detects hardened analyzer cases under explicit v2 selection.
3. `policy-selection-v2.red.test.ts` — accepts explicit v1/v2 and restricts no-policy default states.
4. `v1-immutability-v2.red.test.ts` — exposes every clean-HEAD mismatch against the Gate 1 v1 lineage.
5. `v1-immutability-v2.red.test.ts` — validates the Gate 1 artifact family and rejects changed bytes.
6. `v1-immutability-v2.red.test.ts` — allows v2 dry-run and rejects v2-to-v1 destinations without changing bytes.
7. `reconciliation-manifest-v2.red.test.ts` — requires the strict v2 manifest and complete artifact family.
8. `reconciliation-manifest-v2.red.test.ts` — binds committed lifecycle, hashes, evidence, reviews, and zero baseline deltas.
9. `reconciliation-manifest-v2.red.test.ts` — rejects malformed ordering, paths, secrets, bindings, and hashes.
10. `reconciliation-manifest-v2.red.test.ts` — accepts candidate prefixes and accepted owner activation only.

## Hardening preservation

Command:

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red CI=true pnpm --filter @reading-advantage/architecture-enforcement exec vitest run src/__tests__/analyzer-hardening.test.ts
```

Result: exit `1`; two tests ran, one passed, and one failed.
The failed test was `enforces durable access forms outside the adapter and allows adapter SQL`.
The exact extracted inputs and all existing assertions remain unchanged.

## Verification

Typecheck:

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red pnpm --filter @reading-advantage/architecture-enforcement check-types
```

Result: exit `0`.

ESLint package gate:

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red pnpm turbo run lint --filter=@reading-advantage/architecture-enforcement
```

Result: exit `0` with no warnings.

Prettier:

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red pnpm exec prettier --check packages/architecture-enforcement/src/__tests__/analyzer-hardening.test.ts packages/architecture-enforcement/src/__tests__/fixtures/analyzer-hardening-inputs.ts packages/architecture-enforcement/src/__tests__/policy-selection-v2.red.test.ts packages/architecture-enforcement/src/__tests__/v1-immutability-v2.red.test.ts packages/architecture-enforcement/src/__tests__/reconciliation-manifest-v2.red.test.ts measure/tracks/durable_job_worker_platform_20260713/analyzer-reconciliation-v2-red.md
```

Result: exit `0`.

Diff check:

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red git diff --check -- packages/architecture-enforcement/src/__tests__/analyzer-hardening.test.ts packages/architecture-enforcement/src/__tests__/fixtures/analyzer-hardening-inputs.ts packages/architecture-enforcement/src/__tests__/policy-selection-v2.red.test.ts packages/architecture-enforcement/src/__tests__/v1-immutability-v2.red.test.ts packages/architecture-enforcement/src/__tests__/reconciliation-manifest-v2.red.test.ts measure/tracks/durable_job_worker_platform_20260713/analyzer-reconciliation-v2-red.md
```

Result: exit `0`.

Build graph update:

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red build-graph update ./graph.db packages/architecture-enforcement/src/__tests__/analyzer-hardening.test.ts packages/architecture-enforcement/src/__tests__/fixtures/analyzer-hardening-inputs.ts packages/architecture-enforcement/src/__tests__/policy-selection-v2.red.test.ts packages/architecture-enforcement/src/__tests__/v1-immutability-v2.red.test.ts packages/architecture-enforcement/src/__tests__/reconciliation-manifest-v2.red.test.ts
```

Result: `Updated 5 files (81 → 81 nodes, 88 → 88 edges)`.

## No-source-change proof

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red git rev-parse HEAD
```

Output:

```text
f09c14f147ed4e9a0517167e6c37da7d64134ccf
```

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red git diff --name-only f09c14f147ed4e9a0517167e6c37da7d64134ccf HEAD
```

Output: empty.

```bash
ARCHITECTURE_TEST_TMPDIR=/tmp/opencode/architecture-v2-red git diff --quiet f09c14f147ed4e9a0517167e6c37da7d64134ccf HEAD -- packages/architecture-enforcement/src/analyzer.ts packages/architecture-enforcement/src/contracts.ts packages/architecture-enforcement/src/ownership-map.ts packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json packages/architecture-enforcement/src/config/baselines/database.v1.json packages/architecture-enforcement/src/config/ownership-map.v1.json
```

Result: exit `0`.

No changes were staged.
No commit was created.
