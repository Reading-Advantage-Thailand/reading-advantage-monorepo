# R2 Task 2 Compensation Denominator Remediation Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R2 Task 2 — compensation denominator reconciliation
- Status: remediation evidence only; task remains `[~]` pending the later R2/R3 gates.
- Parent/successor gates changed: **no**

## Corrected evidence transaction

The R2-only adversarial corpus is
`r2-task2-adversarial-fixtures-v1.json`, outside the immutable literal-indexed
R0 `fixtures/v1/` trust root. The accepted R0 fixture index and generator are
unchanged.

`measure/business_operations_graph_baseline_compensation.py` verifies the
accepted R1 archive, then materializes all `6,783` manifest entries into two
separate external roots. Before and after each scan it hashes and verifies the
complete manifest metadata (`9786969557e9e36782473d90c823cec1eaf18d7d369d2133691099a45ccf55eb`)
and its exact entry count. The only non-archive input is the explicitly
recorded resolver shim `node_modules/@reading-advantage/config ->
../../packages/config`; it is separately checked in every bracket.

The producer executed these fresh, distinct transactions:

```text
repo-graph scan . ../scan-1.db --config ../scan-config-v1.json
repo-graph scan . ../scan-2.db --config ../scan-config-v1.json
```

Both exited `0`. The graph artifacts were external and deliberately not
retained: scan 1 was `11c66479865d2d55c139ce130305b01c5d09665e8cb6ad81bc0593675d919cc4`
at `199073792` bytes, and scan 2 was
`5c3dd4093a4e429dcd361fe67fed99fa5703864f7783d48104b1490a44fb3306` at
`199065600` bytes. Equal or reused graph artifact digests are rejected.

The R2-owned `r2-task2-scan-transaction-20260731/` directory durably retains
the exact empty-`customEdges` configuration, each command's stdout/stderr and
exit binding, and hash-bound normalized inventories. It contains no database
and no root `graph.db` or machine-local `/tmp` database is read during
validation. The two independent inventories match at digest
`af8dc71b3b0eba6255b462cb7f03e0e0f7a434075cedfb7de7a9bd3f0217f894`:
`3,420` files, `665` routes, and `3,306` fields.

The preserved audit disposition remains exit `1`, `cleanEligible=false`, and
`COMPENSATION_REQUIRED`. The evidence reconciles the complete non-empty
`3,971`-symbol denominator (`3,306` fields and `665` routes) at
`d2ee44b5e249a56f3c7bfe24d7371c70701ee30f2973f9d7a271f18de6722b42`.

## Strict validator and adversarial corpus

The production `validate_compensation_evidence()` checks source-bundle hashes,
complete audit membership, duplicate and cross-partition IDs, every anchor,
path, name, span, fingerprint, range hash, both scan transactions, and all
durable artifacts. The focused suite first accepts the real non-empty
baseline, then executes every versioned mutation through that validator:

- route/field omission; duplicate field/route; cross-partition duplicate;
- anchor, path, name, span, fingerprint, source-range, and denominator-digest
  tampering;
- same-scan artifact reuse; and missing durable scan inventory.

For scanner-null routes, the full-file fallback is restricted to `page.tsx`
and records `anchorProvenance: "page-file-fallback"`. A null span in a
non-page route fails with `NULL_SPAN_FALLBACK_NON_PAGE`.

## Observed verification

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_r2_compensation
# Ran 5 tests in 92.440s
# OK

PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation measure.tests.test_business_operations_graph_baseline_r2_clean_audit measure.tests.test_business_operations_graph_baseline_r2_compensation
# Ran 74 tests in 83.780s
# OK
```

These are the observed results. The prior receipt's `88`-test passing claim is
superseded; the R0 literal-fixture regression is fixed by relocation rather
than changing immutable R0 fixtures.
