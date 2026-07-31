# R1 Task 2/3 Stable-Window Source and Graph Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Scope: R1 Tasks 2 and 3 only; this is candidate evidence, not R2/R3
  acceptance and not authorization to unblock either successor.
- Canonical scan: `repo-graph scan . ./graph.db`, executed by
  `produce_scan_bracketed_snapshot` strictly between the producer's pre- and
  post-scan denominator/state captures.
- Source bundle: [`r1-task2-source-and-graph-20260731/`](./r1-task2-source-and-graph-20260731/)
- Graph/probe evidence: [`r1-task3-graph-binding-20260731.json`](./r1-task3-graph-binding-20260731.json)

## Corrective capture history

The first current-head scan-bracketed capture was verified and published only
temporarily. Before it was retained, graph-to-snapshot reconciliation found 24
scanner-emitted `.next/**/*.d.ts` rows missing from the source denominator.
The temporary publication was removed without commit. A focused Red test then
proved the gap, and the minimal producer correction stopped excluding `.next`
from its candidate-TypeScript walk. The focused Green suite below includes the
new test. The retained bundle is the fresh capture made after that correction.

## Source binding and durable publication

| Property | Value |
| --- | --- |
| Rich source schema | `3` |
| R0 projection schema | `1` |
| Snapshot entries / replay entries | `6783` / `6783` |
| Source denominator SHA-256 | `9786969557e9e36782473d90c823cec1eaf18d7d369d2133691099a45ccf55eb` |
| Pre/post HEAD | `0dad54c3c1cdfcce1a06220cb0c3a5f92e319b27` / same |
| Branch | `master` |
| Tool version | `0.1.0` |
| Workspace globs | `apps/*`, `packages/*`, `packages/integrations/*`, `services/*` |
| Published artifact count | `9` |

`verify_scan_bracketed_snapshot` succeeded against both the external bundle and
the durable copy. The rich pre/post state artifacts are byte-identical, their
denominator/status/porcelain/staged-diff digests are equal, and the scan record
binds both state-artifact references plus the generated graph reference. Every
published artifact's immutable path, size, and SHA-256 is recorded in the
Task 3 evidence.

## Graph binding and exact probes

| Property | Value |
| --- | --- |
| `graph.db` SHA-256 | `77877db9915dd928be649074cf9b860ad0eac37fbb89faec63ef735e36bff496` |
| `graph.db` size | `181850112` bytes |
| Persisted schema | `2.0.0` |
| Persisted commit SHA | `null` (dirty-tree binding is supplied by the source bundle) |
| Graph file rows | `3420` |
| Canonical file-row ledger SHA-256 | `09a001168fc7df8a4b1a05c3a680749b692f78ce77e81c4d97ba4abd8c033862` |
| Graph nodes / edges | `88968` / `117447` |
| Graph rows absent from snapshot | `0` |
| Graph row hash/size mismatches | `0` |

The evidence records every sorted `files(path, content_hash, size)` row and
requires each row's path, SHA-256, and size to equal an archived source entry.
It also records 28 read-only graph command records (command, exit, stdout and
stderr size/SHA-256), including the exact `search`, `inspect`, and `callers`
sequences for Accounts, backend-kernel, company-identity, license, and www.
The recorded caller-result counts are Accounts `18`, backend `9` and `0`,
company-identity `0` and `0`, license `0`, and www `3` and `0` respectively.
The graph SHA/size were rechecked after every probe and remained equal to the
scan-bound values.

## Verification commands

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation
# Ran 66 tests ... OK

Independent bundle/graph/probe verifier: re-run every exact command in
`r1-task3-graph-binding-20260731.json.commands`, compare its exit/stdout/stderr
sizes and SHA-256 values, verify all source-bundle references, re-hash
`graph.db`, and compare all ledgered graph rows with the snapshot manifest.
# verifiedBundleEntries=6783, verifiedGraphFileRows=3420,
# verifiedCommands=28, verifiedProbes=8, decision=PASS
```

No scan-input drift occurred in the retained transaction. No index, stash,
reset, cleanup, or unrelated path repair was performed. `graph.db` remains the
ignored canonical scan output; the source bundle and graph-binding ledger are
the durable committed evidence. R2 audit/coverage work remains blocked and
both parent/successor gates remain blocked.
