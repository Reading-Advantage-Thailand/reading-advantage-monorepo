# Red Run Receipt — Business Operations Graph Baseline Remediation

- Track: `business_operations_graph_baseline_remediation_20260730`
- Task: exact blocking Red-contract remediation
- Baseline HEAD: `3ff9b734a9e5a69f777108827b569e4f20a5ceb8`
- Branch/worktree contract: one shared `master` worktree
- Production code modified: **no**
- Parent evidence/reviews/plans/graph/APK work modified: **no**
- Commit created: **no**
- Expected state: **Red solely at the absent dedicated validator boundary**

## Final-review finding disposition

| Finding | Red-contract remediation |
| --- | --- |
| `RED-FINAL-C1` | The test pins the parent-manifest digest and all three parent-artifact SHA-256/size values as literals. It byte-compares the authoritative parent paths with frozen copies and asserts original `FAIL`/blocked/RB-01–RB-03 semantics. Coordinated artifact-plus-manifest replacement cannot green the preflight. |
| `RED-FINAL-C2` | Clean and compensation archives contain full base64 source bytes; separate source manifests exactly match replayed path/hash/size/mode/state inventories. Python preflights recompute archive entries, denominator hashes, graph-row hashes, route ranges, candidate digests, role receipts, and ledgers before importing the absent validator. |
| `RED-GREEN-H1` | Both candidates use the exact 17 Accounts route nodes reported by Review B. Every route now has six category entries with a constrained claim vocabulary, required/forbidden token rule, independently replayed category-specific frozen-source range, and unique semantic rationale. Company-admin authorization, global scope, schema validation, and immutable audit claims bind to the reviewed backend capability descriptors; protocol routes bind to their own handler checks. Public and global exceptions are an exact source-reviewed route set. The adversarial corpus now rejects fabricated dispositions and evidence kinds, copied cross-category evidence, fabricated category claims, and public/global exception assertions whose source does not support them. |
| `RED-FINAL-H2` | Candidate manifest, producer receipt, reviewer receipt, and reviewer recomputation ledger are separate hash-bound fixtures. Candidate SHA is finalized before review; producer/reviewer identities differ; reviewer ledger recomputes every candidate artifact plus both named blocked successor gates. |
| `RED-FINAL-H3` | Eight exact required commands per branch bind command, stdout, stderr, their hashes, exit, status, record hash, and source-manifest hash. The corpus covers valid clean, valid tool-limitation compensation with issue, forbidden project-owned compensation, cross-branch issue errors, unknown audit/command/review/severity/worktree states, and unexpected candidate fields. |

## Literal trust roots

- Parent fixture manifest SHA-256:
  `15f3c61fbcea4ea13c777e4f80ff061de2fa007985ef38b77dd560b1c8c77d50`
- Generated fixture index SHA-256:
  `08e6186ddeb8d657305f57e545067f874273bca14eb028a383db2a3927cf4660`
- Frozen/authoritative Review B SHA-256:
  `5bfe10b18aaf650687a337f02a64dab35de378ef8ba333e4946af6e80143fc9f`
- Frozen/authoritative parent producer evidence SHA-256:
  `6d3613787361d0747d6ed9f590583257d92ac15f6717fbd58d9a1bcc006181db`
- Frozen/authoritative prior Red re-review SHA-256:
  `e64fdbd2f67145a18c8e0d821b39629ec750cb71eae78acde357d245ddf19d73`

## Fixture model

`fixtures/v1/generate-fixtures.py` deterministically regenerated and froze:

- `snapshot-{clean,compensation}-v1.archive.json`
- `snapshot-{clean,compensation}-v1.manifest.json`
- `graph-{clean,compensation}-v1.json`
- `command-results-*.json`, including the unknown-state counterexample
- `candidate-{clean,compensation}-v1.manifest.json`
- `producer-{clean,compensation}-v1.receipt.json`
- `reviewer-{clean,compensation}-v1.artifact-ledger.json`
- `reviewer-{clean,compensation}-v1.receipt.json`
- unknown reviewer-state/severity receipt fixtures
- `candidate-envelopes-v1.json`
- `invalid-candidates-v1.json`
- `fixture-index-v1.json`

The clean and compensation source snapshots also freeze
`packages/backend/src/modules/company-identity/capabilities.ts`, and graph rows
bind that source because it supplies the company-admin policy, global boundary,
input-schema, and immutable-audit assertions used by the route matrix. A second
generator run reproduced fixture-index SHA-256
`08e6186ddeb8d657305f57e545067f874273bca14eb028a383db2a3927cf4660`
without drift.

The fixture index pins every generated top-level fixture and the generator. The
test pins the index digest outside that mutable payload.

## Exact verification command

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_remediation -v
```

## Exact result

```text
EXIT=1
Ran 19 tests in 0.530s
FAILED (failures=66)
```

All Python-side archive, manifest, parent-byte, source-anchor, constrained
security-assertion, public/global-exception, exclusion, command,
candidate-digest, receipt, and reviewer-ledger assertions completed before
their validator calls. Every one of the 66 failures is the intentional boundary
failure:

```text
ModuleNotFoundError: No module named 'measure.business_operations_graph_baseline_validation'
AssertionError: Red expected: dedicated module measure.business_operations_graph_baseline_validation does not exist
```

No error or alternate assertion failure occurred. The exact next Red task
remains `[~]`; Phase R0 Green and both successor gates remain blocked.
