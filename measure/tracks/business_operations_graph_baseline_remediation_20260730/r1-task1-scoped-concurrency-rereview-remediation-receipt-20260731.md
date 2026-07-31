# R1 Task 1 Scoped-Concurrency Rereview Remediation Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R1 Task 1 — source-scoped concurrency rereview remediation
- Findings remediated: `R1-SCOPED-H1`, `R1-SCOPED-H2`, `R1-SCOPED-M1`
- R0 validator modified: **no**
- Parent/successor gates changed: **no**

## Remediation

- H1: Git name-status parsing now retains rename source and destination
  identity. Scanner-input rename sources become deleted tombstones even when
  their destination is documentation. Surviving tsconfig references now
  resolve tracked deleted targets, including nonstandard filenames and a
  workspace package export target, into the denominator, archive, and
  scanner-state scope.
- H2: File symlinks are filtered through the same scanner-input predicate as
  regular files. Rich v3 state artifacts bind `dependencyPaths`: manifest
  scanner paths plus each non-deleted symlink's resolved physical target that
  supplies scanner bytes. Status, staged diff, and intervening-commit checks
  use that scope; rich replay recomputes it from the manifest.
- H2 follow-up: A scanner symlink target is normalized lexically and every
  target path component is checked with `lstat` semantics. If any target
  component is another symlink, production raises `SnapshotValidationError`
  before entering the scan window, failing closed instead of permitting an
  unbound intermediate-link change and restoration.
- M1: Manifest and scan-record HEAD fields accept only exactly 40- or exactly
  64-character lowercase hexadecimal Git object IDs.

## Adversarial coverage

- Unstaged and staged deleted nonstandard extends targets replay as tombstones
  without producer index mutation.
- A staged deleted workspace-export extends target wins over a competing
  package-relative candidate and is retained in replay and state evidence.
- A staged scanner-to-Markdown rename retains the source tombstone, status,
  staged diff, replay bytes, and index.
- An unrelated Markdown symlink is excluded. Physical-target staged drift with
  restored live bytes and changed-and-restored physical-target commits both
  abort; the physical target is bound in rich state evidence.
- A changed-and-restored intermediate-symlink attack against a scanner symlink
  chain is rejected before the scan starts.
- Manifest and scan record tampering with 41- and 63-character SHA-like values
  is rejected.

## Verification

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation
Ran 65 tests in 55.305s
OK
```

This is producer remediation evidence only. R1 Task 1 remains `[~]` until a
fresh independent rereview reports no Critical or High finding. Parent Phase 0,
Admin Phase S1, and CRM contract/schema/Red remain blocked.
