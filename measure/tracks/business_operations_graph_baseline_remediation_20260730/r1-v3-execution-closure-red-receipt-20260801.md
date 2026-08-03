# R1 v3 Execution-Closure Red Receipt (2026-08-01)

## Status

**RED - the v2 blocker addendum is not yet provenance-complete, static input
discovery is absent, and no v3 execution-closure candidate exists.**

This corrective Red contract preserves the immutable v2 blocker Markdown
records, product code, Finance, R2 acceptance, and successor markers.

## Command

```bash
CI=true PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_business_operations_graph_baseline_r1_r2_v2_acceptance \
  measure.tests.test_business_operations_graph_baseline_execution_closure
```

## Result

The command ran **11 tests in 1.596s** and failed with **5 expected failures**.
The five v2 candidate-boundary tests and the pinned v2 blocker-boundary test
passed.

The focused failures are:

1. The addendum receipt's `subordinateReferences` duplicates prior raw
   streams. It must instead be exactly hash-bound references to its
   `execution-provenance.json` and
   `execution-input-omission-ledger.json`.
2. `V3_EXECUTION_DISCOVERY_HELPER_MISSING`: no
   `discover_execution_inputs_v1(root, entrypoints)` seam exists.
3. Three candidate assertions stop at
   `V3_EXECUTION_CLOSURE_MANIFEST_MISSING:
   r1-v3-execution-closure-20260801/execution-closure.manifest.json`.

The existing addendum and its current helper are only a blocked-v2 starting
point; neither is accepted as v3 evidence.

## Required implementation contract

The discovery seam must recursively follow package-script hops, static
JavaScript/TypeScript `new URL(..., import.meta.url)` reads, and static shell
SQL-file arguments. The Red fixture requires discovery to change when a source
path is renamed, and to fail closed on environment-derived paths, globs, or
shell-variable file arguments.

The addendum validator must additionally reject missing or tampered:

- ordered materializer/replay argv, cwd, CI-only scrubbed environment, explicit
  absence predicates, network prohibition, exit code, and raw streams;
- Node, pnpm, and scanner identities with version-output hashes;
- a real isolated `discover-v2` child command with argv/cwd/CI-only
  environment, absence predicate, network=false, zero exit, and exact
  hash-bound stdout/stderr raw references; synthetic, missing, or altered
  command and stream evidence must fail validation;
- pre/post source-inventory equality and realpath containment, including no
  shared-worktree or `node_modules` overlay paths;
- AST/import/export/static-path discovery trace rows, per-use source-range
  hashes and resolution IDs, and a row digest;
- the two ordered 0044 consumer rows with distinct `resolutionTraceId`
  values and consumer source-range hashes, plus the same shared named-URL
  resolution-source hash; collapsing, duplicating, or mismatching those rows
  is a validator failure;
- subordinate artifact references, v2 bindings, raw-stream references,
  immutable non-derivable omissions, and blocked markers.

Create the v3 archive, ledger, profile, receipt, and fresh graph/audit/
compensation derivations only after that. The v3 ledger records ordered
entrypoint/package-script expansion with source-range hashes. The profile and
receipt bind matching tool identities plus the frozen archive and lockfile
entry, but must never byte-reference the top-level manifest. Every recorded
command has ordered argv/cwd, scrubbed environment and absence predicates,
network=false, exit code, and raw streams. A validator rejects any
`frozenInputs.manifest` field.

The receipt's `gateStatus` is computed from the ordered command list and
actual exit-code map; it must include the expected and observed
`PG_TEST_URL`-absence skip census and may be `PASS` only when every
recorded command exits zero. A manually retained PASS after a nonzero command
is a validator failure. Standard-pack generation remains either a source input
or an explicitly recorded generator argv/input/output digest.

## Non-cyclic provenance contract

The v3 manifest is the top-level index: `manifest.derivedEvidence` binds
fresh `graph-binding.json`, `clean-audit-attempt.json`, and
`compensation-denominator.json`. Its `closureCore` exactly hash-binds
the v3 archive, omissions ledger, execution profile, and execution receipt;
`closureSha256` is recomputed from that acyclic DAG core.

Each derivative binds only that immutable closure core:

- v3 archive reference;
- v3 omissions-ledger reference;
- v3 execution-profile reference;
- v3 execution-receipt reference;
- `closureSha256`, recomputed by the validator from the manifest.

A derivative never contains a byte reference to its own manifest. Replacing a
core reference with a v2 candidate reference or changing `closureSha256`
must fail validation.

## Boundary preservation

The v2 Red contract and receipt remain unchanged:

- `measure/tests/test_business_operations_graph_baseline_r2_accounts_v2.py`
  SHA-256: `564e0436127bee4886e4c527eb9732c072bf6a01d9a9a4ead92c156803f4a7e6`
- `r2-task3-v2-red-receipt-20260801.md`
  SHA-256: `9fb307020e67573c46f6c05ef3a94b8d0328c4eff52126daf8081756fc7c2bdf`

R1 v3 remains `[~]`. R2 Tasks 3-5, all R3 work, and every parent/successor
gate remain `[b]`. No independent acceptance is claimed.
