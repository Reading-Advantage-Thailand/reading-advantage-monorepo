# R2 Task 2 Compensation Denominator Green Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R2 Task 2 — compensation denominator reconciliation
- Producer: `measure/business_operations_graph_baseline_compensation.py`
- Tests: `measure/tests/test_business_operations_graph_baseline_r2_compensation.py`
- Evidence: `measure/tracks/business_operations_graph_baseline_remediation_20260730/r2-task2-compensation-denominator-20260731.json`
- Plan marker: `[~]` (in progress; downstream R2 Tasks 3-5 remain `[b]`)
- Production code modified: **no** (only the new producer, new focused test
  module, new evidence file, plan.md update, and this receipt).
- Parent/successor gates changed: **no**

## Producer shape

The producer reads the accepted R2 clean-audit attempt, the R1 manifest,
and the R1 archive to:

1. Resolve the audit materialization prefix and translate every
   audit-prefixed file path and node ID into a canonical repository-relative
   path.
2. Look up every unaudited node's `line_start` and `line_end` from the
   canonical `graph.db` SQLite database. Routes with a `null` range fall
   back to the full file range, matching the documented v1 fixture
   convention.
3. Hash the source bytes spanning the declared line range and produce one
   per-node entry with `declarationAnchor`, `fingerprint`, `id`,
   `lineEnd`, `lineStart`, `name`, `path`, and `sourceRangeSha256`.
4. Materialize the R1 archive under a fresh `/tmp` work root (outside the
   repository) for replay verification, then reads the bound canonical
   `graph.db` and the R2 clean-audit `audit-attempt.db` to extract
   normalized file/route/field inventories.
5. Strip each scan's `project_root` prefix before sorting, so both scans
   over the same source bytes produce identical normalized inventories.

## Evidence shape

| Property | Value |
| --- | --- |
| Schema version | `1` |
| Track | `business_operations_graph_baseline_remediation_20260730` |
| Tool | `repo-graph 0.1.0` |
| Audit exit (preserved) | `1` |
| Decision (preserved) | `COMPENSATION_REQUIRED` |
| Total unaudited symbols | `3,971` |
| Field count | `3,306` |
| Route count | `665` |
| Symbols SHA-256 | `d2ee44b5e249a56f3c7bfe24d7371c70701ee30f2973f9d7a271f18de6722b42` |
| First inventory SHA-256 | `915b91d0a5d9a25dcda37e18e4751e94d72b0a0e8270412172d2c41a84ba6d89` |
| Second inventory SHA-256 | `915b91d0a5d9a25dcda37e18e4751e94d72b0a0e8270412172d2c41a84ba6d89` |
| Inventory identity | `true` |
| Normalized file count | `3420` |
| Normalized route count | `665` |
| Normalized field count | `3306` |
| Graph binding (scan 1) | `graph.db` at `77877db9915dd928be649074cf9b860ad0eac37fbb89faec63ef735e36bff496`, `181850112` bytes |
| Scan 2 graph | `audit-attempt.db` at `/tmp/opencode/r2-clean-audit-probe-nbi4_dbp/source/audit-attempt.db` |

The audit exit code and `COMPENSATION_REQUIRED` label are read verbatim
from `r2-clean-audit-attempt-20260731/attempt.json` and re-asserted in the
`auditPreserved` block; the producer never mutates the upstream decision.

## Verification commands

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_r2_compensation
# Ran 19 tests ... OK (11.663s)

PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation measure.tests.test_business_operations_graph_baseline_r2_clean_audit measure.tests.test_business_operations_graph_baseline_r2_compensation
# Ran 88 tests ... OK (60.547s)

PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/business_operations_graph_baseline_compensation.py measure/tests/test_business_operations_graph_baseline_r2_compensation.py
# Compile OK
```

## Adversarial coverage

The focused suite includes a dedicated `R2Task2AdversarialCompensationTests`
class that mutates the evidence file along every documented attack
surface:

- omitting one route entry from `routeReconciliation`;
- omitting one field entry from `fieldReconciliation`;
- duplicating an entry across `fieldReconciliation`;
- tampering the `sourceRangeSha256` of a field entry;
- tampering the `lineStart` / `lineEnd` of a route entry;
- diverging the two scan inventory digests;
- setting the audit exit code to `0`;
- relabeling the decision branch from `COMPENSATION_REQUIRED` to `CLEAN`;
- decrementing the total symbol count;
- tampering the symbol-set SHA-256.

Every adversarial mutation is detected (each test asserts the mutated
evidence diverges from the accepted frozen property). The
`R2Task2AdversarialFixtureTests` class additionally validates that the
denominator's four distinct digests (inventory identity, symbol set,
first source range, first route source range) are pairwise unique and
that re-replaying the canonical `graph.db` produces a deterministic
inventory.

## Verification of unchanged inputs

The two scans both scanned the same R1 archive bytes:

- the bound canonical scan produced `graph.db`
  (`77877db9915dd928be649074cf9b860ad0eac37fbb89faec63ef735e36bff496`,
  `181850112` bytes) at audit HEAD;
- the R2 clean-audit scan produced `audit-attempt.db` over the
  materialized archive at
  `/tmp/opencode/r2-clean-audit-probe-nbi4_dbp/source/audit-attempt.db`.

Every normalized `(path, sha256, size)` tuple, every normalized
`(id, name, filePath, lineStart, lineEnd)` route tuple, and every
normalized field tuple match byte-for-byte across the two scans after
removing each scan's `project_root` prefix. The matched inventory has
`3420` files, `665` routes, and `3306` fields.

## Constraints honored

- No edits to `graph.db`, the real Git index, the dirty worktree, the
  scanner, or any application source. The materialized R1 archive lives
  under `/tmp/opencode/r2-task2-compensation/source` and is outside the
  repository.
- `measure/automation-supervisor.py` is unchanged across the working
  range.
- The accepted R0 validator
  (`measure/business_operations_graph_baseline_validation.py`) and the
  accepted R1 snapshot producer
  (`measure/business_operations_graph_baseline_snapshot.py`) are
  unchanged.
- The parent Admin Phase S1 and CRM `contract-schema-red` gates remain
  blocked. This Green receipt accepts only the bounded R2 Task 2 evidence
  and grants no successor unblock.